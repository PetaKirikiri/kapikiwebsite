import type { ReadingMaterialContent } from './levelReadingMaterial'

// A fictional worked example, separate from the canonical sentence roster.
// Possessive and sibling usage: https://kupu.maori.nz/possession/t-possession
// https://kupu.maori.nz/kupu/teina and https://kupu.maori.nz/kupu/tam%C4%81hine
export const LEVEL_ONE_READING_SECTIONS = [
  { title: 'Tūrangawaewae', meaning: 'Places I belong', lines: [
    ['Ko Ngongotahā te maunga.', 'Ngongotahā is the mountain.', undefined, { structures: [1] }],
    ['Ko Rotorua te roto.', 'Rotorua is the lake.', undefined, { structures: [1] }],
    ['Nō Rotorua ahau.', 'I am from Rotorua.', undefined, { structures: [3] }],
  ] },
  { title: 'Tūpuna', meaning: 'Ancestors', lines: [
    ['Nō Rotorua ngā tūpuna.', 'The ancestors are from Rotorua.', undefined, { structures: [3] }],
  ] },
  { title: 'Mātua', meaning: 'Parents', lines: [
    ['Ko Mere te whaea.', 'Mere is the mother.', undefined, { structures: [1] }],
    ['Ko Hemi te matua.', 'Hemi is the father.', undefined, { structures: [1] }],
  ] },
  { title: 'Tuākana, tēina', meaning: 'Siblings', lines: [
    ['Ko Hana te teina.', 'Hana is the younger sibling.', undefined, { structures: [1] }],
  ] },
  { title: 'Tamariki', meaning: 'Children', lines: [
    ['Ko Rangi te tama.', 'Rangi is the son.', undefined, { structures: [1] }],
    ['Ko Aroha te tamāhine.', 'Aroha is the daughter.', undefined, { structures: [1] }],
  ] },
  { title: 'Mahi', meaning: 'Work', lines: [
    ['He kaiako ahau.', 'I am a teacher.', undefined, { structures: [2] }],
  ] },
  { title: 'Kāinga', meaning: 'Home', lines: [
    ['Kei Pōneke te kāinga.', 'The home is in Wellington.', undefined, { structures: [4] }],
  ] },
] as const

export const LEVEL_ONE_READING: ReadingMaterialContent = { id: 'pepeha', title: 'Pepeha', sections: LEVEL_ONE_READING_SECTIONS }
