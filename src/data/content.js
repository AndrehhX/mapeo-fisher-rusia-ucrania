/**
 * Contenido del mapeo. Todo el texto proviene del informe de investigación de Andreh Callejas
 * ("La guerra entre Rusia y Ucrania", corte 9 de noviembre de 2026) y de
 * Fisher et al. (2010), cap. 2. Cuando algo es interpretación propia, se indica.
 */

export const CUTOFF = '9 de noviembre de 2026'
export const AUTHOR = 'Andreh Callejas'

// Delimitación del mapa (Fisher, paso 1: qué, cuándo y desde qué punto de vista)
export const SCOPE = [
  { k: 'Qué', v: 'Guerra Rusia–Ucrania' },
  { k: 'Cuándo', v: '2022 → nov 2026 · 2014 como antecedente' },
  { k: 'Desde', v: 'Un estudiante en Guatemala' },
]


/* ───────────────────────── Método (Fisher et al., 2010, cap. 2) ───────────────────────── */
export const LEGEND = [
  { type: 'circle', name: 'Círculos', text: 'Partes involucradas. Tamaño = poder en relación con el tema.' },
  { type: 'line', name: 'Línea recta', text: 'Vínculo o relación bastante estrecha.' },
  { type: 'dotted', name: 'Línea punteada', text: 'Vínculo informal o intermitente.' },
  { type: 'double', name: 'Línea doble', text: 'Alianza.' },
  { type: 'arrow', name: 'Flecha', text: 'Dirección predominante de influencia o actividad.' },
  { type: 'zigzag', name: 'Zigzag', text: 'Discordia, conflicto (como un relámpago).' },
  { type: 'broken', name: 'Línea con muro', text: 'Conexión rota.' },
  { type: 'box', name: 'Cuadros', text: 'Temas, tópicos o cosas — no personas.' },
  { type: 'shadow', name: 'Sombra', text: 'Actores externos que influyen sin estar directamente involucrados.' },
]

