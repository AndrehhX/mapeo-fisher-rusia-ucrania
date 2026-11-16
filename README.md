# Rusia–Ucrania · Mapeo del conflicto

Presentación web interactiva del conflicto entre Rusia y Ucrania, construida con la metodología de **mapeo de conflictos** de Simon Fisher et al. en *Trabajando con el conflicto: Habilidades y estrategias para la acción* (Guatemala: CEPADE/CIDECA/RTC, 2010).

Proyecto individual para la actividad de **aula invertida** del curso: investigar un conflicto internacional, mapearlo con la herramienta de Fisher y exponerlo a la clase con una actividad participativa.

> Corte de información: **9 de noviembre de 2026**. El estado de las negociaciones es una fotografía a esa fecha.

## Guion (≈ 5 minutos)

Una idea por pantalla, al estilo de una keynote:

| # | Escena | Qué se ve |
| --- | --- | --- |
| 1 | **Inicio** | Globo 3D de 22.000 puntos (Natural Earth). Con el scroll gira hacia Ucrania: *2014* (flechas hacia Crimea y el Donbás) y *2022* (ejes de la invasión que avanzan y misiles con impacto sobre ciudades). |
| 2 | **La idea** | La propuesta de Fisher en un párrafo que se ilumina palabra por palabra. |
| 3 | **Cuatro momentos** | 2014 · 2015 · 2022 · 2026 a pantalla completa con fotografías reales. |
| 4 | **El mapa** | Mapa de Fisher en 3D con recorrido guiado de 6 pasos y simulación **Evolución 2014 → 2026**: el mapa se arma año por año. |
| 5 | **Dos relatos** | Territorio, seguridad y alto el fuego: Ucrania frente a Rusia. |
| 6 | **Tres cifras** | 2.105 heridos en un mes · 5,7 millones de refugiados · US$587,7 mil millones. |
| 7 | **La mesa** | Abu Dabi: lo que exige Rusia y lo que propone Ucrania. |
| 8 | **Cierre** | Mensaje final, fuentes y créditos. |

## Características

- **Mapa de Fisher en 3D**, fiel a la leyenda del libro: círculos cuyo tamaño es el poder; líneas rectas, punteadas, dobles, flechas, zigzag y línea con muro; cuadros para los asuntos; sombras para los actores externos; y el propio autor ubicado en el mapa.
- **Animación de entrada**: los actores llegan volando desde el fondo y cada relación se dibuja trazo a trazo; detrás, la región en puntos (Natural Earth).
- **Delimitación** (Fisher, paso 1) visible sobre el mapa: qué se mapea, en qué periodo y desde qué punto de vista.
- **Panel por actor** con lo que quiere, su posición y sus relaciones.
- **Leyenda** y **Posiciones** (cuadros estilo figura 2.5 del libro) a un clic.
- **Atajos para exponer**: `AvPág` / `RePág` (o un clicker) pasan de escena; `F` pantalla completa; `←` `→` recorren el mapa; `Esc` vuelve a la vista general.
- Funciona **sin internet** una vez compilado: fuente e imágenes van incluidas.
- Respeta `prefers-reduced-motion`, escala la tipografía también por altura (proyectores) y es usable en móvil.

## Stack

| Área | Tecnología |
| --- | --- |
| Base | React 19 + Vite |
| 3D | Three.js, @react-three/fiber, @react-three/drei, @react-three/postprocessing (bloom) |
| Animación | GSAP + ScrollTrigger, Lenis (scroll suave) |
| Cartografía | world-atlas (Natural Earth), topojson-client, d3-geo |
| Tipografía | Inter Tight (Fontsource, autoalojada) |

## Instalación

Requiere Node.js 20 o superior.

```bash
npm install
npm run dev
```

Abrir `http://localhost:5173`.

## Compilación y despliegue

```bash
npm run build
npm run preview
```

La carpeta `dist/` es un sitio estático con rutas relativas (`base: './'`): puede publicarse en Vercel, Netlify o GitHub Pages, o abrirse desde un servidor local el día de la exposición.

Para regenerar la nube de puntos del globo:

```bash
node scripts/build-globe.mjs
```

## Estructura

```
├── public/img/             Fotografías (WebP) de Wikimedia Commons
├── scripts/build-globe.mjs Genera src/data/globe-points.json
└── src/
    ├── data/
    │   ├── content.js      Todo el contenido: guion, actores, relaciones, recorrido…
    │   ├── credits.json    Autor, licencia y fuente de cada fotografía
    │   └── globe-points.json
    ├── three/
    │   ├── Globe.jsx       Globo de puntos del inicio
    │   └── FisherMap3D.jsx Escena del mapa de Fisher
    ├── components/         Una escena por archivo (Hero, Statement, Scenes, MapSection…)
    ├── lib/                Scroll suave, GSAP y utilidades
    ├── App.jsx
    └── styles.css          Sistema visual
```

## Mantenimiento

- **Actualizar datos**: todo el texto está en `src/data/content.js` (`SCENES`, `STORIES`, `NUMBERS`, `TABLE`). Para cambiar el mapa basta con editar `ACTORS` (posición, poder, color, intereses), `RELATIONS` (tipo de línea y explicación) y `TOUR` (pasos del recorrido).
- **Tipos de relación** disponibles: `line`, `dotted`, `double`, `arrow`, `zigzag`, `broken`. `main: true` marca el conflicto principal y `bend` curva una línea larga para que no cruce el centro.
- **Imágenes**: colocar el archivo en `public/img/`, registrar su crédito en `src/data/credits.json` y su pie de foto en `CAPTIONS`.
- Al cambiar la fecha de corte, actualizar `CUTOFF` y `NUMBERS` con su fuente.

## Fuentes

El contenido proviene del informe de investigación del autor, basado en Associated Press, resoluciones de la Asamblea General y del Consejo de Seguridad de la ONU, la HRMMU, ACNUR, la evaluación RDNA5 y la House of Commons Library. La lista completa está en la sección *Fuentes* de la página.

Las fotografías provienen de Wikimedia Commons bajo licencias Creative Commons o de dominio público; cada una se acredita en la página. La cartografía es de Natural Earth (dominio público).

## Autoría

Desarrollado por **Andreh Callejas** — Universidad del Valle de Guatemala, 2026.
