# Māori tagging architecture

Status: **sole authority for production Māori POS, dots, rails, Guest Records,
recursive pair inference, and Sentence Structures review**.

No other Markdown file, source comment, test, migration comment, recovery file,
or model output establishes tagging policy.

## Purpose

The system learns from confirmed Māori examples until it can tag unseen text
without AI or human help. Hari Pota Book 1 may teach enough to tag Book 2, but
that claim is valid only when Book 2 is processed blindly with knowledge frozen
before its answers are revealed.

The linguistic learning system has exactly three concepts:

1. **Floor Plan** — the complete editable and historical state of one sentence.
2. **Guest Record** — all durable knowledge owned by one normalized Māori word.
3. **Recursion Path** — the one transient deterministic engine. It opens one
   word's potential list, follows one selected potential left and right while
   carrying its purpose ticket, and returns support to that originating word.

There is no separate automatically learned rule store, learned-rule table, observation history,
booking-history document, or saved engine result. Guest Records are the learned
knowledge. The engine owns no knowledge of its own.

Guest Records are disposable compiled knowledge. Their shape will evolve, so
the owner may delete and rebuild every learned Guest Record while retaining all
Floor Plans as the reviewed teaching workspace. A reset must be an allowlisted
learned-word-only transaction, must not touch Floor tables, and must verify the
Floor rows are unchanged before committing.

## Floor Plan: UI only

Sentence Structures lays the canonical sentence seats beside the current
editable POS, dot, and rails. Those seats are immutable during Floor review.
The owner may use that surface to inspect, correct, and confirm one sentence;
canonical sentence text changes only through the separate guarded Levels route
defined below.

The Floor Plan must never:

- serve as automatic-tagging evidence;
- be searched as occurrence history;
- increase a score because a similar sentence was saved;
- create a POS possibility;
- strengthen a Guest Record merely by being opened or automatically filled; or
- become a hidden cache, rule store, or second source of learned knowledge.

`public.floor_plan` is the sole persisted Floor owner. One row contains the
complete schema-v9 sentence state: every word, POS, dot, canonical right
connector ending, and mirrored rail.
There is no separate Sheet row or token table. The automatic engine must not
read `floor_plan` as linguistic evidence.

An explicit confirmed teaching action may consolidate the confirmed sentence
into Guest Records. This is the only route from Floor UI to durable knowledge.
Opening, editing, saving, or automatically proposing a Floor is not itself
confirmation.

Relationship knowledge is derived only during consolidation. One
`learned_maori_word` row owns the word identity and its complete `conditions`
JSON array. Each distinct relationship is one deduplicated array item with one
`local` shape, `left[]` and `right[]` shapes, plus a deduplicated `sources[]`
list containing only `{structureId, floorFingerprint}`. There is no physical
condition child table and no second learned-word source. `tokenIndex` is
forbidden in learned knowledge. Ordered token adjacency inside the Floor state
supplies the temporary left/right context needed for consolidation.

## Guest Record: the only durable learned knowledge

There is one Guest Record per normalized Māori word identity. It contains:

- the word identity;
- Level 1 Family possibilities and confirmed values;
- exact Level 2 Te Aka source labels;
- Level 3 Ours possibilities and confirmed specific POS capabilities;
- zero or more Level 4 semantic Categories;
- left-facing relationship messages;
- right-facing relationship messages;
- confirmed checkpoint/dot and rail outcomes attached to those relationships;
- independent source proof addresses;
- contradiction addresses;
- hidden-test pass addresses; and
- a monotonic knowledge revision.

The source Māori dictionary and learned Māori words are physically separate.
`maori_word`/`lexeme` presence means only that a source word is known; it never
means the system has learned from it. `public.learned_maori_word` is the sole
learned-word lookup. A row may exist there only after a confirmed Floor is
consolidated. Its condition-shape child rows are reached only through that
parent and are not a second word lookup.
Automatic tagging checks the one learned-word table first; no row means the
word is unseen and receives Te Aka source fallback only. Existing empty legacy
learned columns on the live source-word table are
ignored and must remain empty until their removal is separately approved; new
installations do not create them.

A learned Māori word is one row, never one row per appearance. Its potential
Family, Te Aka, Specific/Ours, and Category lists are the union of its surviving
confirmed sources. When a contribution is created or refreshed, it first
imports every Te Aka label, compatible Specific/Ours room, and derived Family
currently available for that Māori word; the reviewed Floor adds observed
possibilities and Categories without narrowing that source candidate set.
Those Floor addresses live only inside each deduplicated condition item's
`sources[]`; there is no source table or separate word-level source collection.
Each condition stores at most one identical address per Floor Plan, using only
`structureId` and the Floor fingerprint; `tokenIndex` is forbidden. A rebuild
starts from the current Floors and replaces the complete learned-word table, so
a changed fingerprint cannot leave an old address, potential, Category, or
relationship behind. If no current source remains, the learned word is deleted.
Stale Floor knowledge must never remain as residue.

Those relationship messages are the reusable patterns. They remain inside the
Guest Record; they are never copied into a separate rule object or table.

Every successful human Floor save immediately reconsolidates only that addressed
Floor. It removes that `structureId` from existing condition sources, deletes
only source-empty conditions, recompiles the words on that Floor, and merges
identical shapes by address. Unrelated learned words and conditions are never
rewritten. A full-table rebuild is reserved for an explicit reset/bootstrap.
One normalized word keeps the union of its source and observed
potentials, while each distinct occurrence contributes its own left and right
relationship message. Repeated appearances of `te` on one Floor therefore
remain one learned word with multiple conditional uses. A candidate is enabled
only where its conditions fit; the absence or contradiction of those conditions
eliminates that candidate. This negative compatibility is evidence, not a
frequency vote and not a hard word-wide label.

Category propagation is relationship consolidation, not word-wide copying and
not exact-sentence replay. The occurrence's accepted Specific/Ours POS must
match. On each existing side, at least two of the neighbouring Specific/Ours
POS, the occurrence dot, and the touching rail must agree with a source
message. Both existing sides pass independently, and a sentence edge matches
only another edge. The token index locates the displayed occurrence after the
match; it contributes no score and is never stored as learned knowledge.

### New and experienced words

A word with no confirmed Guest Record knowledge receives source evidence only
from Te Aka. Te Aka labels may map to several possible Ours rooms. Those are
possibilities, never confirmed capabilities.

Legacy `lexeme_pos_capability` rows are not Te Aka evidence and must never be
imported into a Guest contribution. A compiled possibility must be traceable
either to the exact Floor contribution or to that word's current Te Aka label
and its approved Te Aka-to-Ours mapping.

The frozen Guest Record snapshot may test those source-only Ours possibilities
against relationship shapes demonstrated by other learned words with the same
Ours reading. This is a transient cross-word compatibility lookup, not a saved
rule and not confirmation of the unseen word. An experienced word always uses
its own observed relationships; it may not borrow a missing face from another
word. The shared relationship library is only for a word with no Guest Record.
Its proof addresses still come from the original learned Guests.

An experienced word receives all confirmed knowledge from its Guest Record.
Te Aka remains visible source evidence and may supply a reading not yet
confirmed by our system, but it never masquerades as confirmed Ours knowledge.

The four levels are distinct:

1. `Family` is broad grammatical possibility.
2. `Te Aka` is external source evidence.
3. `Ours` is the detailed grammatical capability used by the engine, including
   distinctions such as transitive and intransitive verb.
4. `Categories` are zero-or-more semantic compatibility facts, never POS.

`nominal_predicate` is an Ours POS in the Particle Family. It is not a Noun
Family child; the nominal expression that follows it retains its own Noun
Family POS. `pre_name_honorific` is likewise a Particle placed before a person
name; only the name itself receives the Noun-Family `proper_name` POS.

Only an exact Ours value may become `acceptedPosCode`. Categories never enter
that scalar field.

## Relationship messages

A message describes what one candidate reading has demonstrated it can receive
or send on one side. It may constrain:

- the Guest's own specific POS;
- the neighbouring Guest's complete potential scope: Family, Te Aka labels,
  Ours values, and Categories;
