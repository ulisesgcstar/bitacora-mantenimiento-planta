/**
 * @fileoverview Orquestador de sincronización entre Sheets y el Formulario.
 * Soporta tipos: TEXT, GRID, TIME y FILE (Fotos).
 * @author arket
 */

/**
 * Función principal que dispara la actualización del formulario.
 * Se invoca desde el menú "Sincronización Power".
 */
// eslint-disable-next-line no-unused-vars
function syncForm() {
    const settings = CONFIG.getSettings();
    if (!settings.ID_FORMULARIO) {
        throw new Error('ID_FORMULARIO no definido en la pestaña _CONFIG_');
    }

    const form = FormApp.openById(settings.ID_FORMULARIO);
    console.log('--- Iniciando Sincronización Power ---');

    // 1. Actualizar Metadatos (Título y Descripción)
    updateFormMetadata(form, settings);

    // 2. Sincronizar Listas Base (Plantas y Usuarios)
    syncListItems(form, settings);

    // 3. Inyectar Cuerpo Dinámico de la Revisión (Preguntas y Fotos)
    syncDynamicQuestions(form, settings);

    console.log('--- Proceso Finalizado con Éxito ---');
}

/**
 * Ajusta el título y descripción del formulario según la revisión activa.
 */
function updateFormMetadata(form, settings) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const revSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.REVISIONES);
    const revData = revSheet.getDataRange().getValues().slice(1);

    const revision = revData.find((r) => r[0] === settings.ID_REVISION_ACTIVA);

    if (revision) {
        const [id, nombre, categoria, periodicidad] = revision;
        form
            .setTitle(`BITÁCORA: ${nombre}`)
            .setDescription(
                `ID: ${id}\nCategoría: ${categoria}\nPeriodicidad: ${periodicidad}\n\nSistema automatizado v2.0`
            );
    }
}

/**
 * Actualiza los desplegables de Plantas y Usuarios.
 */
function syncListItems(form, settings) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const mappings = [
        {
            sheetName: CONFIG.SHEET_NAMES.PLANTAS,
            questionTitle: 'Planta donde se realiza la inspección',
            column: 1,
        },
        {
            sheetName: CONFIG.SHEET_NAMES.USUARIOS,
            questionTitle: '¿Quién realiza la inspección?',
            column: 1,
        },
    ];

    mappings.forEach((map) => {
        const sheet = ss.getSheetByName(map.sheetName);
        const data = sheet.getDataRange().getValues().slice(1);

        const activeOptions = data
            .filter((row) => row[row.length - 1] === true)
            .map((row) => row[map.column]);

        const item = form
            .getItems(FormApp.ItemType.LIST)
            .find((i) => i.getTitle() === map.questionTitle);

        if (item) {
            item.asListItem().setChoiceValues(activeOptions);
            console.log(`Lista actualizada: ${map.questionTitle}`);
        }
    });
}

/**
 * Construye el cuerpo del cuestionario inyectando preguntas de CAT_PREGUNTAS.
 */
function syncDynamicQuestions(form, settings) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const activeRevision = settings.ID_REVISION_ACTIVA;

    // 1. Obtener mapa de escalas (C-NC-NA)
    const scales = getScalesMap(ss);

    // 2. Filtrar preguntas de la revisión activa + Globales
    const questionsSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.PREGUNTAS);
    const allQuestions = questionsSheet.getDataRange().getValues().slice(1);

    const filteredQuestions = allQuestions.filter((row) => {
        const [, idRev, , , , , , activo] = row;
        return (
            activo === true && (idRev === activeRevision || idRev.includes('GLOBAL'))
        );
    });

    // 3. Limpieza: Eliminamos items dinámicos previos (del item 6 en adelante)
    const items = form.getItems();
    for (let i = items.length - 1; i >= 6; i--) {
        form.deleteItem(i);
    }

    // 4. Inyección de nuevos controles
    filteredQuestions.forEach((q) => {
        const [, , , grupoCuadricula, texto, tipo, idEscala] = q;

        switch (tipo) {
            case 'TEXT':
                form.addTextItem().setTitle(texto).setRequired(true);
                break;

            case 'GRID':
                if (scales[idEscala]) {
                    form
                        .addGridItem()
                        .setTitle(grupoCuadricula || 'Evaluación')
                        .setRows([texto])
                        .setColumns(scales[idEscala])
                        .setRequired(true);
                }
                break;

            case 'TIME':
                form.addTimeItem().setTitle(texto).setRequired(true);
                break;

            case 'FILE':
                // Crea el campo para subir fotos/evidencias
                form.addFileUploadItem().setTitle(texto).setRequired(true);
                break;

            case 'PARAGRAPH':
                form.addParagraphTextItem().setTitle(texto).setRequired(true);
                break;
        }
    });
}

/**
 * Crea un diccionario de escalas para las cuadrículas.
 */
function getScalesMap(ss) {
    const sheet = ss.getSheetByName('CAT_ESCALAS');
    const data = sheet.getDataRange().getValues().slice(1);
    const map = {};
    data.forEach((row) => {
        const [id, opciones] = row;
        map[id] = opciones.split(',').map((item) => item.trim());
    });
    return map;
}