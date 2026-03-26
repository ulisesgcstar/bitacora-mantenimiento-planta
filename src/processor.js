/**
 * @fileoverview Motor de procesamiento de respuestas (Pipeline de Datos).
 * @author arket
 */

/**
 * Función principal disparada por el envío del formulario.
 * @param {Object} e Evento de envío de formulario.
 */
// eslint-disable-next-line no-unused-vars
function onFormSubmit(e) {
    try {
        const settings = CONFIG.getSettings();
        console.log('--- Iniciando Procesamiento de Respuesta ---');

        // 1. IDENTIFICACIÓN
        const responseData = extractResponseData(e);

        // 2. LIMPIEZA
        const cleanData = sanitizeData(responseData);

        // 3. MAPEO (Nueva Fase)
        // Transformamos los datos en etiquetas para la plantilla PDF
        const dataMapping = createMapping(cleanData, settings);
        console.log('Mapeo de etiquetas generado con éxito.');

        // Las siguientes fases (Inyección y Conversión) vendrán a continuación
        console.log(`Procesando revisión: ${settings.ID_REVISION_ACTIVA}`);

        console.log('--- Procesamiento Finalizado con Éxito ---');
    } catch (error) {
        console.error('Error en el procesamiento:', error.toString());
    }
}

/**
 * Crea un mapa de sustitución para la plantilla PDF.
 * @param {Object} cleanData
 * @param {Object} settings
 */
function createMapping(cleanData, settings) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const plantaSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.PLANTAS);
    const plantas = plantaSheet.getDataRange().getValues().slice(1);

    // Buscamos la fila de la planta para traer datos extra (Razón Social)
    const infoPlanta = plantas.find(p => p[1] === cleanData.planta) || [];

    const mapa = {
        '{{fecha}}': Utilities.formatDate(cleanData.fecha, "GMT-6", "dd/MM/yyyy"),
        '{{hora}}': Utilities.formatDate(cleanData.fecha, "GMT-6", "HH:mm"),
        '{{planta}}': cleanData.planta,
        '{{razon_social}}': infoPlanta[2] || 'Empresa Gasera S.A.',
        '{{inspector}}': cleanData.inspector,
        '{{ot}}': cleanData.ot,
        '{{id_revision}}': settings.ID_REVISION_ACTIVA
    };

    // Mapeo Dinámico: convierte cada respuesta en un tag {{pregunta}}
    Object.keys(cleanData.respuestas).forEach(pregunta => {
        const tag = `{{${pregunta.toLowerCase().replace(/ /g, '_').substring(0, 20)}}}`;
        mapa[tag] = cleanData.respuestas[pregunta];
    });

    return mapa;
}

/**
 * Extrae las respuestas del formulario y las convierte en JSON.
 */
function extractResponseData(e) {
    const itemResponses = e.response.getItemResponses();
    const data = {
        timestamp: e.response.getTimestamp(),
        email: e.response.getRespondentEmail(),
        respuestasRaw: {}
    };

    itemResponses.forEach(response => {
        data.respuestasRaw[response.getItem().getTitle()] = response.getResponse();
    });

    return data;
}

/**
 * Estructura los datos crudos.
 */
function sanitizeData(data) {
    return {
        fecha: data.timestamp,
        inspector: data.respuestasRaw['¿Quién realiza la inspección?'] || 'N/A',
        planta: data.respuestasRaw['Planta donde se realiza la inspección'] || 'N/A',
        ot: data.respuestasRaw['Número de Orden de Trabajo (OT)'] || 'S/N',
        respuestas: data.respuestasRaw
    };
}

/**
 * @fileoverview Motor de procesamiento de respuestas (Pipeline de Datos).
 * @author arket
 */

/**
 * Función principal disparada por el envío del formulario.
 * @param {Object} e Evento de envío de formulario.
 */