- both the Guest's own checkpoint/dot and the neighbouring Guest's possible dot;
- both of the neighbouring Guest's side rails, as well as the one physical
  boundary rail that touches this Guest;
- semantic categories;
- the direction (`left` or `right`); and
- whether the relationship continues an already compatible chain.

The singular neighbouring Ours value records what was literally observed on
the teaching Floor; the four neighbour arrays record the full potential scope
available for matching. The observed value must never be presented as the
whole neighbour condition.

Investigation and System Tag render an origin potential's seven base fields in
this order: `Ours`, `Family`, `Te Aka`, `Categories`, `Dot`, `Left rail`,
`Right rail`, with each exact physical key visible. A left or right condition
must instead show all twelve of its physical fields separately: the observed
Ours value, all four neighbour-potential arrays, both neighbour rail arrays,
the touching rail, the origin categories, chain continuation, and supporting
proof count. It must not merge the observed Ours value with Ours potentials,
collapse the condition into prose, or omit an empty or unset field.

Messages never depend on an absolute room number. Literal word identity may
select a Guest Record, but reusable compatibility is expressed through the
four knowledge levels and confirmed boundary facts.

Every source contribution is addressed by structure ID solely so a changed
Floor can retract its old compiled knowledge. These addresses are maintenance
metadata: the engine never reads, counts, filters, or scores them. The two
touching rail values must mirror the same physical boundary.

## Recursion Path engine

The engine receives only:

- the current immutable sentence words;
- current UI values solely as locked targets that must not be overwritten;
- Guest Records for experienced words;
- Te Aka fallback evidence for words without confirmed knowledge; and
- the closed live POS and Category catalogs.

It must not receive saved `floor_plan` rows or target answers.

The engine works as one goal-directed recursive procedure, `visit(room,
ticket?)`. The exact same procedure opens every room. The optional ticket is
the only distinction: no ticket means this room creates the origin purpose; a
ticket means this room must answer the already-carried purpose. One invocation
owns exactly one unresolved origin word. The remaining sentence is read-only
walking context, not a batch of additional origins:

1. Ask the origin word for all permitted potentials and load each potential's
   own stored left-facing and right-facing conditions: neighbouring Ours POS,
   own and neighbour Categories, dot, touching rail, continuation, and proof
   count. This operation reads the origin Guest Record only; it does not inspect
   either actual neighbouring word or perform a handshake.
2. Select one origin potential to inspect in deterministic order.
3. Select exactly one of that potential's directional conditions as the pathway
   being attempted. Create a purpose ticket containing the origin word, origin
   potential, direction, current word, that exact `targetCondition`, visited
   path, and return point. Carrying the whole candidate without the selected
   condition is forbidden because it would let the next room re-search every
   pathway.
4. Recursively call the same procedure for the next word with the ticket. Open
   that word's potential list as one observable operation, then consider only
   potentials compatible with the incoming condition.
   Never restart an unconstrained classification of that word.
5. Check the touching left/right Guest messages, dot, rail, and Categories.
6. If the selected potential still has an open continuation, carry the updated
   ticket one room farther in the same direction after replacing
   `targetCondition` with exactly one selected outgoing condition from the
   current room.
7. Return one supported or rejected parcel to the parent frame. That result
   exists to answer the original word's selected-potential question.
8. Inspect both required faces of the origin potential. A sentence edge or a
   reciprocal `off` may close a face locally; non-`off` continuation must be
   supported farther along.
9. The first origin potential whose complete required pathway succeeds wins.
   Apply every literal POS, dot, and rail resolved along that pathway
   immediately and do not inspect later competing origin potentials.
10. Return from that one-origin invocation. The outer controller then chooses
    the first still-unresolved word. A word already resolved by the returned
    pathway is skipped rather than run again.

When recursion reaches a fully resolved neighbouring word, the same procedure
opens its locked potential shape and checks only the
shared boundary handshake,
and returns immediately through that neighbour as a certified anchor. It must
not travel through it into earlier resolved words. Only an unresolved neighbour
may extend the recursive path.

Recursion Path is the sole production inference boundary. It must not call,
wrap, score, replay, or coexist with the sentence-path constraint solver, the
legacy arrangement parser, or another POS/dot/rail engine. It never constructs
one complete start-to-finish Floor Plan as a candidate.

Required proof crosses a physical boundary only when both touching Guest
messages agree on the same non-`off` rail. A reciprocal `off`/`off` boundary is
enough to close that required branch successfully, but it is not an information
wall: a candidate settled elsewhere may still cross it as a small knowledge
parcel and narrow the active origin path. Failure beyond the closed boundary may
not retract its already-sufficient local proof. A one-sided rail is a
contradiction. The outer controller repeats one-origin invocations to a fixed
point without changing any Guest Record. Recursion Path returns the POS, dot,
and rail values carried by the first complete supported pathway while leaving
unrelated fields unresolved. If one potential fails, it may try the next; if
every potential fails, the result is `no_valid_path`.

A provisional result cannot support itself in the same wave.

### Auditable resolution

The engine does not rank complete Floors or use an opaque confidence score.
Every accepted value must be explainable by its origin potential, carried
ticket, reciprocal faces, closure or continuation boundary, and returned parcels
that narrowed
it. Floor addresses never enter inference.

Frequency does not vote between pathways. The deterministic potential order is
part of the procedure: inspect one potential deeply, accept it immediately when
its complete required path succeeds, and inspect the next only after failure.
Different dot or rail observations remain separate relationship messages so a
candidate cannot manufacture a handshake by merging incompatible evidence.

`token_index` is never a matching feature, learned-pattern key, or score input.
Ordered array adjacency determines which Guests
are beside one another during an attempt. A token index may exist only as an
audit/write-back address after inference.

The engine may tag a field only when:

- no hard contradiction survives;
- it belongs to the first complete supported origin pathway; and
- the value survives every required compatible left/right handshake.

Otherwise the field remains unresolved. Frequency, capitalization, absolute
position, or a singleton Te Aka mapping cannot by itself create certainty.

### Sentence-wide pathways

For `Kei te kai te manu i te kākano`, a proposed `te kai` noun pathway must
complete every relationship it requires. If it fails against the surrounding
TAM and `i` pathway, Recursion Path rejects it and tries the next potential. A
progressive verbal pathway wins as soon as its complete left/right recursion
succeeds. The engine never keeps both as competing whole-sentence candidates.

Specific capabilities matter. A merely possible `verb` does not license a
direct object. A possible or confirmed `transitive_verb`, compatible subject
pathway, compatible `i` phrase, and the rest of the Floor must line up.

## Confirmation and consolidation

Automatic output is a proposal on the Floor UI. It does not teach.

After explicit confirmation, consolidation:

1. verifies the canonical sentence and uses every currently known reviewed value;
2. derives each Guest's exact four-level occurrence knowledge;
3. derives left/right relationship messages and chain participation;
4. records distinct proof addresses;
5. records contradictions against existing messages;
6. updates the affected Guest Records atomically; and
7. increments their knowledge revisions.

Consolidation may strengthen an existing message when a genuinely independent
source matches it. It may not turn mere repetition, an automatically proposed
value, or an unreviewed Floor into teaching truth.

The Floor may then remain as UI history or undergo an ordinary UI-history
deletion without weakening the decoder because the confirmed knowledge now
belongs to Guest Records. Deleting its canonical Sentence Structure is a
different owner action: that explicitly retracts the sentence's Guest sources
as defined in Canonical sentence maintenance below.

## Leakage-proof evaluation

The completed tagging is retained as a locked answer sheet, not exposed to the
engine.

For a hidden evaluation:

1. exclude the target sentence;
2. exclude its Floor values;
3. exclude every Guest Record proof or message learned from it;
4. freeze all remaining Guest Records;
5. provide only the target words and permitted Te Aka fallback;
6. run Recursion Path;
7. compare with the locked answers afterward; and
8. record the hidden-test result only after comparison.

Related sentence variants must be held out together when necessary to prevent
near-duplicate memorisation. The required measures are exact accuracy,
coverage, accuracy when the engine claims certainty, abstention on genuine
ambiguity, novel-word transfer, and proof validity.

