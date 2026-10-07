import type { ReadingMaterialContent } from './levelReadingMaterial'

// A fictional worked example, separate from the canonical sentence roster.
// Possessive and sibling usage: https://kupu.maori.nz/possession/t-possession
// https://kupu.maori.nz/kupu/teina and https://kupu.maori.nz/kupu/tam%C4%81hine
export const LEVEL_ONE_READING_SECTIONS = [
  { title: 'Ingoa', meaning: 'Name', lines: [
    ['Ko Hemi tōku ingoa.', 'My name is Hemi.', undefined, { structures: [1] }],
  ] },
  { title: 'Tūrangawaewae', meaning: 'Places I belong', lines: [
    ['Ko Ngongotahā tōku maunga.', 'Ngongotahā is my mountain.', undefined, { structures: [1] }],
    ['Ko Rotorua tōku roto.', 'Rotorua is my lake.', undefined, { structures: [1] }],
    ['Nō Rotorua ahau.', 'I am from Rotorua.', undefined, { structures: [3] }],
  ] },
  { title: 'Tūpuna', meaning: 'Ancestors', lines: [
    ['Nō Rotorua ngā tūpuna.', 'The ancestors are from Rotorua.', undefined, { structures: [3] }],
  ] },
  { title: 'Mātua', meaning: 'Parents', lines: [
    ['Ko Mere tōku whaea.', 'Mere is my mother.', undefined, { structures: [1] }],
    ['Ko Hemi tōku matua.', 'Hemi is my father.', undefined, { structures: [1] }],
  ] },
  { title: 'Tuākana, tēina', meaning: 'Siblings', lines: [
    ['Ko Hana tōku teina.', 'Hana is my younger sibling of the same gender.', undefined, { structures: [1] }],
  ] },
  { title: 'Tamariki', meaning: 'Children', lines: [
    ['Ko Rangi tāku tama.', 'Rangi is my son.', undefined, { structures: [1] }],
    ['Ko Aroha tāku tamāhine.', 'Aroha is my daughter.', undefined, { structures: [1] }],
  ] },
  { title: 'Mahi', meaning: 'Work', lines: [
    ['He kaiako ahau.', 'I am a teacher.', undefined, { structures: [2] }],
  ] },
  { title: 'Kāinga', meaning: 'Home', lines: [
    ['Kei Pōneke tōku kāinga.', 'My home is in Wellington.', undefined, { structures: [4] }],
  ] },
] as const

export const LEVEL_ONE_READING: ReadingMaterialContent = { id: 'pepeha', title: 'Pepeha', sections: LEVEL_ONE_READING_SECTIONS }
