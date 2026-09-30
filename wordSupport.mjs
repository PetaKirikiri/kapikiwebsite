/** Learner-facing source content and reviewed examples; never tagging evidence. */
export async function readWordSupport(db, word, pos, sentence = '') {
  const result = await db.query(`
    with source_entries as (
      select * from public.dictionary_entry where lower(headword)=$1 and source_code='te_aka'
    ), entry as (
      select content from public.word_support_entry
      where word=$1 and pos_code in (coalesce($2::text,''),'')
      order by (pos_code=coalesce($2::text,'')) desc limit 1
    ), role as (
      select p.code,p.label,coalesce(p.description,'') as description,r.explanation as visual,g.display_label as family
      from public.pos_type p left join public.word_support_role r on r.pos_code=p.code
      left join public.pos_group g on g.group_code=p.group_code where p.code=$2::text
    ), definitions as (
      select distinct s.definition,coalesce(l.display_label,s.pos_label_code,'Meaning') as label,
        coalesce(e.source_url,'') as url
      from source_entries e join public.dictionary_sense s using(entry_id)
      left join public.dictionary_pos_label l on l.label_code=s.pos_label_code
      where ($2::text is null or exists (
        select 1 from public.dictionary_pos_mapping m where m.label_code=s.pos_label_code and m.pos_code=$2
      )) order by label,definition limit 16
    ), senses as (
      select s.sense_index,s.pos_label_code as "labelCode",coalesce(l.display_label,s.pos_label_code,'Meaning') as label,
        s.pos_qualifier as qualifier,s.definition,
        coalesce((select jsonb_agg(distinct surface_text) from public.dictionary_sense_passive_form where sense_id=s.sense_id),'[]') as "passiveForms",
        coalesce((select jsonb_agg(synonym order by synonym_index) from public.dictionary_synonym where sense_id=s.sense_id),'[]') as synonyms
      from source_entries e join public.dictionary_sense s using(entry_id)
      left join public.dictionary_pos_label l on l.label_code=s.pos_label_code
    ), pronunciations as (
      select distinct a.audio_url as url,a.source_code as source from public.lexeme_audio a
      join public.lexeme l using(lexeme_id)
      where a.source_code='te_aka' and (lower(l.lemma)=$1 or l.lexeme_id in (select lexeme_id from source_entries))
    ), vocabulary as (
      select distinct meaning from public.training_vocabulary where lower(text_mi)=$1 order by meaning limit 5
    ), examples as (
      select s.structure_id::int as "structureId",s.text_mi as mi,coalesce(c.correct,'') as en,f.state
      from public.sentence_structure s left join public.floor_plan f using(structure_id)
      left join public.training_content c on c.structure_id=s.structure_id and c.text_mi=s.text_mi
      where exists (
        select 1 from regexp_split_to_table(lower(s.text_mi),'\\s+') word where trim(both '.,!?;:…' from word)=$1
      ) order by (s.text_mi=$3) desc,
        exists(select 1 from jsonb_array_elements(f.state->'tokens') t where lower(trim(both '.,!?;:…' from t->>'surfaceText'))=$1 and t->>'acceptedPosCode'=$2) desc,
        s.sort_order limit 4
    ), types as (
      select distinct p.code,p.label,p.description,l.label_code as "sourceLabelCode",l.display_label as "sourceLabel"
      from source_entries e join public.dictionary_sense s using(entry_id)
      join public.dictionary_pos_label l on l.label_code=s.pos_label_code
      join public.dictionary_pos_mapping m on m.label_code=l.label_code
      join public.pos_type p on p.code=m.pos_code
    ) select jsonb_build_object(
      'word',$1::text,'entry',(select content from entry),'role',(select to_jsonb(role) from role),
      'definitions',coalesce((select jsonb_agg(definitions) from definitions),'[]'::jsonb),
      'vocabulary',coalesce((select jsonb_agg(meaning) from vocabulary),'[]'::jsonb),
      'examples',coalesce((select jsonb_agg(examples) from examples),'[]'::jsonb),
      'pronunciations',coalesce((select jsonb_agg(pronunciations) from pronunciations),'[]'::jsonb),
      'types',coalesce((select jsonb_agg(types order by label) from types),'[]'::jsonb),
      'teAka',jsonb_build_object(
        'entries',coalesce((select jsonb_agg(e) from (select distinct headword,source_url as url,source_word_id as "sourceId" from source_entries) e),'[]'::jsonb),
        'senses',coalesce((select jsonb_agg(senses order by sense_index) from senses),'[]'::jsonb)
      ),
      'catalog',jsonb_build_object(
        'groups',(select jsonb_agg(g) from (select group_code as "groupCode",display_label as "displayLabel",description,sort_order as "sortOrder" from public.pos_group order by sort_order) g),
        'posTypes',(select jsonb_agg(p) from (select code as "posCode",label,abbreviation,description,group_code as "groupCode",parent_code as "parentCode" from public.pos_type order by sort_order) p),
        'dictionaryPosLabels','[]'::jsonb,'dictionaryPosMappings','[]'::jsonb,'wordCategories','[]'::jsonb
      )
    ) as support`, [word, pos, sentence])
  const support = result.rows[0].support
  // Imports can contain the same entry under multiple lexemes. Merge identical senses
  // without losing the passive forms or synonyms present on only one scraped copy.
  const senses = new Map()
  for (const sense of support.teAka.senses) {
    const key = JSON.stringify([sense.labelCode, sense.qualifier, sense.definition])
    const prior = senses.get(key)
    if (prior) {
      prior.passiveForms = [...new Set([...prior.passiveForms, ...sense.passiveForms])]
      prior.synonyms = [...new Set([...prior.synonyms, ...sense.synonyms])]
    } else senses.set(key, sense)
  }
  support.teAka.senses = [...senses.values()]
  return support
}

