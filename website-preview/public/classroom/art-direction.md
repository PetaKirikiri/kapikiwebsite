# Classroom artwork trial

Generated with the built-in image-generation tool. The approved classroom concept was used as the visual reference, not as a playable background with baked-in characters.

## Saved assets

- `website-preview/public/classroom/room-v1.png`: clean room background.
- `website-preview/public/classroom/student-walk-v2.png`: transparent, four-direction walking atlas.
- The same runtime assets are mirrored in `public/classroom/` for the main app.

## Prompt set

Room: cleaner empty pixel-art classroom, landscape 3:2, warm timber and sage walls, two windows overlooking New Zealand lake and trees, green chalkboard reading Ka Piki. One small teal-and-copper alchemy workbench against the rear wall. One compact bookshelf and one plant at the edges. Open walkable floor; no characters, rugs, stools, animals, foreground props or additional furniture. Match the approved reference's pixel-art style and elevated RPG perspective.

Character: transparent 4-by-4 sprite atlas of the reference's dark-haired student in a blue sweatshirt, charcoal trousers and neutral shoes. Four walking poses each facing down, right, up and left. Alternating arms and legs, consistent scale and foot registration, no background, labels or shadows.

Correction: remove the mistakenly painted checkerboard to genuine alpha transparency while preserving all sixteen characters and their positions.

## Runtime treatment

Frames are registered at the feet. Walking advances by distance travelled; it stops when the player arrives. Each player can independently select a male or female base design and one of six shirt palettes. Appearance preferences are saved on this device, not to learner accounts. Furniture stays behind the walkable floor boundary. This remains a local single-device trial, without multiplayer or workbench interactions.

## Male companion, 15 September 2026

Built-in image-generation edit using the existing transparent female walking atlas as the reference. Final asset: `website-preview/public/classroom/student-male-walk-v1.png`, mirrored at `public/classroom/student-male-walk-v1.png`.

Prompt: make all sixteen sprites the same friendly male companion with short textured dark-brown hair, no bun, slightly broader face and shoulders, blue sweatshirt, charcoal trousers, neutral shoes, and warm medium skin. Preserve the existing chibi pixel-art quality, canvas dimensions, four directions, walking poses and exact feet registration. Preserve transparent alpha. A second background-extraction edit removed a mistakenly rendered checkerboard without changing the sprites.
