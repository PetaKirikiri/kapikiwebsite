# Kitchen logistics audit — 18 September 2026

## Scope
Shared cooking engine, predicted interactions, action acknowledgements, movement inventory display, preparation, cooking, serving, returns, washing, bench/supply stacking and pot disposal. No new game rules or timing changes in this audit.

## Confirmed faults corrected
- A delayed pickup could collect a different item after another chef changed the counter. Transfers now validate the expected resulting inventory before committing.
- Already-sent actions could continue after an earlier prerequisite failed. Dependent transfers now require an accepted predecessor; unsent dependent transfers are also cancelled.
- Historical movement samples could redraw old carried food. Movement playback no longer owns inventory.
- Washing/return timer changes reused an older revision. They now advance the revision so stale snapshots can be rejected.
- A newer action from another tab could hide an acknowledgement and leave an old pickup pending. Reconciliation uses individual action receipts.
- Receipts retain a bounded record of the station, prior item, resulting item, action time and acceptance for subsequent debugging.

## Verification
- 88 kitchen tests passed.
- All three recipes completed source → chop → pot → plate → serve → dirty return → wash → bench stack → clean supply, with simulated reply delays of 0, 300 and 2500 ms.
- 4000 deterministic mixed interactions across four chefs conserved five plates and two pots.
- Retries, changed counters, rejected action chains, reload serialization, preparation requirements, burnt-pot emptying and off-hob storage are covered.
- Actual local KitchenGame in isolated QA room: placed two dirty plates into sink using J, waited for washing, collected one clean plate using J. UI and saved database both reported held=plate and one clean plate remaining. Saving completed without an item swap.
- Release TypeScript/Vite build passed. Existing bundle-size warning remains.
- User's active room was not reset or reseeded. No production push performed.

## Limits
The historical reported plate-to-onion event did not have a complete action trace, so its precise original input sequence is not proven. The replacement-item and historical-inventory faults were reproduced independently by failing regression tests before fixes. This is not a claim that every possible multiplayer timing sequence has been exhaustively verified, or that the game's custom timings match Overcooked.