/* ───────────────────────── Mapa: nodos ───────────────────────── */
// power: 0..1 → radio de la esfera. pos: coordenadas en la escena.
export const ACTORS = [
  {
    id: 'ua',
    since: 2014,
    name: 'Ucrania',
    full: 'Gobierno y fuerzas armadas de Ucrania',
    kind: 'Parte directa',
    color: '#3d8bff',
    power: 0.78,
    pos: [-3.0, 0.2, 0],
    img: 'img/zelensky.webp',
    role: 'Parte estatal directamente enfrentada a Rusia.',
    interests: [
      'Preservar soberanía e integridad territorial',
      'Negociar sobre territorios ocupados sin legitimar anexiones',
      'Garantías de seguridad que disuadan otra invasión',
      'Mantener capacidad de defensa y vínculos con Europa y la OTAN',
    ],
    position: [
      'No ceder territorio',
      'Alto el fuego como primer paso',
      'Garantías de seguridad concretas',
      'Participación europea en la negociación',
    ],
  },
  {
    id: 'ru',
    since: 2014,
    name: 'Rusia',
    full: 'Gobierno y fuerzas armadas de Rusia',
    kind: 'Parte directa',
    color: '#e0313f',
    power: 1,
    pos: [3.1, 0.25, 0],
    img: 'img/putin-2022.webp',
    role: 'Parte estatal que lanzó la invasión a gran escala y controla territorios ucranianos ocupados.',
    interests: [
      'Mantener o consolidar control territorial',
      'Impedir o limitar la integración militar ucraniana con la OTAN',
      'Garantías de seguridad en Europa',
      'Limitar la capacidad militar ucraniana',
    ],
    position: [
      'Retiro ucraniano de las 4 regiones declaradas anexadas',
      'Renuncia de Ucrania a la OTAN',
      'Restricciones militares a Ucrania',
      'Acuerdo integral antes de un alto el fuego',
      'Sin Europa en esta fase',
    ],
  },
  {
    id: 'defacto',
    since: 2014,
    name: 'Autoridades de facto',
    full: 'Autoridades de facto y fuerzas en zonas ocupadas',
    kind: 'Parte directa (estatus disputado)',
    color: '#b5485a',
    power: 0.34,
    pos: [6.5, -2.1, 0.2],
    img: 'img/crimea-b.webp',
    role: 'Administraciones y formaciones locales instaladas o respaldadas por Rusia en partes de Ucrania.',
    interests: [
      'Sostener su control y su vínculo político con Rusia',
      'Evitar el restablecimiento de la autoridad de Kyiv',
    ],
    position: ['Su legitimidad es rechazada por Ucrania y por la Asamblea General de la ONU'],
  },
  {
    id: 'civ',
    since: 2014,
    name: 'Población civil',
    full: 'Población civil de Ucrania',
    kind: 'Población afectada',
    color: '#f2c14e',
    power: 0.3,
    pos: [0, -3.4, 0.4],
    img: 'img/metro-b.webp',
    role: 'Principal población afectada: desplazados, residentes cerca del frente y en territorios ocupados. No es un bloque homogéneo.',
    interests: [
      'Seguridad física y vivienda',
      'Servicios básicos (energía, calefacción, salud)',
      'Reunificación familiar y retorno seguro',
      'Participar en las decisiones sobre el futuro de sus comunidades',
    ],
    position: ['No controla la negociación, pero sus necesidades son un tema central'],
  },
  {
    id: 'by',
    since: 2022,
    name: 'Bielorrusia',
    full: 'Bielorrusia',
    kind: 'Aliado de Rusia',
    color: '#9c3b46',
    power: 0.36,
    pos: [6.7, 2.5, -0.4],
    img: 'img/minsk.webp',
    role: 'Aliado de Rusia; permitió usar su territorio en la ofensiva inicial.',
    interests: ['Apoyar la relación estratégica con Moscú', 'Gestionar los costos de la guerra y de las sanciones'],
    position: ['La Asamblea General de la ONU deploró su participación en el uso de la fuerza'],
  },
  {
    id: 'us',
    since: 2014,
    name: 'Estados Unidos',
    full: 'Estados Unidos',
    kind: 'Actor externo',
    color: '#7fb2ff',
    power: 0.82,
    pos: [-6.7, 2.5, -0.4],
    img: 'img/abudhabi.webp',
    role: 'Apoyo a Ucrania y actor diplomático central; participa en las conversaciones de noviembre de 2026.',
    interests: [
      'Apoyar la defensa ucraniana',
      'Contener la expansión de la guerra',
      'Negociar condiciones de seguridad',
    ],
    position: ['Su política puede alterar el volumen y la continuidad de la ayuda'],
  },
  {
    id: 'eu',
    since: 2014,
    name: 'UE y Europa',
    full: 'Unión Europea y Estados europeos',
    kind: 'Actor externo',
    color: '#5fd0ff',
    power: 0.7,
    pos: [-6.7, -1.9, -0.3],
    img: 'img/refugees.webp',
    role: 'Apoyo financiero, humanitario y militar a Ucrania; sanciones a Rusia; recepción de refugiados.',
    interests: [
      'Seguridad europea y defensa de la soberanía estatal',
      'Estabilidad regional y reducción de riesgos de escalada',
      'Recuperación de Ucrania',
    ],
    position: ['Ucrania quiere a Europa en la mesa; Rusia se opone en esta etapa'],
  },
  {
    id: 'io',
    since: 2014,
    name: 'ONU · OSCE · CICR · ACNUR',
    short: 'ONU y agencias',
    full: 'Organismos internacionales',
    kind: 'Mediación y protección',
    color: '#8fe3c8',
    power: 0.42,
    pos: [-3.4, -3.6, 0.2],
    img: 'img/osce.webp',
    role: 'Diplomacia, monitoreo, asistencia y protección humanitaria según el mandato de cada institución.',
    interests: [
      'Reducir daños a civiles y facilitar asistencia',
      'Proteger prisioneros y desplazados',
      'Apoyar el diálogo y documentar hechos',
    ],
    position: ['No todos tienen mandato o capacidad para imponer un acuerdo'],
  },
  {
    id: 'self',
    since: 2026,
    name: 'Yo',
    full: 'Andreh Callejas (UVG, Guatemala)',
    kind: 'Observador',
    color: '#ffffff',
    power: 0.2,
    self: true,
    pos: [-6.4, -4.7, 0.6],
    role: 'Fisher pide situarse en el mapa: quien analiza no está por encima de la situación. Mi acceso al conflicto es a través de informes y medios.',
    interests: ['Comprender el conflicto con fuentes verificables', 'Distinguir hechos, posiciones y análisis'],
    position: ['Observador académico externo'],
  },
]

/* ───────────────────────── Mapa: asuntos (cuadros) ───────────────────────── */
export const ISSUE_BOXES = [
  { id: 'i-sec', label: 'Seguridad y alianzas (OTAN)', pos: [0, 1.5, 0.3] },
  { id: 'i-ter', label: 'Territorio y soberanía', pos: [0, 0.22, 0.6] },
  { id: 'i-cf', label: 'Alto el fuego y secuencia', pos: [0, -1.05, 0.3] },
]

