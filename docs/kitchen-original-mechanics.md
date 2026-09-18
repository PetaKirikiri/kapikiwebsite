# Original Overcooked mechanics audit

Researched 18 September 2026. Target: **Overcooked! (2016)**, not Overcooked! 2 or All You Can Eat.

## Evidence

- [Original-game walkthrough: general hints](https://www.trueachievements.com/game/Overcooked/walkthrough/2): returned dirty plates can be carried in a stack; clean plates cannot be carried in the same manner. Burnt contents must be discarded. The guide does not support allowing arbitrary clean plates to be returned to a supply stack.
- [GameSpot's 2016 review](https://www.gamespot.com/reviews/overcooked-review/1900-6416577/): food left on the stove burns, a warning flashes/beeps, and the kitchen can catch fire; a fire extinguisher is used. This is firsthand gameplay coverage, not measured timing data.
- [Series cookware disposal reference](https://overcooked.fandom.com/wiki/Trash_Bin): the bin empties cookware; normal bin use does not destroy pots or plates. Cross-version reference, consistent with the original walkthrough.
- [Series fire reference](https://overcooked.fandom.com/wiki/Fire): overcooking creates burnt food and fire, fire spreads to adjacent counters, and affected cooking devices cannot cook until extinguished. It distinguishes original countertop fire from later ground-fire hazards. This is secondary corroboration, not an original-game timing source.
- [2017 Switch firsthand discussion](https://www.neogaf.com/threads/overcooked-special-edition-finally-hitting-the-switch-this-week.1410303/page-3): dirty plates go into the sink together and completed plates accumulate alongside it.

## Changes in this audit

- Raw vegetables at a pot receive the required preparation prompt, not a recipe-quantity prompt.
- Cookware is carried, put on counters, emptied at the bin, and returned to a vacant hob. Contents are not silently erased by touching a burnt pot.
- Dirty plates can be carried together. Washing produces individual clean plates; collecting one pauses any remaining washing work.
- Plate counts drive the models; the pre-existing five-plate supply is now finite. Five is this map's existing supply, **not a verified universal original-game value**.
- Clean plates can be returned to the supply stack, per the user's subsequent explicit request. This is a deliberate convenience difference from the original-game guide, not a claim about the original's behaviour.
- Washing dishes are recessed within the basin; completed dishes occupy its drainboard.

## Not established or changed

No exact original-game burn delay, fire spread interval or extinguisher duration was verified. **No fire trigger, random fire rule, spread timing or extinguishing mechanic was added.** Existing chop/cook/wash/burn/return timings were left untouched; they must not be represented as verified original-game constants.

This is not a complete original-game clone: the current two-ingredient recipes and map layout remain unchanged. No cooling/spoilage rule was introduced for food taken off the hob.
