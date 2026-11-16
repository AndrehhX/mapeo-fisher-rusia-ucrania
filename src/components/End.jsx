import credits from '../data/credits.json'
import { REFERENCES, CUTOFF, AUTHOR } from '../data/content'

export default function End() {
  return (
    <section className="end" id="cierre">
      <div className="wrap">
        <h2 className="display">
          Un mapa no termina una guerra.
          <br />
          <span className="dim">Ayuda a entender por dónde podría terminar.</span>
        </h2>

        <footer className="end-meta">
          <div>
            <h4>Mapeo del conflicto Rusia–Ucrania</h4>
            Por {AUTHOR}.
            <br />
            Metodología de Fisher et al. (2010).
            <br />
            Información al {CUTOFF}.
            <br />
            Universidad del Valle de Guatemala.
          </div>
          <div>
            <h4>Fuentes</h4>
            <ol>
              {REFERENCES.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ol>
            <details>
              <summary>Créditos de fotografía ({Object.keys(credits).length})</summary>
              <ol>
                {Object.entries(credits).map(([slug, c]) => (
                  <li key={slug}>
                    <a href={c.source} target="_blank" rel="noreferrer">
                      {c.title}
                    </a>
                    , {c.author}. {c.license}, Wikimedia Commons.
                  </li>
                ))}
                <li>Cartografía: Natural Earth (dominio público). Crimea según las fronteras reconocidas por la ONU (Res. 68/262).</li>
              </ol>
            </details>
          </div>
        </footer>
      </div>
    </section>
  )
}