/* ───────────────────────── Mapa: relaciones ───────────────────────── */
// type: line | dotted | double | arrow | zigzag | broken  · main: conflicto principal
export const RELATIONS = [
  // tier 1: estructura principal (siempre visible) · tier 2: secundarias (tenues hasta que se señalan)
  // arc: [altura del vértice, profundidad] curva las relaciones largas por arriba/abajo y hacia el fondo
  { a: 'ua', b: 'ru', since: 2014, type: 'zigzag', main: true, tier: 1, label: 'Conflicto principal', text: 'Guerra abierta desde la invasión a gran escala del 24 feb 2022; conflicto armado desde 2014. Las partes describen de forma incompatible las causas y las condiciones para terminarla.' },
  { a: 'us', b: 'ua', since: 2022, type: 'double', tier: 1, label: 'Alianza · apoyo', text: 'Apoyo militar, financiero y político a Ucrania. Su política puede cambiar el volumen y continuidad de la ayuda.' },
  { a: 'eu', b: 'ua', since: 2022, type: 'double', tier: 1, label: 'Alianza · apoyo', text: 'Apoyo financiero, humanitario y militar; recepción de 5,3 millones de refugiados en Europa.' },
  { a: 'ru', b: 'by', since: 2022, type: 'double', tier: 1, label: 'Alianza', text: 'Bielorrusia, aliado estratégico de Moscú, permitió usar su territorio en la ofensiva inicial.' },
  { a: 'ru', b: 'defacto', since: 2014, type: 'arrow', tier: 1, label: 'Control y respaldo', text: 'Administraciones y formaciones instaladas o respaldadas por Rusia. Buscan evitar que vuelva la autoridad de Kyiv; Ucrania y la ONU rechazan su legitimidad.' },
  { a: 'ru', b: 'civ', since: 2014, type: 'zigzag', tier: 1, label: 'Ataques y ocupación', text: 'Ataques de largo alcance contra ciudades e infraestructura energética; comunidades bajo ocupación. 328 civiles muertos y 2.105 heridos verificados solo en septiembre de 2026.' },
  { a: 'ua', b: 'civ', since: 2014, type: 'line', tier: 1, label: 'Protección', text: 'El Estado ucraniano y su población: seguridad, servicios, retorno y reconstrucción.' },
  { a: 'io', b: 'civ', since: 2022, type: 'arrow', tier: 1, label: 'Asistencia humanitaria', text: 'Para 2026, 10,8 millones de personas necesitan asistencia; el plan humanitario busca atender a 4,1 millones.' },
  { a: 'by', b: 'ua', since: 2022, type: 'arrow', tier: 2, arc: [3.1, -1.6], label: 'Territorio para la invasión', text: 'La invasión del 24 feb 2022 partió también desde Bielorrusia. La Asamblea General deploró su participación.' },
  { a: 'us', b: 'ru', since: 2026, type: 'dotted', tier: 2, arc: [4.1, -2.2], label: 'Negociación intermitente', text: 'Sanciones a Rusia y, a la vez, canal de negociación: conversaciones en Abu Dabi el 10 y 11 de noviembre de 2026.' },
  { a: 'eu', b: 'ru', since: 2014, type: 'broken', tier: 2, arc: [-5.3, -2.2], label: 'Relación rota', text: 'Sanciones europeas a Rusia. Moscú rechaza la presencia europea en esta fase de la negociación.' },
  { a: 'us', b: 'eu', since: 2014, type: 'line', tier: 2, label: 'Relación estrecha', text: 'Coordinan apoyo a Ucrania y sanciones, aunque “la comunidad internacional” no es un actor único ni tiene intereses idénticos.' },
  { a: 'io', b: 'ua', since: 2014, type: 'dotted', tier: 2, label: 'Monitoreo y diplomacia', text: 'Monitoreo de derechos humanos (HRMMU), documentación de hechos y canales diplomáticos y humanitarios, por ejemplo sobre prisioneros.' },
  { a: 'self', b: 'io', since: 2026, type: 'dotted', tier: 2, label: 'Acceso a información', text: 'Mi relación con el conflicto es indirecta: a través de informes de la ONU, ACNUR, Banco Mundial y prensa (AP).' },
]

