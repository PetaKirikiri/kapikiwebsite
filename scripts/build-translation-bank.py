"""Build the teacher-review translation bank. No tagging or learner data writes."""
import json, re, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
lessons=[]
def add(level,title,pattern,pairs,note):
    assert pairs and all(mi.endswith(('.', '?', '!')) and en.endswith(('.', '?', '!')) for mi,en in pairs),title
    lessons.append(dict(level=level,lesson=sum(x['level']==level for x in lessons)+1,title=title,pattern=pattern,focus=list(dict.fromkeys(pairs)),note=note))
def parse(text):
    return [tuple(line.split(' | ',1)) for line in text.strip().splitlines() if line.strip()]
people=[('Mere','wahine','woman'),('Hana','wahine','woman'),('Hemi','tāne','man'),('Pita','tāne','man'),('Mere','kōtiro','girl'),('Hana','kōtiro','girl'),('Hemi','tama','boy'),('Pita','tama','boy')]
pronouns=[('ahau','I'),('koe','You'),('ia','She')]
def be(en):return 'am' if en=='I' else 'are' if en=='You' else 'is'
add(1,'Man, woman, boy, girl','Ko … te …',[(f'Ko {n} te {w}.',f'The {e} is {n}.') for n,w,e in people], 'Four concrete nouns and four reusable names. One sentence frame; no jobs or isolated-word questions.')
add(1,'Say what someone is','He … a …',[(f'He {w} a {n}.',f'{n} is a {e}.') for n,w,e in people], 'Change the sentence frame while keeping every person word familiar.')
add(1,'I, you, he and she','ahau · koe · ia',[(f'He {w} {p}.',f'{"He" if p=="ia" and w in ["tāne","tama"] else en} {be(en)} a {e}.') for p,en in pronouns for w,e in [('tāne','man'),('wahine','woman'),('tama','boy'),('kōtiro','girl')]], 'Introduce three singular pronouns with the familiar He frame. Ia also allows he; example answers are not exclusive.')
add(1,'Say where you are from','Nō',[(f'Nō {place} {p}.',f'{en} {be(en)} from {place}.') for place in ['Rotorua','Taupō','Tauranga'] for p,en in pronouns]+[('Nō hea koe?','Where are you from?')], 'Three place names, with the same spellings in both languages. Reuse singular pronouns.')
add(1,'Say where you are','Kei',[(f'Kei te {w} {p}.',f'{en} {be(en)} at {e}.') for w,e in [('whare','the house'),('kura','the school'),('marae','the marae')] for p,en in pronouns]+[('Kei hea koe?','Where are you?')], 'Three everyday places; retain familiar people and pronouns. Contrast current place with origin in review.')
add(1,'Name familiar animals','He … tēnei',[(f'He {w} tēnei.',f'This is a {e}.') for w,e in [('kurī','dog'),('ngeru','cat'),('manu','bird')]]+[(f'Kei te {place} te {w}.',f'The {e} is at the {pe}.') for w,e in [('kurī','dog'),('ngeru','cat'),('manu','bird')] for place,pe in [('whare','house'),('kura','school')]], 'Add three animals and tēnei. Reuse He and Kei; no technical occupation vocabulary.')
add(1,'One, two, three and none','Kotahi · e rua · e toru · kāorekau',[(f'Kotahi te {w}.',f'There is one {e}.') for w,e in [('kurī','dog'),('ngeru','cat'),('manu','bird')]]+[(f'E {num} ngā {w}.',f'There are {ne} {e}.') for num,ne in [('rua','two'),('toru','three')] for w,e in [('kurī','dogs'),('ngeru','cats'),('manu','birds')]]+[(f'Kāorekau he {w}.',f'There are no {e}.') for w,e in [('kurī','dogs'),('ngeru','cats'),('manu','birds')]], 'Count familiar animals; introduce the singular/plural distinction and zero without adding new nouns.')
add(1,'Count things and people','E … · toko-',[(f'E {num} ngā {w}.',f'There are {ne} {e}.') for num,ne in [('whā','four'),('rima','five')] for w,e in [('kurī','dogs'),('ngeru','cats'),('manu','birds')]]+parse('''Tokorua ngā tāngata. | There are two people.
Tokotoru ngā tāngata. | There are three people.
Tokorua ngā tāne. | There are two men.
Tokotoru ngā tāne. | There are three men.'''), 'Extend the known animal counts to four/five. Introduce people counting with two/three and one new noun, tāngata.')
add(1,'People in my whānau','Ko … tōku …',parse('''Ko Mere tōku whaea. | My mother is Mere.
Ko Hana tōku whaea. | My mother is Hana.
Ko Hemi tōku pāpā. | My father is Hemi.
Ko Pita tōku pāpā. | My father is Pita.
Ko Hana tāku tamaiti. | My child is Hana.
Ko Pita tāku tamaiti. | My child is Pita.
Kotahi te tamaiti. | There is one child.
Tokorua ngā tamariki. | There are two children.
Tokotoru ngā tamariki. | There are three children.
Kei te kura te tamaiti. | The child is at the school.'''), 'Add mother, father and child within known naming/location/counting frames. Tōku/tāku are modelled family expressions; category selection is not tested.')
add(1,'Introduce yourself','Ko · he · nō · kei',parse('''Ko Mere ahau. | I am Mere.
Ko Hemi ahau. | I am Hemi.
Ko wai koe? | Who are you?
Nō Rotorua ahau. | I am from Rotorua.
Nō hea koe? | Where are you from?
Kei te kura ahau. | I am at the school.
Kei hea koe? | Where are you?
Ko Mere tōku whaea. | My mother is Mere.
Ko Hemi tōku pāpā. | My father is Hemi.
Tokorua ngā tamariki. | There are two children.'''), 'Put familiar language into a short introduction. New question word wai; no extra topic vocabulary.')
# Every action below is reused across time, negatives, commands and later questions.
actions=[dict(v='kai',tail='',base='eat',ing='eating',past='ate',part='eaten'),dict(v='moe',tail='',base='sleep',ing='sleeping',past='slept',part='slept'),dict(v='oma',tail='',base='run',ing='running',past='ran',part='run'),dict(v='haere',tail=' ki te kura',base='go to the school',ing='going to the school',past='went to the school',part='gone to the school')]
trans=[dict(v='kai',tail=' i te kai',obj='te kai',oe='the food',base='eat the food',ing='eating the food',past='ate the food',part='eaten the food',passive='kainga'),dict(v='pānui',tail=' i te pukapuka',obj='te pukapuka',oe='the book',base='read the book',ing='reading the book',past='read the book',part='read the book',passive='pānuitia'),dict(v='kite',tail=' i te kurī',obj='te kurī',oe='the dog',base='see the dog',ing='seeing the dog',past='saw the dog',part='seen the dog',passive='kitea')]
allactions=actions+trans

