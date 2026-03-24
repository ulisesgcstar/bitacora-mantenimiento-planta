/**
 * @fileoverview Gestiona la lectura de configuraciones de FORMS, DOCS Y DRIVE globales desde Sheets en la pestaña _CONFIG_.
 * @author Arket
 */

/**
 * Singleton para almacenar la configuración y evitar múltiples lecturas a la hoja.
 * @type {Object|null}
 */
let CACHED_CONFIG = null;

/**
 * Obtiene las configuraciones desde la pestaña _CONFIG_.
 * @returns {Object} Diccionario con IDs del sistema.
 */
function getConfig() {
    if (CACHED_CONFIG) return CACHED_CONFIG;

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('_CONFIG_');

    if (!sheet) {
        throw new Error(
            'FATAL: No se encontró la pestaña _CONFIG_. El sistema no puede inicializarse.'
        );
    }

    const values = sheet.getDataRange().getValues();
    const config = {};

    // Iteramos saltando el encabezado (i = 1)
    for (let i = 1; i < values.length; i++) {
        const [key, value] = values[i];
        if (key && value) {
            config[key.trim()] = value.toString().trim();
        }
    }

    CACHED_CONFIG = config;
    return config;
}

/**
 * Explicación Didáctica:
 * Usamos un "Cache" simple (la variable CACHED_CONFIG) para que, si llamas 
 * a la configuración 10 veces en una misma ejecución, solo lea la hoja de 
 * cálculo la primera vez. Esto mejora drásticamente el rendimiento (Latencia).
 */