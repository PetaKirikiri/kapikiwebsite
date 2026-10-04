import type { CSSProperties, ReactNode } from 'react'
import { courseBigWords, type BigWordStructure } from '../lib/courseBigWords'
import type { CurriculumLevel } from '../lib/sentenceStructureLevels'

export default function LevelBigWords({ level, sentences, nounCatalog, rail }: { level: CurriculumLevel; sentences?: readonly BigWordStructure[]; nounCatalog: { heading: string; examples: { kind: string; example: string; source: { structureId?: number; textMi: string; indices: number[] } }[] }; rail: (example: { structureId?: number; textMi: string; indices: number[] }, label: string, withText?: boolean, after?: { structureId?: number; textMi: string; indices: number[] }) => ReactNode }) {
  if (!sentences) return <p className="level-vocabulary-empty" role="status">Loading sentence structures…</p>
  const groups = courseBigWords(sentences, level).map(group => group.slot === 'noun' ? { ...group, followingHeading: nounCatalog.heading, following: nounCatalog.examples } : group)
  const showFollowing = level === 1 && groups.some(group => group.following?.length)
  return <div className="level-big-words">
    {[{ title: 'New here', items: groups.filter(group => group.level === level) }, { title: 'From earlier levels', items: groups.filter(group => group.level < level) }].filter(section => section.items.length).map(section => <section key={section.title} aria-label={section.title}>
      {level > 1 && <h3>{section.title}</h3>}
      <table className="level-big-word-table" aria-label={section.title}>
        <thead><tr><th scope="col">Big word</th><th scope="col">{showFollowing ? 'Within this section' : 'Meaning'}</th></tr></thead>
        <tbody>{section.items.map(group => <tr key={`${group.label}:${group.purpose}`}>
          <th scope="row"><span className="level-big-word-token"><span className="level-big-word-rails" aria-hidden="true">{rail(group.examples[0], group.label)}</span><span lang="mi">{group.label}</span></span>{showFollowing && <span className="level-big-word-purpose">{group.purpose}</span>}</th>
          <td>{showFollowing ? group.following ? <div className={group.followingHeading ? 'level-noun-tree' : undefined}>
            {group.followingHeading && <div className="level-noun-tree-root">{group.followingHeading}</div>}
            <div className="level-big-word-following" style={{ '--noun-branches': new Set(group.following.map(item => item.kind)).size } as CSSProperties}>{[...new Set(group.following.map(item => item.kind))].map(kind => <div className="level-noun-branch" key={kind}>
              <span>{kind}</span>
              {group.following!.filter(item => item.kind === kind).map(item => item.source ? <span key={item.example} className="level-big-word-following-sample" lang="mi">{rail(item.source, item.example, true, group.examples[0])}</span> : <span key={item.example} lang="mi">{item.example}</span>)}
            </div>)}</div>
          </div> : group.sectionComplete ? <span className="level-big-word-complete">Section complete</span> : group.purpose : group.purpose}</td>
        </tr>)}</tbody>
      </table>
    </section>)}
    {!groups.length && <p>No Big words mapped to this level’s sentence structures yet.</p>}
  </div>
}
