/**
 * @OnlyCurrentDoc
 * sync.js - Orquestador de Formulario Dinámico
 */

function onOpen() {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('🚀 Administración')
        .addItem('1. Sincronizar Catálogos (Rápido)', 'syncCatalogos')
        .addSeparator()
        .addItem('2. Generar Estructura Completa (Power)', 'generarEstructuraCompleta')
        .addToUi();
}

function getConfig() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("_CONFIG_");
    const data = sheet.getRange("A2:B10").getValues();
    let config = {};
    data.forEach(row => { if (row[0]) config[row[0]] = row[1]; });
    return config;
}

function generarEstructuraCompleta() {
    const conf = getConfig();
    const form = FormApp.openById(conf.ID_FORMULARIO);
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    Logger.log("Iniciando reconstrucción lineal estricta...");

    // 1. Limpieza total
    const items = form.getItems();
    items.forEach(item => form.deleteItem(item));

    const tiposRevision = getTiposActivos(ss);
    const periodicidades = [...new Set(tiposRevision.map(t => t.periodicidad))];

    // ==========================================
    // CONSTRUCCIÓN FÍSICA (DE ARRIBA HACIA ABAJO)
    // ==========================================

    // --- A. INICIO ---
    form.addPageBreakItem().setTitle("1. DATOS DE IDENTIFICACIÓN");
    procesarBloquePreguntas(form, getPreguntasPorRevision(ss, "GLOBAL_INICIO"));

    // --- B. SELECTOR PERIODICIDAD ---
    form.addPageBreakItem().setTitle("2. SELECCIÓN DE PERIODICIDAD");
    const itemPeriodo = form.addListItem().setTitle("Seleccione la frecuencia de la revisión").setRequired(true);

    // --- C. MENÚS DE LISTADO POR PERIODICIDAD ---
    const paginasSubMenu = {};
    const itemsListaFormato = {};

    periodicidades.forEach(p => {
        paginasSubMenu[p] = form.addPageBreakItem().setTitle("LISTADO: " + p);
        itemsListaFormato[p] = form.addListItem().setTitle("Seleccione el formato específico de " + p).setRequired(true);
    });

    // --- D. REVISIONES (CUERPOS) ---
    const paginasRevision = {};
    tiposRevision.forEach(tipo => {
        paginasRevision[tipo.id] = form.addPageBreakItem().setTitle(tipo.nombre);
        procesarBloquePreguntas(form, getPreguntasPorRevision(ss, tipo.id));
    });

    // --- E. FINAL ---
    const pageFinal = form.addPageBreakItem().setTitle("EVIDENCIAS Y OBSERVACIONES FINAL");
    procesarBloquePreguntas(form, getPreguntasPorRevision(ss, "GLOBAL_FINAL"));

    // Al terminar esta última sección, el formulario DEBE ENVIARSE
    pageFinal.setGoToPage(FormApp.PageNavigationType.SUBMIT);

    // ==========================================
    // CABLEADO DE SALTOS (NAVEGACIÓN)
    // ==========================================

    // 1. Conectar Revisiones -> Sección Final
    tiposRevision.forEach(tipo => {
        paginasRevision[tipo.id].setGoToPage(pageFinal);
    });

    // 2. Conectar Sub-Menús -> Revisiones
    periodicidades.forEach(p => {
        const itemLista = itemsListaFormato[p];
        const choicesFormato = tiposRevision
            .filter(t => t.periodicidad === p)
            .map(t => itemLista.createChoice(t.nombre, paginasRevision[t.id]));

        itemLista.setChoices(choicesFormato);
    });

    // 3. Conectar Selector Principal -> Sub-Menús
    const choicesSelector = periodicidades.map(p => {
        return itemPeriodo.createChoice(p, paginasSubMenu[p]);
    });
    itemPeriodo.setChoices(choicesSelector);

    Logger.log("Sincronización Exitosa.");
}

// --- FUNCIONES DE DIBUJO Y SOPORTE ---