def active(a,p,en,mode):
    v,t=a['v'],a['tail']
    if mode=='now':return f'Kei te {v} {p}{t}.',f'{en} {be(en)} {a["ing"]}.'
    if mode=='past':return f'I {v} {p}{t}.',f'{en} {a["past"]}.'
    if mode=='done':return f'Kua {v} {p}{t}.',f'{en} {"has" if en=="She" else "have"} {a["part"]}.'
    if mode=='long':return f'E {v} ana {p}{t}.',f'{en} {be(en)} {a["ing"]}.'
    return f'{"Ka" if mode=="future" else "Me"} {v} {p}{t}.',f'{en} {"will" if mode=="future" else "should"} {a["base"]}.'
add(2,'Everyday actions','Kei te', [active(a,p,en,'now') for a in actions for p,en in pronouns], 'Four common actions with familiar people and school. First exposure to actions uses one time frame.')
add(2,'Read, eat and see','… i te …',[active(a,p,en,'now') for a in trans for p,en in pronouns], 'Introduce pānui, kite and pukapuka. Kai is also modelled as the noun food; familiar kurī supplies the other object.')
for title,pattern,mode in [('What happened','I','past'),('What has happened','Kua','done'),('Another way to say it is happening','E … ana','long'),('What will happen','Ka','future'),('What should happen','Me','should')]:
 add(2,title,pattern,[active(a,p,en,mode) for a in allactions for p,en in pronouns], 'Change time or viewpoint using the same seven action expressions. No new action vocabulary.')
add(2,'Above, below and inside','Kei runga · raro · roto',[(f'Kei {pos} te {w} i te whare.',f'The {e} is {pe} the house.') for pos,pe in [('runga','above'),('raro','below'),('roto','inside')] for w,e in [('kurī','dog'),('ngeru','cat'),('manu','bird')]], 'Three relative positions, all with known animals and house. No additional object words.')
dual=[('tāua','You and I'),('māua','We two (not you)'),('kōrua','You two'),('rāua','Those two')]
add(2,'Two people doing things','tāua · māua · kōrua · rāua',[(f'Kei te {a["v"]} {p}{a["tail"]}.',f'{en} are {a["ing"]}.') for p,en in dual for a in actions[:3]], 'Introduce dual pronouns in a familiar present frame; English makes inclusion and number explicit.')
add(2,'Actions across time','Review',[active(a,p,en,mode) for mode in ['past','done','long','future','should'] for a,p,en in [(actions[0],'ahau','I'),(actions[1],'koe','You'),(trans[1],'ia','She')]], 'Mixed retrieval of the level, rather than another go-to-a-place grid. No new vocabulary.')
add(3,'Say what someone is not','Ehara … i te …',[(f'Ehara a {n} i te {w}.',f'{n} is not a {e}.') for n,w,e in people]+[('Ehara tēnei i te kurī.','This is not a dog.'),('Ehara tēnei i te ngeru.','This is not a cat.')], 'Negate classification using familiar people and animals. No job-title vocabulary.')
def negative(a,p,en,mode):
 v,t=a['v'],a['tail']
 if mode=='past':return f'Kāore {p} i {v}{t}.',f'{en} did not {a["base"]}.'
 if mode=='now':return f'Kāore {p} i te {v}{t}.',f'{en} {be(en)} not {a["ing"]}.'
 if mode=='future':return f'Kāore {p} e {v}{t}.',f'{en} will not {a["base"]}.'
 return f'Kāore anō {p} kia {v}{t}.',f'{en} {"has" if en=="She" else "have"} not yet {a["part"]}.'
for title,pattern,mode in [('Did not','Kāore … i','past'),('Is not happening','Kāore … i te','now'),('Will not','Kāore … e','future'),('Not yet','Kāore anō … kia','yet')]:
 add(3,title,pattern,[negative(a,p,en,mode) for a in allactions for p,en in pronouns], 'One negative frame at a time, using already introduced actions, objects and singular pronouns.')