/* ───────────────────────── Recorrido guiado del mapa ───────────────────────── */
export const TOUR = [
  { title: 'Las partes', text: 'Rusia, el círculo más grande: invadió y controla territorio. Ucrania resiste, casi igual de grande.', focus: ['ua', 'ru'], cam: [0, 0.6, 9.5] },
  { title: 'El conflicto', text: 'El zigzag es la guerra. Los cuadros, lo que disputan: territorio, seguridad y el alto el fuego.', focus: ['ua', 'ru', 'i-sec', 'i-ter', 'i-cf'], cam: [0, 0, 8.4] },
  { title: 'Las alianzas', text: 'Líneas dobles. Bielorrusia con Rusia. Estados Unidos y Europa con Ucrania.', focus: ['by', 'ru', 'us', 'eu', 'ua'], cam: [0, 0.6, 15] },
  { title: 'Lo que se rompió', text: 'Europa y Rusia: relación rota. Estados Unidos y Rusia: un canal intermitente, Abu Dabi.', focus: ['eu', 'ru', 'us'], target: [-1.2, -0.9, 0], cam: [-1.2, -0.6, 15.5] },
  { title: 'Quien menos decide', text: 'La población civil: el círculo más pequeño y el que recibe los ataques.', focus: ['civ', 'io', 'ru', 'ua'], cam: [0, -1.4, 9] },
  { title: 'Y yo', text: 'Fisher pide ubicarse en el mapa. Mi vínculo es indirecto: informes y medios.', focus: ['self', 'io'], cam: [-2, -2.4, 8] },
]

/* ───────────────────────── Referencias ───────────────────────── */
export const REFERENCES = [
  'Associated Press. (9 de noviembre de 2026). Peace talks involving the US, Russia and Ukraine start Tuesday. Here’s what to know.',
  'Asamblea General de las Naciones Unidas. (27 de marzo de 2014). Resolución 68/262, “Territorial integrity of Ukraine”.',
  'Asamblea General de las Naciones Unidas. (2 de marzo de 2022). Resolución ES-11/1, “Aggression against Ukraine”.',
  'Consejo de Seguridad de las Naciones Unidas. (17 de febrero de 2015). Resolución 2202 (2015).',
  'Fisher, S., Abdi, D. I., Ludin, J., Smith, R., Williams, S. y Williams, S. (2010). Trabajando con el conflicto: Habilidades y estrategias para la acción. Guatemala: CEPADE/CIDECA/RTC.',
  'Human Rights Monitoring Mission in Ukraine. (16 de octubre de 2026). Civilian casualties remain at record levels amid intensifying attacks on energy as winter approaches.',
  'Naciones Unidas en Ucrania. (13 de enero de 2026). As the relentless war in Ukraine grinds on, humanitarian partners aim to reach 4.1 million people in 2026.',
  'Naciones Unidas en Ucrania. (23 de febrero de 2026). World Bank, United Nations and the European Union issues Rapid Damage and Needs Assessment (RDNA5).',
  'UNHCR. (diciembre de 2025). 2026 Snapshot of Updated 2025–2026 Ukraine Situation.',
  'Walker, N. (22 de agosto de 2023). Conflict in Ukraine: A timeline (2014 – eve of 2022 invasion). House of Commons Library.',
]

/* ───────────────────────── Pies de foto ───────────────────────── */
export const CAPTIONS = {
  '1991-rada': 'Tablero de votación de la Rada Suprema, 24 de agosto de 1991.',
  'maidan-a': 'Plaza de la Independencia, Kyiv, 19 de febrero de 2014.',
  'maidan-b': 'Euromaidán, Kyiv, 2014.',
  'maidan-c': 'Barricadas del Euromaidán, Kyiv, 2014.',
  'crimea-a': 'Soldados sin insignias en la base de Perevalne, Crimea, 9 de marzo de 2014.',
  'crimea-b': 'Base militar de Perevalne, Crimea, marzo de 2014.',
  'donbas-a': 'Barricada en Sloviansk, abril de 2014.',
  'donbas-b': 'Soldados ucranianos cerca de Sloviansk, 2014.',
  minsk: 'Cumbre del formato Normandía, Minsk, febrero de 2015.',
  osce: 'Misión Especial de Monitoreo de la OSCE en el este de Ucrania.',
  'putin-2022': 'Vladimir Putin, 24 de febrero de 2022.',
  metro: 'Refugio en el metro de Kyiv, febrero de 2022.',
  'metro-b': 'Estación de metro Zhytomyrska, Kyiv, 26 de febrero de 2022.',
  irpin: 'Evacuación de civiles bajo el puente destruido del río Irpin, 8 de marzo de 2022.',
  kharkiv: 'Centro de Járkiv tras bombardeos, 2022.',
  annex: 'Discurso de proclamación de anexión, septiembre de 2022.',
  kherson: 'Jersón tras el fin de la ocupación, 19 de noviembre de 2022.',
  bakhmut: 'Bajmut durante la batalla, marzo de 2023.',
  'bakhmut-b': 'Bosque arrasado cerca de Bajmut, 2023.',
  energy: 'Instalación energética en la región de Kyiv tras un ataque con drones, octubre de 2022.',
  blackout: 'Kyiv durante un apagón causado por ataques con misiles, noviembre de 2022.',
  refugees: 'Punto de recepción de refugiados ucranianos en Polonia, 2022.',
  'refugees-b': 'Refugiados ucranianos en Przemyśl, Polonia.',
  unga: 'Salón de la Asamblea General de la ONU, Nueva York.',
  abudhabi: 'Abu Dabi, sede de las conversaciones de noviembre de 2026.',
  zelensky: 'Volodímir Zelenski, presidente de Ucrania.',
  mariupol: 'Teatro Dramático de Mariúpol destruido, 2022.',
}