For a book, process pages sequentially: learn confirmed knowledge from Page 1,
freeze it, test Page 2 blindly, reveal and consolidate Page 2 only afterward,
then repeat. Record the first page after which no AI or human intervention is
needed.

## Canonical Floor state

The current UI sheet is schema version 9. Each token contains:

- zero-based `tokenIndex` equal to its array position;
- immutable nonempty `surfaceText`;
- nullable closed-catalog `acceptedPosCode`;
- nullable `checkpointState` (`must_continue` or `may_end`);
- nullable canonical `rightConnectorEnd` (`send`, `accept`, or `cap`);
- nullable `leftRail`; and
- nullable `rightRail`.

Rails are `off`, `yellow`, `green`, or null. Null means unknown, never off.
Room 0 has no left rail, the last room has no right rail, and adjoining sides
must mirror the same physical rail. The canonical stored boundary is the left
Guest's `rightRail`. The Floor likewise stores one connector-topology fact per
boundary: the left Guest's `rightConnectorEnd`. A left connector ending is not
duplicated on the Floor; consolidation and rendering derive it as the exact
complement of the preceding right ending.

Reception remains a literal copier. It receives only addressed field writes,
never scores, Guest Records, candidates, alternatives, or proofs.

## Persistence boundary

Production persists exactly two auto-tagging owner concepts:

1. `public.floor_plan` stores the complete editable/history state of a sentence.
2. `public.learned_maori_word` stores the compiled knowledge for one word in
   exactly two columns: normalized `word` and its deduplicated `conditions`
   JSON array. Each condition contains `local`, `left`, `right`, and maintenance-
   only `sources`; no physical condition child table exists.

There is no Check-in Sheet table, token table, source table, rule table,
authority table, or global evidence-state table. Operational writer metadata
belongs inside the Floor row; source provenance belongs inside the learned-word
row.

The clean WORDS staging schema continues to own the Māori word and catalog
homes. Guest learning must attach to the Māori word identity rather than create
a parallel rules directory. Until the exact Guest Record persistence fields
and consolidation transaction are installed, Recursion Path may be
tested only with strict in-memory Guest Record inputs and must not be advertised
as learning durably.

No live runtime may silently fall back to the superseded saved-Floor history
route. If Guest Records are unavailable, automatic tagging must abstain and Te
Aka may provide possibilities only.

### Local-first read cache

The browser may persist the last strictly parsed database reads in one
versioned TanStack Query cache backed by IndexedDB. It may cover the canonical
sentence roster and curriculum levels, Floor Plans, the POS catalog,
Investigation layouts, and Investigation Guest Records. Cached data renders
immediately and is revalidated through the same read-only server doors.

This cache is a disposable display copy, never a third data owner. It is not
tagging evidence, cannot feed Recursion Path, and cannot overwrite a
newer database reread. Floor, curriculum, sentence, and Guest writes are never
queued or accepted offline: they still require their existing guarded server
transaction and the returned database acknowledgement. A cache contract-version
change discards the old browser cache.

## Investigation

Investigation is read-only. It should show, with minimal owner-facing labels:

- the Words database structure;
- the Guest Record shape and knowledge revision for a selected word;
- its Level 1, Te Aka, Ours, and Category knowledge;
- its scored left/right messages with proof and contradiction counts;
- one temporary Recursion Path ticket with its carried path and returned
  knowledge parcels; and
- which stable fields, if any, the engine could tag and why.

It must clearly distinguish persisted Guest knowledge from temporary origin
paths. It must not display a separate Rules area because no such
knowledge owner exists.

## Connectors workspace and presentation engine

`connectorPresentation/engine.ts` exposes the framework-independent
`presentSentence` contract: text, optional accepted state, catalog families,
approved shape library, shared rules and measured text widths produce the same
word materials, faces and layout for every host. Text/state mismatch is rejected.
With text alone it preserves unresolved fields. `tagText` calls the read-only
`/__website_sentence` door, which runs the existing Recursion Path session to
completion without Floor reads or writes, then returns its state and receipt.
Website stories must use this analysis; component word dictionaries and
proportional block assignment are forbidden. Translated support text has no
Māori annotation projected onto it. The browser supplies measurements and paints
the returned plan; it owns no parallel connector classification or layout policy.

Website English subtitles may use explicit phrase-to-token alignments from the
teaching translation catalog. These are display-only translations, never Māori
tagging evidence. Exact source-text matching guards against stale alignments;
English segments inherit the already-computed Māori material colour supplied
by the shared renderer. English-only words remain neutral. No Māori token,
shape, colour assignment, or grammar state is changed by a subtitle.
Adjacent English segments join their colour lines only when their aligned
Māori token indices are consecutive and the engine layout joins those tokens.

The owner-approved single-word `Tokorua` nominal predicate displays a rose-to-
blush internal Fat Wave join and a receiving terminal, matching the two-part
`E rua` treatment without splitting or retagging the token. The shared engine
owns this internal presentation plan; the reader only paints its saved face.

The locked Design Lab collection is the only source of sentence connector
artwork. `public.connector_shape` owns append-only snapshots. Its guarded door
validates source contracts and rejects ID collisions with changed content.
Lock in succeeds only after acknowledgement. The browser collection is a
disposable cache, not an alternative owner.

`src/lib/connectorPresentation/blueprints.ts` is the single active presentation
contract. Each blueprint names an exact saved snapshot for each continuing
direction, its material attachment side, and its approved style. There are
only two mating pieces, Sends and Receives; `cap` is a stored Floor ending
that exposes a sender to the page, not a third connector design.
No newest-by-name lookup, Fat fallback, triangle fallback, default generator,
or component-owned rotation, reflection, colour inversion or endpoint choice
is permitted. A newer Design Lab draft does not silently replace an approved
production snapshot. A missing, incompatible or unapproved face is visibly
unavailable and must not be guessed.

Object and target markers use the owner-approved stemless Two-frond Arrow
snapshot `1788915573737`, pointing left. Agent/doer markers use its saved
right-pointing partner `1788915619609`. The engine keeps the fixed arrow frame
above its marker word and anchors its noun-side edge to the following word,
using the marker colour for the arrow and the following word colour for the
surround. Markers paint no extra rectangular
material or stem. The next word touches this frame with ordinary connected-word
spacing. This marker-to-participant attachment is structural and remains
gapless even if an older saved rail at that boundary is off; wrapped rows do
not duplicate the word-centered arrow. Saved
grammatical rails and checkpoints remain unchanged; closed boundaries retain
their normal separation. This assignment reactivates only those exact saved
triangles, not other legacy renderers. In the reviewed ability examples,
`ka taea` / `e taea` is TAM; the following `e` is Agent Marker and begins the
following noun phrase. `Kāore` remains Negative.

Object/target/victim and agent/doer markers share the same light aqua-teal
participant-marker colour. Their meaning is distinguished by arrow direction,
not by colour: object/target/victim points left, away from the following noun;
agent/doer points right, toward the following noun.

The approved runtime motifs are Skinny Wave, Fat Wave, Four-frond Arrow,
and the stemless Two-frond Arrow. Verb and accepted Particle TAM use Skinny Wave. Nouns use
the exact named Fat Wave pair. Accepted Particle Determiner and Object Marker use
Four-frond Arrow. Nominal Marker and Nominal Predicate use the same approved
Fat Wave koru pair as the noun system, with their distinct muted-rose material.
Both nominal edges send the koru pattern. The attached noun or proper name keeps
its Fat Wave receiving terminal and the approved pink material. The nominal lead has
higher boundary priority so the following noun cannot
replace that inverted construction with the ordinary Determiner/Noun treatment. Accepted Particle
Negative uses the owner-approved equilateral triangle, preserving the original
midpoint subdivision with no stem. Its exposed triangle points right, outward
from the negative material. The terminal triangle sits inside the negative
word's own measured slot instead of extending into a separate right-hand slot.
For the owner-requested attached preview, no gap follows a negative when another
section exists, except `Kāorekau`, which retains the visible inter-section gap
and page-coloured triangle cut-out. Every other negative’s saved triangle uses the following material as its complementary
fill and touches that section physically, including at a closed or off saved
boundary. This is presentation only; saved topology and rails remain unchanged.
No duplicate receiving face is painted into the following section. Conditional Markers use a
detached Skinny Wave ending, as do reviewed clause-leading Adverbs such as `Nōnahea`
and `Āhea`; they do not use the participant-marker Arrow or connect to the phrase on
their right. Other Particle readings use the stemless Two-frond Arrow. The
former Two-frond and Four-frond Mangopare drawings remain inactive Design Space
sources and must not enter production presentation. Adjective and
Other remain undesigned.
These bindings are presentation metadata; they do not create POS possibilities
or alter the live catalog. A word such as `kei` receives TAM presentation only
when that occurrence's accepted Ours reading is TAM.