add(3,'Give a simple instruction','Commands',parse('''Haere ki te kura! | Go to the school!
Haere ki te whare! | Go to the house!
Haere ki te marae! | Go to the marae!
E oma! | Run!
E moe! | Sleep!
Kainga te kai! | Eat the food!
Pānuitia te pukapuka! | Read the book!'''), 'Reuse known actions and destinations. Introduce only the command forms kainga and pānuitia; revisit them later in passive sentences.')
add(3,'Say do not','Kaua e',[(f'Kaua e {a["v"]}{a["tail"]}!',f'Do not {a["base"]}!') for a in allactions]+[('Kaua e haere ki te marae!','Do not go to the marae!')], 'Negative instructions reuse the previous command meanings and familiar base verbs.')
add(3,'Ask someone to stop','Kāti te',[(f'Kāti te {a["v"]}{a["tail"]}!',f'Stop {a["ing"]}!') for a in [actions[0],actions[1],actions[2],trans[0],trans[1]]]+[('Kāti te oma ki te kura!','Stop running to the school!')], 'Contrast stopping an action with telling someone not to begin; keep vocabulary familiar.')
add(3,'Say how things should be','Kia',parse('''Kia tere! | Be quick!
Kia tūpato! | Be careful!
Kia kaha! | Be strong!
Kia pai te kai. | May the food be good.
Kia pai te pukapuka. | May the book be good.
Kia tere te oma. | May the running be fast.
Kia kaha te tama. | May the boy be strong.
Kia kaha te kōtiro. | May the girl be strong.'''), 'Introduce four useful qualities inside complete wishes and instructions. Tere and kaha return in comparisons.')
plural=[('tātou','We all (including you)'),('mātou','We (three or more, not you)'),('koutou','You all (three or more)'),('rātou','They (three or more)')]
add(3,'Speak to and about groups','Plural pronouns',[(f'Kāore {p} i {a["v"]}{a["tail"]}.',f'{en} did not {a["base"]}.') for p,en in plural for a in [actions[0],actions[2],trans[1]]], 'Add plural pronouns to the known negative-past frame. English states number and inclusion; dual forms remain in review.')
# Ownership teaches contextual relationships; it does not label every noun permanently A or O.
owners=[('ku','me'),('u','you'),('na','her')]
def possess(prefix,items,negative=False):
 return [(f'{"Ehara " if negative else ""}{(prefix+suffix).capitalize() if not negative else prefix+suffix} te {w}.',f'The {e} '+(f'{"does not belong" if negative else "belongs"} to {en}.' if prefix in ['nā','nō'] else f'is {"not " if negative else ""}for {en}.')) for suffix,en in owners for w,e in items]
aitems=[('pukapuka','book'),('kai','food')];oitems=[('whare','house'),('waka','canoe')]
add(4,'Say who owns it','Nāku · nāu · nāna',possess('nā',aitems)+[('Nā Mere te pukapuka.','The book belongs to Mere.'),('Nā Hemi te kai.','The food belongs to Hemi.')], 'Known books and food, treated as acquired possessions. Introduce N-possession and contracted singular owners.')
add(4,'Homes and transport','Nōku · nōu · nōna',possess('nō',oitems)+[('Nō Mere te whare.','The house belongs to Mere.'),('Nō Hemi te waka.','The canoe belongs to Hemi.')], 'Use the home/transport relationship for O-possession. Waka is the only new object word.')
add(4,'Choose between nā and nō','A/O in context',possess('nā',aitems)+possess('nō',oitems), 'Contrast the two established relationships. A/O labels are teaching context, not immutable dictionary categories.')
add(4,'Say who something is for','Māku · māu · māna',possess('mā',aitems)+[('Mā Mere te kai.','The food is for Mere.'),('Mā Hemi te pukapuka.','The book is for Hemi.')], 'Move from existing ownership to intended recipients using the same A-context items.')
add(4,'Homes and transport for someone','Mōku · mōu · mōna',possess('mō',oitems)+[('Mō Mere te whare.','The house is for Mere.'),('Mō Hemi te waka.','The canoe is for Hemi.')], 'Use the same O-context items and known owners; no fresh vocabulary load.')
add(4,'Say it does not belong','Ehara nā … · ehara nō …',possess('nā',aitems,True)+possess('nō',oitems,True), 'Apply familiar ehara to both ownership patterns and the same objects.')
add(4,'Say it is not for someone','Ehara mā … · ehara mō …',possess('mā',aitems,True)+possess('mō',oitems,True), 'Apply the same negative approach to intended recipients; review positive and negative examples together.')
def emphasis(future=False,negative=False):
 rows=[]
 for owner,en in [('ku','I'),('u','you'),('Mere','Mere')]:
  marker=('mā' if future else 'nā');m=marker+owner if owner in ['ku','u'] else marker+' '+owner
  for a in trans:
   mi=f'{m} {a["obj"]} {"e" if future else "i"} {a["v"]}.'
   if negative:mi='Ehara '+mi
   else:mi=mi[0].upper()+mi[1:]
   english=f'It {"will" if future else "was"}{" not" if negative else ""}{" be" if future else ""} {en} who {"will "+a["base"] if future else a["past"]}.'
   rows.append((mi,english))
 return rows