// eslint-disable-next-line no-unused-vars
function onFormSubmit(e) {
    try {
        const settings = CONFIG.getSettings();
        console.log('--- Iniciando Procesamiento de Respuesta ---');

        // 1. IDENTIFICACIÓN
        const responseData = extractResponseData(e);

        // 2. LIMPIEZA
        const cleanData = sanitizeData(responseData);

        // 3. MAPEO
        const dataMapping = createMapping(cleanData, settings);

        // 4. GESTIÓN DE ARCHIVOS (Nueva Parte: Replicabilidad total)
        // Buscamos o creamos la carpeta del mes actual para guardar el PDF
        const folder = getDestinationFolder(settings.ID_CARPETA_RAIZ);
        console.log(`Carpeta de destino lista: ${folder.getName()}`);

        // NOTA: En el siguiente paso ejecutaremos la creación del PDF usando este 'folder' y 'dataMapping'

        console.log('--- Procesamiento Finalizado con Éxito ---');
    } catch (error) {
        console.error('Error en el procesamiento:', error.toString());
    }
}

/**
 * Busca o crea una estructura de carpetas Año > Mes en Drive.
 * @param {string} rootFolderId ID de la carpeta raíz desde _CONFIG_.
 * @returns {GoogleAppsScript.Drive.Folder} Carpeta del mes actual.
 */
function getDestinationFolder(rootFolderId) {
    const root = DriveApp.getFolderById(rootFolderId);
    const ahora = new Date();
    const anio = ahora.getFullYear().toString();
    const mesNom = Utilities.formatDate(ahora, "GMT-6", "MMMM").toUpperCase();

    // Función interna para buscar o crear subcarpetas
    const getOrCreate = (parent, name) => {
        const folders = parent.getFoldersByName(name);
        return folders.hasNext() ? folders.next() : parent.createFolder(name);
    };

    const folderAnio = getOrCreate(root, anio);
    const folderMes = getOrCreate(folderAnio, mesNom);

    return folderMes;
}

/**
 * Crea un mapa de sustitución para la plantilla PDF.
 */
function createMapping(cleanData, settings) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const plantaSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.PLANTAS);
    const plantas = plantaSheet.getDataRange().getValues().slice(1);
    const infoPlanta = plantas.find(p => p[1] === cleanData.planta) || [];

    const mapa = {
        '{{fecha}}': Utilities.formatDate(cleanData.fecha, "GMT-6", "dd/MM/yyyy"),
        '{{hora}}': Utilities.formatDate(cleanData.fecha, "GMT-6", "HH:mm"),
        '{{planta}}': cleanData.planta,
        '{{razon_social}}': infoPlanta[2] || 'Empresa Gasera S.A.',
        '{{inspector}}': cleanData.inspector,
        '{{ot}}': cleanData.ot,
        '{{id_revision}}': settings.ID_REVISION_ACTIVA
    };

    Object.keys(cleanData.respuestas).forEach(pregunta => {
        const tag = `{{${pregunta.toLowerCase().replace(/ /g, '_').substring(0, 20)}}}`;
        mapa[tag] = cleanData.respuestas[pregunta];
    });

    return mapa;
}

/**
 * Extrae las respuestas del formulario y las convierte en JSON.
 */
function extractResponseData(e) {
    const itemResponses = e.response.getItemResponses();
    const data = {
        timestamp: e.response.getTimestamp(),
        email: e.response.getRespondentEmail(),
        respuestasRaw: {}
    };

    itemResponses.forEach(response => {
        data.respuestasRaw[response.getItem().getTitle()] = response.getResponse();
    });

    return data;
}

/**
 * Estructura los datos crudos.
 */
function sanitizeData(data) {
    return {
        fecha: data.timestamp,
        inspector: data.respuestasRaw['¿Quién realiza la inspección?'] || 'N/A',
        planta: data.respuestasRaw['Planta donde se realiza la inspección'] || 'N/A',
        ot: data.respuestasRaw['Número de Orden de Trabajo (OT)'] || 'S/N',
        respuestas: data.respuestasRaw
    };
}