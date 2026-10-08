"""Author expanded course exercises locally. No database or publication operations."""
import copy, hashlib, json, re, subprocess, sys, time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
P=ROOT/'docs/curriculum/translation-bank'
def read(name): return json.loads((P/name).read_text())
def tokens(text): return re.findall(r'[^\W\d_]+',text.lower())
bank=read('sheets.json'); pacing=read('vocabulary-pacing.json'); sequences=read('lesson-sequences.json'); themes=read('vocabulary-themes.json'); allocations=read('teaching-allocations.json'); course=read('course-pacing.json'); catalogue=read('vocabulary-types.json')
if bank.get('expansion',{}).get('version')==1:
 print(json.dumps({'alreadyPrepared':True,'targets':len(bank['expansion']['targets'])}));sys.exit(0)
rows=json.loads(subprocess.check_output(['node','--import','tsx','--input-type=module','-e',"import b from './docs/curriculum/translation-bank/sheets.json' with{type:'json'};import{courseVocabularyTimeline}from'./src/lib/courseVocabularyTimeline.ts';console.log(JSON.stringify(courseVocabularyTimeline(b.sheets,[])))"],cwd=ROOT,text=True))
inventory={r['displayWord']:r for r in rows if r['firstLesson'] is None}
# Everyday breadth, selected by purpose. No specialist verb is generated for a noun.
noun_groups=[
('Family and relationships',[8,9,12,14],'whakapapa hoa pēpi manuhiri kaumātua rangatahi'),
('Home and household',[17,25,26,33,34,39],'kāpata whāriki kōhua karāhe kete rama pouakawhakaata pūhiko taura taputapu pereti maripi pakitara tuanui taiapa māra kākano putiputi harakeke ahi oneone'),
('Food and drink',[13,14,16,17,19],'mīere panana rīwai pata tote huka kānga kāreti hinu keke aihikirīmi parakuihi tina kaihapa mīti raihi huawhenua kaimoana hāngi pēkana'),
('Clothes and body care',[27,28,29,37,44],'pōtae tarau tōkena hāte panekoti koti putu upoko kanohi karu taringa waha ihu niho kakī tuarā puku makawe kiri matimati tinana'),
('Classroom and office',[18,19,26,32,36,46],'rorohiko reo kupu whārangi rārangi pikitia tuhinga peita kāpia reta karere papa kāri tari rōpū kaupapa mahere koha pūtea ipurangi'),
('Hobbies and events',[20,38,43,45,48],'pōro tīma kaitākaro hākinakina whutupōro kēmu hararei akoranga whakataetae puoro poi toi huritau'),
('Animals',[15,20,35],'hōiho kararehe poaka hipi kau tuna mōkai ngārara pūrerehua tohorā kekeno'),
('Places and transport',[15,35,36,38,39,55,56],'motu huarahi rori piriti tāone tiriti tātahi pāmu motokā taraka rererangi whenua ngahere wāhi rohe wharepukapuka hōhipera wharekai wharehākinakina wharetaonga wharekarakia poti'),
('Time and weather',[12,20,22,23,42],'ata pō wiki tau hāora meneti karaka hau marama hukapapa āniwaniwa'),
('Health and ordinary problems',[22,24],'tākuta rongoā raruraru hauora'),
('Community and everyday decisions',[37,49,52,54],'take tikanga hapori ture whāinga whakaritenga kōwhiringa wheako')]
# word | base | past | completed | ongoing | object | English object | earliest
verb_data='''kōrero|talk|talked|talked|talking|||12
ako|learn|learned|learned|learning|i te reo|the language|18
kī|say|said|said|saying|i te ingoa|the name|13
whakaatu|show|showed|shown|showing|i te pukapuka|the book|18
whakamahi|use|used|used|using|i te pukapuka|the book|18
whāngai|feed|fed|fed|feeding|i te tamaiti|the child|16
whakamau|put on|put on|put on|putting on|i te kākahu|the clothing|27
whakatakoto|put down|put down|put down|putting down|i te ipu|the container|37
tiki|fetch|fetched|fetched|fetching|i te pukapuka|the book|19
kohi|collect|collected|collected|collecting|i te kai|the food|16
whakakī|fill|filled|filled|filling|i te ipu|the container|37
tapahi|cut|cut|cut|cutting|i te parāoa|the bread|17
pana|push|pushed|pushed|pushing|i te kūaha|the door|25
kukume|pull|pulled|pulled|pulling|i te tūru|the chair|30
hiki|lift|lifted|lifted|lifting|i te pēke|the bag|25
maka|throw|threw|thrown|throwing|i te pōro|the ball|20
hopu|catch|caught|caught|catching|i te pōro|the ball|20
neke|move|moved|moved|moving|||24
mihi|greet|greeted|greeted|greeting|||19
tangi|cry|cried|cried|crying|||22
utu|pay for|paid for|paid for|paying for|i te kai|the food|38
tono|request|requested|requested|requesting|i te pukapuka|the book|26
whakaae|agree|agreed|agreed|agreeing|||39
tautoko|support|supported|supported|supporting|i te whānau|the family|36
whakamārama|explain|explained|explained|explaining|i te kupu|the word|46
kōwhiri|choose|chose|chosen|choosing|i te kākahu|the clothing|37
whakaaro|think|thought|thought|thinking|ki te whānau|about the family|39
whakapai|tidy|tidied|tidied|tidying|i te rūma|the room|25
whakanui|celebrate|celebrated|celebrated|celebrating|i te huritau|the anniversary|48
whakamaroke|dry|dried|dried|drying|i te kākahu|the clothing|28'''
quality_data={
'reka':(17,[('He reka te kai.','The food is delicious.'),('He reka te āporo.','The apple is delicious.'),('He reka te parāoa.','The bread is delicious.')]),
'koa':(22,[('Kei te koa ahau.','I am happy.'),('Kei te koa koe.','You are happy.'),('Kei te koa ia.','She is happy.')]),
'pōuri':(22,[('Kei te pōuri ahau.','I am sad.'),('Kei te pōuri koe.','You are sad.'),('Kei te pōuri ia.','She is sad.')]),
'riri':(24,[('Kei te riri ahau.','I am angry.'),('Kei te riri koe.','You are angry.'),('Kei te riri ia.','She is angry.')]),
'āwangawanga':(24,[('Kei te āwangawanga ahau.','I am worried.'),('Kei te āwangawanga koe.','You are worried.'),('Kei te āwangawanga ia.','She is worried.')]),
'atawhai':(26,[('He kaiako atawhai ia.','She is a kind teacher.'),('He tamaiti atawhai ia.','She is a kind child.'),('He kuia atawhai ia.','She is a kind grandmother.')]),
}
for word,english,week,nouns in [
('tika','correct',26,[('tēnei','this'),('te ingoa','the name'),('te kupu','the word')]),('hē','incorrect',26,[('tēnei','this'),('te ingoa','the name'),('te kupu','the word')]),
('mārō','hard',43,[('parāoa','bread'),('tūru','chair'),('kūaha','door')]),('ngohengohe','soft',43,[('parāoa','bread'),('kākahu','clothing'),('moenga','bed')]),
('putua','empty',33,[('kapu','cup'),('ipu','container'),('pouaka','box')]),('kikī','full',33,[('kapu','cup'),('ipu','container'),('pouaka','box')]),
('hou','new',32,[('pukapuka','book'),('pēke','bag'),('whare','house')]),('tawhito','old',32,[('pukapuka','book'),('pēke','bag'),('whare','house')]),
('mahana','warm',44,[('kai','food'),('wai','water'),('rūma','room')]),('paru','dirty',27,[('kākahu','clothing'),('hū','shoe'),('kūaha','door')]),
('kikorangi','blue',27,[('hāte','shirt'),('pōtae','hat'),('koti','coat')]),('waiporoporo','purple',27,[('hāte','shirt'),('pōtae','hat'),('koti','coat')])]:
 pairs=[]
 for noun,en in nouns:
  if word in ['tika','hē']: pairs.append((f'He {word} {noun}.',f'{en.capitalize()} is {english}.'))
  else:
   article='' if en in ['bread','clothing','food','water','shoes'] else ('an ' if english[0] in 'aeiou' else 'a ')
   pairs.append((f'He {noun} {word} tēnei.',f'This is {article}{english} {en}.'))
 quality_data[word]=(week,pairs)
