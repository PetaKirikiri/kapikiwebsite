begin;
create table if not exists public.training_vocabulary (
  vocabulary_key text primary key,
  category text not null,
  text_mi text not null,
  meaning text not null,
  sort_order integer not null
);
create table if not exists public.training_vocabulary_structure (
  vocabulary_key text not null references public.training_vocabulary on delete cascade,
  structure_id bigint not null references public.sentence_structure on delete cascade,
  base_text text not null,
  primary key(vocabulary_key, structure_id)
);
alter table public.training_vocabulary enable row level security;
alter table public.training_vocabulary_structure enable row level security;
revoke all on public.training_vocabulary, public.training_vocabulary_structure from anon, authenticated;
insert into public.training_vocabulary values
 ('noun:manu','Nouns','manu','bird',1),
 ('noun:kākāpō','Nouns','kākāpō','kākāpō',2),
 ('noun:ngahere','Nouns','ngahere','forest',3),
 ('noun:tāngata','Nouns','tāngata','people',4),
 ('number:kotahi','Numbers','kotahi','one',10),
 ('number:rua','Numbers','rua','two',11),
 ('number:tokorua','Numbers','tokorua','two people',12),
 ('name:Charlie','Names','Charlie','Charlie',20),
 ('name:Wellington','Names','Wellington','Wellington',21),
 ('determiner:te','Determiners','te','the (singular)',30),
 ('determiner:ngā','Determiners','ngā','the (plural)',31),
 ('determiner:he','Determiners','he','a / an (classification)',32),
 ('structure:ko','Structure words','Ko','identifies who or what',40),
 ('structure:nō','Structure words','Nō','from (origin)',41),
 ('structure:kei','Structure words','Kei','at / in (present location)',42),
 ('structure:e','Structure words','E','introduces a number',43),
 ('structure:kāorekau','Structure words','Kāorekau','there are no / none',44)
on conflict do nothing;
insert into public.training_vocabulary_structure
select v.vocabulary_key,s.structure_id,s.text_mi
from public.training_vocabulary v cross join public.sentence_structure s
where s.curriculum_level=1 and lower(v.text_mi)=any(string_to_array(lower(s.text_mi),' '))
on conflict do nothing;
commit;
