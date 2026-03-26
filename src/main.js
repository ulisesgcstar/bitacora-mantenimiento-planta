/**
 * @fileoverview Orquestador principal y gestión de interfaz de usuario.
 * @author arket
 */

/**
 * Crea el menú personalizado al abrir el Google Sheet.
 */
// eslint-disable-next-line no-unused-vars
function onOpen() {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('🚀 SISTEMA GAS L.P.')
        .addItem('1. Instalar Sensores (Triggers)', 'setupTriggers')
        .addSeparator()
        .addItem('2. Sincronización Power', 'syncForm')
        .addToUi();
}

/**
 * Instala programáticamente el disparador de envío de formulario.
 * Evita duplicados verificando triggers existentes.
 */
// eslint-disable-next-line no-unused-vars
function setupTriggers() {
    const settings = CONFIG.getSettings();

    // 1. Limpiar triggers previos para evitar ejecuciones dobles
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(t => ScriptApp.deleteTrigger(t));

    // 2. Crear el nuevo trigger vinculado al Formulario
    if (settings.ID_FORMULARIO) {
        ScriptApp.newTrigger('onFormSubmit')
            .forForm(settings.ID_FORMULARIO)
            .onFormSubmit()
            .create();

        SpreadsheetApp.getUi().alert('✅ Sensores instalados con éxito.');
    } else {
        throw new Error('No se encontró ID_FORMULARIO en la configuración.');
    }
}