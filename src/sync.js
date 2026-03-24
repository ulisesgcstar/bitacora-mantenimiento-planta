/**
 * @fileoverview Motor de sincronización entre Google Sheets y Google Forms.
 * Este script transforma filas de una tabla en componentes visuales de formulario.
 * @author Arket
 */

/**
 * Orquestador principal para actualizar el formulario de inspección.
 * Sigue el principio de "Idempotencia": puedes correrlo mil veces y el 
 * resultado final siempre será el mismo y limpio.
 */
function syncFormQuestions() {
    // --- 1. CONEXIÓN Y RECURSOS ---
    // Obtenemos los IDs desde nuestro módulo central de configuración
    const config = getConfig();
    // Accedemos al formulario y a la base de datos de preguntas
    const form = FormApp.openById(config.ID_FORMULARIO);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const questionSheet = ss.getSheetByName('CAT_PREGUNTAS');

    // Validación de seguridad: Si falta la pestaña, detenemos la ejecución
    if (!questionSheet) {
        throw new Error('ERROR CRÍTICO: No se encontró la pestaña CAT_PREGUNTAS.');
    }

    // --- 2. LIMPIEZA SELECTIVA DE ELEMENTOS ---
    // Para no borrar preguntas fijas (Nombre, Planta, Fecha), solo filtramos 
    // y eliminamos los elementos de tipo GRID (cuadrículas de inspección).
    const items = form.getItems();
    items.forEach((item) => {
        if (item.getType() === FormApp.ItemType.GRID) {
            form.deleteItem(item);
        }
    });

    // --- 3. EXTRACCIÓN Y FILTRADO DE DATOS ---
    // Leemos toda la tabla y filtramos solo aquellas filas marcadas como activas (TRUE)
    const data = questionSheet.getDataRange().getValues();
    const activeQuestions = data.slice(1).filter((row) => row[4] === true);

    // --- 4. AGRUPACIÓN LÓGICA (DATA MARSHALLING) ---
    // Convertimos un array plano en un objeto organizado por "Grupo de Cuadrícula".
    // Esto evita crear 50 preguntas sueltas y las agrupa en bloques profesionales.
    const groups = activeQuestions.reduce((acc, row) => {
        const [id, idRevision, grupo, texto] = row;
        // Si el grupo no existe en nuestro acumulador, lo inicializamos como array vacío
        if (!acc[grupo]) acc[grupo] = [];
        // Agregamos el texto de la pregunta al grupo correspondiente
        acc[grupo].push(texto);
        return acc;
    }, {});

    // --- 5. CONSTRUCCIÓN DINÁMICA DEL FORMULARIO ---
    // Iteramos sobre nuestro objeto de grupos para crear las interfaces visuales
    Object.keys(groups).forEach((groupName) => {
        const gridItem = form.addGridItem();

        gridItem
            .setTitle(groupName) // El título es el nombre del grupo (ej: "Sistema de Frenos")
            .setHelpText('Instrucción: C (Conforme), NC (No Conforme), NA (No Aplica)')
            .setRows(groups[groupName]) // Inyecta todas las preguntas de este grupo
            .setColumns(['C', 'NC', 'NA']) // Columnas estándar de inspección industrial
            .setRequired(true); // Obliga al inspector a responder cada fila (Integridad de datos)
    });

    console.log(`ÉXITO: Se han generado ${Object.keys(groups).length} secciones de inspección.`);
}