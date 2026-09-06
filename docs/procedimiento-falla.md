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

En Windows, el evaluador público no encontraba el comando `npm` desde Python. Durante la preparación se ajustó su lanzador para resolver `npm.cmd` y la codificación de salida. Tras la aclaración de conservar íntegro el material de evaluación, se retiraron esos ajustes y se restauró `tools/course_public_evaluator.py` desde el commit inicial `635d471c3bce751720adbe0e2c50bcd245520d51`. Las pruebas de `course-tests/`, `package.json` y `Makefile` se conservan originales. En `.github/workflows/week-01-feedback.yml` sí se añadió `fetch-depth: 0` al checkout para que el evaluador pueda consultar el padre del commit de evidencias; los comandos, las pruebas y los umbrales de evaluación se conservaron. El diagnóstico de este ajuste está en `docs/diagnostico-github-actions.md`.

Los resultados obtenidos con el evaluador modificado son antecedentes, no una validación final del evaluador original. La compatibilidad del entorno de Windows estaba pendiente en esa etapa. En el cierre del 6 de septiembre se resolvió mediante un lanzador local de npm que transmite argumentos, salidas y código de retorno, sin editar el evaluador: procedimiento en [entorno-windows.md](entorno-windows.md) y fuente en `evidence/week-01/entorno-windows/npm-launcher.cs`. Las ejecuciones originales de `make verify-week-01` y `make public-test-week-01` finalizaron con `status: pass`; sus reportes son `reports/week-01/verify.json` y `reports/week-01/public-tests.json`. La evidencia de la falla y su corrección procede directamente de `npm run test:smoke` con la prueba original y no depende de los cambios que se retiraron del evaluador.
