import { bigWordQuestionGroups } from './bigWordQuestions'
export const breakoutChoices = bigWordQuestionGroups
export type BigWordChoice = typeof breakoutChoices[number]
// Authored English recognition prompts; not engine knowledge or personal pepeha facts.
const groups: { word: BigWordChoice; sentences: string[]; challenge: string }[] = [
 {word:'Ko',sentences:['My name is Peta.','Peta is my teacher.','My father is the teacher.','My mother is the manager.','She is my grandmother.','He is my younger brother.'],challenge:'Love is the name of the game.'},
 {word:'Nō',sentences:['I am from this area.','My father is from that village.','My mother is from this area.','The teacher is from that village.','She is from there.','He is from this area.'],challenge:'This message is from another planet.'},
 {word:'He',sentences:['I am a student.','My father is a teacher.','My mother is an adviser.','She is a manager.','He is a good person.'],challenge:'Love is a battlefield.'},
 {word:'Kei',sentences:['I am at home.','My father is at school.','My mother is at the office.','The children are at the marae.','The teacher is there.'],challenge:'Love is in the air.'},
 {word:'E',sentences:['There are two houses.','There are three canoes.','There are four mountains.','There are five rivers.','There are six families.'],challenge:'There are a thousand stars in the sky.'},
 {word:'Toko-',sentences:['There are two students.','There are three children.','There are four teachers.','There are five workers.','There are six people.'],challenge:'There are seven astronauts on the space station.'},
 {word:'Kotahi',sentences:['There is one house.','There is one canoe.','There is one family.','There is one child.','There is one teacher.'],challenge:'There is just one superhero in this city.'},
 {word:'Kāorekau',sentences:['There are no children.','There are no teachers.','There are no canoes.','There are no houses.','There are no workers.'],challenge:'There isn’t a single dragon in the castle.'},
]
// Interleave categories so the position does not give away the answer.
export const bigWordBreakout = Array.from({length:7},(_,index)=>groups.flatMap(group=>{
 const hard=index===group.sentences.length
 const english=hard?group.challenge:group.sentences[index]
 return english?[{id:`${group.word}-${index}`,english,word:group.word,hard}]:[]
})).flat()
export const breakoutRounds = Array.from({length:10},(_,index)=>bigWordBreakout.slice(index*5,index*5+5))
