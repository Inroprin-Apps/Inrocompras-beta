/* INROCOMPRAS v3 · motor del flujo.
   Cada entidad (oportunidad o proyecto, línea, solicitud, orden, embarque) lleva una ficha en un paso del
   diagrama BPMN (su id). NODOS dice, para cada paso, a qué rol le toca, qué tiene que hacer y qué salidas
   tiene (las salidas de cada rombo son los botones). Los rombos que decide la regla, no una persona, están en AUTO. */

const EMPRESAS = { INROPRIN: 'IP', INROPLAS: 'IL', 'CONSORCIO INROPRIN-PUCP': 'CP', COOTEQ: 'CQ' };
const ROLES = [
  { k: 'comercial', n: 'Comercial y Eval. de proyectos', c: 'cm' },
  { k: 'licitaciones', n: 'Licitaciones', c: 'lic' },
  { k: 'pcp', n: 'PCP', c: 'pcp' },
  { k: 'cg', n: 'Control de Gestión', c: 'cg' },
  { k: 'costos', n: 'Costos', c: 'cos' },
  { k: 'tecnica', n: 'Evaluación técnica', c: 'tec' },
  { k: 'maestros', n: 'Maestros SIDIGE', c: 'mae' },
  { k: 'solicitante', n: 'Área solicitante', c: 'jef' },
  { k: 'jefatura', n: 'Jefatura', c: 'jef' },
  { k: 'jcompras', n: 'Jefe de Compras', c: 'jef' },
  { k: 'compras', n: 'Compras · bienes', c: 'com' },
  { k: 'servicios', n: 'Compras · servicios', c: 'srv' },
  { k: 'importaciones', n: 'Importaciones', c: 'imp' },
  { k: 'gop', n: 'Gerencia de Operaciones', c: 'ger' },
  { k: 'gaf', n: 'Gerencia de Adm. y Finanzas', c: 'gaf' },
  { k: 'finanzas', n: 'Finanzas', c: 'fin' },
  { k: 'contabilidad', n: 'Contabilidad', c: 'con' },
  { k: 'consulta', n: 'Consulta (solo lectura)', c: '' }];
const ROL = Object.fromEntries(ROLES.map(r => [r.k, r]));
const AREAS = ['TICs', 'Pedagogía', 'Producción', 'Diseño'];
const PARTIDAS = ['Comercial y evaluación', 'Muestras', 'Adquisición', 'Adicionales', 'Transporte', 'Habilitado', 'Instalación', 'Capacitación', 'Mantenimiento', 'Administrativo'];
const FORMAS = ['Contado', 'Crédito', 'Adelanto', 'Contra entrega', 'Letra', 'Tarjeta de crédito', 'Caja chica'];
const PAGA_ANTES = ['Contado', 'Adelanto', 'Tarjeta de crédito'];
const EST_PPTO = ['Presupuestado', 'No presupuestado', 'Excede presupuesto', 'Preinversión', 'Administrativo', 'Pre aprobado'];
const MOTIVOS_FIN = ['Documentos incompletos', 'Datos incorrectos', 'Falta factura', 'Falta validación técnica', 'Monto no coincide', 'Proveedor incorrecto', 'Otros'];
const NIVELES = ['Accesorio incluido', 'Accesorio no incluido', 'Extra', 'Servicio'];
const CARGA = ['Producción', 'Espera de zarpe', 'Tránsito', 'Llegada', 'En almacén'];
const TRAMITE = ['Pendiente', 'Documentos completos', 'DAM numerada', 'Levante', 'Costeo cerrado'];
const CHECK_DOCS = [['fc', 'Factura comercial'], ['bl', 'BL o AWB'], ['co', 'Certificado de origen'], ['seg', 'Póliza de seguro']];
const GASTOS_IMP = [['Flete internacional', 'valor'], ['Agente de aduanas', 'valor'], ['Almacén', 'valor'], ['Ad valorem', 'producto'], ['Transporte local', 'valor'], ['Seguro', 'valor']];
const TC = { PEN: 1, USD: 3.75, EUR: 4.05, GBP: 4.75 };
const AÑO = 2026;
const RELOJ = { v: 0 };

const uid = p => p + Math.random().toString(36).slice(2, 8).toUpperCase();
const pen = (m, mon) => (+m || 0) * (TC[mon] || 1);
const r2 = n => Math.round((+n || 0) * 100) / 100;
const clone = o => JSON.parse(JSON.stringify(o));

/* ---------- consultas ---------- */
const lineasDe = (S, pid) => Object.values(S.lin).filter(l => l.pry === pid);
const lineasOrden = (S, o) => o.lineas.map(id => S.lin[id]).filter(Boolean);
const cotEleg = l => (l.cots || []).find(c => c.id === l.eleg);
const provDe = (S, ruc) => S.prov[ruc] || { ruc, nombre: ruc, origen: 'Nacional', pre: 'verde', verif: false };
function baseOrden(S, o) { return lineasOrden(S, o).reduce((a, l) => a + (l.cant || 0) * (l.base || 0), 0); }
function montoPEN(o) { return pen(o.monto, o.mon); }
function docsRequeridos(o) {
  if (o.tipo === 'importacion') return [['invoice', 'Invoice'], ['bl', 'BL'], ['dam', 'DAM']];
  if (o.tipo === 'servicio') return [['factura', 'Factura'], ['conformidad', 'Acta de conformidad']];
  if (['Crédito', 'Letra', 'Contra entrega'].includes(o.forma)) return [['factura', 'Factura'], ['guia', 'Guía de remisión']];
  return [['factura', 'Factura']];
}
const faltanDocs = o => docsRequeridos(o).filter(([k]) => !(o.docs || {})[k]);
function partePro(S, l) { return l.pry ? S.pry[l.pry] : null; }

/* ---------- contexto de una acción ---------- */
function ctx(S, rol, who, now) {
  const X = {
    S, rol, who, now: now || RELOJ.v || Date.now(), touched: new Set(), created: [], msgs: [],
    t(e) { X.touched.add(e._t + ':' + e.id); return e; },
    log(e, txt, extra) {
      X.t(e); e.hist = e.hist || [];
      e.hist.unshift(Object.assign({ t: X.now, r: X.rol, u: X.who || '', x: txt, n: e.nodo }, extra || {}));
      if (e.hist.length > 40) e.hist.length = 40;
    },
    nuevo(tipo, obj) {
      const e = Object.assign({ id: obj.id || uid(tipo.slice(0, 1).toUpperCase()), _t: tipo, creado: X.now, desde: X.now, hist: [] }, obj);
      S[tipo][e.id] = e; X.created.push(tipo + ':' + e.id); X.t(e); return e;
    },
    aviso(txt) { X.msgs.push(txt); },
    seq(k) { S.cfg.seq = S.cfg.seq || {}; S.cfg.seq[k] = (S.cfg.seq[k] || 0) + 1; X.touched.add('cfg:cfg'); return S.cfg.seq[k]; }
  };
  return X;
}

/* mueve la ficha a un paso y resuelve en cadena los rombos automáticos */
function mover(e, to, X, nota) {
  let guard = 0;
  while (to && guard++ < 20) {
    e.nodo = to; e.desde = X.now; X.t(e);
    const a = AUTO[e._t + ':' + to] || AUTO[to];
    if (!a) break;
    const [sig, porque] = a(e, X);
    if (porque) X.log(e, porque, { auto: to });
    if (sig === to) break;
    to = sig;
  }
  if (nota) X.log(e, nota);
  return e;
}

