CREATE TABLE IF NOT EXISTS public.training_content (
 structure_id bigint PRIMARY KEY REFERENCES public.sentence_structure(structure_id) ON DELETE CASCADE,
 text_mi text NOT NULL, correct text NOT NULL, alternative text NOT NULL,
 CHECK (correct <> alternative)
);
CREATE TABLE IF NOT EXISTS public.training_settings (id boolean PRIMARY KEY DEFAULT true CHECK(id), active_level smallint NOT NULL CHECK(active_level BETWEEN 1 AND 6));
INSERT INTO public.training_settings(id,active_level) VALUES(true,1) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS public.training_profile (token_hash text PRIMARY KEY, name text NOT NULL DEFAULT '', position integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.training_attempt (id uuid PRIMARY KEY, token_hash text NOT NULL REFERENCES public.training_profile(token_hash), structure_id bigint NOT NULL REFERENCES public.sentence_structure(structure_id), answer text NOT NULL, correct boolean NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.training_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_attempt ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.training_content,public.training_settings,public.training_profile,public.training_attempt FROM anon,authenticated;
