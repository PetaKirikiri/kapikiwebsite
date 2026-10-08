export type TimelineWord = { word: string; english: string; firstLesson: number | null }
export function vocabularyTimeline(sheets: {newForms: string[]}[], entries: {text:string; english:string}[]): TimelineWord[] {
  const words = new Map<string, TimelineWord>()
  const key=(s:string)=>s.normalize('NFC').toLowerCase()
  for (const entry of entries) if(!words.has(key(entry.text))) words.set(key(entry.text),{word:key(entry.text),english:entry.english,firstLesson:null})
  sheets.forEach((sheet,index)=>sheet.newForms.forEach(word=>{
    const existing=words.get(key(word))
    if (!existing) words.set(key(word),{word:key(word),english:'',firstLesson:index+1})
    else if(existing.firstLesson===null) existing.firstLesson=index+1
  }))
  return [...words.values()].sort((a,b)=>a.word.localeCompare(b.word,'mi'))
}
export function cumulativeCounts(words: TimelineWord[]) {
  return Array.from({length:60},(_,i)=>words.filter(w=>w.firstLesson!==null && w.firstLesson<=i+1).length)
}

// Count vocabulary spellings once across taught senses; names are not vocabulary gains.
export function lessonWordTotals(words: (TimelineWord & {type:string})[]) {
 const first=new Map<string,number>()
 for(const word of words){
  if(word.firstLesson===null||word.type==='Name')continue
  const key=word.word.split(' · ')[0].normalize('NFC').toLowerCase()
  first.set(key,Math.min(first.get(key)??61,word.firstLesson))
 }
 const total=Array.from({length:60},(_,i)=>[...first.values()].filter(n=>n<=i+1).length)
 return {total,added:total.map((n,i)=>n-(total[i-1]??0))}
}
