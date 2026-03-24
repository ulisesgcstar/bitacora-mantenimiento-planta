/**
 * @fileoverview Motor de sincronización entre Sheets y Google Forms.
 * @author Arket
 */

/**
 * Actualiza las preguntas del formulario basándose en el catálogo de Sheets.
 * @gain Automatización: Evita editar el formulario manualmente para cada cambio.
 */
function syncFormQuestions() {
    // 1. Obtenemos la configuración y el formulario
    const config = getConfig();
    const form = FormApp.openById(config.ID_FORMULARIO);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const questionSheet = ss.getSheetByName('CAT_PREGUNTAS');

    if (!questionSheet) {
        throw new Error('No se encontró la pestaña CAT_PREGUNTAS');
    }

    // 2. Limpiar el formulario actual (Borrado preventivo)
    const items = form.getItems();
    items.forEach(item => form.deleteItem(item));

    // 3. Obtener datos de preguntas
    const data = questionSheet.getDataRange().getValues();
    // Saltamos encabezado
    const questions = data.slice(1).filter(row => row[4] === true); // Solo activas (PREGUNTA_ACTIVO)

    // 4. Inyectar preguntas al formulario
    questions.forEach((row) => {
        const [id, idRevision, grupo, texto] = row;

        // Creamos una sección de cuadrícula para que sea profesional
        const item = form.addGridItem();
        item.setTitle(texto)
            .setHelpText(`Referencia: ${idRevision}`)
            .setRows(['Cumple', 'No Cumple', 'No Aplica'])
            .setColumns(['Estado de Inspección']);

        // ESLint/Prettier: Mantenemos el código limpio y legible
    });

    console.log(`Sincronización completada: ${questions.length} preguntas añadidas.`);
}

/**
 * Explicación Didáctica:
 * Usamos .deleteItem() para garantizar que el formulario no tenga "basura" 
 * de versiones anteriores. Cada vez que ejecutamos esto, el formulario 
 * refleja EXACTAMENTE lo que dice tu tabla de Google Sheets.
 */