for word,english in [('wawe','early'),('tōmuri','late')]: quality_data[word]=(42,[(f'I tae {word} ahau.',f'I arrived {english}.'),(f'I tae {word} koe.',f'You arrived {english}.'),(f'I tae {word} a Hana.',f'Hana arrived {english}.')])
for word,english in [('rerekē','different'),('ōrite','the same')]: quality_data[word]=(42,[(f'He {word} ngā whare.',f'The houses are {english}.'),(f'He {word} ngā kupu.',f'The words are {english}.'),(f'He {word} ngā kākahu.',f'The clothes are {english}.')])
assert sum(len(g[2].split()) for g in noun_groups)==157 and len(quality_data)==22
base_first={}; original_sources={}; protected=[{} for _ in range(60)]
for index,(sheet,sequence) in enumerate(zip(bank['sheets'],sequences)):
 for pair in sequence['anchors']: protected[index][(pair['mi'],pair['en'])]='Simple sentences'
 for q in sheet['questions']:
  if q['direction']=='structure-choice':continue
  key=(q['mi'],q['en']); original_sources.setdefault(key,index+1)
  fresh=set(tokens(q['mi']))-base_first.keys()
  if fresh:
   protected[index].setdefault(key,'Build on it')
   for word in fresh:base_first[word]=index+1
