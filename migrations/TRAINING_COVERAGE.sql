CREATE TABLE IF NOT EXISTS public.training_skill (
 skill_key text PRIMARY KEY, family text NOT NULL CHECK(family IN ('pronoun','determiner')), label text NOT NULL
);
CREATE TABLE IF NOT EXISTS public.training_variant (
 question_id text PRIMARY KEY, structure_id bigint NOT NULL REFERENCES public.sentence_structure(structure_id) ON DELETE CASCADE,
 base_text text NOT NULL, text_mi text NOT NULL, correct text NOT NULL, alternative text NOT NULL,
 skill_key text NOT NULL REFERENCES public.training_skill(skill_key), CHECK(correct<>alternative)
);
ALTER TABLE public.training_attempt ADD COLUMN IF NOT EXISTS question_id text;
ALTER TABLE public.training_attempt ADD COLUMN IF NOT EXISTS skill_key text REFERENCES public.training_skill(skill_key);
ALTER TABLE public.training_attempt ADD COLUMN IF NOT EXISTS practice_position integer;
ALTER TABLE public.training_skill ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_variant ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.training_skill,public.training_variant FROM anon,authenticated;
