/** Data-only source controls shared by validation and Design Lab equations. */
export const ARROW_HEAD_DEFAULT_ARM_ANGLE_DEGREES = 57.17112763401744

export const ARROW_HEAD_CONTROLS = Object.freeze({
  armLength: Object.freeze({ defaultValue: 1.3, min: 0.75, max: 1.35, step: 0.05 }),
  armAngleDegrees: Object.freeze({
    defaultValue: ARROW_HEAD_DEFAULT_ARM_ANGLE_DEGREES,
    min: 25,
    max: 75,
    step: 1,
  }),
})

export const EQUATION_OWNED_KORU_CONTROLS = Object.freeze({
  blueThickness: Object.freeze({ defaultValue: 2.4, min: 0.8, max: 12, step: 0.2 }),
  radiusStabilisation: Object.freeze({ defaultValue: 0, min: 0, max: 0.5, step: 0.05 }),
  turns: Object.freeze({ defaultValue: 1.5, min: 0.25, max: 4, step: 0.05 }),
  rotationDegrees: Object.freeze({ defaultValue: 0, min: -180, max: 180, step: 5 }),
  direction: Object.freeze({
    defaultValue: 'clockwise' as const,
    options: Object.freeze([
      Object.freeze({ value: 'clockwise' as const, label: 'Clockwise' }),
      Object.freeze({ value: 'counterclockwise' as const, label: 'Anticlockwise' }),
    ]),
  }),
})

export const SHARED_COMPOSITION_CONTROLS = Object.freeze({
  armLength: ARROW_HEAD_CONTROLS.armLength,
  armAngleDegrees: ARROW_HEAD_CONTROLS.armAngleDegrees,
  blueThickness: Object.freeze({ defaultValue: 10, min: 7, max: 16, step: 0.5 }),
  turns: Object.freeze({ defaultValue: 1.25, min: 0.4, max: 1.4, step: 0.05 }),
  rotationDegrees: Object.freeze({ defaultValue: -10, min: -90, max: 90, step: 5 }),
  wholeShapeRotationDegrees: Object.freeze({ defaultValue: 0, min: -180, max: 180, step: 5 }),
  direction: Object.freeze({
    defaultValue: 'clockwise' as const,
    options: Object.freeze([
      Object.freeze({ value: 'clockwise' as const, label: 'Clockwise' }),
      Object.freeze({ value: 'counterclockwise' as const, label: 'Anticlockwise' }),
    ]),
  }),
})

export const ARROW_COMPOSITION_CONTROLS = SHARED_COMPOSITION_CONTROLS

export const ARROW_FOUR_FROND_CONTROLS = Object.freeze({
  leftSmallFrondRotationDegrees: Object.freeze({ min: -180, max: 180, step: 1 }),
  leftSmallFrondMoveX: Object.freeze({ min: -12, max: 12, step: 0.1 }),
  leftSmallFrondMoveY: Object.freeze({ min: -12, max: 12, step: 0.1 }),
  rightSmallFrondRotationDegrees: Object.freeze({ min: -180, max: 180, step: 1 }),
  rightSmallFrondMoveX: Object.freeze({ min: -12, max: 12, step: 0.1 }),
  rightSmallFrondMoveY: Object.freeze({ min: -12, max: 12, step: 0.1 }),
})

export const MANGOPARE_CONTROLS = Object.freeze({
  umbrellaReach: Object.freeze({ defaultValue: 1.35, min: 0.25, max: 4, step: 0.05 }),
  umbrellaCurve: Object.freeze({ defaultValue: 46, min: 5, max: 110, step: 1 }),
  blueThickness: SHARED_COMPOSITION_CONTROLS.blueThickness,
  turns: Object.freeze({
    ...SHARED_COMPOSITION_CONTROLS.turns,
    step: 0.01,
  }),
  radiusStabilisation: Object.freeze({ defaultValue: 0, min: 0, max: 0.5, step: 0.05 }),
  rotationDegrees: SHARED_COMPOSITION_CONTROLS.rotationDegrees,
  direction: SHARED_COMPOSITION_CONTROLS.direction,
})

export const KORU_WAVE_DESIGN_CONTROLS = Object.freeze({
  blueThickness: EQUATION_OWNED_KORU_CONTROLS.blueThickness,
  radiusStabilisation: EQUATION_OWNED_KORU_CONTROLS.radiusStabilisation,
  turns: EQUATION_OWNED_KORU_CONTROLS.turns,
  rotationDegrees: EQUATION_OWNED_KORU_CONTROLS.rotationDegrees,
  size: Object.freeze({ min: 0.6, max: 1.3, step: 0.05, defaultValue: 1 }),
  verticalPosition: Object.freeze({ min: -20, max: 20, step: 1, defaultValue: 0 }),
})

export const TRIANGLE_DESIGN_CONTROLS = Object.freeze({
  size: Object.freeze({ min: 0.5, max: 1, step: 0.05, defaultValue: 1 }),
})