`presentation.ts` consumes the existing canonical topology projection. A
configured left face owns the shared boundary and makes the preceding right
face complementary; otherwise the current word's configured right face owns
it. The selected
saved silhouette declares its attached material side. Its surrounding area is
the exact complementary receiving material, not an independently drawn shape.
An assembled join contains the two adjoining materials, never page-white.
The sentence reader paints one assembled join per continuing word boundary,
not two independently positioned pieces. Single-colour pieces are for inspection.
Adjacent tokens accepted into the same owner-approved high-level teaching
section paint as one continuous material. The active continuous section codes
are TAM, Negative, Nominal Marker, and Location Marker. Thus a reviewed `Kei
runga` location section is one continuous section. Their internal token boundaries retain
the saved Floor topology but expose no connector face; only the section's outer
boundaries connect to another section. This is engine projection policy, never
a renderer exception or a spelling-based component check.
A closed noun end exposes its approved receiving face; other closed ends
expose their configured face, defaulting to sending. This changes neither the
closed checkpoint nor continuation grammar. All exposed faces replace the
absent right material with the page; it never borrows an orientation from the
preceding connector. Both continuing orientations must have approved saved
faces. The two-frond Mangopare reverse is currently unassigned.

The engine owns each word's material colour, both edge faces and their exact
saved silhouette/negative fill plan. Its fixed teaching palette is dark blue
for accepted TAMs, light blue for accepted verbs, light aqua-teal for object,
target, victim, agent and doer markers, light lavender-purple for accepted
negatives and their postposed predicate particle, cool cornflower blue for other
grammatical relation markers, muted rose for nominal markers and nominal predicates,
deep forest green for determiners and light green for ordinary common nouns.
Accepted Location Markers use the same muted rose as the nominal leads; a following
ordinary determiner/noun phrase keeps its normal forest/light-green materials.
Proper names use the same soft pink as nominally attached common nouns. A common noun immediately attached to a Nominal
Marker or Nominal Predicate uses a distinct soft-blush nominal-noun material
instead of any green or purple noun material. This makes the complete nominal
construction belong to the rose family. The comparison particle `ake` uses the
same dark muted rose as its nominal comparison lead, even though its accepted
POS remains unchanged. Purple
is reserved exclusively for accepted negatives and their associated postposed
predicate particle.
This colour context changes presentation only and never changes either word's
accepted POS. Multiword or
discontinuous TAM members remain dark blue. Rails cannot recolour one of these
classes to resemble another. This does not merge tokens or change their
accepted POS or rail. Unassigned classes alone may follow the existing
rail-defined block progression. A preceding word cannot repaint a following
word. Geometry never determines linguistic state.

In the reviewed introductory examples, `Tokorua` and `Kotahi` are Nominal
Predicates, `Kei runga` is a Location Marker section, and `Ehara`, `Kāorekau`,
and `Kāti` are Negatives. `Mā` and `Mō` in ownership constructions remain
Genitive Linkers and therefore use the approved stemless Two-frond Arrow in the cool
relation-marker colour. Agentive `Mā` remains an Agent Marker and retains the
separate right-pointing doer triangle.

Components only measure the text/layout, place the resulting plans, and paint
the exact saved drawing. `SavedConnectorCheckpoint` accepts a compiled plan,
not a family, direction, style, ending decision or colour override.
`src/lib/connectorPresentation/layout.ts` owns word-slot spacing and measured
rail-control spans for every sentence consumer. Each word owns one material
block; except at a continuous section's internal seam, it also owns a left
mating face and a right mating face. The left face is the exact
complement of the preceding boundary; the right face is the word's own approved
piece. Adjacent right/left faces share exactly one frame at the middle of the
interword gap, with complementary material filling the saved silhouette's surround.
Sentence/closed boundaries leave the left
edge flat. A right cap exposes the same sender, not a third design. The former
centre-to-centre decorative strip is not rendered. Each word's material block
ends at its outgoing frame centre. A connected following word's material begins
at that same centre, underneath the assembled join. It must not wait until the
text starts or leave any previous-word colour past the join. The block follows
measured text width plus one natural text-space allowance, split evenly on both
sides. Because a saved face is centred on its boundary, only half of that face
lies inside each neighbouring word cell; the minimum is therefore one complete
face plus a small body, never two full faces. Text is centred in its own material
cell. The left and right joins sit on that cell's boundaries like two arms;
the light-blue verb body must remain centred above the verb in E-kai-ana.
Continuing cells touch and share exactly one join; closed boundaries add only
the shared half-face separation needed by the exposed face. Ending state cannot
change the outgoing cell anchor.
The incoming face shares the preceding outgoing anchor rather than painting a duplicate.
These invariants apply in review and continuous reading. A wrapped row
repeats the same assembled incoming join at its start, never a different drawing.
Browser adapters remeasure on container resize and font loading; they must not
add page-specific word margins, connector padding, or rewrite sentence tokens.
Sentence Structures groups accepted passages by whether any accepted token
belongs to the Verb POS Family. A TAM alone does not make a passage a verb
sentence, and an unmarked accepted verb remains in the verb-sentence group.
The Connectors tab displays single-colour Sends and Receives pieces, never a
two-colour assembled join or an additional Ends card. The receiving piece is
the exact negative of the sending silhouette. It uses these same engine plans and live catalog bindings;
there is no separate preview-only assignment system. Inactive saved drawings
and previous versions remain in a clearly separate library section for
recovery/design work and cannot enter the production rendering graph.

### Owner-controlled high-level patterns

The owner explicitly controls fixed left/right Sends/Receives settings for
the existing high-level groups: Verb, TAM, Noun, Determiners/Nominal markers,
other Particles, Adjective and Other. `patterns.ts` owns this grouping and its
strict schema. `public.connector_pattern_setting` is the shared configuration
source, not learned evidence and not a replacement POS classifier. Each row
stores one left/right pair and a revision. It names only approved blueprints.
No per-word exceptions, occurrence-specific patterns, or new geometry are added.

The Pattern controls workspace collates current roster-linked Floor occurrences
for display only, lists their normalized words and detailed POS labels, and
shows one real sentence example per group. This does not feed Floors into
inference. Drafts are local and inert until explicit Save succeeds. Saves use
revision checks, validate both saved shape orientations, and acknowledge a
database reread. A missing orientation cannot be replaced by a guessed flip.
Before the additive storage installation is approved, this workspace is preview
only, Save is disabled, and there are no saved overrides; the engine defaults remain active.
Other storage errors must be surfaced rather than treated as an empty setting.

