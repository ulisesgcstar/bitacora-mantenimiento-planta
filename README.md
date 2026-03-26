# Sistema de Bitácoras Dinámicas - Industria Gas L.P. v2.0

## 📊 Descripción del Proyecto

Sistema de ingeniería de datos y automatización diseñado para la gestión de cumplimiento normativo en plantas de Gas L.P. Basado en el principio de **Single Source of Truth (SSOT)**, el sistema orquestaliza Google Sheets, Forms, Drive y Calendar mediante Apps Script para transformar capturas de campo en reportes legales (PDF) y dashboards visuales.

## 🛠️ Stack Tecnológico

- **Lenguaje:** Google Apps Script (JavaScript ES6+)
- **Entorno de Desarrollo:** VS Code, WSL2, Clasp
- **Arquitectura:** Data-Driven Design (Desacoplamiento de lógica y datos)
- **Calidad de Código:** ESLint, Prettier

## 🏗️ Arquitectura de Datos (SSOT)

El sistema se comporta como un intérprete de catálogos maestros:

- **Capa de Configuración:** Centralizada en la pestaña `_CONFIG_`.
- **Capa de Catálogos:** `CAT_PLANTAS`, `CAT_USUARIOS`, `CAT_PREGUNTAS`.
- **Capa de Procesamiento:** Motor `processor.js` (Fase de Identificación, Limpieza, Mapeo e Inyección).

## ⚙️ Funcionalidades Core

### 1. Sincronización Power (`sync.js`)

- **Limpieza Total:** Antes de inyectar datos, el sistema garantiza que no existan residuos de configuraciones anteriores.
- **Validación de Estatus:** Solo los registros marcados como activos en los catálogos maestros son desplegados en la interfaz del inspector.

### 2. Motor de Preguntas Dinámicas

- **Mapeo Relacional:** Vincula automáticamente preguntas con sus respectivas escalas de evaluación (C/NC/NA).
- **Inyección por Contexto:** Filtra y construye el cuerpo del formulario basándose en la `ID_REVISION_ACTIVA`.

### 3. UX Dinámica

- **Auto-etiquetado:** El formulario actualiza su título y descripción legal en tiempo real basándose en el catálogo de revisiones, eliminando la confusión del operador en campo.

### 4. Motor de Procesamiento (`processor.js`)

- **Arquitectura de Pipeline:** El flujo de datos sigue una secuencia lógica: Identificación -> Limpieza -> Mapeo.
- **Normalización de Respuestas:** Transforma eventos de formulario en objetos JSON estructurados para facilitar la generación de documentos legales.

### 5. Interfaz y Automatización (`main.js`)

- **Custom UI:** Menú nativo en Google Sheets para una operación sin código.
- **Auto-Trigger Setup:** Instalación programática de disparadores de evento, garantizando que el pipeline de datos se active automáticamente tras cada captura.