/* ───────────────────────── Guion de la presentación (5 min) ───────────────────────── */

// Párrafo que se ilumina palabra a palabra con el scroll
export const STATEMENT =
  'Fisher propone algo sencillo: dibujar a las partes, lo que disputan y cómo se relacionan. Un mapa no decide quién tiene razón. Muestra dónde está el poder, y dónde podría abrirse una salida.'

// Cuatro momentos a pantalla completa
export const SCENES = [
  { year: '2014', title: 'Crimea y el Donbás.', text: 'Rusia ocupa y anexa la península. Comienzan los combates en el este.', img: 'img/crimea-a.webp' },
  { year: '2015', title: 'Minsk no alcanza.', text: 'Altos el fuego frágiles. Ninguna solución política.', img: 'img/minsk.webp' },
  { year: '2022', title: 'La invasión.', text: '24 de febrero. Desde Rusia, Bielorrusia y Crimea. La ONU la llama agresión.', img: 'img/metro.webp' },
  { year: '2026', title: 'Desgaste.', text: 'Drones, misiles y apagones. Un frente que casi no se mueve.', img: 'img/energy.webp' },
]

// Lo que disputan: una línea por parte
export const STORIES = [
  { topic: 'Territorio', ua: 'Respeto a sus fronteras reconocidas.', ru: 'Crimea y cuatro regiones anexadas.' },
  { topic: 'Seguridad', ua: 'Garantías creíbles y libertad de alianzas.', ru: 'Ucrania fuera de la OTAN y con límites militares.' },
  { topic: 'Alto el fuego', ua: 'Primero el cese, después negociar.', ru: 'Primero un acuerdo integral.' },
]

// Cifras: una por pantalla
export const NUMBERS = [
  { value: 2105, label: 'civiles heridos en un solo mes', note: 'Septiembre de 2026, además de 328 muertos. Verificados por la ONU; la cifra real es mayor.', img: 'img/kharkiv.webp' },
  { value: 5.7, decimals: 1, unit: 'millones', label: 'de personas refugiadas', note: 'Desde febrero de 2022. 5,3 millones en Europa (ACNUR).', img: 'img/refugees-b.webp' },
  { value: 587.7, decimals: 1, prefix: 'US$', unit: 'mil millones', label: 'para reconstruir', note: 'Necesidades a diez años según el Banco Mundial, la ONU, la UE y Ucrania.', img: 'img/kherson.webp' },
]

// La mesa de Abu Dabi
export const TABLE = {
  ru: ['Retiro de las cuatro regiones', 'Ucrania fuera de la OTAN', 'Acuerdo antes del alto el fuego'],
  ua: ['No ceder territorio', 'Alto el fuego primero', 'Garantías y Europa en la mesa'],
}


/* ───────────────────────── Simulación: el mapa año por año ───────────────────────── */
export const EVOLUTION = [
  { year: 2014, title: '2014 · Crimea y el Donbás', text: 'Rusia ocupa Crimea y respalda a las autoridades de facto. Europa sanciona. Minsk no resuelve nada.' },
  { year: 2022, title: '2022 · La invasión', text: 'Bielorrusia presta su territorio. Estados Unidos y Europa se vuelven aliados de Ucrania. La ONU asiste a millones.' },
  { year: 2026, title: '2026 · Abu Dabi', text: 'Estados Unidos abre un canal con Rusia. Europa, fuera de la mesa. Así está el mapa hoy.' },
]
