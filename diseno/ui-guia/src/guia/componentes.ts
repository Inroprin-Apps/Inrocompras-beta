// La lista de piezas de UI y si están aprobadas. /dev/colores (sección «Piezas de UI») se arma con esto: lo aprobado sube
// arriba, la línea lo separa de lo que falta, y cada pieza nueva entra abajo. Para aprobar una, se cambia
// su `status` aquí (el ejemplo vive en app/dev/colores/examples.tsx, por id).

export type ComponentStatus = 'aprobado' | 'pendiente';
/** De dónde viene la pieza: ya estaba en INROCONTA, se portó de GRAMA, o se escribió nueva. */
export type Origin = 'inroconta' | 'grama' | 'nuevo';

export interface ComponentEntry {
    id: string;
    title: string;
    origin: Origin;
    /** El archivo en esta guía (src/ui/…) y, si viene de GRAMA, el original. */
    source: string;
    status: ComponentStatus;
    /** Qué cambió frente al original, o qué hay que decidir. */
    note: string;
}

export const COMPONENTS: ComponentEntry[] = [
    {
        id: 'boton',
        title: 'Botón',
        origin: 'inroconta',
        source: 'ui/button.tsx',
        status: 'aprobado',
        note: 'Variantes primary, secondary, ghost, dashed y danger (sin botón negro), con cinco estados (hover 92 %, pulsado 84 %, foco con anillo, deshabilitado gris). De GRAMA: `dashed` (añadir donde no hay nada) e `iconOnly` (cuadrado, pide aria-label). El hover cambia el fondo, nunca el borde.',
    },
    {
        id: 'campo',
        title: 'Campo de formulario',
        origin: 'nuevo',
        source: 'ui/field.tsx',
        status: 'aprobado',
        note: 'Etiqueta arriba, y debajo la ayuda O el error (nunca los dos, así nada salta). Se marca lo opcional, no lo obligatorio.',
    },
    {
        id: 'buscador',
        title: 'Buscador',
        origin: 'inroconta',
        source: 'ui/bits.tsx · SearchBox',
        status: 'aprobado',
        note: 'Filtra 150 ms después de la última tecla. Su borde es el de control (≥3:1).',
    },
    {
        id: 'select-menu',
        title: 'Desplegable',
        origin: 'grama',
        source: 'ui/select-menu.tsx  ←  GRAMA shared/ui/select.tsx',
        status: 'aprobado',
        note: 'Reemplaza al <select> del navegador. Se cierra al elegir, al pulsar fuera y con Escape; se abre hacia arriba si abajo no cabe. Sin transparencias ni el registro de iconos de GRAMA.',
    },
    {
        id: 'filter-pill',
        title: 'Píldora de filtro',
        origin: 'grama',
        source: 'ui/filter-pill.tsx  ←  GRAMA shared/ui/filter-pill.tsx',
        status: 'aprobado',
        note: 'El filtro redondeado de una barra de herramientas. Activo = algo distinto de la primera opción. Cambié su cierre al hook en vez del telón `fixed`.',
    },
    {
        id: 'periodo',
        title: 'Período',
        origin: 'inroconta',
        source: 'ui/period-picker.tsx',
        status: 'aprobado',
        note: 'Primero el tipo (día, mes, trimestre, año, rango) y luego cuál; solo ofrece períodos con datos. Hecho con el desplegable y la fecha de GRAMA, sin los controles nativos del navegador.',
    },
    {
        id: 'segmentado',
        title: 'Segmentado',
        origin: 'inroconta',
        source: 'ui/card.tsx · Segmented',
        status: 'aprobado',
        note: 'Para 2 a 4 vistas de lo mismo que se cambian a menudo.',
    },
    {
        id: 'tabs',
        title: 'Pestañas',
        origin: 'grama',
        source: 'ui/tabs.tsx  ←  GRAMA shared/ui/tabs.tsx',
        status: 'aprobado',
        note: 'Barra subrayada o píldoras. Cada pestaña tiene enlace propio (#fragmento) y los paneles llegan ya pintados. Quité el ancla de tutorial y la medición.',
    },
    {
        id: 'tooltip',
        title: 'Tooltip',
        origin: 'grama',
        source: 'ui/tooltip.tsx  ←  GRAMA shared/ui/tooltip.tsx',
        status: 'aprobado',
        note: 'Explica un icono al posar el cursor o con el teclado. Fondo `ink` (el oscuro del texto) en lugar del `chrome` de GRAMA.',
    },
    {
        id: 'drop-zone',
        title: 'Zona de archivos',
        origin: 'grama',
        source: 'ui/drop-zone.tsx  ←  GRAMA shared/ui/drop-zone.tsx',
        status: 'aprobado',
        note: 'La forma de pedir un archivo: arrastrar o hacer clic. Deshabilitado ahora es gris (antes opacidad).',
    },
    {
        id: 'tarjeta',
        title: 'Tarjeta',
        origin: 'inroconta',
        source: 'ui/card.tsx · Card',
        status: 'aprobado',
        note: 'Blanca, borde `line`, sin sombra, esquinas de 12 px.',
    },
    {
        id: 'kpi',
        title: 'KPI',
        origin: 'inroconta',
        source: 'ui/card.tsx · Kpi',
        status: 'aprobado',
        note: 'Etiqueta arriba, pastilla de estado opcional a la derecha, cifra grande con su unidad y nota abajo; con enlace lleva la flecha ↗. Cuando hay algo que corregir, la etiqueta pasa a rojo y la pastilla lo dice. Con el valor viajando, un hueco.',
    },
    {
        id: 'chip',
        title: 'Chip',
        origin: 'inroconta',
        source: 'ui/card.tsx · Chip',
        status: 'aprobado',
        note: 'Fondo suave y texto fuerte del rol (ahora derivados del color base).',
    },
    {
        id: 'aviso',
        title: 'Aviso',
        origin: 'inroconta',
        source: 'ui/bits.tsx · Notice',
        status: 'aprobado',
        note: 'Para algo que afecta a toda la pantalla y sigue siendo cierto. Vestido como el toast (tarjeta blanca con borde gris fino): la clase de aviso (error, advertencia, información o correcto) la dice solo el icono de color. Se puede cerrar con la equis para que no moleste; vuelve al recargar. Se queda mientras sea cierto; el toast se va solo.',
    },
    {
        id: 'toast',
        title: 'Toast',
        origin: 'inroconta',
        source: 'ui/toaster.tsx',
        status: 'aprobado',
        note: 'Confirma lo que se acaba de hacer; el color va solo en el icono. Mismo diseño que el de GRAMA, sobre sonner.',
    },
    {
        id: 'tabla',
        title: 'Tabla y paginador',
        origin: 'inroconta',
        source: 'ui/bits.tsx · T, ui/pager.tsx',
        status: 'aprobado',
        note: 'Cabecera en minúsculas (small, medio, gris) sobre un gris muy suave, con línea arriba y debajo, bordes verticales solo en los lados externos y la flecha de orden siempre visible (azul = ordenada así); filas holgadas con su divisor; cifras a la izquierda con tabular-nums, 30 filas por página.',
    },
    {
        id: 'barra',
        title: 'Barra con cifra',
        origin: 'inroconta',
        source: 'ui/bits.tsx · BarRow',
        status: 'aprobado',
        note: 'Comparar con barras. La fila elegida lleva fondo azul suave (primary-soft), con 8 px de relleno.',
    },
    {
        id: 'anillo',
        title: 'Anillo',
        origin: 'inroconta',
        source: 'ui/bits.tsx · Ring',
        status: 'aprobado',
        note: 'Un porcentaje con la cifra dentro. Trazo delgado (5).',
    },
    {
        id: 'hueco',
        title: 'Hueco de carga',
        origin: 'inroconta',
        source: 'ui/hueco.tsx',
        status: 'aprobado',
        note: 'Ocupa el sitio exacto del dato que aún viaja; la pantalla de carga ES la pantalla final.',
    },
    {
        id: 'floating-panel',
        title: 'Panel flotante',
        origin: 'grama',
        source: 'ui/floating-panel.tsx  ←  GRAMA shared/ui/floating-panel.tsx',
        status: 'aprobado',
        note: 'Un panel que cuelga de un control, pintado en un portal: no lo tapa ni lo recorta nada. Se coloca debajo, o encima si abajo no cabe. Es la base de la fecha y la hora.',
    },
    {
        id: 'date-field',
        title: 'Fecha',
        origin: 'grama',
        source: 'ui/date-field.tsx  ←  GRAMA shared/ui/date-field.tsx',
        status: 'aprobado',
        note: 'Un día elegido de un calendario, en lugar de <input type="date">. La cabecera abre los años y los meses; «Hoy» y «Quitar fecha». Usa react-day-picker. Sin opacidades.',
    },
    {
        id: 'time-field',
        title: 'Hora',
        origin: 'grama',
        source: 'ui/time-field.tsx  ←  GRAMA shared/ui/time-field.tsx',
        status: 'aprobado',
        note: 'Una hora escrita o elegida: entiende «15:30», «1530», «3pm»; lista de cada media hora; flechas del teclado.',
    },
    {
        id: 'date-time-input',
        title: 'Fecha y hora',
        origin: 'grama',
        source: 'ui/date-time-input.tsx  ←  GRAMA shared/ui/date-time-input.tsx',
        status: 'aprobado',
        note: 'Día y hora guardados como un solo instante. Quité el «borde del día» de aperturas y cierres de GRAMA: aquí no se envía nada hasta que están las dos mitades.',
    },
    {
        id: 'multi-choice',
        title: 'Selección múltiple',
        origin: 'grama',
        source: 'ui/multi-choice.tsx  ←  GRAMA shared/ui/multi-choice.tsx',
        status: 'aprobado',
        note: 'Elegir varios valores. Lo marcado es lo elegido; «Seleccionar todos»; buscador cuando hay más de 8 opciones.',
    },
    {
        id: 'error-boundary',
        title: 'Frontera de error',
        origin: 'grama',
        source: 'ui/error-boundary.tsx  ←  GRAMA shared/ui/error-boundary.tsx',
        status: 'aprobado',
        note: 'Lo que se rompe en una zona no se lleva la pantalla. Quité PostHog: el reporte va por `onError` y cada app decide adónde.',
    },
    {
        id: 'enter-form',
        title: 'Formulario con Enter',
        origin: 'grama',
        source: 'ui/enter-form.tsx  ←  GRAMA shared/ui/enter-form.tsx',
        status: 'aprobado',
        note: 'Un <form> de verdad: Enter guarda y, si se pide, Escape cancela. Sin repetir un onKeyDown en cada casilla.',
    },
    {
        id: 'hover-marquee',
        title: 'Texto que se desliza',
        origin: 'grama',
        source: 'ui/hover-marquee.tsx  ←  GRAMA shared/ui/hover-marquee.tsx',
        status: 'aprobado',
        note: 'Un título largo se lee entero al pasar el cursor, sin ensanchar la columna. Si no cabe, se desliza; si cabe, nunca se mueve. Con «menos movimiento» se parte en líneas.',
    },
    {
        id: 'chart',
        title: 'Gráfico',
        origin: 'grama',
        source: 'ui/chart/  ←  GRAMA shared/ui/chart/',
        status: 'aprobado',
        note: 'ECharts (barras y líneas) leyendo los colores de los tokens: cambia un color en globals.css y cambian todos los gráficos. Carga bajo demanda con una caja del mismo alto. Colores nuevos en el grupo «Colores de gráficos».',
    },
    {
        id: 'sidebar',
        title: 'Menú lateral',
        origin: 'inroconta',
        source: 'ui/sidebar.tsx · Sidebar',
        status: 'aprobado',
        note: 'El de INROCONTA, rehecho: fondo blanco, grupos con icono y contador (en gris, para que se lea bien y no robe la atención), se contrae a solo iconos (el botón «Contraer» aparece solo al pasar el cursor) y lo recuerda, en el celular pasa arriba con un botón, sección activa en azul sólido (`primary`). Títulos de grupo en texto normal, no en mayúsculas.',
    },
    {
        id: 'rombos',
        title: 'Rombos de la marca',
        origin: 'nuevo',
        source: 'ui/marca.tsx · Rombos',
        status: 'aprobado',
        note: 'Los cuatro rombos de contorno (azul, turquesa, rojo, amarillo) en fila, del manual de marca (págs. 10 y 16–18). Un sello sobre el título de una página o de una tarjeta. Solo decoración (aria-hidden).',
    },
    {
        id: 'cubo',
        title: 'Cubo de rombos',
        origin: 'nuevo',
        source: 'ui/marca.tsx · CuboRombos',
        status: 'aprobado',
        note: 'La cuadrícula 3 × 3 girada 45° del logo (azul arriba, rojo abajo, amarillo en el centro y el cuadrado rojo suelto a la derecha). Variantes: de contorno o rellena (la rellena es el logo) y a los cuatro colores del logo o de uno solo (gris, azul, turquesa, rojo, amarillo o blanco). Para fondos de estados vacíos, login y portadas; se puede recortar por el borde, como en la hoja membretada. Solo decoración.',
    },
];

/** Lo que de GRAMA NO se porta (y por qué), para que no se pregunte dos veces. */
export const NOT_PORTED: { name: string; why: string }[] = [
    { name: 'tangram, quiz-option-shapes, confetti, achievement-icons, presence-beat', why: 'Son del campus educativo: juegos, logros y partidas en vivo.' },
    { name: 'chatbot, content', why: 'El chat y el contenido de aprendizaje del campus: dependen de sus datos y de su servidor.' },
    {
        name: 'calendar, tour',
        why: 'Traen los datos de GRAMA (cursos y sesiones; los recorridos del campus y del admin). INROCONTA ya tiene driver.js por su lado. Se pueden llevar genéricos si los quieres.',
    },
    {
        name: 'spam-notice, enlace-precargado, feature-seen, icons.ts',
        why: 'Correos del campus, precarga y medición propias de GRAMA, y su registro de iconos (aquí se usa lucide directo).',
    },
];