# Retain the original reference paradigms and their later practice, plus early thematic retrieval.
legacy=[{} for _ in range(60)]
for group in themes['groups']:
 if group['pairs']:
  for week in [group['lesson'],*group.get('reviewLessons',[])]:
   for pair in group['pairs']:legacy[week-1][(pair['mi'],pair['en'])]='Revisit' if week!=group['lesson'] else 'Build on it'
for group in read('reference-progression.json')['groups']:
 first=(group['level']-1)*10+group['lesson']
 for pair in group['pairs']:
  key=(pair['mi'],pair['en']);legacy[first-1][key]='Build on it'
  later=next((i for i,sheet in enumerate(bank['sheets']) if first<=i<40 and any(q['mi']==pair['mi'] and q['en']==pair['en'] and q['kind']=='review' for q in sheet['questions'])),None)
  if later is not None:legacy[later][key]='Revisit'
for intro in course['introductions']:
 first=(intro['level']-1)*10+intro['lesson']
 for week in [first,first+5]:
  for pair in intro['pairs']:legacy[week-1][(pair['mi'],pair['en'])]='Build on it' if week==first else 'Revisit'
for pair in read('outcome-alignment.json')['storyPractice']:
 week=(pair['level']-1)*10+pair['lesson']
 match=next(q for q in bank['sheets'][week-1]['questions'] if q['mi']==pair['mi'] and q['direction']=='en-mi')
 legacy[week-1][(match['mi'],match['en'])]='Build on it'
reading=json.loads(subprocess.check_output(['node','--import','tsx','--input-type=module','-e',"import{LEVEL_ONE_READING}from'./src/lib/levelOneReadingMaterial.ts';import{LEVEL_READING_MATERIAL}from'./src/lib/levelReadingMaterial.ts';console.log(JSON.stringify(Object.entries({1:LEVEL_ONE_READING,...LEVEL_READING_MATERIAL}).flatMap(([level,r])=>r.sections.flatMap(s=>s.lines.map(p=>({level:+level,mi:p[0],en:p[1]}))))))"],cwd=ROOT,text=True))
for pair in reading:
 week=next(i for i,sheet in enumerate(bank['sheets']) if sheet['level']<=pair['level'] and any(q['mi']==pair['mi'] and q['en']==pair['en'] for q in sheet['questions']))
 legacy[week][(pair['mi'],pair['en'])]='Build on it'
