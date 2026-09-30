import type { CurriculumLevel } from './sentenceStructureLevels'

export type ReadingLine = readonly [
  maori: string, english: string, speaker?: string,
  curriculum?: { structures: readonly number[]; kiwahaId?: string; language?: readonly string[] },
]
export type ReadingMaterialContent = {
  id: string
  title: string
  sections: readonly { title: string; meaning: string; lines: readonly ReadingLine[] }[]
}

// Fictional readings. References identify the taught frames, never engine rules.
// Each level deliberately reuses earlier language; it is not a grammar checklist.
export const LEVEL_READING_MATERIAL = {
  2: {
    id: "bread", title: "Te parāoa",
    sections: [{ title: "Te parāoa", meaning: "The bread", lines: [
      ["Kei te kāinga rāua.", "They are at home.", undefined, {"structures": [4]}],
      ["Ka kai tāua i te parāoa ināianei.", "We will eat the bread now.", "Maia", {"structures": [24], "language": ["now"]}],
      ["I hoko ahau i te parāoa inanahi.", "I bought the bread yesterday.", "Hana", {"structures": [20], "language": ["yesterday"]}],
      ["Tau kē!", "Great!", "Maia", {"structures": [], "kiwahaId": "kiwaha-draft-1"}],
      ["I kai ahau i te parāoa inanahi.", "I ate the bread yesterday.", "Hana", {"structures": [20], "language": ["yesterday"]}],
      ["Kāorekau ngā kai.", "There is no food.", "Maia", {"structures": [63]}],
      ["Ka hoko ahau i te parāoa āpōpō.", "I will buy the bread tomorrow.", "Hana", {"structures": [24], "language": ["tomorrow"]}],
      ["Me hoko koe i te parāoa ināianei.", "You should buy the bread now.", "Maia", {"structures": [25], "language": ["now"]}],
    ] }],
  },
  3: {
    id: "phone", title: "Te waea",
    sections: [{ title: "Te waea", meaning: "The missing phone", lines: [
      ["Kāore au i te kite i te waea.", "I cannot see the phone.", "Maia", {"structures": [29]}],
      ["Kei runga te pēke i te tēpu.", "The bag is on the table.", "Hana", {"structures": [5]}],
      ["Kāore anō au kia whakatuwhera i te pēke.", "I have not opened the bag yet.", "Maia", {"structures": [31]}],
      ["Me whakatuwhera koe i te pēke.", "You should open the bag.", "Hana", {"structures": [25]}],
      ["I muri mai, i whakatuwhera ia i te pēke.", "Afterwards, she opened the bag.", undefined, {"structures": [20], "language": ["afterwards"]}],
      ["Kāore au i te kite i te waea.", "I cannot see the phone.", "Maia", {"structures": [29]}],
      ["Kei te pupuri koe i te waea!", "You are holding the phone!", "Hana", {"structures": [22]}],
      ["Hei aha!", "Never mind!", "Maia", {"structures": [], "kiwahaId": "kiwaha-draft-3"}],
    ] }],
  },
  4: {
    id: "books", title: "Ngā pukapuka",
    sections: [{ title: "Ngā pukapuka", meaning: "The books", lines: [
      ["Kei te pānui rāua i ngā pukapuka.", "They are reading the books.", undefined, {"structures": [22]}],
      ["Nāku te pukapuka.", "The book is mine.", "Maia", {"structures": [11]}],
      ["Nāku te ingoa i tuhi.", "I wrote the name.", "Maia", {"structures": [32]}],
      ["Me pānui koe i te ingoa.", "You should read the name.", "Hana", {"structures": [25]}],
      ["I pānui ia i te ingoa.", "She read the name.", undefined, {"structures": [20]}],
      ["Ko Hana te ingoa.", "The name is Hana.", "Maia", {"structures": [1]}],
      ["Ko Maia te ingoa.", "The name is Maia.", "Hana", {"structures": [1]}],
      ["Māku te pukapuka e tuku.", "I will hand over the book.", "Maia", {"structures": [34]}],
      ["Nā Maia te pukapuka i tuku, ā, nā Hana te pukapuka i tuku.", "Maia handed over the book, and then Hana handed over the book.", undefined, {"structures": [32, 32], "language": ["and-then"]}],
      ["I muri mai, i pānui rāua i ngā pukapuka.", "Afterwards, they read the books.", undefined, {"structures": [20], "language": ["afterwards"]}],
    ] }],
  },
  5: {
    id: "box", title: "Te pouaka",
    sections: [{ title: "Te pouaka", meaning: "The heavy box", lines: [
      ["Kawe ai au i ngā pouaka.", "I regularly carry boxes.", "Maia", {"structures": [27]}],
      ["Ka taea e au te pouaka te kawe.", "I can carry the box.", "Maia", {"structures": [40]}],
      ["Kāore e taea e au te pouaka te kawe.", "I cannot carry the box.", "Maia", {"structures": [42]}],
      ["Kei roto ngā pukapuka i te pouaka.", "The books are in the box.", undefined, {"structures": [5]}],
      ["Me tango tāua i ngā pukapuka.", "We should take out the books.", "Hana", {"structures": [25]}],
      ["I tangohia ngā pukapuka e Hana.", "The books were taken out by Hana.", undefined, {"structures": [55]}],
      ["Ka taea e au te pouaka te kawe ināianei.", "I can carry the box now.", "Maia", {"structures": [40], "language": ["now"]}],
      ["Māku ngā pukapuka e kawe.", "I will carry the books.", "Hana", {"structures": [34]}],
      ["I muri mai, i kawea te pouaka e Maia, ā, i kawea ngā pukapuka e Hana.", "Afterwards, the box was carried by Maia, and then the books were carried by Hana.", undefined, {"structures": [55, 55], "language": ["afterwards", "and-then"]}],
    ] }],
  },
  6: {
    id: "bicycle", title: "Te pahikara",
    sections: [{ title: "Te pahikara", meaning: "The bicycle", lines: [
      ["I titiro ahau ki te pahikara.", "I looked at the bicycle.", undefined, {"structures": [20]}],
      ["Kāore e taea e au te pahikara te hoko.", "I could not buy the bicycle.", undefined, {"structures": [42]}],
      ["Kāorekau aku moni.", "I had no money.", undefined, {"structures": [63]}],
      ["I kite ahau i te pēke.", "I saw a bag.", undefined, {"structures": [20]}],
      ["Kei raro te pēke i te tūru.", "There was a bag under the seat.", undefined, {"structures": [5]}],
      ["I whakatuwhera ahau i te pēke.", "I opened the bag.", undefined, {"structures": [20]}],
      ["Kei roto ngā moni i te pēke.", "There was money inside the bag.", undefined, {"structures": [5]}],
      ["Mēnā ka pupuri au i ngā moni, ka taea e au te pahikara te hoko.", "If I kept the money, I could buy the bicycle.", undefined, {"structures": [52, 40]}],
      ["I tango ahau i ngā moni.", "I took out the money.", undefined, {"structures": [20]}],
      ["I hoki mai te kuia.", "An elderly woman came back.", undefined, {"structures": [20]}],
      ["Nōku te pēke!", "That bag is mine!", "Te kuia", {"structures": [12]}],
      ["He aha koe i tango ai i ngā moni?", "Why did you take the money?", "Te kuia", {"structures": [44]}],
      ["Kāore au i kōrero.", "I said nothing.", undefined, {"structures": [28]}],
      ["Mō aku rongoā ngā moni.", "The money is for my medicine.", "Te kuia", {"structures": [14]}],
      ["I titiro ahau ki te pahikara.", "I looked at the bicycle.", undefined, {"structures": [20]}],
      ["Nāku ngā moni i tuku, ā, nā te kuia ngā moni i tango.", "I handed over the money, and the woman took it.", undefined, {"structures": [32, 32], "language": ["and-then"]}],
      ["Māku tō pēke e kawe.", "I will carry your bag.", "Ahau", {"structures": [34]}],
      ["I muri mai, i kawe ahau i te pēke, ā, i hīkoi māua ki te kāinga.", "Afterwards, I carried the bag, and we walked home together.", undefined, {"structures": [20, 20], "language": ["afterwards", "and-then"]}],
      ["Ka hīkoi ahau āpōpō.", "I will walk tomorrow.", undefined, {"structures": [24], "language": ["tomorrow"]}],
    ] }],
  },
} as const satisfies Record<Exclude<CurriculumLevel, 1>, ReadingMaterialContent>
