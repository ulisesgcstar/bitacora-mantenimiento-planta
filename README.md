# Sistema de Inspecciones Dinámicas
## Arquitectura: Navegación Jerárquica por Periodicidad
- Metadatos Globales (Inicio/Fin)
- Motor de 45 formatos con saltos de sección automáticos
- Historial de datos desacoplado
### Módulo: sync.js
Este script actúa como el orquestador principal del sistema. Realiza las siguientes tareas:
1. Mapeo de Catálogos (Plantas, Usuarios, Escalas).
2. Construcción de Secciones Globales (Inicio y Fin).
3. Generación de Lógica de Ramificación (Saltos por Periodicidad).
4. Inyección de Inspecciones Dinámicas basadas en estados TRUE/FALSE.