for week,pairs in enumerate(legacy):
 for key,stage in pairs.items():protected[week].setdefault(key,stage)
# A short two-sentence translation may practise an existing reference example alongside
# one new lexical sentence. Both clauses retain their original meaning and grammar.
# This preserves reference teaching within the fixed fifty attempts, without fake counts.
bundled=[set() for _ in range(60)]
# New lexical support is explicit, not an unseen template token.
support={'tēnei':('Pronoun','this',5),'mō':('Grammar word','about; for',32)}
base_first['tēnei']=5
base_first.setdefault('mō',32)
noncontent={i+1 for i,l in enumerate(pacing['lessons']) if l['consolidation']}|{1,2,3,4}
capacity=[(50-sum(q['direction']=='structure-choice' for q in s['questions']))//2 for s in bank['sheets']]
for i,pairs in enumerate(protected):
 while len(pairs)>capacity[i]:
  a,b=[k for k in legacy[i] if k in pairs and pairs[k]!='Simple sentences'][:2]
  pairs.pop(a);pairs.pop(b);bundled[i].update([a,b])
  pairs[(a[0]+' '+b[0],a[1]+' '+b[1])]='Build on it'
reserved=[dict(x) for x in protected];added=[[] for _ in range(60)];targets=[]
load=[sum(r['firstLesson']==i+1 for r in rows) for i in range(60)]
# Bound all timeline introductions, including existing support words, names and grammatical items.
def free(week,new=False):
 return (len(reserved[week-1])<capacity[week-1] or new and any(k not in bundled[week-1] and reserved[week-1].get(k)!='Simple sentences' for k in legacy[week-1])) and (not new or week not in noncontent and load[week-1]<15 and len(added[week-1])+len(pacing['lessons'][week-1]['newWords'])<10-(1 if week in {5,32} else 0))
def known(pair,week,own):return all(w==own or base_first.get(w,999)<=week for w in tokens(pair[0]))
def schedule(word,category,pairs,preferred):
 assert word in inventory,word
 info=inventory[word]
 starts=list(dict.fromkeys(preferred+[w for w in range(min(preferred),55) if w not in preferred]+list(range(8,min(preferred)))))
 for first in starts:
  if first>54 or not free(first,True) or not known(pairs[0],first,word):continue
  pairs=list(pairs)
  clause=next((k for k in legacy[first-1] if k in reserved[first-1] and k not in bundled[first-1] and reserved[first-1][k]!='Simple sentences' and known(k,first,word)),None)
  if len(reserved[first-1])>=capacity[first-1] and not clause:continue
  if clause and len(reserved[first-1])>=capacity[first-1]:
   reserved[first-1].pop(clause);bundled[first-1].add(clause)
   pairs[0]=(clause[0]+' '+pairs[0][0],clause[1]+' '+pairs[0][1])
  reserved[first-1][pairs[0]]='Build on it'
  item={'word':word,'english':info['english'],'type':info['type'],'category':category,'introductionLesson':first,'retrievalLessons':[],'pairs':[{'mi':mi,'en':en} for mi,en in pairs]}
  targets.append(item);added[first-1].append(item);load[first-1]+=1;base_first[word]=first
  return
 raise ValueError(f'No introduction capacity for {word}')
schedule('kōrero','Reusable actions',[('Kei te kōrero ahau.','I am talking.'),('I kōrero koe.','You talked.'),('Ka kōrero ia.','She will talk.')],[12])
# Nouns use one familiar naming frame, then a distinct identifying/location/perception context.
mass=set('whakapapa mīere pata tote huka kānga hinu aihikirīmi mīti raihi kaimoana pēkana harakeke ahi oneone taputapu pūtea hākinakina puoro toi reo peita kāpia hauora hukapapa parakuihi tina kaihapa whutupōro whenua makawe kiri'.split())
places=set(noun_groups[7][2].split())|{'māra'}
abstract=set('whakapapa reo kaupapa mahere pūtea hākinakina akoranga puoro toi hauora take tikanga hapori ture whāinga whakaritenga kōwhiringa wheako'.split())
overrides={'huawhenua':'vegetable','mīere':'honey','hauora':'health','tinana':'body','pēkana':'bacon','tūpuna':'ancestors','tarau':'pair of trousers','tōkena':'sock','putu':'boot','niho':'tooth','tikanga':'custom','pūtea':'money','tuhinga':'piece of writing','ipurangi':'internet connection'}
requests=[]
for category,weeks,words in noun_groups:
 ws=words.split()
 for index,word in enumerate(ws):
  en=overrides.get(word,inventory[word]['english'].split(';')[0]); en=en.replace('the ','',1) if en.startswith('the ') else en
  article='' if word in mass else ('an ' if en[0].lower() in 'aeiou' or en=='hour' else 'a ')
  first=(f'He {word} tēnei.',f'This is {article}{en}.')
  if word in 'hoa pēpi manuhiri kaumātua rangatahi'.split():first=(f'Ko Hana te {word}.',f'The {en} is Hana.')
  if word=='whakapapa':first=('Ko tōku whakapapa tēnei.','This is my ancestry.')
  if word=='hauora':first=('He pai tōku hauora.','My health is good.')
  if word=='reo':first=('He reo tēnei.','This is a language.')
  if word=='whenua':first=('He whenua tēnei.','This is land.')
  second=(f'Ko te {word} tēnei.',f'This is the {en}.')
  if word=='whakapapa':third=('Ko tōu whakapapa tēnei.','This is your ancestry.')
  elif category=='Family and relationships':third=(f'Kei te kāinga te {word}.',f'The {en} is at home.')
  elif word in places:third=(f'Kei te {word} ahau.',f'I am at the {en}.')
  elif word in abstract:third=(f'Kei te kōrero ahau mō te {word}.',f'I am talking about the {en}.')
  else:third=(f'I kite ahau i te {word}.',f'I saw the {en}.')
  preferred=weeks[index*len(weeks)//len(ws):]+weeks[:index*len(weeks)//len(ws)]
  if category=='Family and relationships':preferred=[5,6,7,9,12]
  if word in {'hukapapa','āniwaniwa'}:preferred=[47,48,49,52]
  if word in {'kōwhiringa','wheako'}:preferred=[49,48,47,46]
  if word in 'kāpata whāriki kete pereti maripi hāte pōtae tarau tōkena'.split():preferred=[9,8,12]+preferred
  if word in {'kāpata','whāriki'}:
   first,second=second,first
   preferred=[6,7,8,9]
  # Abstract retrieval needs an explicitly taught speaking verb; reserve its intro first below.
  requests.append((word,category,[first,second,third],preferred))
for line in verb_data.splitlines():
 word,base,past,part,ing,tail,object_en,start=line.split('|');start=int(start)
 if any(t['word']==word for t in targets):continue
 tail=' '+tail if tail else '';obj=' '+object_en if object_en else ''
 pairs=[(f'Kei te {word} ahau{tail}.',f'I am {ing}{obj}.'),(f'I {word} koe{tail}.',f'You {past}{obj}.'),(f'Ka {word} ia{tail}.',f'She will {base}{obj}.')]
 requests.append((word,'Reusable actions',pairs,[start]))
for word,(start,pairs) in quality_data.items():requests.append((word,'Qualities and feelings',pairs,[start]))
pending={r[0]:r for r in requests}
def place(word,chain=()):
 if word not in pending:return
 if word in chain:raise ValueError(f'Circular lexical prerequisite: {word}')
 request=pending[word]
 for pair in request[2]:
  for prerequisite in tokens(pair[0]):
   if prerequisite!=word and prerequisite not in base_first and prerequisite in pending:place(prerequisite,chain+(word,))
 schedule(*request);pending.pop(word)
for request in sorted(requests,key=lambda r:min(r[3][0],54)):
 place(request[0])
# Joint capacitated matching: reserve two distinct later weeks per target.
# A first revisit is at least two weeks later; a second is at least six weeks later.
# Matching replaces fail-late greedy reservations and retains both translation directions.
from collections import deque
edges=[]
def node():edges.append([]);return len(edges)-1
def edge(a,b,cap):
 forward=[b,len(edges[b]),cap];backward=[a,len(edges[a]),0];edges[a].append(forward);edges[b].append(backward);return forward
source=node();sink=node();week_nodes={w:node() for w in range(1,61)}
for w,n in week_nodes.items():edge(n,sink,capacity[w-1]-len(reserved[w-1])+sum(k in reserved[w-1] and k not in bundled[w-1] and reserved[w-1][k]!='Simple sentences' for k in legacy[w-1]))
word_week={};jobs=[]
for item in targets:
 first=item['introductionLesson']
 for index in [1,2]:
  pair=item['pairs'][index];key=(pair['mi'],pair['en']);job=node();edge(source,job,1);options=[]
  start=first+(2 if index==1 else 6);end=60
  for w in range(start,end+1):
   if not known(key,w,item['word']):continue
   address=(item['word'],w)
   if address not in word_week:
    group=node();word_week[address]=group;edge(group,week_nodes[w],1)
   options.append((w,edge(job,word_week[address],1)))
  jobs.append((item,index,key,options))
flow=0
while True:
 distance=[-1]*len(edges);distance[source]=0;queue=deque([source])
 while queue:
  a=queue.popleft()
  for b,rev,cap in edges[a]:
   if cap and distance[b]<0:distance[b]=distance[a]+1;queue.append(b)
 if distance[sink]<0:break
 cursor=[0]*len(edges)
 def send(a):
  if a==sink:return 1
  while cursor[a]<len(edges[a]):
   e=edges[a][cursor[a]];b,rev,cap=e
   if cap and distance[b]==distance[a]+1 and send(b):e[2]-=1;edges[b][rev][2]+=1;return 1
   cursor[a]+=1
  return 0
 while send(source):flow+=1
if flow!=len(jobs):
 print([(item['word'],item['introductionLesson'],index,[w for w,e in options]) for item,index,key,options in jobs if not any(e[2]==0 for w,e in options)])
 raise ValueError(f'Retrieval matching: {flow}/{len(jobs)} placements; {sum(capacity)-sum(map(len,reserved))} available pair slots.')
for item,index,key,options in jobs:
 week=next(w for w,e in options if e[2]==0)
 while len(item['retrievalLessons'])<index:item['retrievalLessons'].append(None)
 item['retrievalLessons'][index-1]=week
 if len(reserved[week-1])>=capacity[week-1]:
  clause=next(k for k in legacy[week-1] if k in reserved[week-1] and k not in bundled[week-1] and reserved[week-1][k]!='Simple sentences')
  reserved[week-1].pop(clause);bundled[week-1].add(clause)
  key=(clause[0]+' '+key[0],clause[1]+' '+key[1])
  item['pairs'][index]={'mi':key[0],'en':key[1]}
 reserved[week-1][key]='Revisit'
# First encounters and grammar anchors stay protected; redundant legacy pair copies are replaced by the lexical retrieval contract.
# Existing theme review dates remain authoritative for their retained clauses.
# Resolve a prerequisite against actual placements, never an assumed future allocation.
for item in targets:
 for week,pair in [(item['introductionLesson'],item['pairs'][0]),*zip(item['retrievalLessons'],item['pairs'][1:])]:
  if not known((pair['mi'],pair['en']),week,item['word']):raise ValueError(f'Unintroduced prerequisite: {item["word"]} at {week}')
lookup={(p['mi'],p['en']):(t,0 if i==0 else i) for t in targets for i,p in enumerate(t['pairs'])}
previous={};clause_sources={};prepared=copy.deepcopy(bank)
for index,sheet in enumerate(prepared['sheets']):
 week=index+1;old=bank['sheets'][index];choices=[copy.deepcopy(q) for q in old['questions'] if q['direction']=='structure-choice'];pairs=dict(reserved[index])
 # Fill with authored earlier material. Source references are rebuilt from retained exercises.
 candidates=[(q['mi'],q['en']) for q in old['questions'] if q['direction']!='structure-choice']+list(previous)
 for pair in candidates:
  if len(pairs)>=capacity[index]:break
  if all(base_first.get(w,999)<=week for w in tokens(pair[0])):pairs.setdefault(pair,'Revisit' if pair in previous else 'Build on it')
 if len(pairs)<capacity[index]:
  originals=list(pairs)
  ordinal=1
  while len(pairs)<capacity[index] and originals:
   for pair in originals:
    if len(pairs)>=capacity[index]:break
    # Introductory sheets already repeat familiar prompts; do not claim these as new vocabulary.
    pairs[(pair[0]+' '*ordinal,pair[1]+' '*ordinal)] = pairs[pair]
   ordinal+=1
 if len(pairs)!=capacity[index]:raise ValueError(f'Question capacity {week}: {len(pairs)}/{capacity[index]}')
 qs=[]
 for pair,stage in pairs.items():
  clean=(pair[0].strip(),pair[1].strip());target=lookup.get(clean); prior=previous.get(clean)
  for direction in ['en-mi','mi-en']:
   matching=next((q for q in old['questions'] if (q['mi'],q['en'])==clean and q['direction']==direction and q['id'] not in {x['id'] for x in qs}),None)
   q=copy.deepcopy(matching) if matching else {'id':f'{sheet["id"]}-v1-{hashlib.sha256((pair[0]+pair[1]+direction).encode()).hexdigest()[:12]}','mi':clean[0],'en':clean[1],'direction':direction,'answer':'','options':[],'choiceLabel':'Choose the Big Word','context':''}
   q['reviewClauses']=[{'mi':mi,'en':en,'from':source} for (mi,en),source in clause_sources.items() if mi in clean[0] and en in clean[1]]
   q.update(stage=stage,kind='review' if prior else 'focus',reviewFrom=prior,acceptedAnswers=[clean[0] if direction=='en-mi' else clean[1]],retrievalFrom=None,retrievalWords=[])
   if target and target[1]>0:q.update(kind='transfer',reviewFrom=None,retrievalFrom=prepared['sheets'][target[0]['introductionLesson']-1]['id'],retrievalWords=[target[0]['word']])
   qs.append(q)
 qs.sort(key=lambda q:['Recognise','Simple sentences','Revisit','Build on it'].index(q['stage']))
 sheet['questions']=choices+qs
 if len(sheet['questions'])!=50:raise ValueError(sheet['id'])
 for key in original_sources:
  if any(key[0] in q['mi'] and key[1] in q['en'] for q in qs):clause_sources.setdefault(key,sheet['id'])
 for pair in pairs:previous.setdefault((pair[0].strip(),pair[1].strip()),sheet['id'])
 sheet['focusExamples']=[{'mi':mi,'en':en} for (mi,en),stage in pairs.items() if stage!='Revisit']
 sheet['distinctPairs']=len(set((q['mi'],q['en']) for q in qs));sheet['reviewSources']=sorted({q['reviewFrom'] for q in qs if q['reviewFrom']})
 for q in sheet['questions']:q.setdefault('retrievalFrom',None);q.setdefault('retrievalWords',[]);q.setdefault('reviewClauses',[])
for group in themes['groups']:
 sheet=prepared['sheets'][group['lesson']-1]
 group['pairs']=[p for p in group['pairs'] if any(p['mi'] in q['mi'] and p['en'] in q['en'] and q['direction']=='en-mi' for q in sheet['questions'])]
selected={t['word'] for t in targets}
for item in targets:catalogue['words'][item['word']]={'type':item['type'],'english':item['english']}
for lesson,items in zip(pacing['lessons'],added):
 lesson['optionalWords']=[w for w in lesson['optionalWords'] if w['word'] not in selected]
 lesson['newWords'] += [{'word':t['word'],'english':t['english'],'type':t['type'],'status':'introduced'} for t in items]
 if items:lesson['theme'] += ' / '+', '.join(dict.fromkeys(t['category'] for t in items));lesson['goal']+=' Practise the added everyday vocabulary in familiar frames and retrieve it later.'
 lesson['coverageStatus']='Teacher validation required for expanded examples.'
seen=set()
for sheet,allocation in zip(prepared['sheets'],allocations):
 used=set(w for q in sheet['questions'] if q['direction']!='structure-choice' for w in tokens(q['mi']));fresh=sorted(used-seen);seen|=used
 sheet['newForms']=fresh;allocation['translationVocabulary']=fresh
for intro in course['introductions']:
 sheet=prepared['sheets'][(intro['level']-1)*10+intro['lesson']-1]
 anchors={(p['mi'],p['en']) for p in intro['pairs']}
 intro['extensionPairs']=[{'mi':q['mi'],'en':q['en']} for q in sheet['questions'] if q['direction']=='en-mi' and q['kind']=='focus' and (q['mi'],q['en']) not in anchors]
prepared['expansion']={'version':1,'targets':targets,'retainedGrammarTargets':[s['pattern'] for s in bank['sheets']],'retainedVocabularyIntroductions':{w:n for w,n in base_first.items() if w not in selected},'bundledPairs':sum(map(len,bundled)),'exerciseQuota':50,'retrievalDefinition':'Two later translations in both directions with distinct sentences; no mastery claim.'}
# Core word credit must match its actual first exercise, including support words.
actual_first={}
for week,s in enumerate(prepared['sheets'],1):
 for q in s['questions']:
  if q['direction']!='structure-choice':
   for word in tokens(q['mi']):actual_first.setdefault(word,week)
for t in targets:
 if actual_first.get(t['word'])!=t['introductionLesson']:raise ValueError(f'Earlier incidental encounter: {t["word"]} {actual_first.get(t["word"])} vs {t["introductionLesson"]}')
for word,(kind,en,week) in support.items():
 for l in pacing['lessons']:l['newWords']=[w for w in l['newWords'] if w['word']!=word]
 pacing['lessons'][actual_first[word]-1]['newWords'].append({'word':word,'english':en,'type':kind,'status':'introduced'})
result={'sheets.json':prepared,'vocabulary-pacing.json':pacing,'vocabulary-types.json':catalogue,'vocabulary-themes.json':themes,'teaching-allocations.json':allocations,'course-pacing.json':course}
summary={'lessons':60,'exercises':3000,'addedNouns':sum(t['type']=='Noun' for t in targets),'addedActions':30,'addedQualities':22,'maxNewCoreWords':max(len(l['newWords']) for l in pacing['lessons']),'maxReservedPairs':max(map(len,reserved))}
if '--apply' in sys.argv:
 snapshot=ROOT/'.local/curriculum-backups'/f'source-before-expansion-{int(time.time())}'
 snapshot.mkdir(parents=True,mode=0o700)
 for name,data in result.items():
  (snapshot/name).write_bytes((P/name).read_bytes());(P/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
 summary['snapshotPath']=str(snapshot);summary['prepared']=True
print(json.dumps(summary,ensure_ascii=False))