The owner-approved built-in Verb and TAM baselines are Skinny Wave Sends on
both the left and right, so the verbal section has two outward arms. This makes
a following TAM/verbal section own its boundary with a Negative: the purple
Negative material fits into the left side of the Skinny Wave instead of laying
a Negative motif over the blue section. A configured left face owns the shared
boundary: the preceding word exposes the complementary face rather than
choosing a competing orientation. Where the following word has no configured
left face, the current word's right rule owns the boundary.
Verbs are always light blue and TAMs dark blue.
In an ability construction built with `taea`, its doer marker `e` uses the same
light blue as the Verb while retaining the approved doer-arrow orientation into
the following noun phrase. This colour rule is presentation-only: it does not
change the marker's accepted POS or its participant role.
Target markers such as `ki` use that same light Verb blue consistently while
retaining their outward target-arrow orientation into the destination phrase.
An accepted Passive Verb is the visual subtype of Verb that keeps the same
light-blue Skinny Wave material while pointing both exposed fronds to the left:
its left face uses the approved Skinny Wave Send and its right face uses the
separately saved Skinny Wave Receive. This POS-level orientation is part of the
shared pattern source used by presentation and Recursion Path; it does not
change the accepted POS, colour, rails, checkpoint, or saved source geometry.
An accepted Stative Verb is its directional counterpart: it keeps that same
light-blue Skinny Wave material while pointing both exposed fronds to the right,
using the saved Receive on its left face and the saved Send on its right face.
It has the same shared-pattern and no-grammar-change constraints as Passive Verb.
The owner-approved built-in Noun baseline is Fat Wave Sends on both the left
and right. This gives every noun, including `manu` and `kākano`, two outward
wave arms under the same next-word-owned boundary rule. Only the exact saved
fat Wave 4 and Wave 3 Design Lab snapshots may render those two sides; the
skinny Verb wave pair remains a separate blueprint.
This baseline normalizes continuing orientation in both presentation and
Recursion Path, including the former reversed verb in `E kai ana`. It is source
code policy, not a fabricated saved setting; the settings UI identifies it as
the engine default. Existing saved group settings override the baseline.
A closed post-verbal TAM (such as ai or ana) has a flat visual finish with no
outgoing face. Its incoming verb join stays intact and its closed grammatical
checkpoint is preserved. Other closed TAMs expose the approved Skinny Wave receiving face so its terminal
curl rises from bottom to top. This presentation rule does not alter the stored
cap, checkpoint, or the verb's two outward sending arms.
An explicitly saved group pair overrides that group's continuing connector
orientation in both presentation and Recursion Path. Existing closed sides,
sentence edges, may-end checkpoints, POS and rails are preserved. Learned
condition local/target orientations are projected through the same settings for
matching, without rewriting Guest Records or Floor history. Incompatible
configured adjoining motifs or polarities are rejected by inference and visibly
flagged by the renderer; neither component may fix them. Inference freezes the
settings with its input snapshot. Unsaved groups retain current contextual
behaviour except for that approved verbal baseline until the owner sets them. Sentence Structures, Connectors and Website
read these same settings; there is no browser-local assignment store.

### Geometry ownership

Connector SVG geometry must never be invented by visually adjusting path
coordinates. Every connector path must originate in a dedicated geometry
module and declare one auditable provenance: `parametric`,
`approved-source-trace`, or `approved-source-derived`. Parametric geometry must
name its equation/control-point record and must pass bounds, mirror, baseline,
and self-intersection checks appropriate to that motif. Trace-derived geometry
must retain the approved source dimensions and derivation metadata.

Rendering components may only consume those registered geometry exports. They
must not contain local SVG path literals, hand-adjusted Bézier points, cosmetic
patch paths, or CSS transforms that compensate for incorrect source geometry.
Workshop and temporary experiment components follow the same rule: uncertainty
must remain visibly unimplemented rather than being filled with a plausible
guess. `npm run check:connector-geometry` is a mandatory build gate; bypassing,
weakening, or allow-listing a guessed path is not an implementation.

The separate `Fibonacci` workspace displays one isolated equation-generated
curl without changing the accepted connector registry. It must use
`makeEquationOwnedKoruGeometry` from `equationOwnedKoruGeometry`, with 2.4
default Blue thickness. The complete curl is shown immediately with no draw,
fade, reveal, or opacity animation. It is one uninterrupted golden-spiral parameter range
from the selected Total line distance asymptotically down to its centre. The equation owns one
rotating roller segment. Its tracked edge tends asymptotically to radius zero
and its outer
edge is always exactly one constant Blue thickness farther along the same
radial angle. Blue thickness must not grow or shrink with radius, distance,
angle, or time. No coordinate,
historical distance, or turn count may act as a stem endpoint, anchor, baseline,
extension seam, or formula boundary. In particular the workspace must contain
no `lineEnd`, fixed control points, 2.25-turn split, prefix/suffix splice, or
separate inward/outward geometry. The equation owns one fixed drawing scale;
there is no White thickness setting. Radius stabilisation modifies its radial
growth rate globally, never at a point. Every changed value applies immediately
and shows the completed recalculated shape; there is no separate `Draw again`
action or animation. Direction selects clockwise or anticlockwise traversal of that same
equation. Rotation applies one global angle to every calculated coordinate; it
must not alter proportions or introduce a pivot seam. Direction and rotation
both apply immediately. The experiment is the one filled area swept between those two
globally calculated roller edges. As its tracked edge tends to radius zero,
rotating that complete roller creates the nub without a separate
circle, cap, terminal path, orbit, shape stroke, reveal mask, or composited correction.
All shape-affecting meter defaults, ranges, and steps are exported beside
`makeEquationOwnedKoruGeometry`; the component owns none of them. Every value
enters that function. That one
module returns the complete geometry used by the locked source
`koru.fibonacci.v1`. `lockedFibonacciKoruSource` seals that geometry with its
registered source key, immutable version, equation revision, swept-area path,
viewBox, and colour. `FibonacciView` may request that sealed drawing but must
render it only through the geometry-blind `PatternDrawer`. The view must not
contain an SVG path, construct coordinates, call the raw geometry function, or
independently choose or override any path, width, colour, transform, or boundary
geometry. `PatternDrawer` must reject a missing, unknown, unlocked, mismatched,
or altered source identity; it must never substitute a fallback picture.

An accepted locked pattern version is append-only. New stems, branches,
Mangopare compositions, bounded motifs, experiments, and later equations may
consume `koru.fibonacci.v1`, but may not edit it or silently redirect its key.
Any intentionally changed source equation requires a new source key and version
plus explicit owner acceptance. The accepted default v1 path has a regression
fingerprint so an equation edit cannot silently change the approved picture.
Dependencies flow from compositions to locked primitives only; a locked
primitive must never import or absorb composition geometry.
The Fibonacci trajectory tracks one edge of the virtual roller. Its conceptual
domain begins at `angle → -∞`, where its radius tends to zero, and its radius is
globally `scale × exp(growthRate × angle)`. There is no finite special starting
angle. The renderer may begin sampling only where the calculated radius reaches
a sub-pixel visibility tolerance used for numerical rendering; this cutoff does
not alter the equation or create a visible shape boundary. The earlier
asymptotic rotations remain the mathematical reason the roller sweeps the
centre into a nub.
At every angle the module calculates the roller's complete radial segment from
`radius` to `radius + Blue thickness` and fills the area swept by that segment.
This is one global roller model; the view must not replace it with a centred
stroke or select a different side at any angle.
Rendering samples are derived only from the same parameter equation and may
adapt in density to physical radius; they cannot carry independent shape
decisions or coordinates.
The experimental SVG must not clip the equation at its viewBox. Its overflow is
visible so a continuing thick stroke cannot acquire a false vertical edge from
the rectangular viewport boundary.
It must not inject double-frond endpoints, a centre stem, a replacement equation,
or later experimental geometry. This is an isolated visual test only: it has no POS,
connector, Floor, Condition, database, or renderer meaning until the owner
separately accepts it.

The separate `Trajectory` workspace is an isolated equation experiment for a
future stem-to-koru join. Its registered source is
`trajectory.ballistic.experimental.v1`. The component supplies only the
source-owned initial position, launch angle, launch speed, gravity, and duration.
`trajectoryGeometry` evaluates one projectile equation globally:
`x(t)=x0+vx·t` and `y(t)=y0-vy·t+½g·t²`. There is no forced destination,
arrival direction, arrival strength, endpoint correction, Hermite endpoint
basis, or local anatomical section; the visible endpoint is only the value of
that equation at the selected duration. Before real source boundaries exist at both
ends, the experiment must show that centreline only: it must not close two
offset edges, add a filled ribbon, cap either endpoint, or manufacture terminal
anatomy. Width belongs to the later boundary-to-boundary composition contract,
not this trajectory experiment. `TrajectoryView` must not contain SVG paths, control points, sampled
coordinates, endpoint corrections, or a fallback picture; it renders the sealed
source only through `PatternDrawer`. This experiment must not alter, import
geometry into, or redirect the locked `koru.fibonacci.v1` source. It has no
Mangopare, connector, POS, Floor, Condition, database, or production meaning
until the owner separately accepts a composition contract.

