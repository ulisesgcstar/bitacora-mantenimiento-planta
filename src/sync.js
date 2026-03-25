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
    data.forEach(row => {
        if (row[0]) config[row[0]] = row[1];
    });
    return config;
}

function generarEstructuraCompleta() {
    const conf = getConfig();
    const form = FormApp.openById(conf.ID_FORMULARIO);
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    Logger.log("Iniciando construcción...");

    // Limpieza total del formulario
    const items = form.getItems();
    items.forEach(item => form.deleteItem(item));

    // --- 1. SECCIÓN GLOBAL_INICIO ---
    form.addPageBreakItem().setTitle("1. DATOS DE IDENTIFICACIÓN");
    const preguntasInicio = getPreguntasPorRevision(ss, "GLOBAL_INICIO");
    procesarBloquePreguntas(form, preguntasInicio);

    // --- 2. LÓGICA DE PERIODICIDAD ---
    const tiposRevision = getTiposActivos(ss);
    const periodicidades = [...new Set(tiposRevision.map(t => t.periodicidad))];

    const sectionPeriodo = form.addPageBreakItem().setTitle("2. SELECCIÓN DE PERIODICIDAD");
    const preguntaPeriodo = form.addListItem()
        .setTitle("Seleccione la periodicidad de la revisión a realizar")
        .setRequired(true);

    // --- 3. CREAR SECCIÓN FINAL PRIMERO (Para referencias de saltos) ---
    const sectionFinal = form.addPageBreakItem().setTitle("EVIDENCIAS Y OBSERVACIONES FINAL");
    const preguntasFinal = getPreguntasPorRevision(ss, "GLOBAL_FINAL");
    procesarBloquePreguntas(form, preguntasFinal);

    // --- 4. CREAR SECCIONES DE REVISIÓN (Cuerpo) ---
    const seccionesDeRevision = {};
    tiposRevision.forEach(tipo => {
        const section = form.addPageBreakItem()
            .setTitle(tipo.nombre)
            .setGoToPage(sectionFinal); // Salto automático al terminar la revisión

        const preguntas = getPreguntasPorRevision(ss, tipo.id);
        procesarBloquePreguntas(form, preguntas);
        seccionesDeRevision[tipo.id] = section;
    });

    // --- 5. CONECTAR MENÚS DE PERIODICIDAD ---
    const choicesPeriodo = [];
    periodicidades.forEach(periodo => {
        const subSeccionMenu = form.addPageBreakItem().setTitle("LISTADO: " + periodo);
        const listaFormatos = form.addListItem().setTitle("Seleccione el formato " + periodo);

        const choicesFormato = tiposRevision
            .filter(t => t.periodicidad === periodo)
            .map(t => listaFormatos.createChoice(t.nombre, seccionesDeRevision[t.id]));

        listaFormatos.setChoices(choicesFormato);
        choicesPeriodo.push(preguntaPeriodo.createChoice(periodo, subSeccionMenu));
    });

    preguntaPeriodo.setChoices(choicesPeriodo);
    Logger.log("Sincronización Exitosa.");
}

/**
 * Maneja la agrupación de preguntas tipo GRID basadas en GRUPO_CUADRICULA
 */
function procesarBloquePreguntas(form, preguntas) {
    let i = 0;
    while (i < preguntas.length) {
        const p = preguntas[i];

        // Si es un GRID y tiene un nombre de grupo, buscamos a sus "compañeros"
        if (p.tipo === 'GRID' && p.cuadricula) {
            const mismoGrupo = preguntas.filter(x => x.cuadricula === p.cuadricula && x.tipo === 'GRID');
            const filas = mismoGrupo.map(x => x.texto);
            const opciones = getEscalaOpciones(p.escala);

            form.addGridItem()
                .setTitle(p.cuadricula)
                .setRows(filas)
                .setColumns(opciones)
                .setRequired(true);

            i += mismoGrupo.length; // Saltamos las preguntas que ya agrupamos
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
        case 'DATE': form.addDateItem().setTitle(p.texto); break;
        case 'TIME': form.addTimeItem().setTitle(p.texto); break;
        case 'LIST':
            // Si la pregunta es "Planta" o "Inspector", cargamos los catálogos
            let opciones = [];
            if (p.texto.toLowerCase().includes("planta")) opciones = getListaColumna(ss, "CAT_PLANTAS", 1);
            else if (p.texto.toLowerCase().includes("inspector")) opciones = getListaColumna(ss, "CAT_USUARIOS", 1);
            else opciones = getEscalaOpciones(p.escala);

            form.addListItem().setTitle(p.texto).setChoiceValues(opciones).setRequired(true);
            break;
        case 'FILE_UPLOAD':
            form.addSectionHeaderItem().setTitle(p.texto).setHelpText("Suba sus evidencias (Máx 10 fotos).");
            break;
        case 'CHECKBOX_GRID':
            const colCheck = getEscalaOpciones(p.escala);
            form.addCheckboxGridItem().setTitle(p.texto).setRows([p.texto]).setColumns(colCheck).setRequired(true);
            break;
    }
}

// Nueva función de soporte para leer catálogos simples
function getListaColumna(ss, nombreHoja, columna) {
    const sheet = ss.getSheetByName(nombreHoja);
    if (!sheet) return ["Hoja no encontrada"];
    const values = sheet.getDataRange().getValues();
    values.shift(); // Quitar encabezado
    return values.map(row => row[columna - 1].toString()).filter(item => item !== "");
}

/**
 * FUNCIONES DE SOPORTE (Lectura de Sheets)
 */
function getPreguntasPorRevision(ss, idRevision) {
    const sheet = ss.getSheetByName("CAT_PREGUNTAS");
    const values = sheet.getDataRange().getValues();
    values.shift(); // Quitar encabezado
    return values
        .filter(row => row[1] === idRevision && row[7] === true)
        .map(row => ({
            id: row[0],
            idRevision: row[1],
            grupo: row[2],
            cuadricula: row[3],
            texto: row[4],
            tipo: row[5],
            escala: row[6]
        }));
}

function getTiposActivos(ss) {
    const sheet = ss.getSheetByName("CAT_TIPO_REVISION");
    const values = sheet.getDataRange().getValues();
    values.shift();
    return values
        .filter(row => row[4] === true)
        .map(row => ({ id: row[0], nombre: row[1], categoria: row[2], periodicidad: row[3] }));
}

function getEscalaOpciones(idEscala) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("CAT_ESCALAS");
    if (!sheet) return ["N/A"];
    const values = sheet.getDataRange().getValues();
    const fila = values.find(row => row[0] === idEscala);
    return fila ? fila[1].toString().split(",").map(item => item.trim()) : ["N/A"];
}

function syncCatalogos() {
    SpreadsheetApp.getUi().alert("Función de sincronización rápida de listas en desarrollo.");
}