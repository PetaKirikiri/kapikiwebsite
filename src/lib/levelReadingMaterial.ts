import type { CurriculumLevel } from './sentenceStructureLevels'

export type ReadingLine = readonly [
  maori: string, english: string, speaker?: string,
  curriculum?: { structures: readonly number[]; kiwahaId?: string; language?: readonly string[] },
]
export type ReadingMaterialContent = {
  id: string
  title: string
  sections: readonly {
    title: string
    meaning: string
    lines: readonly ReadingLine[]
    /** Sentence indexes that start a prose paragraph. */
    paragraphStarts?: readonly number[]
  }[]
}

// Fictional graded prose. Curriculum references describe taught frames, not engine rules.
// Sentences remain individually addressable for the existing course reading renderer.
export const LEVEL_READING_MATERIAL = {
  2: {
    id: "bread", title: "Te parāoa",
    sections: [{ title: "Te parāoa", meaning: "The bread", paragraphStarts: [0,3,7,10], lines: [
      ["Ko Hana te whaea.", "Hana is the mother.", undefined, {"structures":[1]}],
      ["Ko Maia te tamāhine.", "Maia is the daughter.", undefined, {"structures":[1]}],
      ["Nō Rotorua rāua.", "They are both from Rotorua.", undefined, {"structures":[3]}],
      ["I hoko rāua i te parāoa inanahi.", "They bought bread yesterday.", undefined, {"structures":[20],"language":["yesterday"]}],
      ["He parāoa iti tēnei.", "It is a small loaf of bread.", undefined, {"structures":[2]}],
      ["Ka hoki rāua ki te kāinga.", "Then they went home.", undefined, {"structures":[24]}],
      ["Ka kai a Maia i te parāoa i te ahiahi.", "Maia ate the bread that afternoon.", undefined, {"structures":[24]}],
      ["Kei te kāinga a Hana ināianei.", "Hana is at home now.", undefined, {"structures":[4],"language":["now"]}],
      ["Me kai ia i te parakuihi.", "She needs to have breakfast.", undefined, {"structures":[25]}],
      ["Kāorekau te parāoa.", "There is no bread.", undefined, {"structures":[63]}],
      ["Kei te kai ia i ngā hēki.", "She is eating eggs.", undefined, {"structures":[22]}],
      ["Kei te inu ia i te kawhe.", "She is drinking coffee.", undefined, {"structures":[22]}],
      ["Ka hoko rāua i te parāoa nui āpōpō.", "They will buy a big loaf of bread tomorrow.", undefined, {"structures":[24],"language":["tomorrow"]}],
    ] }],
  },
  3: {
    id: "phone", title: "Te waea",
    sections: [{ title: "Te waea", meaning: "The missing phone", paragraphStarts: [0,3,7,10], lines: [
      ["He kaiako a Maia.", "Maia is a teacher.", undefined, {"structures":[2]}],
      ["Tokotoru ngā ākonga.", "There are three students.", undefined, {"structures":[7]}],
      ["Kei te kura rātou.", "They are at school.", undefined, {"structures":[4]}],
      ["I mutu te mahi i te ahiahi.", "Work finished that afternoon.", undefined, {"structures":[20]}],
      ["Me hoki a Maia ki te kāinga.", "Maia needed to go home.", undefined, {"structures":[25]}],
      ["Kāore ia i kite i te waea.", "She could not find the phone.", undefined, {"structures":[28]}],
      ["Ka karanga ia ki ngā ākonga, “Me titiro koutou ki raro i ērā tūru.”", "She called to the students, “Look under those chairs.”", undefined, {"structures":[24,25]}],
      ["Ka titiro rātou ki raro i ngā tūru.", "They looked under the chairs.", undefined, {"structures":[24]}],
      ["Kāore rātou i kite i te waea.", "They did not find the phone.", undefined, {"structures":[28]}],
      ["Kāore anō a Maia kia whakatuwhera i te pēke.", "Maia had not opened the bag yet.", undefined, {"structures":[31]}],
      ["Ka whakatuwhera ia i te pēke.", "She opened the bag.", undefined, {"structures":[24]}],
      ["Ka tango ia i ngā pukapuka.", "She took out the books.", undefined, {"structures":[24]}],
      ["Ka kite ia i te waea i roto i te pēke.", "She found the phone inside the bag.", undefined, {"structures":[24]}],
      ["Ka kata ngā ākonga.", "The students laughed.", undefined, {"structures":[24]}],
      ["Ka hoki a Maia ki te kāinga.", "Maia went home.", undefined, {"structures":[24]}],
    ] }],
  },
  4: {
    id: "books", title: "Ngā pukapuka",
    sections: [{ title: "Ngā pukapuka", meaning: "The books", paragraphStarts: [0,3,7,11], lines: [
      ["Ko Hana tōku tuahine.", "Hana is my sister.", undefined, {"structures":[1]}],
      ["He ākonga ia.", "She is a student.", undefined, {"structures":[2]}],
      ["I haere ahau ki tōna whare inanahi.", "I went to her house yesterday.", undefined, {"structures":[20],"language":["yesterday"]}],
      ["Ka pānui māua i ētahi pukapuka.", "We read some books together.", undefined, {"structures":[24]}],
      ["Ka tango ahau i tētahi pukapuka nui.", "I picked up a big book.", undefined, {"structures":[24]}],
      ["Ka hoki ahau ki te kāinga.", "I went home.", undefined, {"structures":[24]}],
      ["Ka whakatuwhera ahau i te pukapuka.", "I opened the book.", undefined, {"structures":[24]}],
      ["Ko Hana te ingoa i roto.", "Hana was the name inside.", undefined, {"structures":[1]}],
      ["Nāna tōna ingoa i tuhi ki roto.", "She had written her name inside.", undefined, {"structures":[32]}],
      ["Nā tōku tuahine te pukapuka nui.", "The big book belongs to my sister.", undefined, {"structures":[11]}],
      ["Nāku te pukapuka iti.", "The small book is mine.", undefined, {"structures":[11]}],
      ["Ka kawe ahau i tāna pukapuka ki tōna whare.", "I took her book back to her house.", undefined, {"structures":[24]}],
      ["Kei runga tāku pukapuka i te tēpu.", "My book is on the table.", undefined, {"structures":[5]}],
      ["Ka tango ahau i tāku pukapuka.", "I picked up my book.", undefined, {"structures":[24]}],
      ["Ka pānui ahau i te ingoa, ā, ka hoki ahau ki te kāinga.", "I checked the name and then went home.", undefined, {"structures":[24,24],"language":["and-then"]}],
    ] }],
  },
  5: {
    id: "box", title: "Te pouaka",
    sections: [{ title: "Te pouaka", meaning: "The heavy box", paragraphStarts: [0,3,6,9], lines: [
      ["He kaiako tōku tungāne.", "My brother is a teacher.", undefined, {"structures":[2]}],
      ["Ko Hemi tōna ingoa.", "His name is Hemi.", undefined, {"structures":[1]}],
      ["I whakarite ahau i āku pukapuka mō āna ākonga inanahi.", "I got my books ready for his students yesterday.", undefined, {"structures":[20],"language":["yesterday"]}],
      ["Ka tuku ahau i ngā pukapuka ki roto i te pouaka.", "I put the books into the box.", undefined, {"structures":[24]}],
      ["Ka whakamātau ahau ki te kawe i te pouaka.", "I tried to carry the box.", undefined, {"structures":[24]}],
      ["Kāore e taea e au te pouaka nui te kawe.", "I could not carry the big box.", undefined, {"structures":[42]}],
      ["He taumaha te pouaka.", "The box was heavy.", undefined, {"structures":[2]}],
      ["Ka karanga ahau ki tōku tungāne.", "I called to my brother.", undefined, {"structures":[24]}],
      ["Ka haere mai ia ki te āwhina.", "He came to help.", undefined, {"structures":[24]}],
      ["Ka taea e māua te pouaka te kawe.", "Together, we could carry the box.", undefined, {"structures":[40]}],
      ["Ka kawea te pouaka ki te waka e māua.", "We carried the box to the car.", undefined, {"structures":[55]}],
      ["Ka haere māua ki te kura.", "We went to the school.", undefined, {"structures":[24]}],
      ["Kei te pānui āna ākonga i ēnei pukapuka ināianei.", "His students are reading these books now.", undefined, {"structures":[22],"language":["now"]}],
    ] }],
  },
  6: {
    id: "bicycle", title: "Te pahikara",
    sections: [{ title: "Te pahikara", meaning: "The bicycle", paragraphStarts: [0,3,6,10,14], lines: [
      ["Tokotoru mātou.", "There were three of us.", undefined, {"structures":[7]}],
      ["He kaimahi mātou.", "We are workmates.", undefined, {"structures":[2]}],
      ["I hīkoi mātou ki te mahi inanahi.", "We walked to work yesterday.", undefined, {"structures":[20],"language":["yesterday"]}],
      ["Ka kite ahau i tētahi pahikara i waho i te whare.", "I noticed a bicycle outside a building.", undefined, {"structures":[24]}],
      ["I hiahia ahau ki te pahikara, engari kāore e taea e au te pahikara te hoko.", "I wanted the bicycle, but I could not buy it.", undefined, {"structures":[20,42],"language":["but"]}],
      ["Kāorekau āku moni.", "I had no money.", undefined, {"structures":[63]}],
      ["Ka noho mātou ki tētahi tūru roa.", "We sat on a bench.", undefined, {"structures":[24]}],
      ["Ka kite ahau i tētahi pēke i raro i te tūru.", "I noticed a bag under the bench.", undefined, {"structures":[24]}],
      ["Ka whakatuwhera ahau i te pēke.", "I opened the bag.", undefined, {"structures":[24]}],
      ["Ka kite mātou i ngā moni i roto.", "We saw the money inside.", undefined, {"structures":[24]}],
      ["Mēnā ka pupuri au i ngā moni, ka taea e au te pahikara te hoko.", "If I kept the money, I could buy the bicycle.", undefined, {"structures":[52,40]}],
      ["Ka titiro ahau ki te pahikara.", "I looked at the bicycle.", undefined, {"structures":[24]}],
      ["Ka titiro ahau ki ngā moni.", "I looked at the money.", undefined, {"structures":[24]}],
      ["Ehara ēnei i ā mātou moni.", "This was not our money.", undefined, {"structures":[10]}],
      ["Ka hoki mai te kuia, ā, ka titiro ia ki raro i te tūru.", "An elderly woman returned and looked under the bench.", undefined, {"structures":[24,24],"language":["and-then"]}],
      ["Ka pātai ahau ki te kuia.", "I asked the woman.", undefined, {"structures":[24]}],
      ["Nōna te pēke.", "The bag was hers.", undefined, {"structures":[12]}],
      ["Ka hoatu ahau i tōna pēke ki te kuia.", "I gave her bag back to her.", undefined, {"structures":[24]}],
      ["Ka haere tonu mātou ki te mahi.", "We continued on to work.", undefined, {"structures":[24]}],
      ["Ka hīkoi anō mātou āpōpō.", "We will walk again tomorrow.", undefined, {"structures":[24],"language":["tomorrow"]}],
    ] }],
  },
} as const satisfies Record<Exclude<CurriculumLevel, 1>, ReadingMaterialContent>