/* ---------- rombos que decide la regla ---------- */
const AUTO = {
  /* línea */
  gbuy(l, X) { return l.incluido ? ['eincl', 'Viene incluido con el equipo: queda solo con SKU, no se compra.'] : ['t7', null]; },
  gpre(l, X) {
    const rojos = (l.cots || []).filter(c => c.pre === 'rojo');
    return rojos.length ? ['t13', `Precalificación: ${rojos.length} proveedor(es) en rojo. Pasa a Finanzas.`] : ['t10', 'Precalificación: todos los proveedores en verde.'];
  },
  gvp(l, X) {
    const c = cotEleg(l), p = provDe(X.S, c && c.ruc);
    return p.verif ? ['t14', 'Cuentas del proveedor ya verificadas.'] : ['tvp', 'Proveedor sin cuentas verificadas: pasa a Contabilidad.'];
  },
  /* orden */
  'ord:gexc'(o, X) {
    const b = baseOrden(X.S, o), m = montoPEN(o);
    if (b && m > b * 1.1 && !o.sustento) return ['t14b', `Supera el presupuesto base en ${Math.round((m / b - 1) * 100)} %: necesita sustento.`];
    return ['t15', null];
  },
  'ord:gi'(o, X) {
    const conj = montoPEN(o) >= 5000;
    o.firm = { gop: 'pend', gaf: conj ? 'pend' : 'n/a' };
    return ['t16', conj ? 'Aprobación conjunta (S/ 5,000 o más): firman la GOP y la GAF en paralelo.' : 'Aprobación única (menos de S/ 5,000): firma solo la GOP.'];
  },
  'ord:gj'(o, X) {
    const f = o.firm || {}, pend = ['gop', 'gaf'].some(k => f[k] === 'pend');
    if (pend) return ['t16', null];
    if (f.gop === 'obs' || f.gaf === 'obs') return ['t14', 'Una gerencia observó la orden: vuelve a Compras.'];
    o.aprobada = X.now; return ['t19', 'Firmas completas: orden aprobada.'];
  },
  'ord:gpp'(o, X) { return PAGA_ANTES.includes(o.forma) && !o.adelantoPagado ? ['tade', `Forma de pago «${o.forma}»: se paga antes de recibir.`] : ['g20', null]; },
  'ord:g20'(o, X) {
    if (o.tipo === 'servicio') return ['tcs', 'Es un servicio: no pasa por almacén, lo cierra la conformidad.'];
    if (o.tipo === 'importacion') {
      const S = X.S; let em = Object.values(S.emb).find(x => x.nodo === 't21' && x.empresa === o.empresa && x.consolidar);
      if (em) { em.ocs.push(o.id); X.t(em); X.log(em, `Se suma la orden ${o.num} (consolidado).`); }
      else {
        em = X.nuevo('emb', { num: `EMB-${AÑO}-${String(X.seq('emb')).padStart(3, '0')}`, empresa: o.empresa, ocs: [o.id], nodo: 't21', carga: 0, tramite: 0, check: {}, gastos: [], costeo: { v: 1, hist: [] }, modalidad: 'Marítimo', incoterm: o.incoterm || 'FOB', consolidar: true, eta: X.now + 30 * 864e5 });
        X.log(em, `Embarque creado desde la orden ${o.num}.`);
      }
      o.emb = em.id; return ['emb', `Importación: pasa al embarque ${em.num}.`];
    }
    return ['t22', 'Bien nacional: va a almacén.'];
  },
  'ord:gcant'(o, X) {
    const L = lineasOrden(X.S, o), falta = L.some(l => (l.recibido || 0) < (l.cant || 0));
    return falta ? ['t22', 'Entrega parcial: el saldo queda pendiente.'] : ['t23', 'Llegó completo.'];
  },
  'ord:glg'(o, X) {
    const f = faltanDocs(o);
    return f.length && !o.sinFactura ? ['tleg', 'Legajo incompleto: falta ' + f.map(x => x[1].toLowerCase()).join(', ') + '.'] : ['t26', 'Legajo completo.'];
  },
  /* embarque cerrado */
};

/* ---------- campos de los formularios ---------- */
const F = {
  motivo: { k: 'motivo', l: 'Motivo', tipo: 'area', req: true },
  file: (k, l) => ({ k, l, tipo: 'file', req: true }),
  num: (k, l, req = true) => ({ k, l, tipo: 'num', req }),
  txt: (k, l, req = true, def) => ({ k, l, tipo: 'text', req, def }),
  sel: (k, l, op, def) => ({ k, l, tipo: 'sel', op, def, req: true })
};

/* ---------- los pasos ---------- */
/* n: nombre corto del paso · rol: quién · que: la instrucción · acts: salidas
   act: { k, l, t: p (principal) | s | d (negativa), f: campos, ok(e,X): true o texto de por qué no, run(e,v,X) } */
