# Plan de la falla controlada — semana 1

Plan registrado antes de modificar el código. Preparación y ejecución asistidas en la sesión de Codex; los integrantes deben repetir las comprobaciones que registren como propias.

1. **Archivo:** `App.tsx`, rama de éxito de `getBackendHealth()` dentro de `useEffect`.
2. **Cambio temporal:** sustituir únicamente `.then(() => active && setStatus('available'))` por `.then(() => active && setStatus('offline'))`.
3. **Comando detector:** `npm run test:smoke` desde la raíz, con Node 22.22.0.
4. **Predicción:** el título seguirá renderizando; la prueba fallará porque espera `available` en `backend-status` y recibirá `Backend: offline`, aunque el doble resuelva correctamente.
5. **Corrección prevista:** restaurar `setStatus('available')` en la rama de éxito y repetir exactamente el mismo comando.
6. **Límites:** no editar pruebas, usar sólo el doble ya incluido y conservar las salidas del estado original, la falla y la corrección. La disponibilidad de un servidor real y los flujos de incidencias quedan fuera de esta comprobación.

La falla sólo se provocará después de completar `make feedback` en el proyecto original. Los errores de permisos o de herramientas de Windows se registran como problemas de entorno, separados de la falla controlada.

## Resultado de la ejecución asistida

- `make feedback` terminó con código 0 antes de provocar la falla: typecheck, lint, smoke, auditoría con umbral crítico y exportación Android completados. Salida: `reports/week-01/logs/feedback-original.txt`.
- Se aplicó sólo el cambio previsto. El diff temporal está en `reports/week-01/logs/falla-controlada.patch`.
- Con la falla activa, `npm run test:smoke` terminó con código 1: una prueba falló. Mensaje: `Expected substring: "available"`; `Received string: "Backend: offline"`. Salida: `reports/week-01/logs/smoke-falla.txt`.
- **Síntoma:** el texto de disponibilidad no cumple la expectativa de la prueba aunque el título se renderiza.
- **Causa:** la rama `.then` de una respuesta exitosa asignaba `offline`. El doble de backend sí resolvía correctamente; no se trató de una caída de servidor.
- Se restauraron los bytes originales de `App.tsx`. El mismo comando terminó con código 0: una suite y una prueba aprobadas. Salida: `reports/week-01/logs/smoke-corregido.txt`.
- No se modificaron archivos de `course-tests/`. Esta ejecución respalda la transición de interfaz con un doble; no acredita conectividad real ni funciones de negocio.

## Incidencias de entorno separadas

La primera ejecución de `make feedback` se detuvo al ejecutar Hermes por permisos del entorno restringido. La salida se conserva en `reports/week-01/logs/feedback-inicial.txt`. Al ejecutar con los permisos necesarios pasó sin cambiar el código de la app. Esta incidencia no se presenta como la falla controlada.

En Windows, el evaluador público no encontraba el comando `npm` desde Python. Se ajustó exclusivamente su lanzador para resolver `npm.cmd` y leer la salida en UTF-8. Se conservaron todos los comandos, criterios y códigos de salida. Las comprobaciones del lanzador verificaron npm 10.9.4, el rechazo de un comando que termina con código 7 y el rechazo de un ejecutable inexistente.
