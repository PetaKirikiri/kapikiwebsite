/** Reusable scene behind page content; the atmosphere never intercepts controls. */
export default function ForestScene() {
  return <div className="ka-forest-scene" aria-hidden="true">
    <div className="ka-forest-art" />
    <div className="ka-forest-sunlight" />
    <div className="ka-forest-mist" />
    <div className="ka-forest-mist ka-forest-mist-near" />
    <div className="ka-forest-shade" />
    <div className="ka-forest-leaves">{Array.from({ length: 5 }, (_, index) => <i key={index} />)}</div>
    <div className="ka-forest-lights">{Array.from({ length: 8 }, (_, index) => <i key={index} />)}</div>
  </div>
}