function procesarBloquePreguntas(form, preguntas) {
    let i = 0;
    while (i < preguntas.length) {
        const p = preguntas[i];

        // Soporte para agrupar tanto GRID como CHECKBOX_GRID
        if ((p.tipo === 'GRID' || p.tipo === 'CHECKBOX_GRID') && p.cuadricula) {
            const mismoGrupo = preguntas.filter(x => x.cuadricula === p.cuadricula && x.tipo === p.tipo);
            const filas = mismoGrupo.map(x => x.texto);

            if (p.tipo === 'GRID') {
                form.addGridItem().setTitle(p.cuadricula).setRows(filas).setColumns(getEscalaOpciones(p.escala)).setRequired(true);
            } else {
                form.addCheckboxGridItem().setTitle(p.cuadricula).setRows(filas).setColumns(getEscalaOpciones(p.escala)).setRequired(true);
            }
            i += mismoGrupo.length;
        } else {
            dibujarPreguntaIndividual(form, p);
            i++;
        }
    }
}

function dibujarPreguntaIndividual(form, p) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    switch (p.tipo) {
        case 'TEXT': form.addTextItem().setTitle(p.texto).setRequired(true); break;
        case 'PARAGRAPH': form.addParagraphTextItem().setTitle(p.texto); break;
        case 'DATE': form.addDateItem().setTitle(p.texto).setRequired(true); break;
        case 'TIME': form.addTimeItem().setTitle(p.texto).setRequired(true); break;
        case 'LIST':
            let opciones = [];
            const t = p.texto.toLowerCase();
            if (t.includes("planta") || t.includes("ubicación")) {
                opciones = getListaColumna(ss, "CAT_PLANTAS", 2);
            } else if (t.includes("quien") || t.includes("inspector") || t.includes("realiza")) {
                opciones = getListaColumna(ss, "CAT_USUARIOS", 2);
            } else {
                opciones = getEscalaOpciones(p.escala);
            }
            form.addListItem().setTitle(p.texto).setChoiceValues(opciones.length > 0 ? opciones : ["Sin datos"]).setRequired(true);
            break;
        case 'FILE_UPLOAD':
            form.addSectionHeaderItem().setTitle(p.texto).setHelpText("Suba evidencias (Máx 10 fotos).");
            break;
        case 'GRID':
            form.addGridItem().setTitle(p.texto).setRows([p.texto]).setColumns(getEscalaOpciones(p.escala)).setRequired(true);
            break;
        case 'CHECKBOX_GRID':
            form.addCheckboxGridItem().setTitle(p.texto).setRows([p.texto]).setColumns(getEscalaOpciones(p.escala)).setRequired(true);
            break;
        default:
            Logger.log("Tipo no soportado o mal escrito en la base: " + p.tipo);
    }
}

function getListaColumna(ss, nombreHoja, numCol) {
    const sheet = ss.getSheetByName(nombreHoja);
    if (!sheet) return [];
    const values = sheet.getDataRange().getValues();
    values.shift();
    return values.map(row => row[numCol - 1]).filter(val => val && val !== "").map(val => val.toString());
}

function getPreguntasPorRevision(ss, id) {
    const sheet = ss.getSheetByName("CAT_PREGUNTAS");
    const values = sheet.getDataRange().getValues();
    values.shift();
    return values.filter(row => row[1] === id && row[7] === true)
        .map(row => ({ id: row[0], idRevision: row[1], grupo: row[2], cuadricula: row[3], texto: row[4], tipo: row[5], escala: row[6] }));
}

function getTiposActivos(ss) {
    const sheet = ss.getSheetByName("CAT_TIPO_REVISION");
    const values = sheet.getDataRange().getValues();
    values.shift();
    return values.filter(row => row[4] === true)
        .map(row => ({ id: row[0], nombre: row[1], categoria: row[2], periodicidad: row[3] }));
}

function getEscalaOpciones(id) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("CAT_ESCALAS");
    if (!sheet) return ["N/A"];
    const values = sheet.getDataRange().getValues();
    const fila = values.find(row => row[0] === id);
    return fila ? fila[1].toString().split(",").map(i => i.trim()) : ["N/A"];
}

function syncCatalogos() { SpreadsheetApp.getUi().alert("Función rápida en desarrollo."); }