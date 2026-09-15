export const CURRICULUM_LEVELS = [1, 2, 3, 4, 5, 6] as const

export type CurriculumLevel = (typeof CURRICULUM_LEVELS)[number]