add(4,'Emphasise who did it','Nā … i',emphasis(), 'Introduce agent emphasis with familiar eating, reading and seeing. Keep ownership and actor emphasis distinct.')
add(4,'Emphasise who will do it','Mā … e',emphasis(True), 'Change past actor emphasis to future using exactly the same action and object vocabulary.')
add(4,'Say it was not that person','Ehara nā … · ehara mā …',emphasis(False,True)+emphasis(True,True), 'Negate the identity of the agent, not the occurrence of the action. Include both past and future emphasis.')
animals=[('kurī','dog'),('ngeru','cat'),('manu','bird')]
add(5,'Bigger and smaller','He … ake … i',[(f'He {adj} ake te {w} i te {w2}.',f'The {en} is {ae} than the {e2}.') for adj,ae in [('nui','bigger'),('iti','smaller')] for w,en in animals for w2,e2 in animals if w!=w2], 'Introduce two comparison words with familiar animals; avoid loading ten new adjectives onto the first comparison lesson.')
add(5,'Faster and stronger','He … ake … i',[(f'He {adj} ake a {n} i a {other}.',f'{n} is {ae} than {other}.') for adj,ae in [('tere','faster'),('kaha','stronger')] for n,other in [('Mere','Hemi'),('Hana','Pita'),('Hemi','Pita'),('Pita','Hana')]], 'Reuse tere and kaha from wishes; introduce no new adjectives. Names practise the personal i a form.')
add(5,'Things you do regularly','… ai · ia rā',[(f'{a["v"].capitalize()} ai {p}{a["tail"]} ia rā.',f'{en} {a["base"] if en!="She" else {"kai":"eats","moe":"sleeps","oma":"runs","haere":"goes to the school","pānui":"reads the book"}[a["v"]]} every day.') for a in [actions[0],actions[1],actions[2],actions[3],trans[1]] for p,en in pronouns], 'Introduce habitual ai and ia rā using five familiar actions, rather than only going somewhere.')
add(5,'Say what you can do','Ka taea e …',[(f'Ka taea e {p} {a["obj"]} te {a["v"]}.',f'{en} can {a["base"]}.') for p,en in [('au','I'),('koe','You'),('ia','She')] for a in trans], 'Ability with known actions and objects. Uses the object-before-verbal-comment pattern, with no active-object i.')
add(5,'Ability with movement','Ka taea e …',[(f'Ka taea e {p} te {a["v"]}{a["tail"]}.',f'{en} can {a["base"]}.') for p,en in [('au','I'),('koe','You'),('ia','She')] for a in [actions[1],actions[2],actions[3]]], 'Extend the same ability frame to familiar intransitive actions; introduce no vocabulary.')
add(5,'Say what you cannot do','Kāore e taea e …',[(f'Kāore e taea e {p} {a["obj"]} te {a["v"]}.',f'{en} cannot {a["base"]}.') for p,en in [('au','I'),('koe','You'),('ia','She')] for a in trans]+[('Kāore e taea e au te oma.','I cannot run.'),('Kāore e taea e koe te moe.','You cannot sleep.')], 'Negate ability while holding the positive ability sentence vocabulary constant.')
passpart={'kai':'eaten','pānui':'read','kite':'seen'}
passowners=[('Mere','Mere'),('Hemi','Hemi'),('au','me')]
add(5,'Put the object first','Passive · I',[(f'I {a["passive"]} {a["obj"]} e {p}.',f'{a["oe"].capitalize()} was {passpart[a["v"]]} by {en}.') for a in trans for p,en in passowners], 'Reuse command forms kainga and pānuitia; introduce kitea. Compare with active sentences already encountered.')
add(5,'Completed passive actions','Passive · Kua',[(f'Kua {a["passive"]} {a["obj"]} e {p}.',f'{a["oe"].capitalize()} has been {passpart[a["v"]]} by {en}.') for a in trans for p,en in passowners], 'Change only the aspect of known passive sentences; no new verbs or objects.')
add(5,'Future passive actions','Passive · Ka',[(f'Ka {a["passive"]} {a["obj"]} e {p}.',f'{a["oe"].capitalize()} will be {passpart[a["v"]]} by {en}.') for a in trans for p,en in passowners], 'Use the known future marker with known passive forms; compare who acts with what is affected.')
add(5,'Compare, describe habits and ability','Review',sum([x['focus'][:3] for x in lessons if x['level']==5 and x['lesson'] in [1,2,3,4,6]],[]), 'Cumulative retrieval across comparisons, habits and ability. No new words or grammar.')
# Questions reuse the same established actions; time adverbs introduced in complete sentences.
qactions=[actions[0],actions[1],actions[2],trans[1],trans[2]]
def why(mode):
 out=[]
 for p,en in [('koe','you'),('ia','she')]:
  for a in qactions:
   if mode=='past':mi=f'He aha {p} i {a["v"]} ai{a["tail"]}?';eng=f'Why did {en} {a["base"]}?'
   elif mode=='future':mi=f'He aha {p} e {a["v"]} ai{a["tail"]} āpōpō?';eng=f'Why will {en} {a["base"]} tomorrow?'
   else:mi=f'He aha {p} i kore ai e {a["v"]}{a["tail"]}?';eng=f'Why did {en} not {a["base"]}?'
   out.append((mi,eng))
 return out
add(6,'Ask why something happened','He aha … i … ai',why('past'), 'Add a why-question frame to established past actions; no new action vocabulary.')
add(6,'Ask about usual actions','He aha … e … ai',[(f'He aha {p} e {a["v"]} ai{a["tail"]} ia rā?',f'Why {"does" if en=="she" else "do"} {en} {a["base"]} every day?') for p,en in [('koe','you'),('ia','she')] for a in qactions], 'Use familiar ia rā to make the habitual reading explicit. Avoid ambiguous present/future English prompts.')
add(6,'Ask why something will happen','… āpōpō',why('future'), 'Introduce only āpōpō as a time expression; keep the previously practised question frame and actions.')
add(6,'Ask why something did not happen','He aha … i kore ai e …',why('negative'), 'Negative why questions reuse known negative meanings and familiar verbs; no extra vocabulary.')
add(6,'Ask when something happened','Nōnahea',[(f'Nōnahea {p} i {a["v"]} ai{a["tail"]}?',f'When did {en} {a["base"]}?') for p,en in [('koe','you'),('ia','she')] for a in qactions], 'Replace the question focus with past when while keeping the action vocabulary familiar.')
add(6,'Ask when something will happen','Āhea',[(f'Āhea {p} e {a["v"]} ai{a["tail"]}?',f'When will {en} {a["base"]}?') for p,en in [('koe','you'),('ia','she')] for a in qactions], 'Future when questions use the same known actions and pronouns.')
conditions=parse('''Ki te haere koe ki te kura, ka haere ahau ki te kura. | If you go to the school, I will go to the school.
Ki te oma koe, ka oma ahau. | If you run, I will run.
Ki te moe te tamaiti, ka pānui ahau i te pukapuka. | If the child sleeps, I will read the book.
Ki te pānui koe i te pukapuka, ka kai ahau. | If you read the book, I will eat.
Ki te kai te tamaiti, ka kai ahau. | If the child eats, I will eat.
Ki te kite ahau i te kurī, ka haere ahau ki te whare. | If I see the dog, I will go to the house.
Ki te haere a Mere ki te marae, ka haere a Hemi ki te marae. | If Mere goes to the marae, Hemi will go to the marae.
Ki te oma te kurī, ka oma te ngeru. | If the dog runs, the cat will run.
Ki te pānui a Hana i te pukapuka, ka moe a Pita. | If Hana reads the book, Pita will sleep.
Ki te haere koe ki te whare, ka kai koe. | If you go to the house, you will eat.''')
add(6,'If this happens','Ki te … ka …',conditions, 'Join two already familiar clauses; vary the consequence. No new content words.')
add(6,'Another way to say if','Mēnā',[(mi.replace('Ki te ','Mēnā ka ',1),en) for mi,en in conditions], 'Practise the same conditional meanings with mēnā; change the frame without changing vocabulary.')
add(6,'If and alternatives','Mehemea',[(mi.replace('Ki te ','Mehemea ka ',1),en) for mi,en in conditions], 'Introduce mehemea using the same scenarios, then contrast it with earlier conditional frames in review.')
add(6,'Questions and conditions together','Review',sum([x['focus'][:2] for x in lessons if x['level']==6 and x['lesson'] in [1,4,5,6,7]],[]), 'Cumulative why, negative why, when and if sentences. No new grammar or vocabulary.')
alignment=json.loads((ROOT/'docs/curriculum/translation-bank/outcome-alignment.json').read_text())
for entry in alignment['levelOne']:
    lesson=lessons[entry['lesson']-1]
    lesson.update(title=entry['title'],pattern=entry['pattern'],focus=[(p['mi'],p['en']) for p in entry['pairs']],note='Build a personal pepeha: '+entry['title']+'.')
