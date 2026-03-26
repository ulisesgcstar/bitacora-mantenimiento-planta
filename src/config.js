/**
 * @fileoverview Configuración global y mapeo de la Fuente Única de Verdad (SSOT).
 * @author arket 
 */

/**
 * Objeto global que almacenará la configuración del sistema.
 * Se carga desde la pestaña _CONFIG_ para mantener el desacoplamiento.
 */
// eslint-disable-next-line no-unused-vars
const CONFIG = {
  // Nombres de las pestañas (Catálogos)
  SHEET_NAMES: {
    CONFIG: '_CONFIG_',
    PLANTAS: 'CAT_PLANTAS',
    USUARIOS: 'CAT_USUARIOS',
    PREGUNTAS: 'CAT_PREGUNTAS',
    REVISIONES: 'CAT_TIPO_REVISION',
  },

  /**
   * Obtiene los valores de la pestaña _CONFIG_ y los mapea a un objeto.
   * @returns {Object} Diccionario con IDs de recursos y variables globales.
   */
  getSettings() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(this.SHEET_NAMES.CONFIG);

    // Obtenemos todos los datos de la pestaña de configuración
    const data = sheet.getDataRange().getValues();
    const settings = {};

    // Iteramos sobre las filas (saltando el encabezado) para armar el objeto
    data.slice(1).forEach((row) => {
      const [llave, valor] = row;
      if (llave) {
        settings[llave] = valor;
      }
    });

    return settings;
  },
};