const NODOS = {
  /* ===== 0 · Antes de ganar (oportunidad / proyecto) ===== */
  t0: { e: 'pry', rol: 'cg', n: 'Abrir CC de evaluación', que: 'Abre un centro de costo de evaluación para medir lo que cuesta intentar ganar este proyecto.',
    acts: [{ k: 'abrir', l: 'Abrir centro de costo', t: 'p', f: [F.txt('cc', 'Código del CC de evaluación', true, p => `EV-${AÑO}-${p.id.slice(-3)}`)],
      run(p, v, X) { p.ccEval = v.cc; X.log(p, `Centro de costo de evaluación ${v.cc} abierto.`); return 'gmu'; } }] },
  gmu: { e: 'pry', rol: 'comercial', n: '¿Requiere muestras o servicios?', que: 'Indica si para evaluar u ofertar hace falta comprar muestras o contratar un servicio (por ejemplo, revisar el contrato o una tarea pedagógica).',
    acts: [
      { k: 'muestras', l: 'Pedir muestras', t: 's', f: [F.txt('desc', 'Qué muestras'), F.num('cant', 'Cantidad')],
        run(p, v, X) { X.nuevo('sol', { tipo: 'muestra', pry: p.id, area: 'Comercial', items: [{ desc: v.desc, cant: +v.cant }], nodo: 'tmu', cc: p.ccEval }); X.log(p, `Muestras pedidas: ${v.desc}.`); return 'gmu'; } },
      { k: 'servicio', l: 'Pedir un servicio', t: 's', f: [F.txt('desc', 'Qué servicio'), F.sel('area', 'Área que lo necesita', ['Licitaciones', 'Evaluación de proyectos', 'Pedagogía'])],
        run(p, v, X) { X.nuevo('sol', { tipo: 'servicio-previo', pry: p.id, area: v.area, items: [{ desc: v.desc, cant: 1 }], nodo: 'tms', cc: p.ccEval }); X.log(p, `Servicio previo pedido: ${v.desc}.`); return 'gmu'; } },
      { k: 'seguir', l: 'Seguir a la decisión', t: 'p', run(p, v, X) { X.log(p, 'Muestras y servicios previos definidos.'); return 'gwin'; } }] },
  gwin: { e: 'pry', rol: 'comercial', n: '¿Se gana?', que: 'Registra el resultado de la convocatoria.',
    acts: [
      { k: 'ganado', l: 'Ganado', t: 'p', run(p, v, X) { p.etapa = 'ganado'; X.log(p, 'Proyecto ganado.'); return 'tw'; } },
      { k: 'perdido', l: 'Perdido', t: 'd', f: [F.motivo], run(p, v, X) { p.etapa = 'perdido'; X.log(p, `Proyecto perdido: ${v.motivo}. Costo de adquisición: S/ ${fmt(costoAdq(X.S, p))}.`); return 'eLost'; } }] },
  tw: { e: 'pry', rol: 'comercial', n: 'Kick-off por correo', que: 'Envía el correo de kick-off con la data del proyecto ganado. Con eso, cada rol empieza a registrar lo suyo.',
    acts: [{ k: 'kick', l: 'Enviar kick-off', t: 'p', f: [F.txt('fecha', 'Fecha del kick-off', true, () => hoy())],
      run(p, v, X) { X.aviso('Correo de kick-off enviado a Licitaciones, PCP y Control de Gestión.'); X.log(p, `Kick-off enviado (${v.fecha}).`); return 't1'; } }] },
  t1: { e: 'pry', rol: 'licitaciones', n: 'Ficha de proyecto', que: 'Arma la ficha con PCP: monto, plazos y lo que el TDR exige para todos los bienes.',
    acts: [{ k: 'ficha', l: 'Guardar ficha', t: 'p', f: [F.num('monto', 'Monto adjudicado (S/)'), F.txt('plazo', 'Plazo de entrega', true, () => '120 días'), F.file('oferta', 'Oferta final (PDF)'),
      { k: 'ent', l: 'El TDR exige para todos los bienes', tipo: 'multi', op: ['Etiqueta por equipo', 'Placa metálica en mobiliario', 'Manual de operación', 'Video de operatividad'] }],
      run(p, v, X) { p.ficha = { monto: +v.monto, plazo: v.plazo, oferta: v.oferta, ent: v.ent || [] }; X.log(p, `Ficha de proyecto lista (S/ ${fmt(v.monto)}).`); return 't2b'; } }] },
  t2b: { e: 'pry', rol: 'pcp', n: 'Crear el centro de costo', que: 'Crea el centro de costo del proyecto con Licitaciones (si había uno de evaluación, se convierte; un adicional lleva -02, -03).',
    acts: [{ k: 'crear', l: 'Crear centro de costo', t: 'p', f: [F.txt('cc', 'Código del centro de costo', true, p => p.cc || (p.padre ? null : `PRO-${AÑO}-${p.id.slice(-3)}`))],
      run(p, v, X) { p.cc = v.cc; X.log(p, `Centro de costo ${v.cc} creado en el SIDIGE.`); return 't2'; } }] },
  t2: { e: 'pry', rol: 'cg', n: 'Validar el centro de costo', que: 'Revisa empresa, código y sufijo en el maestro del SIDIGE.',
    acts: [
      { k: 'ok', l: 'Conforme', t: 'p', run(p, v, X) { p.ccOk = true; X.log(p, `Centro de costo ${p.cc} validado.`); return 't3'; } },
      { k: 'obs', l: 'Observar', t: 'd', f: [F.motivo], run(p, v, X) { X.log(p, `Centro de costo observado: ${v.motivo}`); return 't2b'; } }] },
  t3: { e: 'pry', rol: 'costos', n: 'Cargar presupuesto base', que: 'Carga los ítems de la hoja de productos (código del cliente, cantidad y precio base) y elige el área técnica que los desglosa.',
    form: 'ppto',
    acts: [{ k: 'enviar', l: 'Enviar a desglose', t: 'p', ok: p => (p.ppto || []).length ? true : 'Agrega al menos un ítem.',
      run(p, v, X) {
        (p.ppto || []).forEach(it => X.nuevo('lin', { pry: p.id, cod: it.cod, desc: it.desc, cant: +it.cant, base: +it.base, area: it.area, tipo: 'bien', niv: 'Equipo', nodo: 't4', partida: p.padre ? 'Adicionales' : 'Adquisición' }));
        const n = (p.ppto || []).length; p.ppto = [];
        if ((p.ficha && p.ficha.ent || []).length) {
          X.nuevo('lin', { pry: p.id, desc: 'Extras y entregables del TDR', cant: 1, base: 0, area: 'Diseño', tipo: 'bien', niv: 'Extra', nodo: 't4b', esExtras: true });
          X.log(p, 'El TDR pide extras: Diseño y Pedagogía los agregan.', { auto: 'gext' });
        } else X.log(p, 'El TDR no pide extras.', { auto: 'gext' });
        X.log(p, `${n} ítems del presupuesto base enviados a desglose.`); return 'ejec';
      } }] },
  ejec: { e: 'pry', rol: null, n: 'En ejecución', que: 'Las líneas del plan avanzan cada una por su cuenta.', acts: [] },
  eLost: { e: 'pry', rol: null, n: 'Perdido', que: 'El centro de costo de evaluación quedó cerrado con su costo de adquisición.', fin: true, acts: [] },

  /* ===== 2 · Desglose (línea) ===== */
  t4: { e: 'lin', rol: 'tecnica', n: 'Desglosar', que: 'Agrega lo que lleva el ítem (accesorios incluidos y no incluidos, extras y servicios) y sube la ficha técnica.',
    form: 'hijos',
    acts: [{ k: 'listo', l: 'Desglose listo', t: 'p', f: [F.file('ficha', 'Ficha técnica (PDF)')],
      run(l, v, X) { l.fichaTec = v.ficha; X.log(l, 'Desglose listo y ficha técnica subida.'); return 't4c'; } }] },
  t4b: { e: 'lin', rol: 'tecnica', n: 'Agregar extras del TDR', que: 'Diseño agrega etiquetas y placas por bien; Pedagogía, los manuales y videos como entregable del proyecto.',
    acts: [{ k: 'extras', l: 'Crear extras', t: 'p',
      run(l, v, X) {
        const p = X.S.pry[l.pry], eq = lineasDe(X.S, l.pry).filter(x => x.niv === 'Equipo'), tot = eq.reduce((a, x) => a + (x.cant || 0), 0);
        (p.ficha.ent || []).forEach(en => {
          const porBien = /Etiqueta|Placa/.test(en);
          X.nuevo('lin', { pry: l.pry, padre: null, desc: en, cant: porBien ? tot : 1, base: porBien ? 6 : 1500, area: porBien ? 'Diseño' : 'Pedagogía', tipo: porBien ? 'bien' : 'servicio', niv: porBien ? 'Extra' : 'Entregable', nodo: 't4c', partida: 'Adquisición' });
        });
        X.log(l, `${(p.ficha.ent || []).length} extras creados para ${tot} bienes.`); return 'hecho';
      } }] },
  hecho: { e: 'lin', rol: null, n: 'Hecho', que: 'Tarea cumplida.', fin: true, acts: [] },
  t4c: { e: 'lin', rol: 'pcp', n: 'Revisar desglose', que: 'Cruza el desglose con la ficha de proyecto. Si falta algo, vuelve al área.', bulk: 'ok',
    acts: [
      { k: 'ok', l: 'Completo', t: 'p', run(l, v, X) { X.log(l, 'Desglose revisado: completo.'); return 't5'; } },
      { k: 'falta', l: 'Falta algo', t: 'd', f: [F.motivo], run(l, v, X) { X.log(l, `Desglose incompleto: ${v.motivo}`); return 't4'; } }] },
  t5: { e: 'lin', rol: 'pcp', n: 'Pedir el SKU', que: 'Pide el código del artículo con tipo, marca y modelo (también para lo que viene incluido).',
    acts: [{ k: 'pedir', l: 'Pedir SKU', t: 'p', f: [F.txt('tipoArt', 'Tipo', true, l => l.tipoArt || l.desc.split(' ')[0]), F.txt('marca', 'Marca', false, l => l.marca || ''), F.txt('modelo', 'Modelo', false, l => l.modelo || '')],
      run(l, v, X) { Object.assign(l, { tipoArt: v.tipoArt, marca: v.marca, modelo: v.modelo }); X.log(l, `SKU pedido: ${v.tipoArt} ${v.marca} ${v.modelo}.`); return 'gsku'; } }] },
  gsku: { e: 'lin', rol: 'maestros', n: '¿Ya existe el SKU?', que: 'Revisa si el artículo ya existe por tipo, marca y modelo antes de crear uno nuevo.', form: 'dup',
    acts: [
      { k: 'reusa', l: 'Usar el existente', t: 's', ok: (l, X) => skuParecidos(X.S, l).length ? true : 'No hay artículos parecidos.', f: [{ k: 'sku', l: 'Artículo', tipo: 'sel', op: (l, X) => skuParecidos(X.S, l).map(x => x.sku), req: true }],
        run(l, v, X) { l.sku = v.sku; X.log(l, `Se reutiliza el SKU ${v.sku}.`); return 'gbuy'; } },
      { k: 'crear', l: 'Crear SKU nuevo', t: 'p', run(l, v, X) { X.log(l, 'No existe: Maestros lo crea.'); return 't6'; } }] },
  t6: { e: 'lin', rol: 'maestros', n: 'Crear el SKU', que: 'Crea el artículo en el SIDIGE con el procedimiento oficial.',
    acts: [{ k: 'crear', l: 'Crear artículo', t: 'p', f: [F.txt('sku', 'Código', true, (l, X) => `ART-${String(6400 + X.seq('sku')).padStart(5, '0')}`)],
      run(l, v, X) { l.sku = v.sku; X.log(l, `SKU ${v.sku} creado con sp_CrearArticulo.`); return 'gbuy'; } }] },
  eincl: { e: 'lin', rol: null, n: 'Incluido: solo SKU', que: 'No se compra; se controla al recibir el equipo.', fin: true, acts: [] },
  t7: { e: 'lin', rol: 'pcp', n: 'Emitir requerimiento', que: 'Emite el requerimiento en el SIDIGE con la partida del gasto que define el área que lo pide.', bulk: 'rq',
    acts: [{ k: 'rq', l: 'Emitir requerimiento', t: 'p', f: [F.sel('partida', 'Partida del gasto', PARTIDAS, l => l.partida || 'Adquisición'), F.txt('fecha', 'Fecha requerida', true, () => hoy(20))],
      run(l, v, X) { l.partida = v.partida; l.rq = l.rq || `RQ-${AÑO}${String(X.seq('rq')).padStart(4, '0')}`; l.fechaReq = v.fecha; X.log(l, `Requerimiento ${l.rq} emitido (partida ${v.partida}).`); return 'g8'; } }] },
  g8: { e: 'lin', rol: 'jefatura', n: '¿Aprueba el requerimiento?', que: 'Aprueba el requerimiento o recházalo con motivo.', bulk: 'ok',
    acts: [
      { k: 'ok', l: 'Aprobar', t: 'p', run(l, v, X) { X.log(l, `Requerimiento ${l.rq} aprobado.`); return 'gtipo'; } },
      { k: 'no', l: 'Rechazar', t: 'd', f: [F.motivo], run(l, v, X) { X.log(l, `Requerimiento rechazado: ${v.motivo}`); return 't7'; } }] },
  gtipo: { e: 'lin', rol: 'jcompras', n: 'Asignar comprador', que: 'Asigna la línea: los bienes a su comprador y los servicios al responsable de servicios.', bulk: 'auto',
    acts: [
      { k: 'bien', l: 'A bienes', t: 'p', run(l, v, X) { l.tipo = 'bien'; X.log(l, 'Asignada a Compras · bienes.'); return 't9'; } },
      { k: 'srv', l: 'A servicios', t: 's', run(l, v, X) { l.tipo = 'servicio'; X.log(l, 'Asignada a Compras · servicios.'); return 't9s'; } }] },
  t9: { e: 'lin', rol: 'compras', n: 'Cotizar', que: 'Sube todas las cotizaciones del bien. La app lee el PDF y registra al proveedor por su RUC.', form: 'cots',
    acts: [{ k: 'enviar', l: 'Enviar a validación', t: 'p', ok: l => (l.cots || []).filter(c => c.dic !== 'no' && c.pre !== 'rechazado').length ? true : 'Sube al menos una cotización.',
      run(l, v, X) { X.log(l, `${(l.cots || []).length} cotización(es) enviadas.`); return 'gpre'; } }] },
  t9s: { e: 'lin', rol: 'servicios', n: 'Cotizar el servicio', que: 'Cotiza el servicio con el alcance del área que lo pidió.', form: 'cots',
    acts: [{ k: 'enviar', l: 'Enviar a validación', t: 'p', ok: l => (l.cots || []).length ? true : 'Sube al menos una cotización.',
      run(l, v, X) { X.log(l, `${(l.cots || []).length} cotización(es) del servicio enviadas.`); return 'gpre'; } }] },
  t13: { e: 'lin', rol: 'finanzas', n: 'Evaluar proveedor en rojo', que: 'Investiga al proveedor en rojo. Si es la única opción que cumple, puedes aceptarlo con otra forma de pago.', form: 'rojos',
    acts: [
      { k: 'acepta', l: 'Aceptar con contra entrega', t: 'p', run(l, v, X) { (l.cots || []).filter(c => c.pre === 'rojo').forEach(c => { c.pre = 'aceptado'; c.forma = 'Contra entrega'; }); X.log(l, 'Finanzas acepta al proveedor con pago contra entrega.'); return 't10'; } },
      { k: 'rechaza', l: 'Rechazar proveedor', t: 'd', f: [F.motivo], run(l, v, X) {
        (l.cots || []).filter(c => c.pre === 'rojo').forEach(c => { c.pre = 'rechazado'; });
        const quedan = (l.cots || []).filter(c => c.pre !== 'rechazado').length;
        X.log(l, `Finanzas rechaza al proveedor: ${v.motivo}`); return quedan ? 't10' : (l.tipo === 'servicio' ? 't9s' : 't9'); } }] },
  t10: { e: 'lin', rol: 'tecnica', n: 'Validar el modelo', que: 'Revisa cada propuesta contra la ficha técnica (sin ver precios) y decide.', form: 'dic',
    acts: [
      { k: 'cumple', l: 'Pasar a elegir proveedor', t: 'p', ok: l => vivas(l).some(c => c.dic === 'cumple') ? true : 'Marca al menos una propuesta como «Cumple».', run(l, v, X) { X.log(l, 'Validación técnica: hay propuestas que cumplen.'); return 't12'; } },
      { k: 'consultar', l: 'Consultar al proveedor', t: 's', ok: l => vivas(l).some(c => c.dic === 'consultar') ? true : 'Marca la propuesta que necesita consulta.', f: [F.txt('pregunta', 'Pregunta para el proveedor')], run(l, v, X) { l.pregunta = v.pregunta; X.log(l, `Consulta al proveedor: ${v.pregunta}`); return 't10b'; } },
      { k: 'otra', l: 'Pedir otra cotización', t: 's', run(l, v, X) { X.log(l, 'Ninguna cumple: Compras trae otra propuesta.'); return l.tipo === 'servicio' ? 't9s' : 't9'; } },
      { k: 'desc', l: 'Descontinuado: nuevo SKU', t: 'd', f: [F.motivo], run(l, v, X) {
        const b = clone(l); delete b.id; delete b.hist; delete b.creado;
        const n = X.nuevo('lin', Object.assign(b, { cots: [], eleg: null, sku: null, rq: null, oc: null, reemplazaA: l.id, nodo: 't5' }));
        l.reemplazo = n.id; X.log(l, `Modelo descontinuado (${v.motivo}): se crea una línea de reemplazo con SKU nuevo.`); return 'reemp'; } }] },
  reemp: { e: 'lin', rol: null, n: 'Reemplazada', que: 'Esta línea se reemplazó por otra con SKU nuevo.', fin: true, acts: [] },
  t10b: { e: 'lin', rol: 'compras', n: 'Consultar al proveedor', que: 'Obtén la respuesta del proveedor y devuélvela al área técnica.',
    acts: [{ k: 'resp', l: 'Enviar respuesta', t: 'p', f: [{ k: 'resp', l: 'Respuesta del proveedor', tipo: 'area', req: true }],
      run(l, v, X) { (l.cots || []).filter(c => c.dic === 'consultar').forEach(c => { c.resp = v.resp; c.dic = 'pend'; }); X.log(l, `Respuesta del proveedor: ${v.resp}`); return 't10'; } }] },
  t12: { e: 'lin', rol: 'compras', n: 'Elegir proveedor', que: 'Elige entre las propuestas que cumplen, por precio, plazo y forma de pago.',
    acts: [{ k: 'elegir', l: 'Elegir', t: 'p', f: [{ k: 'cot', l: 'Propuesta', tipo: 'sel', req: true, op: (l, X) => vivas(l).filter(c => c.dic === 'cumple').map(c => [c.id, `${provDe(X.S, c.ruc).nombre} · ${c.mon} ${fmt(c.precio)} · ${c.plazo}`]) }],
      run(l, v, X) { l.eleg = v.cot; const c = cotEleg(l); X.log(l, `Proveedor elegido: ${provDe(X.S, c.ruc).nombre}.`); return 'gstock'; } }] },
  gstock: { e: 'lin', rol: 'compras', n: '¿Sigue con stock?', que: 'La validación pudo tomar días: reconfirma el stock con el proveedor elegido.',
    acts: [
      { k: 'si', l: 'Hay stock', t: 'p', run(l, v, X) { X.log(l, 'Stock confirmado.'); return 't13b'; } },
      { k: 'no', l: 'Sin stock', t: 'd', run(l, v, X) {
        const c = cotEleg(l); if (c) c.dic = 'no'; l.eleg = null;
        const otra = vivas(l).some(x => x.dic === 'cumple');
        X.log(l, 'El proveedor ya no tiene stock.'); return otra ? 't12' : (l.tipo === 'servicio' ? 't9s' : 't9'); } }] },
  t13b: { e: 'lin', rol: 'finanzas', n: 'Validar proveedor y acordar pago', que: 'Valida al proveedor elegido y acuerda con Compras la forma de pago.',
    acts: [{ k: 'ok', l: 'Acordar forma de pago', t: 'p', f: [F.sel('forma', 'Forma de pago', FORMAS, l => (cotEleg(l) || {}).forma || 'Crédito'), F.num('adel', '% de adelanto', false), F.num('dias', 'Días de crédito', false)],
      run(l, v, X) { const c = cotEleg(l); c.forma = v.forma; c.adel = +v.adel || (v.forma === 'Adelanto' ? 30 : 0); c.dias = +v.dias || (v.forma === 'Crédito' ? 30 : 0); X.log(l, `Forma de pago acordada: ${v.forma}.`); return 'gvp'; } }] },
  tvp: { e: 'lin', rol: 'contabilidad', n: 'Verificar cuentas del proveedor', que: 'Revisa las cuentas, el CCI y la cuenta de detracción (o SWIFT e IBAN si es extranjero).', form: 'cuentas',
    acts: [{ k: 'ok', l: 'Cuentas verificadas', t: 'p', f: [F.txt('banco', 'Banco'), F.txt('cuenta', 'Cuenta o IBAN'), F.txt('cci', 'CCI o SWIFT')],
      run(l, v, X) { const c = cotEleg(l), p = X.S.prov[c.ruc]; if (p) { p.verif = true; p.cuentas = { banco: v.banco, cuenta: v.cuenta, cci: v.cci }; X.touched.add('prov:' + p.ruc); } X.log(l, `Cuentas de ${p ? p.nombre : c.ruc} verificadas.`); return 't14'; } }] },
  t14: { e: 'lin', rol: 'compras', n: 'Crear la orden', que: 'Arma la orden con las líneas del mismo proveedor y proyecto.', form: 'agrupa',
    acts: [{ k: 'oc', l: 'Crear orden', t: 'p', run(l, v, X) { const o = crearOrden(l, X); return 'enorden'; } }] },
  enorden: { e: 'lin', rol: null, n: 'En orden', que: 'Sigue a su orden de compra.', acts: [] },

  /* ===== orden ===== */
  'ord:t14': { e: 'ord', rol: 'compras', n: 'Corregir la orden', que: 'Una gerencia o Control de Gestión observó la orden. Corrige y reenvía.',
    acts: [{ k: 're', l: 'Reenviar a aprobación', t: 'p', f: [F.txt('cambio', 'Qué corregiste')], run(o, v, X) { X.log(o, `Orden corregida: ${v.cambio}`); return 'gexc'; } }] },
  t14b: { e: 'ord', rol: 'compras', n: 'Adjuntar sustento del exceso', que: 'Lo proyectado supera el presupuesto base en más de 10 %. Explica el exceso para Control de Gestión.',
    acts: [{ k: 'sus', l: 'Adjuntar sustento', t: 'p', f: [{ k: 'sus', l: 'Sustento', tipo: 'area', req: true }], run(o, v, X) { o.sustento = v.sus; X.log(o, 'Sustento del exceso adjuntado.'); return 't15'; } }] },
  t15: { e: 'ord', rol: 'cg', n: 'Validar presupuesto', que: 'Marca el estado del presupuesto de la orden.',
    acts: [
      { k: 'ok', l: 'Conforme', t: 'p', f: [F.sel('est', 'Estado del presupuesto', EST_PPTO, o => o.estPpto || 'Presupuestado')], run(o, v, X) { o.estPpto = v.est; X.log(o, `Presupuesto: ${v.est}.`); return 'gi'; } },
      { k: 'obs', l: 'Observar', t: 'd', f: [F.motivo], run(o, v, X) { X.log(o, `Control de Gestión observa: ${v.motivo}`); return 't14'; } }] },
  t16: { e: 'ord', rol: o => ['gop', 'gaf'].filter(k => (o.firm || {})[k] === 'pend'), n: 'Firmas de gerencia', que: 'Firma la orden u obsérvala. La GOP decide la demasía por línea.',
    acts: [
      { k: 'gop', l: 'Firmar como GOP', t: 'p', rol: 'gop', ok: o => o.firm.gop === 'pend' ? true : 'La GOP ya respondió.', run(o, v, X) { o.firm.gop = 'ok'; X.log(o, 'Firmada por la GOP.'); return 'gj'; } },
      { k: 'gopsd', l: 'Aprobar sin demasía', t: 's', rol: 'gop', ok: o => o.demasia ? true : 'No tiene demasía.', run(o, v, X) { o.firm.gop = 'ok'; o.demasia = 0; X.log(o, 'Firmada por la GOP sin la demasía.'); return 'gj'; } },
      { k: 'gopo', l: 'Observar (GOP)', t: 'd', rol: 'gop', f: [F.motivo], run(o, v, X) { o.firm.gop = 'obs'; X.log(o, `Observada por la GOP: ${v.motivo}`); return 'gj'; } },
      { k: 'gaf', l: 'Firmar como GAF', t: 'p', rol: 'gaf', ok: o => o.firm.gaf === 'pend' ? true : 'La GAF no firma esta orden o ya respondió.', run(o, v, X) { o.firm.gaf = 'ok'; X.log(o, 'Firmada por la GAF.'); return 'gj'; } },
      { k: 'gafo', l: 'Observar (GAF)', t: 'd', rol: 'gaf', f: [F.motivo], run(o, v, X) { o.firm.gaf = 'obs'; X.log(o, `Observada por la GAF: ${v.motivo}`); return 'gj'; } }] },
  t19: { e: 'ord', rol: 'compras', n: 'Enviar la orden', que: 'Envía el PDF al proveedor (en español e inglés si es importación) y pide el manual del fabricante.',
    acts: [{ k: 'env', l: 'Enviar al proveedor', t: 'p', run(o, v, X) { o.enviada = X.now; X.aviso(`Orden ${o.num} enviada al proveedor.`); X.log(o, 'Orden enviada al proveedor.'); return 'gat'; } }] },
  gat: { e: 'ord', rol: 'compras', n: '¿El proveedor atiende?', que: 'Confirma que el proveedor atenderá la orden.',
    acts: [
      { k: 'si', l: 'Confirma', t: 'p', run(o, v, X) { X.log(o, 'El proveedor confirma la orden.'); return 'gpp'; } },
      { k: 'no', l: 'No atenderá', t: 'd', f: [F.motivo], run(o, v, X) { liberarLineas(o, X, 'no atendida'); X.log(o, `El proveedor no atenderá: ${v.motivo}. Las líneas vuelven a cotizar.`); return 'noat'; } }] },
  noat: { e: 'ord', rol: null, n: 'No atendida', que: 'La orden se cerró como no atendida.', fin: true, acts: [] },
  tanu: { e: 'ord', rol: 'jcompras', n: 'Aprobar anulación', que: 'El comprador pidió anular la orden. Si la apruebas, las líneas recuperan su saldo y vuelven a cotizar.',
    acts: [
      { k: 'ok', l: 'Aprobar anulación', t: 'd', run(o, v, X) { liberarLineas(o, X, 'anulada'); X.log(o, 'Anulación aprobada por el Jefe de Compras.'); return 'anulada'; } },
      { k: 'no', l: 'Rechazar anulación', t: 's', run(o, v, X) { X.log(o, 'Anulación rechazada.'); return o.antes || 't19'; } }] },
  anulada: { e: 'ord', rol: null, n: 'Anulada', que: 'Orden anulada; sus líneas volvieron a cotizar.', fin: true, acts: [] },
  tade: { e: 'ord', rol: 'finanzas', n: 'Pagar adelanto o contado', que: 'Paga en InroPay la cuota anticipada.',
    acts: [{ k: 'pagar', l: 'Registrar pago', t: 'p', f: [F.txt('op', 'N.° de operación')], run(o, v, X) {
      o.adelantoPagado = true; const pct = o.forma === 'Adelanto' ? (o.adel || 30) : 100;
      o.cuotas = [{ c: o.forma === 'Adelanto' ? 'Adelanto' : 'Pago total', pct, monto: r2(o.monto * pct / 100), est: 'Pagado', op: v.op }].concat(pct < 100 ? [{ c: 'Saldo', pct: 100 - pct, monto: r2(o.monto * (100 - pct) / 100), est: 'Plan' }] : []);
      X.log(o, `Pagado en InroPay: ${pct} % (op. ${v.op}).`); return 'g20'; } }] },
  emb: { e: 'ord', rol: null, n: 'En embarque', que: 'Sigue a su embarque de importación.', acts: [] },
  tcs: { e: 'ord', rol: 'solicitante', n: 'Dar conformidad del servicio', que: 'Da la conformidad del servicio que pidió tu área. Si resultó en un producto (maquila), ese producto ingresa a almacén.',
    acts: [
      { k: 'ok', l: 'Dar conformidad', t: 'p', f: [F.file('acta', 'Acta de conformidad')], run(o, v, X) { o.docs.conformidad = v.acta; X.log(o, 'Conformidad del servicio registrada.'); return 't25'; } },
      { k: 'maq', l: 'Conforme con producto (maquila)', t: 's', f: [F.file('acta', 'Acta de conformidad')], run(o, v, X) { o.docs.conformidad = v.acta; o.maquila = true; X.log(o, 'Servicio conforme; el producto resultante ingresa a almacén.'); return 't22'; } }] },
  t22: { e: 'ord', rol: 'compras', n: 'Registrar ingreso', que: 'Registra la guía (con su foto) y lo recibido por línea. Si falta algo, queda el saldo pendiente.', form: 'recibe',
    acts: [{ k: 'ing', l: 'Registrar ingreso', t: 'p', f: [F.txt('guia', 'N.° de guía'), F.file('foto', 'Foto de la guía firmada'), F.sel('dest', 'Destino', ['Planta PP', 'Almacén Magdalena'], 'Planta PP')],
      run(o, v, X) {
        lineasOrden(X.S, o).forEach(l => { const q = +v['rec_' + l.id]; l.recibido = (l.recibido || 0) + (isNaN(q) ? (l.cant - (l.recibido || 0)) : q); X.t(l); if (v['inc_' + l.id]) l.incidencia = v['inc_' + l.id]; });
        o.docs.guia = v.foto; o.destino = v.dest; X.log(o, `Ingreso con guía ${v.guia} en ${v.dest}.`); return 'gcant'; } }] },
  t23: { e: 'ord', rol: 'tecnica', n: 'Revisar la calidad', que: 'Revisa lo recibido y evalúa al proveedor.',
    acts: [
      { k: 'ok', l: 'Conforme', t: 'p', f: [F.sel('eval', 'Evaluación del proveedor', ['Buena', 'Regular', 'Mala'], 'Buena')], run(o, v, X) { o.calidad = 'Conforme'; o.evalProv = v.eval; X.log(o, `Calidad conforme. Evaluación del proveedor: ${v.eval}.`); return 't25'; } },
      { k: 'no', l: 'No conforme', t: 'd', f: [F.motivo], run(o, v, X) { o.calidad = 'No conforme'; X.log(o, `No conforme: ${v.motivo}`); return 't25b'; } }] },
  t25b: { e: 'ord', rol: 'compras', n: 'Devolver al proveedor', que: 'Registra la devolución con su guía.',
    acts: [{ k: 'dev', l: 'Registrar devolución', t: 'p', f: [F.txt('guia', 'Guía de devolución')], run(o, v, X) { o.devGuia = v.guia; X.log(o, `Devuelto con guía ${v.guia}.`); return 't25c'; } }] },
  t25c: { e: 'ord', rol: 'compras', n: 'Registrar nota de crédito', que: 'Registra la nota de crédito: la orden pasa a una versión nueva y las líneas recuperan saldo para recomprar.',
    acts: [{ k: 'nc', l: 'Registrar nota de crédito', t: 'p', f: [F.txt('nc', 'N.° de nota de crédito'), F.num('monto', 'Monto')],
      run(o, v, X) {
        o.nc = { num: v.nc, monto: +v.monto }; o.version = (o.version || 1) + 1; o.monto = r2(Math.max(0, o.monto - (+v.monto || 0)));
        liberarLineas(o, X, 'recompra'); X.log(o, `Nota de crédito ${v.nc}: orden en versión ${o.version}; las líneas vuelven a cotizar.`);
        return o.monto > 0 ? 't25' : 'cerrada'; } }] },
  cerrada: { e: 'ord', rol: null, n: 'Cerrada con nota de crédito', que: 'La orden quedó en cero.', fin: true, acts: [] },
  t25: { e: 'ord', rol: 'contabilidad', n: 'Verificar factura', que: 'Verifica la factura con SUNAT (INROCONTA) y que coincida con la orden.',
    acts: [
      { k: 'ok', l: 'Coincide con la orden', t: 'p', f: [F.txt('fac', 'N.° de factura'), F.num('monto', 'Monto de la factura')], ok: o => true,
        run(o, v, X) {
          if (Math.abs((+v.monto || 0) - o.monto) > Math.max(1, o.monto * 0.005)) { X.log(o, `La factura ${v.fac} (${fmt(v.monto)}) no coincide con la orden (${fmt(o.monto)}): se pide corrección.`, { auto: 'gfac' }); X.aviso('La factura no coincide: se pidió al proveedor corregirla.'); return 't25'; }
          o.docs.factura = v.fac; X.log(o, `Factura ${v.fac} verificada con SUNAT.`, { auto: 'gfac' }); return 'gret'; } },
      { k: 'corr', l: 'Pedir corrección', t: 'd', f: [F.motivo], run(o, v, X) { X.log(o, `Factura observada: ${v.motivo}`); return 't25'; } }] },
  gret: { e: 'ord', rol: 'contabilidad', n: '¿Retención o detracción?', que: 'Indica si aplica retención del 3 %, detracción (servicio sujeto) o ninguna.', form: 'sugret',
    acts: [
      { k: 'ret', l: 'Retención 3 %', t: 's', run(o, v, X) { o.ret = r2(montoPEN(o) * 0.03); X.log(o, `Aplica retención: S/ ${fmt(o.ret)}.`); return 't25r'; } },
      { k: 'det', l: 'Detracción', t: 's', run(o, v, X) { o.det = r2(montoPEN(o) * 0.12); X.log(o, `Aplica detracción: S/ ${fmt(o.det)}.`); return 'tdet'; } },
      { k: 'nin', l: 'Ninguna', t: 'p', run(o, v, X) { X.log(o, 'No aplica retención ni detracción.'); return 'glg'; } }] },
  t25r: { e: 'ord', rol: 'contabilidad', n: 'Aplicar la retención', que: 'Emite el comprobante de retención.',
    acts: [{ k: 'ok', l: 'Emitir comprobante', t: 'p', f: [F.txt('cr', 'N.° de comprobante de retención')], run(o, v, X) { o.docs.retencion = v.cr; X.log(o, `Comprobante de retención ${v.cr} emitido.`); return 'glg'; } }] },
  tdet: { e: 'ord', rol: 'finanzas', n: 'Depositar la detracción', que: 'Deposita la detracción en el Banco de la Nación del proveedor.',
    acts: [{ k: 'ok', l: 'Registrar depósito', t: 'p', f: [F.txt('cd', 'Constancia de depósito')], run(o, v, X) { o.docs.detraccion = v.cd; X.log(o, `Detracción depositada (${v.cd}).`); return 'glg'; } }] },
  tleg: { e: 'ord', rol: 'compras', n: 'Completar legajo', que: 'Sube lo que falta para pagar. Si la factura no llega, puedes pagar dejando sustento.', form: 'legajo',
    acts: [
      { k: 'ok', l: 'Revisar legajo', t: 'p', ok: o => faltanDocs(o).length ? 'Aún falta ' + faltanDocs(o).map(x => x[1].toLowerCase()).join(', ') + '.' : true, run(o, v, X) { X.log(o, 'Legajo completo.'); return 'glg'; } },
      { k: 'sus', l: 'Pagar sin factura con sustento', t: 's', f: [{ k: 'sus', l: 'Sustento', tipo: 'area', req: true }], run(o, v, X) { o.sinFactura = v.sus; X.log(o, `Pago sin factura, con sustento: ${v.sus}`); return 'glg'; } }] },
  t26: { e: 'ord', rol: 'compras', n: 'Solicitar el pago', que: 'Envía la solicitud de pago a InroPay con el legajo completo.',
    acts: [{ k: 'sol', l: 'Solicitar pago en InroPay', t: 'p', run(o, v, X) { o.solPago = X.now; X.aviso(`Solicitud de pago de ${o.num} enviada a InroPay.`); X.log(o, 'Pago solicitado en InroPay.'); return 'gobs'; } }] },
  gobs: { e: 'ord', rol: 'finanzas', n: '¿Observa el pago?', que: 'Revisa la solicitud de pago en InroPay.',
    acts: [
      { k: 'ok', l: 'Programar pago', t: 'p', run(o, v, X) { X.log(o, 'Pago programado.'); return 't27'; } },
      { k: 'obs', l: 'Observar', t: 'd', f: [F.sel('mot', 'Motivo', MOTIVOS_FIN, 'Documentos incompletos'), { k: 'det', l: 'Detalle', tipo: 'area', req: false }], run(o, v, X) { o.obsFin = v.mot; X.log(o, `Finanzas observa: ${v.mot}. ${v.det || ''}`); return 'subsana'; } }] },
  subsana: { e: 'ord', rol: 'compras', n: 'Subsanar observación de pago', que: 'Finanzas observó el pago. Subsana y vuelve a enviar.',
    acts: [{ k: 'ok', l: 'Subsanar y reenviar', t: 'p', f: [F.txt('que', 'Qué subsanaste')], run(o, v, X) { o.obsFin = null; X.log(o, `Subsanado: ${v.que}`); return 'gobs'; } }] },
  t27: { e: 'ord', rol: 'finanzas', n: 'Pagar', que: 'Paga en InroPay; el estado vuelve a la orden y a cada línea.',
    acts: [{ k: 'pagar', l: 'Registrar pago', t: 'p', f: [F.txt('op', 'N.° de operación')], run(o, v, X) {
      (o.cuotas || []).forEach(c => { if (c.est !== 'Pagado') { c.est = 'Pagado'; c.op = v.op; } });
      if (!(o.cuotas || []).length) o.cuotas = [{ c: 'Pago total', pct: 100, monto: o.monto, est: 'Pagado', op: v.op }];
      o.pagada = X.now; lineasOrden(X.S, o).forEach(l => { if (l.nodo === 'enorden') { l.nodo = 'e28'; l.desde = X.now; X.t(l); } }); X.log(o, `Pagada (op. ${v.op}).`); return 'e28'; } }] },
  e28: { e: 'ord', rol: null, n: 'Pagada', que: 'Orden pagada y en planta, con toda su trazabilidad.', fin: true, acts: [] },
  'lin:e28': { e: 'lin', rol: null, n: 'Pagada y en planta', que: 'Línea completa.', fin: true, acts: [] },

  /* ===== embarque ===== */
  t21: { e: 'emb', rol: 'importaciones', n: 'Seguimiento del embarque', que: 'Sigue la carga y el trámite en paralelo. Marca los documentos del checklist.', form: 'emb',
    acts: [
      { k: 'docs', l: 'Documentos completos', t: 'p', ok: e => CHECK_DOCS.every(([k]) => (e.check || {})[k]) ? true : 'Falta marcar documentos del checklist.', run(e, v, X) { e.tramite = Math.max(e.tramite, 1); e.consolidar = false; X.log(e, 'Documentos completos.'); return 'gper'; } }] },
  gper: { e: 'emb', rol: 'importaciones', n: '¿Requiere permiso?', que: 'Algunos productos necesitan permiso de MTC o DIGESA antes del despacho.',
    acts: [
      { k: 'si', l: 'Requiere permiso', t: 's', f: [F.sel('ent', 'Entidad', ['MTC', 'DIGESA'], 'MTC')], run(e, v, X) { e.permiso = { ent: v.ent }; X.log(e, `Requiere permiso de ${v.ent}.`); return 'tper'; } },
      { k: 'no', l: 'No requiere', t: 'p', run(e, v, X) { X.log(e, 'No requiere permiso.'); return 'gcanal'; } }] },
  tper: { e: 'emb', rol: 'importaciones', n: 'Tramitar permiso', que: 'Tramita el permiso y súmalo al checklist.',
    acts: [{ k: 'ok', l: 'Permiso obtenido', t: 'p', f: [F.file('doc', 'Permiso (PDF)')], run(e, v, X) { e.permiso.doc = v.doc; X.log(e, `Permiso de ${e.permiso.ent} obtenido.`); return 'gcanal'; } }] },
  gcanal: { e: 'emb', rol: 'importaciones', n: 'Numerar DAM y canal', que: 'Registra la DAM y su canal. El tipo de cambio de costeo se congela al numerar.',
    acts: [{ k: 'dam', l: 'Registrar DAM', t: 'p', f: [F.txt('dam', 'N.° de DAM'), F.sel('canal', 'Canal', ['Verde', 'Naranja', 'Rojo'], 'Verde')],
      run(e, v, X) { e.dam = v.dam; e.canal = v.canal; e.tramite = Math.max(e.tramite, 2); e.tc = Object.assign({}, TC); X.log(e, `DAM ${v.dam} numerada, canal ${v.canal}. Tipo de cambio de costeo congelado.`); if (v.canal !== 'Verde') X.log(e, `Canal ${v.canal}: revisión ${v.canal === 'Rojo' ? 'física' : 'documentaria'} antes del levante.`); return 't21b'; } }] },
  t21b: { e: 'emb', rol: 'importaciones', n: 'Levante y costeo', que: 'Registra los gastos (cada uno con su orden hija si es un servicio) y cierra el costeo.', form: 'costeo',
    acts: [{ k: 'cerrar', l: 'Levante y cerrar costeo', t: 'p', ok: e => (e.gastos || []).length ? true : 'Registra al menos un gasto.',
      run(e, v, X) {
        e.tramite = 4; e.carga = Math.max(e.carga, 3); const c = costeoEmb(X.S, e);
        e.costeo.hist.unshift({ v: e.costeo.v, t: X.now, fi: c.fi, motivo: e.costeo.reabierto || 'Cierre inicial' }); e.costeo.reabierto = null;
        e.ocs.forEach(id => { const o = X.S.ord[id]; if (o && o.nodo === 'emb') { o.docs.invoice = o.docs.invoice || 'invoice.pdf'; o.docs.bl = 'bl.pdf'; o.docs.dam = e.dam; mover(o, 't22', X, `Levante del embarque ${e.num}: pasa a almacén.`); } });
        X.log(e, `Costeo cerrado (versión ${e.costeo.v}, FI ${c.fi.toFixed(3)}).`); return 'cerrado'; } }] },
  cerrado: { e: 'emb', rol: null, n: 'Costeo cerrado', que: 'Embarque con levante y costeo cerrado.', fin: true, acts: [] },
  trc: { e: 'emb', rol: 'importaciones', n: 'Reabrir costeo con motivo', que: 'Llegó un gasto después del cierre. Regístralo; el costeo se recalcula y queda una versión nueva.', form: 'costeo',
    acts: [{ k: 'ok', l: 'Cerrar nueva versión', t: 'p', run(e, v, X) {
      const c = costeoEmb(X.S, e); e.costeo.hist.unshift({ v: e.costeo.v, t: X.now, fi: c.fi, motivo: e.costeo.reabierto }); e.costeo.reabierto = null;
      X.log(e, `Costeo cerrado en versión ${e.costeo.v} (FI ${c.fi.toFixed(3)}).`); return 'cerrado'; } }] },

  /* ===== solicitudes ===== */
  tsol: { e: 'sol', rol: 'solicitante', n: 'Registrar solicitud', que: 'Registra lo que necesita tu área. Puedes pegar filas desde Excel.', form: 'items',
    acts: [{ k: 'env', l: 'Enviar a mi jefe', t: 'p', ok: s => (s.items || []).length ? true : 'Agrega al menos un ítem.', run(s, v, X) { X.log(s, 'Solicitud enviada para liberar.'); return 'gsl'; } }] },
  gsl: { e: 'sol', rol: 'jefatura', n: '¿Se libera?', que: 'Libera la solicitud, obsérvala o derívala a caja chica si es menor o urgente.',
    acts: [
      { k: 'lib', l: 'Liberar', t: 'p', run(s, v, X) {
        s.items.forEach(it => X.nuevo('lin', { pry: null, sol: s.id, desc: it.desc, cant: +it.cant, base: +it.base || 0, area: s.area, tipo: 'bien', niv: 'Equipo', nodo: 't5', partida: 'Administrativo', cc: s.cc }));
        X.log(s, `Liberada: ${s.items.length} ítem(s) pasan a pedir SKU.`); return 'enreq'; } },
      { k: 'cc', l: 'Caja chica o tarjeta', t: 's', run(s, v, X) { X.log(s, 'Derivada a compra por caja chica o tarjeta.'); return 'tcc'; } },
      { k: 'obs', l: 'Observar', t: 'd', f: [F.motivo], run(s, v, X) { X.log(s, `Observada: ${v.motivo}`); return 'tsol'; } }] },
  enreq: { e: 'sol', rol: null, n: 'En requerimiento', que: 'Sus ítems siguen en el plan de compras.', fin: true, acts: [] },
  tcc: { e: 'sol', rol: 'compras', n: 'Comprar por caja chica', que: 'Compra y paga al momento; luego rinde con el comprobante.',
    acts: [{ k: 'ok', l: 'Rendir compra', t: 'p', f: [F.txt('comp', 'Comprobante'), F.num('monto', 'Monto (S/)')], run(s, v, X) { s.rendido = { comp: v.comp, monto: +v.monto }; X.log(s, `Comprado y rendido en la liquidación de caja chica (S/ ${fmt(v.monto)}).`); return 'ecc'; } }] },
  ecc: { e: 'sol', rol: null, n: 'Rendido en caja chica', que: 'Gasto rendido en la liquidación de caja chica.', fin: true, acts: [] },
  tmu: { e: 'sol', rol: 'compras', n: 'Comprar muestras', que: 'Compra las muestras con el proceso normal y el centro de costo de evaluación.',
    acts: [{ k: 'ok', l: 'Iniciar compra', t: 'p', run(s, v, X) {
      s.items.forEach(it => X.nuevo('lin', { pry: s.pry, sol: s.id, desc: it.desc, cant: +it.cant, base: 0, area: 'TICs', tipo: 'bien', niv: 'Equipo', nodo: 't5', partida: 'Muestras', cc: s.cc }));
      X.log(s, 'Compra de muestras iniciada (pide SKU y sigue el flujo normal).'); return 'enreq'; } }] },
  tms: { e: 'sol', rol: 'servicios', n: 'Contratar servicio previo', que: 'Emite la orden de servicio con el centro de costo de evaluación.',
    acts: [{ k: 'ok', l: 'Iniciar contratación', t: 'p', run(s, v, X) {
      s.items.forEach(it => X.nuevo('lin', { pry: s.pry, sol: s.id, desc: it.desc, cant: 1, base: 0, area: 'Pedagogía', tipo: 'servicio', niv: 'Servicio', nodo: 't7', partida: 'Comercial y evaluación', cc: s.cc, sku: 'SRV-GEN' }));
      X.log(s, 'Contratación del servicio iniciada.'); return 'enreq'; } }] }
};