tam_plan=json.loads((ROOT/'docs/curriculum/translation-bank/level-two-tams.json').read_text())
for entry in tam_plan['lessons']:
    lesson=lessons[10+entry['lesson']-1]
    lesson.update(title=entry['title'],pattern=entry['pattern'],focus=[(p['mi'],p['en']) for p in entry['pairs']] or [('Kei te kai ahau.','I am eating.')],note='TAM recognition first; use familiar actions. Objects with i start in Lesson 3; ki connections start in Lesson 4.')
reference_plan=json.loads((ROOT/'docs/curriculum/translation-bank/reference-progression.json').read_text())
reference_pairs={}
for group in reference_plan['groups']:
    key=(group['level'],group['lesson'])
    reference_pairs.setdefault(key,[]).extend((p['mi'],p['en']) for p in group['pairs'])
for row in alignment['storyPractice']:
    reference_pairs.setdefault((row['level'],row['lesson']),[]).append((row['mi'],row['en']))
for entry in alignment['levelOne']:
    reference_pairs.setdefault((1,entry['lesson']),[]).extend((p['mi'],p['en']) for p in entry['pairs'])
for entry in tam_plan['lessons']:
    # All target connections are guaranteed a place in the object lessons.
    if entry['lesson']>=3:
        reference_pairs.setdefault((2,entry['lesson']),[]).extend((p['mi'],p['en']) for p in entry['pairs'])
level_recognition={p['level']:p for p in json.loads((ROOT/'docs/curriculum/translation-bank/level-recognition.json').read_text())}
pacing=json.loads((ROOT/'docs/curriculum/translation-bank/course-pacing.json').read_text())
for entry in pacing['introductions']:
    key=(entry['level'],entry['lesson'])
    lesson=lessons[(entry['level']-1)*10+entry['lesson']-1]
    lesson['title']=entry['title']
    lesson['pattern']=entry['pattern']
    if entry['level']>=3:
        lesson['focus']=[(p['mi'],p['en']) for p in entry['pairs']]
    pairs=[(p['mi'],p['en']) for p in entry['pairs']]
    extensions=[(p['mi'],p['en']) for p in entry.get('extensionPairs',[])]
    reference_pairs.setdefault(key,[]).extend(pairs+extensions)
    # A planned second encounter, in addition to ordinary cumulative recall.
    revisit=(entry['level'],entry['lesson']+5)
    reference_pairs.setdefault(revisit,[]).extend(pairs)
    lesson['note']='Core language introduced early with simple examples; later lessons extend and revisit it.'
for level,plan in level_recognition.items():
    lessons[(level-1)*10].update(title=plan['title'],pattern=' · '.join(plan['options']),focus=[('Ko Mere ahau.','I am Mere.')],note='Recognise new patterns from English. All translations revise earlier levels.')
for lesson in lessons:
    if lesson['level']>=3 and lesson['lesson']>=5:
        lesson['title']='Practise: '+lesson['title'][0].lower()+lesson['title'][1:]
for key,pairs in reference_pairs.items():
    reference_pairs[key]=list(dict.fromkeys(pairs))
for lesson in lessons:
    additions=reference_pairs.get((lesson['level'],lesson['lesson']),[])
    lesson['focus']=list(dict.fromkeys(additions+lesson['focus']))
    if additions: lesson['note'] += ' Reference practice: ' + '; '.join(', '.join(g['forms']) for g in reference_plan['groups'] if (g['level'],g['lesson'])==(lesson['level'],lesson['lesson'])) + '.'
sequence_plan=json.loads((ROOT/'docs/curriculum/translation-bank/lesson-sequences.json').read_text())
for lesson,plan in zip(lessons,sequence_plan):
    if plan['mode']=='scaffolded':
        key=(lesson['level'],lesson['lesson'])
        anchors=[(p['mi'],p['en']) for p in plan['anchors']]
        reference_pairs[key]=list(dict.fromkeys(anchors+reference_pairs.get(key,[])))
        lesson['focus']=list(dict.fromkeys(anchors+lesson['focus']))
