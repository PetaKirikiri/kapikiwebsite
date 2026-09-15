-- Learner content display metadata only; never POS or tagging evidence.
ALTER TABLE public.training_skill ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'Other';
ALTER TABLE public.training_skill ADD COLUMN IF NOT EXISTS category_order integer NOT NULL DEFAULT 100;
ALTER TABLE public.training_skill ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 100;
WITH groups(category,category_order,forms) AS (VALUES
 ('Articles',1,ARRAY['te','ngā','he']),
 ('Demonstratives',2,ARRAY['tēnei','ēnei','tēnā','ēnā','tērā','ērā']),
 ('Indefinites',3,ARRAY['tētahi','ētahi']),
 ('Previously mentioned',4,ARRAY['taua','aua']),
 ('Possessives · A category',5,ARRAY['tāku','āku','tāu','āu','tāna','āna','tā tāua','ā tāua','tā māua','ā māua','tā kōrua','ā kōrua','tā rāua','ā rāua','tā tātou','ā tātou','tā mātou','ā mātou','tā koutou','ā koutou','tā rātou','ā rātou']),
 ('Possessives · O category',6,ARRAY['tōku','ōku','tōu','ōu','tōna','ōna','tō tāua','ō tāua','tō māua','ō māua','tō kōrua','ō kōrua','tō rāua','ō rāua','tō tātou','ō tātou','tō mātou','ō mātou','tō koutou','ō koutou','tō rātou','ō rātou']),
 ('Possessives · Neutral',7,ARRAY['taku','aku','tō','ō','tana','ana']),
 ('Pronouns · Singular',8,ARRAY['au','ahau','koe','ia']),
 ('Pronouns · Dual',9,ARRAY['tāua','māua','kōrua','rāua']),
 ('Pronouns · Plural',10,ARRAY['tātou','mātou','koutou','rātou'])
) UPDATE public.training_skill s SET category=g.category, category_order=g.category_order, display_order=array_position(g.forms,s.label)
FROM groups g WHERE s.label=ANY(g.forms) AND s.family=CASE WHEN g.category_order>=8 THEN 'pronoun' ELSE 'determiner' END;