The separate `Arrow` workspace is an isolated protected composition in the
immutable `0 0 96 96` connector canvas. Its `arrowHeadGeometry` derives the
pointed centre stem and both straight origin-to-shoulder arms from the existing
double-frond control record without editing the accepted Particle/TAM source.
`arrow.composition.experimental.v1` attaches one locked `koru.fibonacci.v1` at
the calculated end of the left arm using that endpoint's position, outgoing
tangent, and exact material width; the right arm and koru are the mathematical
reflection of the complete left side. The equation geometrically unions the
stem, both straight arms, and both locked koru into one sealed path. No component
or Drawer may place, rotate, patch, cap, or join a frond.
Arrow may place the locked koru only with one affine similarity transform:
uniform scale, rigid rotation, and translation applied identically to every
source coordinate. Distance-based rotation, local warping, endpoint reshaping,
or any other deformation of the locked koru is forbidden.
The vertical stem ends at the shared
`CONNECTOR_GEOMETRY_STANDARD.verticalStemBottomY`; Arrow may not inherit or
calculate a private bottom coordinate.
The workspace may expose live source-owned controls for arm length, shared blue
thickness, curl distance, frond rotation, and left-frond direction. Every input
recalculates the complete sealed composition immediately; reflection determines
the right side. The component owns only the temporary input values and renders
the result through `PatternDrawer`. The experiment has no POS, checkpoint, rail,
Floor, Condition, database, or production meaning.

Design Space exposes the original Arrow unchanged and a separate `Arrow · 4 fronds`
variation with source key `arrow.four-fronds.experimental.v1`. The additional
smaller pair is generated from the same locked `koru.fibonacci.v1` equation and
is attached at equation-derived points on the two arm tangents. It has its own
saved input, rotation, and position records. It must not branch inside, replace,
or modify `arrow.composition.experimental.v1`.

`Arrow · two-frond bite` began as a separate Design Space experiment,
`arrow.bite.experimental.v1`. It reuses the two-frond Arrow arms and locked curls,
omits its centre stem, and unions the exterior of the arm V to the canvas edge.
The default whole-shape rotation places the solid material on the left and the
two-frond bite on the right. It has independent inputs and a reproducible recipe.
The exact saved left- and right-pointing snapshots are now the approved
production Two-frond Arrow used for object, target, agent/doer, and other
Particle assignments in place of the former Mangopare assignments.
Its `points left` and `points right` variants share all source and placement
settings. The right-pointing version rotates the complete finished result by
180 degrees (both output reflections), including its placement. Each direction
has a separately labelled saved snapshot and retains the identical frond geometry.

Design Space also exposes `Arrow · reverse` from the exact sealed normal Arrow
source. On initialization it copies every normal Arrow composition input and
placement value and changes exactly one value: whole-composition rotation is
offset by 180 degrees. Its controls subsequently persist under a separate
record. The reverse must not alter any internal frond or attachment input, and
must not modify the original Arrow's source or saved controls.

Design Space also exposes `Arrow · 4 fronds · reverse` as an independent version
of that exact sealed four-frond source. On initialization it copies every approved
four-frond input and transform, then changes exactly one value: whole-composition
rotation is offset by 180 degrees. Its controls subsequently persist under a
separate record. The reverse version must not modify either the approved
four-frond equation or the original version's saved controls.

The separate `Mangopare` workspace renders only the sealed
`mangopare.composition.experimental.v49` source. Its centre stem, one left
umbrella, one locked `koru.fibonacci.v1`, and the exact reflected right side are
geometrically unioned before rendering. The umbrella has no straight-arm
section. It begins as an ellipse-derived band. Its inner and outer boundaries
receive independent whole-trajectory seventh-degree Hermite corrections that align
both final edge positions, both final edge tangents, and both signed edge
curvatures with the accepted frond tail. A
centreline-only approximation is forbidden because it can leave a visible kink
on either material edge. Because the SVG renders a finite polygonal sample of
the equation, a deterministic secant solve makes the signed curvature over the
visible terminal interval equal the locked frond curvature; relying only on the
infinitesimal endpoint derivative is forbidden. Each correction is zero in position and tangent at the
apex. Its seventh-degree basis also matches the frond's signed curvature rate,
so the umbrella approaches the join through the same evolving bend instead of
changing shoulder curvature abruptly. Each correction is distributed across
the complete boundary; it is not a local cap,
wedge, patch, or component join. The locked koru may not be moved, rescaled,
rotated, or reshaped to satisfy the umbrella.

Design Space identifies that accepted source as Mangopare version `2 fronds`
with stable ID `two-fronds-v1`. The separate `4 fronds` version has stable ID
`four-fronds-v1`, source key `mangopare.four-fronds.experimental.v1`, and its
own geometry file, input record, and whole-shape rotation record. Its base path
must remain the exact output of the accepted v49 factory. The additional pair
is produced only by a source-owned similarity transform of that same locked
koru pair; component-authored frond points are forbidden. A Mangopare version
owns its source contract, equation factory, input record, and whole-shape
rotation record. The four-frond source must not replace, branch inside, or
reinterpret the two-frond factory. Changing one version must never mutate
another version's settings or geometry.

Design Space also exposes `2 fronds · reverse` and `4 fronds · reverse` as
independent versions of their exact matching Mangopare sources. On first
initialization, each reverse copies every equation input and placement value
from its matching original and changes exactly one value: whole-composition
rotation is offset by 180 degrees. Each reverse then persists independently.
Creating or editing either reverse must never alter the original Mangopare
version, its equation, or any Arrow source or settings.

Mangopare's copied Arrow frond pair is calculated separately from the umbrella.
Its attachment frame and base thickness are pinned to the saved Arrow baseline
(`1.35`, `46`, `8.5`, `1.25`, `-5 degrees`, clockwise). Umbrella reach,
umbrella curve, and umbrella blue thickness may not enter the frond-pair
calculation. Curl distance, radius stabilisation, frond rotation, and direction
remain independent frond inputs. The accepted loose-tail interval defaults to
`1.05` turns and remains the live frond ending-distance input. It is longer than
the superseded `0.93` cut so the umbrella has enough trajectory to inherit the
frond's bend gradually. Only the umbrella equation may adapt to that
source-owned target.
Mangopare's frond ending-distance input may append or trim only the outer
parameter interval of that locked equation. Placement is always calculated
from the copied Arrow baseline asset, so changing ending distance may not move,
rotate, scale, or reshape the already accepted frond body.
Mangopare owns wider controls than Arrow: umbrella reach controls travelled arc
length and umbrella curve controls ellipse radius/tightness. These meanings may
not be reversed, and neither control may inherit Arrow's arm limits.

Mangopare uses the immutable `0 0 96 96` connector zone and must keep its full
material inside that zone without clipping, stretching the viewBox, or
distorting the locked koru. The component owns only the typed equation inputs
and passes them to `makeMangopareDrawing`; `PatternDrawer` remains
geometry-blind. Persisted Mangopare settings are allowlisted to the current
input fields so removed experimental controls can never re-enter the live
equation. Obsolete Mangopare experimental source registrations are forbidden.
`PatternDrawer` receives no scene parts, transforms, placement instructions,
branching logic, or Mangopare-specific condition; it renders exactly one path.
This is
an unaccepted visual experiment with no connector, POS, Floor, Condition,
database, or production meaning.

Design Space may retain source-derived wave, arrow and triangle drawing tools
as unassigned design experiments. Their labels describe artwork, not accepted
POS assignments. A saved experiment is not active until the explicit runtime
blueprint references it. Source transforms are saved into the locked drawing;
the production renderer never repeats those transforms.