# Explicit thematic teaching sets feed both exercises and the cumulative viewer.
theme_plan=json.loads((ROOT/'docs/curriculum/translation-bank/vocabulary-themes.json').read_text())
for group in theme_plan['groups']:
    index=group['lesson']-1
    pairs=[(p['mi'],p['en']) for p in group['pairs']]
    key=(lessons[index]['level'],lessons[index]['lesson'])
    reference_pairs[key]=list(dict.fromkeys(reference_pairs.get(key,[])+pairs))
    lessons[index]['focus']=list(dict.fromkeys(lessons[index]['focus']+pairs))
assert len(lessons)==60

def sample(rows,n,offset=0):
    # Evenly cover the pool, keeping repetitions intentional for small beginner pools.
    return [rows[(offset+(i*len(rows)//n if len(rows)>=n else i))%len(rows)] for i in range(n)]
sheets=[];audit=[];known=set()
for index,l in enumerate(lessons):
    previous=lessons[:index]
    # Recall draws from the immediately preceding lesson and earlier stages, including earlier levels.
    sources=[]
    for distance in [1,2,4,8,10]:
        if index>=distance:sources.append(lessons[index-distance])
    review=[]
    for i in range(10):
        if sources:
            source=sources[i%len(sources)]
            review.append((source['focus'][(i//len(sources)+l['lesson'])%len(source['focus'])],f'L{source["level"]}-{source["lesson"]:02}'))
    focus=sample(l['focus'],15 if review else 25)
    # Five short rounds: three focus pairs, two review pairs; both directions with a delay.
    pairs=[]
    if review:
        for round in range(5):
            pairs.extend((pair,'focus',None) for pair in focus[round*3:round*3+3])
            pairs.extend((pair,'review',source) for pair,source in review[round*2:round*2+2])
    else:pairs=[(pair,'focus',None) for pair in focus]
    questions=[]
    # Each 10-question round has five full sentences each way. Reverse order differs to avoid immediate copying.
    for round in range(5):
        block=pairs[round*5:round*5+5]
        for direction,items in [('mi-en',block),('en-mi',block[2:]+block[:2])]:
            for (mi,en),kind,source in items:
                questions.append(dict(id=f'L{l["level"]}-{l["lesson"]:02}-{len(questions)+1:02}',mi=mi,en=en,direction=direction,kind=kind,reviewFrom=source))
    tokens=set(re.findall(r"[\wāēīōūĀĒĪŌŪ]+",' '.join(mi for mi,en in l['focus']).lower()))
    new=sorted(tokens-known);known|=tokens
    sheet=dict(id=f'L{l["level"]}-{l["lesson"]:02}',level=l['level'],lesson=l['lesson'],title=l['title'],pattern=l['pattern'],status='Revised draft · teacher review',progressionNote=l['note'],newForms=new,focusExamples=len(l['focus']),distinctPairs=len(set(q['mi'] for q in questions)),reviewSources=list(dict.fromkeys(source for _,source in review)),questions=questions)
    sheets.append(sheet)
    audit.append(dict(level=l['level'],lesson=l['lesson'],title=l['title'],status='Rebuilt',note=l['note'],newForms=new,distinctPairs=sheet['distinctPairs'],reviewQuestions=sum(q['kind']=='review' for q in questions)))
    assert len(questions)==50 and sum(q['direction']=='mi-en' for q in questions)==25
    assert all(q['mi'].rstrip('”\"')[-1] in '.?!' and q['en'].rstrip('”\"')[-1] in '.?!' for q in questions)
    assert all(len(q['mi'].split())>=2 or q['mi'].startswith(('E ', 'Kia ')) for q in questions)
    assert all(q['reviewFrom'] in {s['id'] for s in sheets[:-1]} for q in questions if q['kind']=='review')
output=ROOT/'docs/curriculum/translation-bank'
metadata=dict(version=2,status='Rebuilt progression · teacher-review draft',scope='60 lesson sheets. Each contains 50 complete-sentence translation attempts, 25 in each direction. Repetition is intentional; 3,000 attempts does not mean 3,000 distinct sentences.',constraints=dict(fullSentencesOnly=True,directions=['mi-en','en-mi'],progression='Small additions of new language inside familiar frames; known vocabulary for grammatical contrasts; cumulative recall.'),sources=['https://blog.duolingo.com/the-nuts-and-bolts-of-course-creation-at-duolingo/','https://blog.duolingo.com/duolingo-grammar-skills-improvements-2021/','https://kupu.maori.nz/sentences/negatives','https://kupu.maori.nz/sentences/questions','https://kupu.maori.nz/extra/the-word-taea','https://kupu.maori.nz/sentences/passive-sentences'],sheets=sheets)
# Recognition and translation are separate teaching capabilities. The introduction
# teaches recognition only; it must never be a source of translation recall.
intro=json.loads((output/'big-word-intro.json').read_text())
recognition=[dict(id=f'L1-01-{i+1:02}', en=q['en'], mi='', direction='structure-choice',acceptedAnswers=[q['answer']],choiceLabel='Choose the Big Word',context='',
    answer=q['answer'], options=intro['options'], kind='focus', reviewFrom=None)
    for i,q in enumerate(intro['questions'])]
recognition=[dict(q,stage='Recognise') for q in recognition]
sheets[0].update(lessonTargets=intro['options'],title=intro['title'],pattern=intro['instruction'],questions=recognition,
    progressionNote='Recognise all eight Big Words from English sentences. Full translation is introduced separately.',
    newForms=[],reviewSources=[],distinctPairs=50)
# Keep the original basic Ko pairs as translation input in lesson 2, alongside He.
# Review never translates recognition-only material from lesson 1.
recall_counts={}
for index,sheet in enumerate(sheets[1:],1):
    translations=[q for q in sheet['questions'] if q['reviewFrom']!='L1-01']
    focus=[q for q in translations if q['kind']=='focus']
    review=[q for q in translations if q['kind']=='review']
    selected=[]
    for d in ['en-mi','mi-en']:
        current=[q for q in focus if q['direction']==d]
        added=reference_pairs.get((sheet['level'],sheet['lesson']),[])
        current=[dict(mi=m,en=e,direction=d,kind='focus',reviewFrom=None) for m,e in added]+current
        previous=[]
        seen_pairs=set()
        for earlier in sheets[1:index]:
            for old in earlier['questions']:
                key=(old['mi'],old['en'],d)
                if old['direction']==d and key not in seen_pairs:
                    seen_pairs.add(key)
                    previous.append(dict(old,kind='review',reviewFrom=earlier['id']))
        reference_targets={(p['mi'],p['en']) for g in reference_plan['groups'] for p in g['pairs']}
        previous.sort(key=lambda q: (0 if (q['mi'],q['en']) in reference_targets and sum(recall_counts.get((q['mi'],q['en'],direction),0) for direction in ['en-mi','mi-en'])==0 else 1, recall_counts.get((q['mi'],q['en'],d),0)))
        limit=max(10,len(added)) if previous else 20
        assert limit<=20,(sheet['id'], 'Explicit examples exceed the 20 translation slots per direction; reschedule them before rebuilding.')
        mandatory=current[:len(added)]
        assert len(mandatory)<=limit,(sheet["id"],len(mandatory))
        selected.extend(mandatory+sample(current[len(added):] or current,limit-len(mandatory)))
        if previous:
            slots=20-limit
            ignored={'ko','te','ngā','he','i','ki','a','e','ka','kei','kua','me','ana','ahau','au','koe','ia','tōku','tōu','tōna','tāku','tāu','tāna'}
            topic=set(re.findall(r'[\wāēīōū]+',' '.join(p['mi'] for p in sequence_plan[index]['anchors']).lower()))-ignored
            relevance=lambda q:len(topic & (set(re.findall(r'[\wāēīōū]+',q['mi'].lower()))-ignored))
            relevant=sorted(previous,key=lambda q:(-relevance(q),recall_counts.get((q['mi'],q['en'],d),0)))
            unrevised=[q for q in previous if not any(r['kind']=='review' and r['mi']==q['mi'] and r['en']==q['en'] for r in selected) and (q['mi'],q['en']) in reference_targets and sum(recall_counts.get((q['mi'],q['en'],direction),0) for direction in ['en-mi','mi-en'])==0]
            recalled=unrevised[:slots] if sheet['level']<=4 else []
            recalled += [q for q in relevant if q not in recalled][:max(0,(slots+1)//2-len(recalled))]
            recalled += [q for q in previous if q not in recalled][:slots-len(recalled)]
            if len(recalled)<slots:recalled+=sample(previous,slots-len(recalled))
            recalled=[dict(q,reviewRelevance=relevance(q)) for q in recalled]

            selected.extend(recalled)
    plan=sequence_plan[index]
    choices=[]
    if plan['mode']=='scaffolded':
        pool=plan['recognition']
        targets=plan['targets']
        # Balance targets, then require discrimination against genuinely earlier examples.
        groups=[[q for q in pool if q['answer']==t] for t in targets]
        markers=[q for q in pool if q['choiceLabel']=='Choose i or ki']
        if markers: groups += [[q for q in markers if q['answer']==m] for m in ['i','ki']]
        chosen=[];seen=set()
        for round_number in range(10):
            for group in groups:
                fresh=next((q for q in group if (q['en'],q.get('context',''),q['answer']) not in seen),None)
                if fresh and len(chosen)<max(7,len(groups)):
                    chosen.append(fresh);seen.add((fresh['en'],fresh.get('context',''),fresh['answer']))
        # A second encounter is useful; avoid padding a block with one prompt.
        for q in list(chosen):
            if len(chosen)<max(7,len(groups)):chosen.append(q)
        contrasts=[]
        for earlier in reversed(sheets[:index]):
            for q in earlier['questions']:
                if q['direction']=='structure-choice' and q['answer'] not in targets and (q['en'],q.get('context',''),q['answer']) not in seen:
                    contrasts.append(dict(q,kind='review',reviewFrom=earlier['id']))
                    seen.add((q['en'],q.get('context',''),q['answer']))
        if sheet['level']==2 and sheet['lesson']>=4:
            movement=next(q for q in markers if q.get('context')=='Kei te haere koe ___ te kura.')
            if movement not in chosen:
                replace_at=next((i for i,q in reversed(list(enumerate(chosen))) if q['answer']=='ki'),None)
                if replace_at is not None:chosen[replace_at]=movement
        # Prefer short familiar prompts, and vary the contrasting answers.
        local_options={option for q in pool for option in q['options']}
        contrasts.sort(key=lambda q:(q['answer'] not in local_options,len(q['en'].split())))
        used_answers=set()
        for q in contrasts:
            if q['answer'] not in used_answers and len(chosen)<10:
                chosen.append(q);used_answers.add(q['answer'])
        for q in contrasts:
            if len(chosen)<10 and q not in chosen:chosen.append(q)
        while len(chosen)<10:chosen.append(pool[len(chosen)%len(pool)])
        choices=[dict(q,kind=q.get('kind','focus'),reviewFrom=q.get('reviewFrom'),direction='structure-choice') for q in chosen]

    for offset,question in enumerate(choices):
        options=question['options'];shift=(index+offset)%len(options)
        question['options']=options[shift:]+options[:shift]

    # Every lesson has the same learning sequence, not a whole-level choice pool.
    anchors={(p['mi'],p['en']) for p in plan['anchors']}
    simple=[q for q in selected if q['kind']=='focus' and (q['mi'],q['en']) in anchors]
    for q in selected:
        if q['kind']=='focus' and (q['mi'],q['en']) not in anchors:
            source=next((old for old in sheets[:index] if any(p['direction']==q['direction'] and p['mi']==q['mi'] and p['en']==q['en'] for p in old['questions'])),None)
            if source:q.update(kind='review',reviewFrom=source['id'])
    revision=[q for q in selected if q['kind']=='review']
    extended=[q for q in selected if q['kind']=='focus' and (q['mi'],q['en']) not in anchors]
    complexity=lambda q:(len(q['mi'].split()),len(q['mi']))
    simple.sort(key=complexity);extended.sort(key=complexity)
    mixed=[dict(q,stage='Recognise') for q in choices]+[dict(q,stage='Simple sentences') for q in simple]+[dict(q,stage='Revisit') for q in revision]+[dict(q,stage='Build on it') for q in extended]
    if sheet['level']>=2 and sheet['lesson']==1:
        # Recognition is new; translations revise only Level 1 language.
        prior=[dict(q,kind='review',reviewFrom=s['id']) for s in sheets[:index] for q in s['questions'] if q['direction']!='structure-choice']
        mixed=[]
        for r in range(5):
            pool=tam_plan['recognition'] if sheet['level']==2 else level_recognition[sheet['level']]['questions']
            round_choices=sample(pool,6,r*6) if sheet['level']==2 else [pool[(r*6+j)%len(pool)] for j in range(6)]
            mixed.extend(dict(q,kind='focus',reviewFrom=None,direction='structure-choice') for q in round_choices)
            for d in ['en-mi','mi-en']:mixed.extend(sample([q for q in prior if q['direction']==d],2,r*2))
    if plan['mode']=='introduction':
        mixed=[dict(q,stage='Recognise' if q['direction']=='structure-choice' else 'Revisit') for q in mixed]
    for q in mixed:
        if q['kind']=='review' and q['direction']!='structure-choice':
            key=(q['mi'],q['en'],q['direction'])
            recall_counts[key]=recall_counts.get(key,0)+1
    sheet['questions']=[dict(q,id=f'{sheet["id"]}-{i+1:02}',
        answer=q.get('answer',''),options=q.get('options',[]),acceptedAnswers=q.get('acceptedAnswers',[q.get('answer','')]),choiceLabel=q.get('choiceLabel','Choose the Big Word'),context=q.get('context','')) for i,q in enumerate(mixed)]
    sheet['lessonTargets']=plan['targets']
    sheet['reviewSources']=list(dict.fromkeys(q['reviewFrom'] for q in mixed if q['reviewFrom']))
    sheet['distinctPairs']=len(set((q['en'],q['mi']) for q in mixed))
# Explicit draft allocations are separate from generated exercise appearances.
# They record translation vocabulary and whole lesson frames, not engine rules.
allocations=[];known_words=set()
for index,sheet in enumerate(sheets):
    source=[] if sheet['lesson']==1 else lessons[index]['focus']
    words=set(re.findall(r"[\wāēīōūĀĒĪŌŪ]+",' '.join(mi for mi,en in source).lower()))
    actual_words=set(re.findall(r'[\wāēīōū]+',' '.join(q['mi'] for q in sheet['questions'] if q['direction']!='structure-choice').lower()))
    words &= actual_words
    introduced=sorted(words-known_words);known_words |= words
    sheet['newForms']=introduced
    allocations.append(dict(id=sheet['id'],status='draft',translationVocabulary=introduced,
        translationFrames=[] if sheet['lesson']==1 else [sheet['pattern']],
        recognitionStructures=list(dict.fromkeys([o for q in sequence_plan[index]['recognition'] for o in q['options']])) if sequence_plan[index]['mode']=='scaffolded' else intro['options'] if index==0 else tam_plan['tams'] if index==10 else level_recognition[sheet['level']]['options'] if sheet['level']>=3 and sheet['lesson']==1 else ['i'] if index==12 else ['ki'] if index==13 else []))
    sheet['progressionNote'] += ' Recognise this lesson’s patterns, practise simple sentences, revisit earlier work, then extend.' if sequence_plan[index]['mode']=='scaffolded' else ' Recognise new patterns using English sentences; translation revision uses earlier material.'
    audit[index].update(title=sheet['title'],status='Mixed draft',newForms=introduced,
        note=sheet['progressionNote'],distinctPairs=sheet['distinctPairs'],
        reviewQuestions=sum(q['kind']=='review' for q in sheet['questions']))
    for q in sheet['questions']:
        if q['direction']=='structure-choice':
            assert q['answer'] in q['options']
        else:
            assert set(re.findall(r"[\wāēīōūĀĒĪŌŪ]+",q['mi'].lower()))<=known_words,(sheet['id'],q)
            assert q['reviewFrom']!='L1-01'
metadata.update(version=3,scope='50 mixed sentence exercises per lesson. Level 1 Lesson 1 is recognition-only; Levels 2–6 Lesson 1 have 30 pattern choices and 10 earlier-level revision translations each way. Other lessons mix 10 recognition, 20 English-to-Māori and 20 Māori-to-English attempts.',
    status='Mixed exercise draft; teaching allocations require review')
# Allocation changes require an explicit editorial edit; rebuilding exercises cannot
# silently move a word or frame earlier to make validation pass.
allocation_path=output/'teaching-allocations.json'
saved_allocations=json.loads(allocation_path.read_text())
if '--update-draft-allocations' in sys.argv:
    allocation_path.write_text(json.dumps(allocations,ensure_ascii=False,indent=2)+'\n')
else:
    assert allocations==saved_allocations,'Teaching allocation changed: review the explicit plan before rebuilding.'
(output/'sheets.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')
(output/'audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n')
for row in audit:print(f'L{row["level"]}-{row["lesson"]:02}: {row["title"]} | new forms: {", ".join(row["newForms"])}')
print('60 sheets; 3,000 attempts; full sentences; both directions; no forward-reference review.')
