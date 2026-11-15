ALTER TABLE public.binders ADD COLUMN is_public boolean NOT NULL DEFAULT false, ADD COLUMN cover_card_id uuid REFERENCES public.cards(id);
CREATE OR REPLACE FUNCTION public.read_public_binder(p_id uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT jsonb_build_object('id',b.id,'name',b.name,'description',b.description,'is_public',b.is_public,'cover_card_id',b.cover_card_id,'cards',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'image_url',c.image_url,'reason',bc.reason,'position',bc.position) ORDER BY bc.position,bc.id) FROM public.binder_cards bc JOIN public.cards c ON c.id=bc.card_id AND c.user_id=b.user_id WHERE bc.binder_id=b.id AND bc.user_id=b.user_id),'[]'::jsonb)) FROM public.binders b WHERE b.id=p_id AND b.is_public=true;
$$;
REVOKE ALL ON FUNCTION public.read_public_binder(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.read_public_binder(uuid) TO anon, authenticated;
CREATE OR REPLACE FUNCTION public.save_binder_detail(p_id uuid,p_name text,p_description text,p_cover uuid,p_public boolean,p_cards jsonb) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE c jsonb; pos integer:=0;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
 PERFORM 1 FROM public.binders WHERE id=p_id AND user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Binder not found'; END IF;
 IF length(trim(p_name))=0 OR length(p_name)>120 THEN RAISE EXCEPTION 'Invalid name'; END IF;
 IF jsonb_typeof(p_cards)<>'array' OR jsonb_array_length(p_cards)>500 THEN RAISE EXCEPTION 'Invalid cards'; END IF;
 IF p_cover IS NOT NULL AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_cards) v WHERE (v->>'id')::uuid=p_cover) THEN RAISE EXCEPTION 'Cover must be in this binder'; END IF;
 DELETE FROM public.binder_cards WHERE binder_id=p_id AND user_id=auth.uid();
 FOR c IN SELECT value FROM jsonb_array_elements(p_cards) LOOP
  IF NOT EXISTS(SELECT 1 FROM public.cards WHERE id=(c->>'id')::uuid AND user_id=auth.uid()) THEN RAISE EXCEPTION 'Choose your own cards'; END IF;
  INSERT INTO public.binder_cards(user_id,binder_id,card_id,position,reason) VALUES(auth.uid(),p_id,(c->>'id')::uuid,pos,c->>'reason');
  pos:=pos+1;
 END LOOP;
 UPDATE public.binders SET name=trim(p_name),description=p_description,cover_card_id=p_cover,is_public=p_public WHERE id=p_id AND user_id=auth.uid();
END; $$;
REVOKE ALL ON FUNCTION public.save_binder_detail(uuid,text,text,uuid,boolean,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_binder_detail(uuid,text,text,uuid,boolean,jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.confirm_binder_preview(p_message uuid,p_name text,p_publish boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE m public.mori_messages%ROWTYPE; c jsonb; bid uuid; cid uuid; cover uuid; pos integer:=0; r public.mori_messages%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
 SELECT * INTO m FROM public.mori_messages WHERE id=p_message AND user_id=auth.uid() AND kind='confirm' FOR UPDATE;
 IF NOT FOUND OR m.payload->>'tool'<>'create_binder' OR m.payload->>'status'<>'pending' THEN RAISE EXCEPTION 'Pending binder not found'; END IF;
 IF length(trim(p_name))=0 OR length(p_name)>120 THEN RAISE EXCEPTION 'Invalid name'; END IF;
 IF jsonb_array_length(m.payload->'cards')=0 THEN RAISE EXCEPTION 'Choose cards first'; END IF;
 INSERT INTO public.binders(user_id,name,description,is_public) VALUES(auth.uid(),trim(p_name),m.payload->>'description',p_publish) RETURNING id INTO bid;
 FOR c IN SELECT value FROM jsonb_array_elements(m.payload->'cards') LOOP
  SELECT id INTO cid FROM public.cards WHERE user_id=auth.uid() AND tcgdex_id=c->>'tcgdex_id' ORDER BY created_at,id LIMIT 1;
  IF cid IS NULL THEN RAISE EXCEPTION 'Choose your own cards'; END IF;
  IF nullif(trim(c->>'reason'),'') IS NULL THEN RAISE EXCEPTION 'Every card needs a reason'; END IF;
  IF pos=0 THEN cover:=cid; END IF;
  INSERT INTO public.binder_cards(user_id,binder_id,card_id,position,reason) VALUES(auth.uid(),bid,cid,pos,c->>'reason'); pos:=pos+1;
 END LOOP;
 UPDATE public.binders SET cover_card_id=cover WHERE id=bid;
 UPDATE public.mori_messages SET payload=m.payload || jsonb_build_object('status','confirmed','name',trim(p_name),'binder_id',bid) WHERE id=m.id;
 INSERT INTO public.mori_messages(user_id,role,content) VALUES(auth.uid(),'mori','Your binder “'||trim(p_name)||'” is ready'||CASE WHEN p_publish THEN ' and public.' ELSE ' and private.' END) RETURNING * INTO r;
 RETURN jsonb_build_object('done','confirmed','binder_id',bid,'reply',to_jsonb(r));
END; $$;
REVOKE ALL ON FUNCTION public.confirm_binder_preview(uuid,text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_binder_preview(uuid,text,boolean) TO authenticated;