/* acciones laterales (no son el siguiente paso, pero el flujo las permite) */
const LATERALES = {
  pry: [{ k: 'adicional', l: 'Registrar adicional o post-venta', rol: ['pcp', 'costos'], cuando: p => p.nodo === 'ejec' && !p.padre,
    f: [F.txt('desc', 'Qué pide el cliente')],
    run(p, v, X) {
      const n = Object.values(X.S.pry).filter(x => x.padre === p.id).length + 2;
      const q = X.nuevo('pry', { nombre: `${p.nombre} · adicional`, cliente: p.cliente, empresa: p.empresa, padre: p.id, etapa: 'ganado', nodo: 't2b', cc: `${p.cc}-${String(n).padStart(2, '0')}`, ficha: p.ficha, nota: v.desc });
      X.log(q, `Adicional o post-venta de ${p.nombre}: ${v.desc}.`); X.log(p, `Adicional registrado (${q.cc}).`); return q; } }],
  ord: [
    { k: 'mod', l: 'Modificar orden', rol: ['compras'], cuando: o => ['t19', 'gat', 'tade', 't22', 'tcs'].includes(o.nodo),
      f: [F.num('monto', 'Monto'), F.sel('mon', 'Moneda', ['PEN', 'USD', 'EUR', 'GBP'], o => o.mon), F.sel('forma', 'Forma de pago', FORMAS, o => o.forma)],
      run(o, v, X) {
        const crit = +v.monto !== o.monto || v.mon !== o.mon || v.forma !== o.forma;
        o.monto = +v.monto; o.mon = v.mon; o.forma = v.forma; o.version = (o.version || 1) + 1;
        if (crit) { o.cuotas = (o.cuotas || []).filter(c => c.est === 'Pagado'); X.log(o, `Orden modificada (versión ${o.version}): cambió monto, moneda o forma de pago; vuelve a aprobación y las cuotas se recalculan.`, { auto: 'gmc' }); mover(o, 't15', X); }
        else X.log(o, `Orden modificada sin cambios críticos (versión ${o.version}).`, { auto: 'gmc' });
        return o; } },
    { k: 'anu', l: 'Solicitar anulación', rol: ['compras'], cuando: o => ['t19', 'gat', 'tade', 't22'].includes(o.nodo), f: [F.motivo],
      run(o, v, X) { o.antes = o.nodo; X.log(o, `Anulación solicitada: ${v.motivo}`, { auto: 'gmc' }); mover(o, 'tanu', X); return o; } }],
  emb: [
    { k: 'carga', l: 'Avanzar estado de la carga', rol: ['importaciones'], cuando: e => e.carga < CARGA.length - 1, f: [{ k: 'a', l: 'Nuevo estado', tipo: 'sel', req: true, op: e => CARGA.slice(e.carga + 1), def: e => CARGA[e.carga + 1] }],
      run(e, v, X) { e.carga = CARGA.indexOf(v.a); X.log(e, `Carga: ${v.a}.`); return e; } },
    { k: 'gasto', l: 'Registrar gasto después del cierre', rol: ['importaciones'], cuando: e => e.nodo === 'cerrado', f: [F.motivo],
      run(e, v, X) { e.costeo.v += 1; e.costeo.reabierto = v.motivo; X.log(e, `Costeo reabierto: ${v.motivo}`, { auto: 's0d' }); mover(e, 'trc', X); return e; } }],
  lin: []
};

