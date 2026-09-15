export async function nextTrainingQuestion(db, hash) {
 const {rows}=await db.query(`WITH questions AS (
 SELECT 'structure:'||c.structure_id AS question_id,c.structure_id,c.text_mi FROM training_content c
 UNION ALL SELECT question_id,structure_id,base_text FROM training_variant
 ), history AS (
 SELECT coalesce(question_id,'structure:'||structure_id) AS question_id,count(*) AS attempts,
 (array_agg(correct ORDER BY created_at DESC))[1] AS last_correct,max(practice_position) AS last_position
 FROM training_attempt WHERE token_hash=$1 GROUP BY 1
 ) SELECT q.question_id FROM questions q JOIN sentence_structure s USING(structure_id)
 CROSS JOIN training_settings t JOIN training_profile p ON p.token_hash=$1
 LEFT JOIN history h USING(question_id)
 WHERE s.curriculum_level=t.active_level AND s.text_mi=q.text_mi
 ORDER BY CASE WHEN h.last_correct=false AND p.position-coalesce(h.last_position,0)>=3 THEN 0 WHEN h.attempts IS NULL THEN 1 ELSE 2 END,
 coalesce(h.attempts,0),coalesce(h.last_position,-1),s.sort_order,q.question_id LIMIT 1`,[hash])
 return rows[0]?.question_id ?? null
}
export async function trainingCoverage(db, hash) {
 const {rows}=await db.query(`SELECT k.skill_key AS key,k.family,k.label,k.category,
 count(DISTINCT v.question_id)::int AS examples,
 count(DISTINCT v.structure_id)::int AS structures,
 count(a.id)::int AS attempts,
 count(a.id) FILTER(WHERE a.correct)::int AS correct,
 count(DISTINCT a.question_id) FILTER(WHERE a.correct)::int AS demonstrated
 FROM training_skill k LEFT JOIN training_variant v USING(skill_key)
 LEFT JOIN training_attempt a ON a.question_id=v.question_id AND a.token_hash=$1
 GROUP BY k.skill_key ORDER BY k.category_order,k.display_order,k.skill_key`,[hash])
 return rows.map(row=>({...row,status:row.examples===0?'Missing content':row.demonstrated>=3&&row.attempts>=4&&row.correct/row.attempts>=.8?'Demonstrated':row.attempts?'Practising':'Not practised'}))
}

export async function structureCoverage(db, hash) {
 const {rows}=await db.query(`WITH questions AS (
 SELECT structure_id,'structure:'||structure_id AS question_id FROM training_content
 UNION ALL SELECT structure_id,question_id FROM training_variant
 ), evidence AS (
 SELECT coalesce(question_id,'structure:'||structure_id) AS question_id,count(*) AS attempts,count(*) FILTER(WHERE correct) AS correct FROM training_attempt WHERE token_hash=$1 GROUP BY 1
 ) SELECT q.structure_id::int AS "structureId",count(*)::int AS examples,
 count(*) FILTER(WHERE e.correct>=3 AND e.correct::float/e.attempts>=.8)::int AS demonstrated
 FROM questions q LEFT JOIN evidence e USING(question_id) GROUP BY q.structure_id`,[hash])
 return rows
}
