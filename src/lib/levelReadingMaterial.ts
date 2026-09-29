import type { CurriculumLevel } from './sentenceStructureLevels'

// Authored reading examples, not canonical sentence records or tagging evidence.
// Vocabulary follows the proposed teaching groups; allocation remains editorial.
export type ReadingLine = readonly [maori: string, english: string, speaker?: string]
export type ReadingMaterialContent = {
  id: string
  title: string
  sections: readonly { title: string; meaning: string; lines: readonly ReadingLine[] }[]
}

export const LEVEL_READING_MATERIAL = {
  2: {
    id: 'weekend', title: 'Te mutunga wiki',
    sections: [{ title: 'Te mutunga wiki', meaning: 'The weekend', lines: [
      ['I haere ahau ki Rotorua i te mutunga wiki.', 'I went to Rotorua over the weekend.'],
      ['I noho ahau ki te kāinga o tōku whaea.', 'I stayed at my mother’s home.'],
      ['I hīkoi māua ki te roto i te ata.', 'The two of us walked to the lake in the morning.'],
      ['I titiro māua ki ngā manu i runga i te wai.', 'We watched the birds on the water.'],
      ['I kai māua i te parāoa me ngā hēki.', 'We ate bread and eggs.'],
      ['Kua hoki ahau ki Pōneke.', 'I have returned to Wellington.'],
      ['Kei te inu ahau i te kāwhe ināianei.', 'I am drinking coffee now.'],
      ['Kei runga taku pukapuka i te tēpu.', 'My book is on the table.'],
      ['E pānui ana ahau i taku pukapuka.', 'I am reading my book.'],
      ['Ka hoki ahau ki te mahi āpōpō.', 'I will go back to work tomorrow.'],
      ['Ka kōrero ahau ki ngā tamariki mō ngā manu.', 'I will talk to the children about the birds.'],
      ['Kua pō.', 'Night has fallen.'],
      ['Me moe ahau ināianei.', 'I should sleep now.'],
    ] }],
  },
  3: {
    id: 'lunch', title: 'Te whakarite kai',
    sections: [{ title: 'Te whakarite kai', meaning: 'Getting lunch ready', lines: [
      ['Kei te whakarite kai a Maia rāua ko Hana.', 'Maia and Hana are getting food ready.'],
      ['Kāore au i hoko parāoa inanahi.', 'I did not buy bread yesterday.', 'Maia'],
      ['Kei konei he raihi me ngā huawhenua.', 'There is rice and there are vegetables here.', 'Hana'],
      ['Kāore anō au kia horoi i ngā huawhenua.', 'I have not washed the vegetables yet.', 'Hana'],
      ['Horoia ngā huawhenua.', 'Wash the vegetables.', 'Maia'],
      ['Kaua e tango i tērā maripi.', 'Do not take that knife.', 'Maia'],
      ['Ehara tērā i te maripi pai.', 'That is not a good knife.', 'Maia'],
      ['Tangohia tēnei maripi.', 'Take this knife.', 'Maia'],
      ['Kia tūpato.', 'Be careful.', 'Maia'],
      ['Kāore au i te tapahi i ngā huawhenua ināianei.', 'I am not cutting the vegetables now.', 'Hana'],
      ['E tatari ana au ki te raihi.', 'I am waiting for the rice.', 'Hana'],
      ['Kāti te tatari.', 'Stop waiting.', 'Maia'],
      ['Kua rite te raihi.', 'The rice is ready.', 'Maia'],
      ['E noho ki te tēpu.', 'Sit at the table.', 'Maia'],
      ['Kāore au e kai i te raihi katoa!', 'I will not eat all the rice!', 'Hana'],
    ] }],
  },
  4: {
    id: 'meeting', title: 'He hui āpōpō',
    sections: [{ title: 'He hui āpōpō', meaning: 'A meeting tomorrow', lines: [
      ['He hui tā mātou rōpū āpōpō.', 'Our group has a meeting tomorrow.'],
      ['Nō te kura tēnei whare.', 'This building belongs to the school.'],
      ['Mō tō mātou rōpū te ruma nui.', 'The large room is for our group.'],
      ['Nā Maia tēnei pukapuka.', 'This book belongs to Maia.'],
      ['Ehara nāku.', 'It is not mine.'],
      ['Mā ngā tamariki ngā pukapuka hou.', 'The new books are for the children.'],
      ['Nā Hana te hui i whakarite.', 'Hana organised the meeting.'],
      ['Ehara nāku te hui i whakarite.', 'It was not me who organised the meeting.'],
      ['Nāku ngā kai i hoko.', 'I bought the food.'],
      ['Mā Maia te kōrero e tīmata.', 'Maia will start the discussion.'],
      ['Māku ngā pukapuka e kawe.', 'I will bring the books.'],
      ['Mā Hana ngā tamariki e āwhina.', 'Hana will help the children.'],
      ['Ehara māna ngā pereti e horoi.', 'She will not be the one to wash the plates.'],
      ['Māku tērā mahi.', 'That job is for me.'],
    ] }],
  },
  5: {
    id: 'garden', title: 'He māra hou',
    sections: [{ title: 'He māra hou', meaning: 'A new garden', lines: [
      ['Haere ai au ki te māra o te kura i ngā ata.', 'I usually go to the school garden in the mornings.'],
      ['Mahi ai mātou ko ngā tamariki i reira.', 'The children and I regularly work there.'],
      ['He nui ake te māra hou i te māra tawhito.', 'The new garden is bigger than the old garden.'],
      ['He taumaha rawa tēnei pouaka.', 'This box is too heavy.'],
      ['Kāore e taea e au te pouaka te kawe.', 'I cannot carry the box.'],
      ['Ka taea e Hana te pouaka te kawe.', 'Hana can carry the box.'],
      ['He kaha ake ia i ahau.', 'She is stronger than me.'],
      ['I kawea te pouaka e Hana ki te māra.', 'The box was carried to the garden by Hana.'],
      ['I whakatōngia ngā kākano e ngā tamariki.', 'The seeds were planted by the children.'],
      ['I tuhia ngā ingoa ki ngā pepa e Maia.', 'The names were written on the labels by Maia.'],
      ['Kua tupu ngā kākano.', 'The seeds have sprouted.'],
      ['Ka taea e ngā tamariki ngā huawhenua te tiaki.', 'The children can look after the vegetables.'],
      ['He māmā ake te mahi inā mahi tahi tātou.', 'The work is easier when we work together.'],
    ] }],
  },
  6: {
    id: 'community-garden', title: 'Te māra o te hapori',
    sections: [{ title: 'Te māra o te hapori', meaning: 'The community garden', lines: [
      ['Kei te kōrero a Maia rāua ko Hana mō te māra o te kura.', 'Maia and Hana are talking about the school garden.'],
      ['He aha koutou i tīmata ai i tēnei māra?', 'Why did you start this garden?', 'Hana'],
      ['Ki ōku whakaaro, he mea nui te ako a ngā tamariki ki te whakatō kai.', 'I think it is important for children to learn to grow food.', 'Maia'],
      ['He aha koutou i kore ai e tono i te hapori?', 'Why did you not invite the community?', 'Hana'],
      ['Kāore anō te mahere kia oti i taua wā.', 'The plan was not finished yet at that time.', 'Maia'],
      ['Nōnahea koutou i kōrero ai ki ngā whānau?', 'When did you talk to the families?', 'Hana'],
      ['I kōrero mātou ki a rātou i tērā wiki.', 'We talked to them last week.', 'Maia'],
      ['Ki te whakaae te kura, ka whakatuwhera mātou i te māra ki te hapori.', 'If the school agrees, we will open the garden to the community.', 'Maia'],
      ['Āhea koutou e whakatuwhera ai i te māra?', 'When will you open the garden?', 'Hana'],
      ['Mēnā ka oti ngā mahi, ka whakatuwhera mātou ā tērā marama.', 'If the work is finished, we will open it next month.', 'Maia'],
      ['Mehemea ka tae mai ngā whānau, ka nui ake te āwhina.', 'If the families come, there will be more help.', 'Hana'],
      ['Engari me kōrero tātou mō te tiaki i te māra.', 'But we should discuss looking after the garden.', 'Hana'],
      ['Āe, me whakarite tātou i ngā kawenga.', 'Yes, we should organise the responsibilities.', 'Maia'],
      ['Mā te mahi tahi e pai ai te māra mō te katoa.', 'By working together, the garden will be good for everyone.', 'Maia'],
    ] }],
  },
} as const satisfies Record<Exclude<CurriculumLevel, 1>, ReadingMaterialContent>