/* ---------- utilidades del dominio ---------- */
function vivas(l) { return (l.cots || []).filter(c => c.pre !== 'rechazado'); }
function skuParecidos(S, l) {
  const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const tk = norm(l.tipoArt), mk = norm(l.marca), mo = norm(l.modelo);
  const out = [], vistos = new Set();
  Object.values(S.lin).forEach(x => {
    if (!x.sku || x.id === l.id || vistos.has(x.sku)) return;
    const st = norm(x.tipoArt) === tk && tk, sm = mk && norm(x.marca) === mk, smo = mo && norm(x.modelo) === mo;
    if (st && (sm || smo || (!mk && !mo))) { vistos.add(x.sku); out.push({ sku: x.sku, desc: `${x.tipoArt || ''} ${x.marca || ''} ${x.modelo || ''}`.trim(), igual: sm && smo }); }
  });
  (S.cfg.articulos || []).forEach(a => { if (!vistos.has(a.sku) && norm(a.tipo) === tk && (!mk || norm(a.marca) === mk)) { vistos.add(a.sku); out.push({ sku: a.sku, desc: `${a.tipo} ${a.marca} ${a.modelo}`, igual: norm(a.modelo) === mo }); } });
  return out;
}
function precalifica(ruc) { const d = +String(ruc).slice(-1); return (d === 7 || d === 9) ? 'rojo' : 'verde'; }
function crearOrden(l, X) {
  const S = X.S, c = cotEleg(l), p = provDe(S, c.ruc), pr = partePro(S, l);
  const grupo = Object.values(S.lin).filter(x => x.nodo === 't14' && x.pry === l.pry && cotEleg(x) && cotEleg(x).ruc === c.ruc && x.tipo === l.tipo);
  const tipo = p.origen === 'Extranjero' ? 'importacion' : (l.tipo === 'servicio' ? 'servicio' : 'nacional');
  const empresa = (pr && pr.empresa) || 'INROPRIN', serie = EMPRESAS[empresa] || 'IP', pro = tipo === 'importacion' ? 'IMP' : tipo === 'servicio' ? 'SRV' : 'NAC';
  const monto = r2(grupo.reduce((a, x) => a + (x.cant || 0) * (cotEleg(x).precio || 0), 0));
  const o = X.nuevo('ord', { num: `${serie}-${pro}-${AÑO}-${String(X.seq(serie + pro)).padStart(4, '0')}`, pry: l.pry, empresa, ruc: c.ruc, tipo, lineas: grupo.map(x => x.id), monto, mon: c.mon, forma: c.forma || 'Crédito', adel: c.adel || 0, dias: c.dias || 0, docs: { cotizacion: c.pdf || 'cotizacion.pdf' }, version: 1, incoterm: tipo === 'importacion' ? 'FOB' : null, demasia: grupo.reduce((a, x) => a + (x.demasia || 0), 0), nodo: 't14' });
  grupo.forEach(x => { x.oc = o.id; mover(x, 'enorden', X, `Va en la orden ${o.num}.`); });
  X.log(o, `Orden creada con ${grupo.length} línea(s) de ${p.nombre}.`);
  mover(o, 'gexc', X);
  return o;
}
function liberarLineas(o, X, porque) {
  lineasOrden(X.S, o).forEach(l => { if (l.oc === o.id) { l.oc = null; const c = cotEleg(l); if (c) c.dic = 'no'; l.eleg = null; l.recibido = 0; mover(l, l.tipo === 'servicio' ? 't9s' : 't9', X, `La orden ${o.num} quedó ${porque}: la línea recupera su saldo y vuelve a cotizar.`); } });
}
function costoAdq(S, p) {
  return Object.values(S.ord).filter(o => o.pry === p.id && ['e28', 't27', 'gobs', 't26'].includes(o.nodo)).reduce((a, o) => a + montoPEN(o), 0) + (p.horasEval || 0);
}
function costeoEmb(S, e) {
  const tc = e.tc || TC, prods = [];
  e.ocs.forEach(id => { const o = S.ord[id]; if (!o) return; lineasOrden(S, o).forEach(l => { const c = cotEleg(l) || {}; prods.push({ l, o, exw: (l.cant || 0) * (c.precio || 0) * (tc[o.mon] || 1), muestra: l.partida === 'Muestras' }); }); });
  const exwT = prods.reduce((a, p) => a + p.exw, 0) || 1;
  const gVal = (e.gastos || []).filter(g => g.costo && g.rep === 'valor').reduce((a, g) => a + pen(g.monto, g.mon), 0);
  const gProd = (e.gastos || []).filter(g => g.costo && g.rep === 'producto').reduce((a, g) => a + pen(g.monto, g.mon), 0);
  prods.forEach(p => { p.pct = p.exw / exwT; p.gastos = gVal * p.pct; p.adv = gProd * p.pct; p.total = p.exw + p.gastos + p.adv; p.unit = p.total / Math.max(1, p.l.cant || 1); });
  return { prods, exwT, fi: (exwT + gVal + gProd) / exwT };
}

