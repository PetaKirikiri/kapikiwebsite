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
    id: "weekend", title: "Te mutunga wiki",
    sections: [
      { title: "Te mutunga wiki", meaning: "The weekend", lines: [
        ["I tunu ahau i te parāoa.","I baked the bread."],
        ["I kai ahau i te parāoa.","I ate the bread."],
        ["I inu ahau i te wai.","I drank the water."],
        ["Kua horoi ahau i te pereti.","I have washed the plate."],
        ["Kei runga te pukapuka i te tēpu.","The book is on the table."],
        ["Kei te pānui ahau i te pukapuka.","I am reading the book."],
        ["E inu ana ahau i te kāwhe.","I am drinking the coffee."],
        ["Ka whakarite ahau i te kai.","I will prepare the food."],
        ["Me horoi ahau i ngā huawhenua.","I should wash the vegetables."],
        ["Kua horoi ahau i ngā huawhenua.","I have washed the vegetables."],
        ["Ka tunu ahau i ngā huawhenua.","I will cook the vegetables."],
        ["Ka kai ahau i ngā huawhenua.","I will eat the vegetables."],
        ["Me horoi ahau i ngā pereti.","I should wash the plates."],
      ] },
    ],
  },
  3: {
    id: "lunch", title: "Te whakarite kai",
    sections: [
      { title: "Te whakarite kai", meaning: "Getting lunch ready", lines: [
        ["Kei te whakarite ahau i te kai.","I am preparing the food.","Maia"],
        ["Kāore au i hoko i te parāoa.","I did not buy the bread.","Maia"],
        ["Kei te tunu au i te raihi.","I am cooking the rice.","Hana"],
        ["Kāore anō au kia horoi i ngā huawhenua.","I have not washed the vegetables yet.","Hana"],
        ["Horoia ngā huawhenua.","Wash the vegetables.","Maia"],
        ["Kaua e tango i tērā maripi.","Do not take that knife.","Maia"],
        ["Ehara tērā i te maripi pai.","That is not a good knife.","Maia"],
        ["Tangohia tēnei maripi.","Take this knife.","Maia"],
        ["Kia tūpato.","Be careful.","Maia"],
        ["Kāore au i te tapahi i ngā huawhenua.","I am not cutting the vegetables.","Hana"],
        ["E horoi ana au i ngā huawhenua.","I am washing the vegetables.","Hana"],
        ["Kāti te horoi i ngā huawhenua.","Stop washing the vegetables.","Maia"],
        ["Kua tunu au i te raihi.","I have cooked the rice.","Maia"],
        ["E noho ki te tēpu.","Sit at the table.","Maia"],
        ["Kāore au e kai i te raihi.","I will not eat the rice.","Hana"],
      ] },
    ],
  },
  4: {
    id: "meeting", title: "Te hui",
    sections: [
      { title: "Te hui", meaning: "The meeting", lines: [
        ["He hui tēnei.","This is a meeting."],
        ["Nō te kura tēnei whare.","This building belongs to the school."],
        ["Mō te rōpū te ruma nui.","The large room is for the group."],
        ["Nā Maia tēnei pukapuka.","This book belongs to Maia."],
        ["Ehara nā Hana tēnei pukapuka.","This book does not belong to Hana."],
        ["Mā ngā tamariki ngā pukapuka hou.","The new books are for the children."],
        ["Nā Hana te hui i whakarite.","Hana organised the meeting."],
        ["Ehara nā Maia te hui i whakarite.","It was not Maia who organised the meeting."],
        ["Nā Maia ngā kai i hoko.","Maia bought the food."],
        ["Mā Maia te kōrero e tīmata.","Maia will start the discussion."],
        ["Mā Hana ngā pukapuka e kawe.","Hana will bring the books."],
        ["Mā Hana ngā tamariki e āwhina.","Hana will help the children."],
        ["Ehara mā Hana ngā pereti e horoi.","Hana will not be the one to wash the plates."],
        ["Mā Maia tērā mahi.","That job is for Maia."],
      ] },
    ],
  },
  5: {
    id: "garden", title: "He māra hou",
    sections: [
      { title: "He māra hou", meaning: "A new garden", lines: [
        ["Whakatō ai ngā tamariki i ngā kākano.","The children regularly plant the seeds."],
        ["Tiaki ai au i te māra.","I regularly look after the garden."],
        ["He nui ake te māra hou i te māra tawhito.","The new garden is bigger than the old garden."],
        ["He taumaha ake tēnei pouaka i tēnā pouaka.","This box is heavier than that box."],
        ["Kāore e taea e au te pouaka te kawe.","I cannot carry the box."],
        ["Ka taea e Hana te pouaka te kawe.","Hana can carry the box."],
        ["He kaha ake ia i ahau.","She is stronger than me."],
        ["I kawea te pouaka e Hana.","The box was carried by Hana."],
        ["I whakatōngia ngā kākano e ngā tamariki.","The seeds were planted by the children."],
        ["I tuhia ngā ingoa e Maia.","The names were written by Maia."],
        ["Kua whakatō ngā tamariki i ngā kākano.","The children have planted the seeds."],
        ["Ka taea e ngā tamariki ngā huawhenua te tiaki.","The children can look after the vegetables."],
        ["He māmā ake tēnei mahi i tērā mahi.","This job is easier than that job."],
      ] },
    ],
  },
  6: {
    id: "community-garden", title: "Te māra o te hapori",
    sections: [
      { title: "Te māra o te hapori", meaning: "The community garden", lines: [
        ["Kei te whakarite mātou i te māra.","We are preparing the garden."],
        ["He aha koutou i tīmata ai i tēnei māra?","Why did you start this garden?","Hana"],
        ["Mā ngā tamariki tēnei māra.","This garden is for the children.","Maia"],
        ["He aha koutou i kore ai e whakarite i te māra?","Why will you not prepare the garden?","Hana"],
        ["Kāore mātou i whakarite i te mahere.","We did not prepare the plan.","Maia"],
        ["Nōnahea koutou i whakarite ai i te mahere?","When did you prepare the plan?","Hana"],
        ["I whakarite mātou i te mahere.","We prepared the plan.","Maia"],
        ["Ki te tiaki tātou i te māra, ka kai tātou i ngā huawhenua.","If we look after the garden, we will eat the vegetables.","Maia"],
        ["Āhea koutou e whakatuwhera ai i te māra?","When will you open the garden?","Hana"],
        ["Mēnā ka whakarite mātou i te māra, ka whakatō mātou i ngā kākano.","If we prepare the garden, we will plant the seeds.","Maia"],
        ["Mehemea ka whakatō mātou i ngā kākano, ka tiaki mātou i ngā huawhenua.","If we plant the seeds, we will look after the vegetables.","Hana"],
        ["Me tiaki tātou i te māra.","We should look after the garden.","Hana"],
        ["Me whakarite tātou i ngā mahi.","We should organise the jobs.","Maia"],
        ["Ka taea e tātou ngā huawhenua te tiaki.","We can look after the vegetables.","Maia"],
      ] },
    ],
  },
} as const satisfies Record<Exclude<CurriculumLevel, 1>, ReadingMaterialContent>