The separate `SVG Lab` is a user-authored scratchpad, not a connector workshop.
Its `New stroke` control may create an editable three-point curve and display
the resulting SVG source. The user directly moves only Start, Shape, and Frond;
Start and Frond are hard anchors while Shape is a soft curvature influence and
must not force the path through itself. Hidden cubic handles preserve one
continuous curve and make it meet the opposite mathematical reflection with a
shared horizontal tangent at the centre. Those temporary strokes exist only in local
React memory and carry no connector, frond, tukutuku, POS, Floor, Condition,
checkpoint, learning, or database meaning. They must not be imported by a
renderer or geometry registry. Promoting a scratch stroke into any production
shape is a separate owner-approval and provenance task governed by this gate.
The SVG Lab frond is one deformable material. It must never render a separately
closed arm and frond, splice an arm outline to a prebuilt frond outline, or
transform the complete source silhouette onto the arm. Those are all the same
forbidden glued-hand architecture.

The approved filled blue silhouette supplies a medial-axis recipe only. An
offline material-mask extraction thins the blue fill to its main skeleton and
measures twice the nearest-blue-boundary distance at ordered stations. The live
arm endpoint supplies position, tangent, signed handedness, and scale; the
ordered blue medial stations supply how that same centreline bends, expands
through the broad body, and tapers into the tip. The renderer offsets the one
complete live centreline by that changing measured thickness and closes it only
once. It must contain no arm end-cap, frond root-cap, overlap, internal seam, or
second hand object.

White negative space, the fitted white-channel circle, its inner radius, and
the old isolation cut are forbidden as live curvature, width, scale, taper, or
terminal-shape inputs. The exact blue source outline may appear beside the live
result as a reference, but it must not be inserted into the result. The opposite
side is made only by mirroring the complete live material.

Continuity proves only that the object is one material. It does not prove a
blue-frond match. A future PASS requires an independent normalized boundary
comparison between the generated material and the approved blue specimen; a
self-comparison or a hard-coded PASS is forbidden. Until that independent score
exists, the UI may say the blue medial profile is active and that the object is
one material, but must state that the final boundary score is pending.

Width is anatomical, not one globally variable field. The incoming arm and the
`body_line` section retain the incoming line width; any width change there is a
failure. Width may change only through the source-measured
`terminal_ball_neck`, `terminal_ball_flare`, and `terminal_ball` sections. The
same continuous width field narrows through the neck and then expands into the
terminal maximal disc; no circle, cap object, or second silhouette may be added.

The approved filled-blue source calibrates the current terminal anatomy. Its
body line is `10.591978` source units, its neck is `0.780786×` body width, and
its terminal ball is `1.812693×` body width. The accepted ball-diameter range
is `1.722058×–1.903327×` the incoming live line, so changing the line width
scales the complete neck, flare, and ball together. The terminal ball ratio is
not a user control. Its size must affect the preceding transition and must be
validated before rendering; an out-of-range target is rejected rather than
clamped into a passing shape. These calibration ranges come from the one
approved specimen and are not universal biological or cultural laws.
Except for the explicitly unassigned Fibonacci equation experiment above, every
visual described as a frond must also derive its Bézier path from the one canonical
frond control-point record and its reflection/affine functions. A new surface may
transform that primitive, but must not imitate a frond with unrelated hand-drawn
curves or decorative strokes.
The unassigned circular spiral-frond base shown in the workshop is an exact
silhouette trace of the owner-approved isolated raster reference. The checked-in
trace records its source dimensions, original boundary-step count, and simplified
SVG control-point count. Its compound even-odd path must retain both the enclosed
outer circular boundary and the separate internal spiral cut-out. It must not be replaced with a merely similar spiral
equation. It is a temporary SVG preview only. It has no connector registry, POS,
phase, checkpoint, Floor, or learned-condition meaning.
The temporary right-hand decomposition is calculated from that trace rather than
drawn by eye. It least-squares-fits the exterior circle, finds the radial mode of
the white channel's near-circular run, and uses that calculated inner radius to
partition the exact filled silhouette into named outside-circle and middle-frond
SVG objects. That calculated intersection must be materialised as its own closed
`SPIRAL_FROND_ISOLATED_PATH`; neither the full compound trace nor a runtime clip
is an acceptable substitute for the middle-frond object. The frond's lower stem
boundary must follow the sampled source contour from the calculated inner-circle
crossing to the traced lower-right cusp. A three-point triangle is not a valid
substitute because it cuts away that curved source boundary. The opposite cut
runs from the tangent point to that cusp. The unchanged canonical trace must recompose across those objects;
the white channel remains negative space. This remains a presentation experiment
with no connector, Floor, Condition, or POS meaning until owner confirmation.
A third temporary preview may uniformly scale that isolated complete frond from
its calculated lower-right stem tip while leaving the calculated outside-circle
object unchanged. The scale is one explicit variable and must transform the
frond's width, height, thickness, curl, and stem together; it must not deform
individual coordinates or change the circle.

The Connectors workspace reads the shared drawing collection and live POS
catalog only. It must not read Floor Plans, Guest Records, consolidation, or
automatic tagging. Its engine previews use explicit example materials, not
saved teaching answers, and write no linguistic data.

## System Tag Test workspace

The owner may debug Recursion Path from the separate `System Tag Test`
workspace. Its one editable free-text field is transient test language, not an
addressed Sentence Structure and not a Floor edit. The debugger renders that
one submitted sentence only, beginning with all POS,
dots, and rails unresolved, and exposes exactly two controls: `One step` and
`Full tag`. Both controls use the same Recursion Path session and operation
boundary. `One step` advances exactly one observable engine operation. `Full
tag` repeatedly requests that same next operation until the passage completes;
it is not a second inference engine or batch route. Each request sends exactly
the current normalized `textMi` plus its transient session ID; it must not send
or load a Sentence Structure address, initialise, iterate, or carry a
corpus-sized test request. Its strict door operation is `step-recursion-path`,
whose input contains one `textMi`, never a source address or text array. Editing
the text discards only that temporary session.

Both buttons stay directly below Passage 1 and above the current
operation details, so a long condition list never forces the owner to scroll to
the bottom before advancing or completing the test.

An always-visible key/value table sits below Passage 1 and the controls. Before
the first operation it says that no actual learned word has been loaded. After
each `potentials_opened` operation it is labelled `Actual learned-word record`
and renders the literal strictly parsed word and every condition passed into
Recursion Path—never a generic blueprint or placeholder. Every indexed
`conditions[n].local`, `left[n]`, and `right[n]` shape shows all thirteen physical
fields: `ours`, `family`, `teAka`, `categories`, `dot`, `leftRail`, `rightRail`,
`leftConnectorEnd`, `leftConnectorFamily`, `rightConnectorEnd`,
`rightConnectorFamily`, `blockColor`, and `blockType`. Every indexed `sources[n]` shows the real
`structureId` and `floorFingerprint`; no persisted key may be hidden.
There is exactly one reusable `WordConditionShape`. `LearnedWord.conditions[]`
contains a `local` shape plus `left[]` and `right[]` lists made exclusively from
that identical shape, and maintenance-only `sources[]` Floor addresses which the
engine never reads, filters, or scores.
`RecursionTicket` carries
the origin word and selected condition, direction, one target shape, current
word and selected condition, visited path, and return point. No separate
neighbour-shaped object is permitted. Storage IDs, deduplication keys, proof
addresses, and current database field names remain outside this approval view.
`blockColor` is always the top colour of the word represented by that same
`WordConditionShape`. `blockType` is, for now, the normalized starting word of
that same coloured block: `kei` for a `Kei runga` block and `te` for a
`te manu` block. Neither value describes a left or right neighbouring block. The
only left/right coloured paths are that shape's `leftRail` and `rightRail`;
fields such as `leftBlock`, `rightBlock`, or `neighbourBlock` are forbidden.
`leftConnectorEnd` and `rightConnectorEnd` are the exact abstract topology at
those two sides. `leftConnectorFamily` and `rightConnectorFamily` identify the
exact accepted POS Family whose connector design owns that side. They are not
another rail, checkpoint, motif name, colour, or specific POS field.
Their closed values are:

