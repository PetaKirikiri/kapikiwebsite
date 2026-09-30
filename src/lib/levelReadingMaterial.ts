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
    id: "jobs", title: "Ngā mahi",
    sections: [{ title: "Ngā mahi", meaning: "Who is doing the dishes?", lines: [
      ["Ka whakarite rāua i te hui āpōpō.", "They will organise the gathering tomorrow.", undefined, {"structures": [24], "language": ["tomorrow"]}],
      ["Māku ngā kai e whakarite.", "I will prepare the food.", "Maia", {"structures": [34]}],
      ["Māku te whare e whakarite.", "I will get the house ready.", "Hana", {"structures": [34]}],
      ["Me horoi koe i ngā pereti.", "You should wash the plates.", "Maia", {"structures": [25]}],
      ["Ka whakarite ahau i te whare, engari kāore au e horoi i ngā pereti.", "I will get the house ready, but I will not wash the plates.", "Hana", {"structures": [24, 30], "language": ["but"]}],
      ["He aha koe i kore ai e horoi i ngā pereti?", "Why will you not wash the plates?", "Maia", {"structures": [49]}],
      ["Mēnā ka whakarite koe i te whare, ka horoi ahau i ngā pereti.", "If you get the house ready, I will wash the plates.", "Hana", {"structures": [52, 24]}],
      ["Ka whakarite ahau i ngā kai.", "I will prepare the food.", "Maia", {"structures": [24]}],
      ["Me horoi tāua i ngā pereti.", "We should wash the plates together.", "Hana", {"structures": [25]}],
      ["Ka horoi tāua i ngā pereti, ā, ka inu tāua i te kawhe.", "We will wash the plates, and then we will drink the coffee.", "Maia", {"structures": [24, 24], "language": ["and-then"]}],
      ["Māku te kawhe e whakarite.", "I will make the coffee.", "Hana", {"structures": [34]}],
    ] }],
  },
} as const satisfies Record<Exclude<CurriculumLevel, 1>, ReadingMaterialContent>
