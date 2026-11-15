CREATE OR REPLACE FUNCTION public.list_public_binders(p_query text DEFAULT '') RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT COALESCE(jsonb_agg(x ORDER BY x->>'name'),'[]'::jsonb) FROM (
  SELECT jsonb_build_object('id',b.id,'name',b.name,'description',b.description,
   'cover',(SELECT c.image_url FROM public.cards c WHERE c.id=b.cover_card_id AND c.user_id=b.user_id),
   'count',(SELECT count(*) FROM public.binder_cards bc WHERE bc.binder_id=b.id AND bc.user_id=b.user_id)) x
  FROM public.binders b WHERE b.is_public=true AND (coalesce(p_query,'')='' OR b.name ILIKE '%'||p_query||'%' OR b.description ILIKE '%'||p_query||'%')
  LIMIT 20) s;
$$;
REVOKE ALL ON FUNCTION public.list_public_binders(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_binders(text) TO anon, authenticated;