- `leftConnectorEnd`: `send`, `accept`, `none`, or null when unresolved;
- `leftConnectorFamily`: the preceding word's Family for either derived
  `send` or `accept`, and null for `none` or an unresolved ending;
- `rightConnectorEnd`: `send`, `accept`, `cap`, or null when unresolved; and
- `rightConnectorFamily`: the current word's Family for `send`, `accept`, or
  `cap`, and null for an unresolved ending.

The confirmed Floor stores only each word's `rightConnectorEnd`. Its checkpoint
and right ending must agree exactly: `must_continue` permits `send` or `accept`,
`may_end` requires `cap`, and an unresolved checkpoint requires null. A
checkpoint does not choose between the two continuing orientations.
Consolidation derives the opposite face on the following word without adding a
second Floor field: preceding `send` becomes following-left `accept`, preceding
`accept` becomes following-left `send`, preceding `cap` becomes following-left
`none`, and preceding null becomes following-left null. The first word always
has `leftConnectorEnd: none`. This is a symmetric boundary contract, so a
pattern such as `T–V–T` can store right-facing `send` on the first T and
right-facing `accept` on V, producing an inward, left-facing `send` on the final
T.

Connector Family ownership follows the Floor boundary's left-hand word, not
which side is male or female. Its right `send`, `accept`, or `cap` uses that
word's Family, and the following word's complementary left face retains the
same preceding Family. Reversing a boundary therefore reverses its male/female
geometry without replacing a Verb Koru with the following word's motif. `none`
and unresolved sides own no Family. No SVG name, male/female label, rail colour,
or source address is stored in the ending fields. The Connectors workspace maps the stored Family to its
accepted motif, such as Particle to double-frond Koru and Verb to rolling-wave
Koru. The renderer reads this topology and applies only the same complement
projection; it must not infer a face from POS, checkpoint, word identity, or a
hard-coded sentence pattern. Recursion Path includes both ending roles and
their Families in its exact condition-shape comparison so a learned `send` face
cannot silently match `accept`, a cap, or a different Family. The existing rail
comparison still owns path traversal: connector topology does not replace it,
score it, or cast a duplicate vote for the dot.
For each actual condition the table separates `this word’s knowledge`, `left`,
`right`, and `sources`. The temporary Recursion ticket remains in the current
operation display because it is not part of the persisted learned-word record.
Context belonging to another word must never appear under the local singular
word-knowledge heading.

The server retains one short-lived resumable controller over the frozen Guest
snapshot for the submitted free text only. It invokes Recursion Path for exactly one unresolved origin at a
time, immediately applies everything returned by the first successful pathway,
skips words thereby resolved, and only then selects the next unresolved origin.
Each `One step` request advances that controller by exactly one
operation and then suspends it: open one room's potential list (with its carried
ticket visibly attached when it is not the origin), create one purpose ticket,
compare one room potential with that ticket, return one result to its parent
frame, reject one origin path, or resolve one literal field. The server must not
finish the algorithm first and replay a stored trace. The UI must never
manufacture explanation steps from a final answer. It applies a field only when
that exact engine operation is `field_resolved`; other sentences remain
untouched. Full stops remain real sentence boundaries, and no component may
become an artificial Floor or cross-sentence inference chain. The workspace
must not show a copy-result summary or report panel. Passage 1 must picture the
current operation through its actual word shapes, conditions, ticket, path,
return result, and field change. It must not add a `Step N · one operation`,
`Ask “word”: what can you be?`, or explanatory opening sentence above those
values. The owner-facing structured UI is the sole visible
step display; it must not add a raw JSON, system-object, or developer-data panel
above or below that UI. Debug totals cover Passage 1 only.

Every `potentials_opened` operation must expose a strict diagnostic alongside
the condition shapes: whether the learned word existed, its condition count,
its Te Aka candidates, frozen relationship-library word and condition counts,
candidate counts before and after locked UI fields, and one exact empty reason.
Every attempted handshake must expose the precise mismatched shape fields and
the required versus actual touching rail. A bare `No potentials`, `not set`, or
`Rejected` without those diagnostics is forbidden.

This stepped debugger is a transient, read-only preview. Its inference boundary
receives the submitted free-text words, one frozen Guest Record snapshot, and Te Aka
fallback only. It must not read `floor_plan` or any saved
Floor value; it begins the submitted text from an empty transient sheet and never
writes a Floor or Guest Record. The visible receipt must state `Floor reads: 0`
and `Floor writes: 0`. One paragraph request freezes Guest Records once, so no
other sentence can be loaded, advanced, or become evidence in the same run.

This first Passage 1 debugger is deliberately a reconstruction test: it may use every
already-compiled Guest Record source, including a source originally consolidated
from the sentence now being reconstructed. It asks whether Guest knowledge can
rebuild its teaching example without consulting Floor answers. The later hidden
generalisation test applies the stricter target-source and related-variant
exclusions defined under Leakage-proof evaluation.

## Levels workspace

The public curriculum prototype shows the current canonical ordered roster of
Sentence Structures in a separate `Levels` workspace. The roster count is not
fixed. The owner may assign each structure to exactly one of six curriculum
levels, `Level 1` through `Level 6`, or leave it unassigned while the curriculum
is being organised.

The assignment is presentation-only curriculum data keyed by the stable
`structure_id`. It does not alter the canonical sentence text, canonical sort
order, Floor Plan, Check-in Sheet, Guest Record, POS, dot, rail, relationship
message, engine candidate, score, proof, or automatic-tagging outcome. No
tagging or consolidation worker may read the curriculum level.

The assignment lives only in nullable `public.sentence_structure.curriculum_level`,
whose closed values are integers `1` through `6`. A narrow sentence-level write
route may set that field or clear it to null. It must not create an alternate
sentence roster, duplicate sentence record, tagging input, or secondary browser
store. The workspace opens on an
`Unassigned` tab beside exactly six curriculum tabs. Every loaded canonical
structure appears in exactly one of those seven tabs. Assigning a structure from
`Unassigned` removes it from that tab immediately and places it in the chosen
curriculum-level tab. Counts are derived from the database-reread roster.

### Canonical sentence maintenance

Levels is also the one owner-facing route for correcting or deleting a canonical
Sentence Structure. It is not a local text override or hidden-row list.

Every edit or delete request carries the stable `structure_id` and the exact
currently displayed Māori text as a stale-write guard. The server locks that
row and performs one narrow database transaction. An edit preserves the stable
ID and sort position, replaces `text_mi` and its contiguous token seats, retains
the structure's pedagogical variants, retracts that structure's rebuildable
Guest source contributions, and deletes its old Floor Plan so the corrected
sentence begins fresh review. A delete performs the same safe source retraction,
permanently retires the stable ID, deletes the canonical row and its dependent token,
variant, and Floor rows, and compacts the surviving sort order without changing
any surviving stable ID.

Every current learned condition contains the complete approved local/left/right
shapes and its exact Floor addresses. Sentence mutation retracts only that
`structureId` from learned conditions and recompiles only the affected Floor's
words: identical shapes collapse to one condition item, its `sources[]` are
recalculated, and source-empty words vanish. It must never leave stale knowledge
or guess how to weaken a learned word.

The UI never saves an edit on blur. It requires Save or Enter, rereads the
canonical roster after acknowledgement, and shows database failures without
discarding the draft. Delete requires an explicit confirmation naming the exact
sentence and warning that its saved Floor work will be removed. No mutation
touches the read-only `words_clean.maori_sentence_structure` staging copy.

## Implementation order

1. Strict Guest Record and relationship-message schemas.
2. Pure Recursion Path engine and leakage tests.
3. One guarded Guest Record persistence owner attached to Māori words.
4. Explicit confirmed-sentence consolidation.
5. Replace the saved-Floor-history automatic route.
6. Investigation diagnostics.
7. Sequential hidden-page evaluation.

The end-state success condition is: deterministic completion, zero unsupported
guesses, zero AI interventions, and zero human interventions on unseen text.