/* ---------- a quién le toca ---------- */
function nodoDe(e) { return NODOS[e._t + ':' + e.nodo] || NODOS[e.nodo] || { rol: null, n: e.nodo, que: '', acts: [] }; }
function rolesDe(e) { const nd = nodoDe(e); if (!nd.rol) return []; return typeof nd.rol === 'function' ? nd.rol(e) : [nd.rol]; }
function meToca(e, rol, area) {
  if (!rolesDe(e).includes(rol)) return false;
  if (rol === 'tecnica' && area && area !== 'Todas') {
    if (e._t === 'lin') return e.area === area;
    if (e._t === 'ord') return true;
  }
  return true;
}
function accionesPara(e, rol, X) {
  const nd = nodoDe(e);
  return (nd.acts || []).filter(a => !a.rol || a.rol === rol).map(a => Object.assign({ okMsg: a.ok ? a.ok(e, X) : true }, a));
}
function lateralesPara(e, rol) { return (LATERALES[e._t] || []).filter(a => a.rol.includes(rol) && a.cuando(e)); }

/* ejecuta una salida: valida, corre y mueve; devuelve el contexto (tocados, creados, avisos) */
function ejecutar(S, e, actK, v, rol, who, lateral) {
  const X = ctx(S, rol, who);
  const lista = lateral ? lateralesPara(e, rol) : accionesPara(e, rol, X);
  const a = lista.find(x => x.k === actK);
  if (!a) throw new Error('Esa acción ya no está disponible.');
  if (!lateral && a.okMsg !== true) throw new Error(a.okMsg);
  for (const f of (a.f || [])) if (f.req && (v[f.k] === undefined || v[f.k] === '' || v[f.k] === null)) throw new Error(`Completa «${f.l}».`);
  X.t(e);
  const r = a.run(e, v || {}, X);
  if (!lateral && typeof r === 'string') mover(e, r, X);
  X.accion = a.l; X.ent = e;
  return X;
}

/* ---------- formato ---------- */
function fmt(n) { return (+n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function hoy(dias) { const d = new Date(Date.now() + (dias || 0) * 864e5); return d.toISOString().slice(0, 10); }

if (typeof module !== 'undefined') module.exports = { RELOJ, EMPRESAS, ROLES, ROL, AREAS, PARTIDAS, FORMAS, NODOS, AUTO, LATERALES, CARGA, TRAMITE, CHECK_DOCS, GASTOS_IMP, TC, uid, clone, ctx, mover, ejecutar, accionesPara, lateralesPara, nodoDe, rolesDe, meToca, crearOrden, costeoEmb, precalifica, skuParecidos, lineasDe, lineasOrden, cotEleg, provDe, docsRequeridos, faltanDocs, montoPEN, baseOrden, fmt, hoy, vivas, pen, r2, costoAdq };
