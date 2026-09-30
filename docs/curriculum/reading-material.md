# Controlled reading material

Updated 30 September 2026. The course roster and allocated vocabulary determine
what each reading may use. Storytelling does not introduce an extra grammar syllabus.

| Level | Reading | Situation and payoff | Current-level teaching | Earlier teaching reused |
| --- | --- | --- | --- | --- |
| 1 | Pepeha | A practical introduction | Naming, classification, origin, location | — |
| 2 | Te parāoa | Hana ate the bread yesterday and offers to buy it tomorrow; Maia wants it now | Past and future actions; suggestions; time anchors | Location, absence |
| 3 | Te waea | Maia opens a bag while holding the missing phone | Present negatives, not yet; afterwards | Location, past and current actions, suggestions |
| 4 | Ngā pukapuka | Reading the names reveals that two books have been swapped | Ownership and agent-emphatic past/future actions | Naming, reading, suggestions, ordinary past actions |
| 5 | Te pouaka | Maia carries the emptied box; Hana carries the books | Habitual actions, ability/inability, passives | Location, suggestions, agent-emphatic future, sequencing |
| 6 | Ngā mahi | Both people already have a job and try to avoid washing dishes; they agree to share it | Why someone will not do something; a conditional offer | Assigning responsibility, negatives, future actions, suggestions |

Each ordinary line carries `curriculum.structures`: references to the actual
course structure IDs. These are editorial traceability, not grammar-engine input.
Checks reject later-level references, missing references, and words outside the
cumulative vocabulary allocation (apart from named people and places).
Every later reading must use both its current level and previous-level frames.
These checks do not certify naturalness or grammatical correctness by themselves;
the lines have also been compared with their referenced course frames.

## Kīwaha

Only the two expressions explicitly allocated below are exposed. They are taught
as whole responses and are not permission to introduce their component grammar.
They do not count towards the ordinary vocabulary target or create learned POS.

| Expression | Introducing level | Meaning here | Dictionary source |
| --- | --- | --- | --- |
| Tau kē! | 1 | Great! | https://maoridictionary.co.nz/word/1845 |
| Hei aha! | 3 | Never mind! | https://maoridictionary.co.nz/word/1023 |

`courseLevel` and `english` on the existing vocabulary draft records select the
published expressions. Other proposed expressions remain unpublished. The earlier
teacher-review status remains explicit; course allocation does not claim formal
teacher approval. Every reading occurrence links to its introducing level's
vocabulary page within the same MOE or general route.

## Time and linking words

These are explicit editorial additions for narrative flow, recorded in
`courseReadingLanguage.ts` and linked from each story to the introducing level's
vocabulary section. Source evidence supports meaning/use, not the chosen course
level. This is not an expansion of the canonical sentence roster or learned POS.

| Introducing level | Expressions | Bounded use |
| --- | --- | --- |
| 2 | inanahi, ināianei, āpōpō | End-position yesterday, now, tomorrow with compatible frames |
| 3 | i muri mai | Later event in a past account: I muri mai, i … |
| 4 | ā | Joining complete clauses for successive actions only |
| 5 | Reuse earlier expressions | No extra connector introduced |
| 6 | engari | Contrast between complete clauses |

Every use records an expression ID as well as its base sentence-frame references.
Checks reject missing/unknown IDs, later-level expressions, incompatible frame
references and unsupported positions. Conjunctions require two clause references.
Only the exact registered expression is exempt from the ordinary-word allocation;
its other senses are not authorised. Naturalness and actual grammatical structure
still require editorial review. No “luckily”, “until” or unallocated indefinite
phrases were added. Linked source examples are exposed beside these expressions.

## Presentation and outstanding rail coverage

The existing reading cards and shared sentence renderer remain. Repeated dialogue
keeps separate speaker rows but requests automatic analysis only once per exact text.
Exact saved annotations may be reused only for the same sentence. No POS, rails,
word knowledge, or canonical sentence records were generated from the editorial
structure references.

At verification on 30 September, both the local and public `__website_sentence`
service returned an entirely unresolved state for `I hoko ahau i te parāoa.`,
with zero Floor reads and writes. New sentences therefore remain readable with
English translations but do not yet have complete rails. This is an outstanding
tagging-service limitation, not completed visual acceptance of rail coverage.