/** Read-only vocabulary projection of source labels and existing word-level assignments. */
export async function readVocabularyPos(db, words) {
  const result = await db.query(`
    with requested as (select word, ord from unnest($1::text[]) with ordinality r(word, ord)),
    identities as (
      select distinct r.word, l.lexeme_id from requested r
      join public.lexeme l on l.language_code='mi' and (
        lower(normalize(l.lemma,NFC))=r.word or exists (
          select 1 from public.lexeme_alias a where a.lexeme_id=l.lexeme_id
          and lower(normalize(a.alias,NFC))=r.word
        )
      )
    ), source as (
      select distinct i.word, s.pos_label_code as code,
        coalesce(dl.display_label,s.pos_label_code) as label, e.source_url as url
      from identities i join public.dictionary_entry e using(lexeme_id)
      join public.dictionary_sense s using(entry_id)
      left join public.dictionary_pos_label dl on dl.label_code=s.pos_label_code
      where e.source_code='te_aka' and s.pos_label_code is not null
    ), assigned as (
      select distinct i.word, p.code, p.label, p.group_code, g.display_label as broad_label, 'unreviewed' as status
      from identities i join public.lexeme_pos_capability c using(lexeme_id)
      join public.pos_type p on p.code=c.pos_code
      join public.pos_group g on g.group_code=p.group_code
    ), confirmed as (
      select distinct r.word, p.code, p.label, g.group_code, g.display_label as broad_label, 'confirmed' as status
      from requested r join public.learned_maori_word w on w.word=r.word
      cross join lateral jsonb_array_elements(w.conditions) c
      left join public.pos_type p on p.code=c->'local'->>'ours'
      left join public.pos_group g on g.group_code=c->'local'->>'family'
      where jsonb_array_length(c->'sources')>0
    ), internal as (select * from assigned union select * from confirmed),
    categories as (
      select i.word, c.category_code as code, c.label
      from identities i join public.lexeme_category lc using(lexeme_id)
      join public.word_category c on c.category_code=lc.category_code
      union
      select r.word, cat.category_code as code, cat.label
      from requested r join public.learned_maori_word w on w.word=r.word
      cross join lateral jsonb_array_elements(w.conditions) c
      cross join lateral jsonb_array_elements_text(c->'local'->'categories') code(value)
      join public.word_category cat on cat.category_code=code.value
      where jsonb_array_length(c->'sources')>0
    )
    select r.word,
      coalesce((select jsonb_agg(v order by v.label) from (
        select distinct code,label,url from source where word=r.word
      ) v),'[]') as "teAka",
      coalesce((select jsonb_agg(v order by v.label,v.status) from (
        select distinct group_code as code,broad_label as label,status from internal x where x.word=r.word and x.group_code is not null
        and (x.status='confirmed' or not exists(select 1 from confirmed c where c.word=x.word and c.group_code=x.group_code))
      ) v),'[]') as "broadPos",
      coalesce((select jsonb_agg(v order by v.label,v.status) from (
        select distinct code,label,status from internal x where x.word=r.word and x.code is not null
        and (x.status='confirmed' or not exists(select 1 from confirmed c where c.word=x.word and c.code=x.code))
      ) v),'[]') as "specificPos",
      coalesce((select jsonb_agg(v order by v.label) from (
        select distinct code,label from categories where word=r.word
      ) v),'[]') as categories
    from requested r order by r.ord`, [words])
  return result.rows
}
