import './SiteIdentity.css'
import './LevelOnePepeha.css'

// A fictional worked example, separate from the canonical sentence roster.
// Possessive and sibling usage: https://kupu.maori.nz/possession/t-possession
// https://kupu.maori.nz/kupu/teina and https://kupu.maori.nz/kupu/tam%C4%81hine
const SECTIONS = [
  { title: 'Tūrangawaewae', meaning: 'Places I belong', lines: [
    ['Ko Ngongotahā te maunga.', 'Ngongotahā is the mountain.'],
    ['Ko Rotorua te roto.', 'Rotorua is the lake.'],
    ['Nō Rotorua ahau.', 'I am from Rotorua.'],
  ] },
  { title: 'Tūpuna', meaning: 'Ancestors', lines: [
    ['Nō Rotorua ōku tūpuna.', 'My ancestors are from Rotorua.'],
  ] },
  { title: 'Mātua', meaning: 'Parents', lines: [
    ['Ko Mere tōku whaea.', 'Mere is my mother.'],
    ['Ko Hemi tōku matua.', 'Hemi is my father.'],
  ] },
  { title: 'Tuākana, tēina', meaning: 'Siblings', lines: [
    ['Ko Hana tōku teina.', 'Hana is my younger sister.'],
  ] },
  { title: 'Tamariki', meaning: 'Children', lines: [
    ['Ko Rangi tāku tama.', 'Rangi is my son.'],
    ['Ko Aroha tāku tamāhine.', 'Aroha is my daughter.'],
  ] },
  { title: 'Mahi', meaning: 'Work', lines: [
    ['He kaiako ahau.', 'I am a teacher.'],
  ] },
  { title: 'Kāinga', meaning: 'Home', lines: [
    ['Kei Pōneke tōku kāinga.', 'My home is in Wellington.'],
  ] },
] as const

export default function LevelOnePepeha() {
  return <section className="site-card level-pepeha" aria-labelledby="level-pepeha-heading">
    <header className="site-card-cover level-pepeha-cover">
      <span className="level-pepeha-eyebrow">Pūrākau · Level 1</span>
      <h2 className="site-card-title" id="level-pepeha-heading">Ko Maia ahau.</h2>
      <p>Maia’s pepeha</p>
    </header>
    <p className="level-pepeha-intro">Meet Maia, a fictional teacher. Her pepeha connects the places and people she comes from with her life today.</p>
    <ol className="level-pepeha-sections">
      {SECTIONS.map(({ title, meaning, lines }, index) => <li key={title}>
        <div className="level-pepeha-section-label">
          <span className="level-pepeha-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
          <div><h3 lang="mi">{title}</h3><p>{meaning}</p></div>
        </div>
        <div className="level-pepeha-lines">
          {lines.map(([maori, english]) => <div className="level-pepeha-line" key={maori}>
            <p lang="mi">{maori}</p>
            <p lang="en">{english}</p>
          </div>)}
        </div>
      </li>)}
    </ol>
  </section>
}
