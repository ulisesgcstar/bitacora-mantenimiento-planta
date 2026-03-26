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
