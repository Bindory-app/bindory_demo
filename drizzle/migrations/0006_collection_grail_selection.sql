ALTER TABLE public.cards ADD COLUMN is_grail boolean NOT NULL DEFAULT false, ADD COLUMN grail_rank integer, ADD COLUMN slab_photo_path text;
ALTER TABLE public.cards ADD CONSTRAINT cards_grail_rank_check CHECK ((is_grail AND grail_rank BETWEEN 1 AND 3) OR (NOT is_grail AND grail_rank IS NULL));
CREATE UNIQUE INDEX cards_owner_grail_rank ON public.cards(user_id,grail_rank) WHERE is_grail;
CREATE OR REPLACE VIEW public.user_cards WITH (security_invoker=true) AS SELECT * FROM public.cards;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_cards TO authenticated;
GRANT ALL ON public.user_cards TO service_role;
CREATE FUNCTION public.set_card_grail(p_card_id uuid,p_rank integer) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
 IF p_rank NOT BETWEEN 1 AND 3 OR p_rank IS NULL THEN RAISE EXCEPTION 'Choose grail 1, 2 or 3'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':grails',0));
 IF NOT EXISTS(SELECT 1 FROM public.cards WHERE id=p_card_id AND user_id=auth.uid()) THEN RAISE EXCEPTION 'Choose a card you own'; END IF;
 UPDATE public.cards SET is_grail=false,grail_rank=NULL WHERE user_id=auth.uid() AND (grail_rank=p_rank OR id=p_card_id);
 UPDATE public.cards SET is_grail=true,grail_rank=p_rank WHERE id=p_card_id AND user_id=auth.uid();
END; $$;
REVOKE ALL ON FUNCTION public.set_card_grail(uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_card_grail(uuid,integer) TO authenticated;
ALTER TABLE public.cards ADD CONSTRAINT cards_slab_photo_owner CHECK (slab_photo_path IS NULL OR (split_part(slab_photo_path,'/',1)=user_id::text AND position('..' in slab_photo_path)=0));