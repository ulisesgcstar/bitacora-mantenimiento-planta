/**
 * @fileoverview Orquestador de sincronización entre Sheets y el Formulario.
 */

/**
 * Actualiza las preguntas de tipo lista (dropdown) basadas en CAT_PLANTAS y CAT_USUARIOS.
 * @param {GoogleAppsScript.Forms.Form} form
 * @param {Object} settings
 */
function syncListItems(form, settings) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Mapeo de Catálogo -> Título de la pregunta en el Formulario
    const mappings = [
        { sheetName: CONFIG.SHEET_NAMES.PLANTAS, questionTitle: 'Planta donde se realiza la inspección', column: 1 }, // NOMBRE_PLANTA
        { sheetName: CONFIG.SHEET_NAMES.USUARIOS, questionTitle: '¿Quién realiza la inspección?', column: 1 }      // NOMBRE_USUARIO
    ];

    mappings.forEach(map => {
        const sheet = ss.getSheetByName(map.sheetName);
        const data = sheet.getDataRange().getValues().slice(1); // Quitamos encabezado

        // Filtramos solo los elementos activos (asumiendo que la última columna es el booleano _ACTIVO)
        const activeOptions = data
            .filter(row => row[row.length - 1] === true)
            .map(row => row[map.column]);

        // Buscamos la pregunta en el formulario por su título
        const item = form.getItems(FormApp.ItemType.LIST)
            .find(i => i.getTitle() === map.questionTitle);

        if (item) {
            item.asListItem().setChoiceValues(activeOptions);
            console.log(`Actualizada la lista: ${map.questionTitle} con ${activeOptions.length} opciones.`);
        }
    });
}

/**
 * Segunda parte de la sincronización: Construcción dinámica del cuestionario.
 */
function syncDynamicQuestions(form, settings) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const activeRevision = settings.ID_REVISION_ACTIVA;

    if (!activeRevision) {
        console.error('Error: No hay ID_REVISION_ACTIVA en la pestaña _CONFIG_');
        return;
    }

    // 1. Obtener Escalas (Diccionario de ID_ESCALA -> Array de opciones)
    const scales = getScalesMap(ss);

    // 2. Obtener Preguntas y filtrar por la revisión activa + Globales
    const questionsSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.PREGUNTAS);
    const allQuestions = questionsSheet.getDataRange().getValues().slice(1);

    const filteredQuestions = allQuestions.filter(row => {
        const [, idRevision, , , , , , activo] = row;
        return activo === true && (idRevision === activeRevision || idRevision.includes('GLOBAL'));
    });

    // 3. Limpiar secciones dinámicas (opcional: podrías limpiar todo el formulario antes)
    // Para este nivel, eliminaremos todos los items después de los selectores base para reconstruir
    const items = form.getItems();
    // Asumimos que los primeros items son fijos (Fecha, Planta, Inspector, OT)
    // Eliminamos desde el item 6 en adelante para reconstruir el cuerpo
    for (let i = items.length - 1; i >= 6; i--) {
        form.deleteItem(i);
    }

    // 4. Inyectar preguntas según su TIPO_CONTROL
    filteredQuestions.forEach(q => {
        const [, , , grupoCuadricula, texto, tipo, idEscala] = q;

        switch (tipo) {
            case 'TEXT':
                form.addTextItem().setTitle(texto).setRequired(true);
                break;

            case 'GRID':
                if (scales[idEscala]) {
                    form.addGridItem()
                        .setTitle(grupoCuadricula || 'Evaluación')
                        .setRows([texto])
                        .setColumns(scales[idEscala])
                        .setRequired(true);
                }
                break;

            case 'TIME':
                form.addTimeItem().setTitle(texto).setRequired(true);
                break;

            // Aquí podemos extender a más tipos (MULTIPLE_CHOICE, PARAGRAPH, etc.)
        }
    });

    console.log(`Cuerpo de la revisión ${activeRevision} inyectado con éxito.`);
}

/**
 * Crea un mapa de búsqueda rápida para las escalas de respuesta.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss 
 * @returns {Object} { "C-NC-NA": ["C", "NC", "NA"], ... }
 */
function getScalesMap(ss) {
    const sheet = ss.getSheetByName('CAT_ESCALAS');
    const data = sheet.getDataRange().getValues().slice(1);
    const map = {};

    data.forEach(row => {
        const [id, opciones] = row;
        // Convertimos la cadena "C, NC, NA" en un array real
        map[id] = opciones.split(',').map(item => item.trim());
    });

    return map;
}

/**
 * Actualiza la función principal para orquestar todo el flujo.
 */
// eslint-disable-next-line no-unused-vars
function syncForm() {
    const settings = CONFIG.getSettings();
    if (!settings.ID_FORMULARIO) throw new Error('ID_FORMULARIO no definido en _CONFIG_');

    const form = FormApp.openById(settings.ID_FORMULARIO);

    console.log('--- Iniciando Sincronización Power ---');

    // 1. Actualizar Título y Descripción (Contexto)
    updateFormMetadata(form, settings);

    // 2. Sincronizar Listas Base (Plantas y Usuarios)
    syncListItems(form, settings);

    // 3. Inyectar Cuerpo de la Revisión
    syncDynamicQuestions(form, settings);

    console.log('--- Proceso Finalizado con Éxito ---');
}

/**
 * Ajusta el título del formulario para que el inspector sepa qué está llenando.
 */
function updateFormMetadata(form, settings) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const revSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.REVISIONES);
    const revData = revSheet.getDataRange().getValues().slice(1);

    const revision = revData.find(r => r[0] === settings.ID_REVISION_ACTIVA);

    if (revision) {
        const [id, nombre, categoria, periodicidad] = revision;
        form.setTitle(`BITÁCORA: ${nombre}`)
            .setDescription(`ID: ${id}\nCategoría: ${categoria}\nPeriodicidad: ${periodicidad}\n\nSistema automatizado v2.0`);
    }
}