import type { CurriculumLevel } from './sentenceStructureLevels'

export type ReadingLine = readonly [
  maori: string, english: string, speaker?: string,
  curriculum?: { structures: readonly number[]; kiwahaId?: string },
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
      ["Kei te kāinga ngā tāngata.", "The people are at home.", undefined, {"structures": [4]}],
      ["Tokotoru ngā tāngata.", "There are three people.", undefined, {"structures": [7]}],
      ["Ka kai tātou i te parāoa.", "We will eat the bread.", "Maia", {"structures": [24]}],
      ["I hoko ahau i te parāoa.", "I bought the bread.", "Hana", {"structures": [20]}],
      ["Tau kē!", "Great!", "Maia", {"structures": [], "kiwahaId": "kiwaha-draft-1"}],
      ["Kua kai ahau i te parāoa.", "I have eaten the bread.", "Hana", {"structures": [21]}],
      ["Kāorekau ngā kai.", "There is no food.", "Maia", {"structures": [63]}],
      ["Me hoko koe i ngā āporo.", "You should buy the apples.", "Maia", {"structures": [25]}],
      ["Ka hoko ahau i ngā āporo.", "I will buy the apples.", "Hana", {"structures": [24]}],
      ["Ka hoko ahau i te parāoa.", "I will buy the bread.", "Maia", {"structures": [24]}],
    ] }],
  },
  3: {
    id: "phone", title: "Te waea",
    sections: [{ title: "Te waea", meaning: "The missing phone", lines: [
      ["Kāore au i te kite i te waea.", "I cannot see the phone.", "Maia", {"structures": [29]}],
      ["Kei runga te pēke i te tēpu.", "The bag is on the table.", "Hana", {"structures": [5]}],
      ["Kāore anō au kia whakatuwhera i te pēke.", "I have not opened the bag yet.", "Maia", {"structures": [31]}],
      ["Me whakatuwhera koe i te pēke.", "You should open the bag.", "Hana", {"structures": [25]}],
      ["Kua whakatuwhera ahau i te pēke.", "I have opened the bag.", "Maia", {"structures": [21]}],
      ["Kāore au i te kite i te waea.", "I cannot see the phone.", "Maia", {"structures": [29]}],
      ["Kāti te whakatuwhera i ngā pēke.", "Stop opening the bags.", "Hana", {"structures": [60]}],
      ["Kei te pupuri koe i te waea.", "You are holding the phone.", "Hana", {"structures": [22]}],
      ["Hei aha!", "Never mind!", "Maia", {"structures": [], "kiwahaId": "kiwaha-draft-3"}],
    ] }],
  },
  4: {
    id: "books", title: "Ngā pukapuka",
    sections: [{ title: "Ngā pukapuka", meaning: "The swapped books", lines: [
      ["Kei te pānui rāua i ngā pukapuka.", "They are reading the books.", undefined, {"structures": [22]}],
      ["Nāku te pukapuka.", "The book is mine.", "Maia", {"structures": [11]}],
      ["Ehara nā Maia te pukapuka.", "The book does not belong to Maia.", "Hana", {"structures": [15]}],
      ["Nāku te ingoa i tuhi.", "I wrote the name.", "Maia", {"structures": [32]}],
      ["Me pānui koe i te ingoa.", "You should read the name.", "Hana", {"structures": [25]}],
      ["Ko Hana te ingoa.", "The name is Hana.", "Maia", {"structures": [1]}],
      ["Ko Maia te ingoa.", "The name is Maia.", "Hana", {"structures": [1]}],
      ["Māku te pukapuka e tuku.", "I will hand over the book.", "Maia", {"structures": [34]}],
      ["Māku te pukapuka e tuku.", "I will hand over the book.", "Hana", {"structures": [34]}],
      ["I tuku rāua i ngā pukapuka.", "They handed over the books.", undefined, {"structures": [20]}],
      ["Tau kē!", "Great!", "Maia", {"structures": [], "kiwahaId": "kiwaha-draft-1"}],
    ] }],
  },
  5: {
    id: "box", title: "Te pouaka",
    sections: [{ title: "Te pouaka", meaning: "The heavy box", lines: [
      ["Kawe ai au i ngā pouaka.", "I regularly carry boxes.", "Maia", {"structures": [27]}],
      ["Ka taea e au te pouaka te kawe.", "I can carry the box.", "Maia", {"structures": [40]}],
      ["He taumaha ake te pouaka i te pēke.", "The box is heavier than the bag.", undefined, {"structures": [19]}],
      ["Kāore e taea e au te pouaka te kawe.", "I cannot carry the box.", "Maia", {"structures": [42]}],
      ["Kāore e taea e au te pouaka te kawe.", "I cannot carry the box.", "Hana", {"structures": [42]}],
      ["Kei roto ngā pukapuka i te pouaka.", "The books are in the box.", undefined, {"structures": [5]}],
      ["Me tango tāua i ngā pukapuka.", "We should take out the books.", "Hana", {"structures": [25]}],
      ["I tangohia ngā pukapuka e Hana.", "The books were taken out by Hana.", undefined, {"structures": [55]}],
      ["I kawea ngā pukapuka e Maia.", "The books were carried by Maia.", undefined, {"structures": [55]}],
      ["Ka taea e au te pouaka te kawe.", "I can carry the box.", "Hana", {"structures": [40]}],
      ["He māmā ake te pouaka i te pēke.", "The box is lighter than the bag.", undefined, {"structures": [19]}],
      ["Tau kē!", "Great!", "Maia", {"structures": [], "kiwahaId": "kiwaha-draft-1"}],
    ] }],
  },
  6: {
    id: "jobs", title: "Ngā mahi",
    sections: [{ title: "Ngā mahi", meaning: "Who is doing the dishes?", lines: [
      ["Kei te whakarite rāua i te hui.", "They are organising the gathering.", undefined, {"structures": [22]}],
      ["Māku ngā kai e whakarite.", "I will prepare the food.", "Maia", {"structures": [34]}],
      ["Māku te whare e whakarite.", "I will get the house ready.", "Hana", {"structures": [34]}],
      ["Mā Hana ngā pereti e horoi.", "Hana will wash the plates.", "Maia", {"structures": [34]}],
      ["Ehara māku ngā pereti e horoi.", "I will not be the one to wash the plates.", "Hana", {"structures": [38]}],
      ["He aha koe i kore ai e horoi i ngā pereti?", "Why will you not wash the plates?", "Maia", {"structures": [49]}],
      ["Ka whakarite ahau i te whare.", "I will get the house ready.", "Hana", {"structures": [24]}],
      ["Mēnā ka whakarite koe i te whare, ka horoi ahau i ngā pereti.", "If you get the house ready, I will wash the plates.", "Hana", {"structures": [52, 24]}],
      ["Kāore au e whakarite i te whare.", "I will not get the house ready.", "Maia", {"structures": [30]}],
      ["He aha koe i kore ai e whakarite i te whare?", "Why will you not get the house ready?", "Hana", {"structures": [49]}],
      ["Ka whakarite ahau i ngā kai.", "I will prepare the food.", "Maia", {"structures": [24]}],
      ["Me horoi tāua i ngā pereti.", "We should wash the plates together.", "Hana", {"structures": [25]}],
      ["Tau kē!", "Great!", "Maia", {"structures": [], "kiwahaId": "kiwaha-draft-1"}],
    ] }],
  },
} as const satisfies Record<Exclude<CurriculumLevel, 1>, ReadingMaterialContent>
