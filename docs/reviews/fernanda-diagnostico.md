# Diagnóstico individual — Fernanda (Semana 1, Riesgo 3)

## 1. Objetivo de la revisión y del experimento

Revisar de forma independiente el Riesgo 3 del registro del equipo (la interfaz representa incorrectamente el resultado del chequeo de backend) y reproducir personalmente la falla controlada y su corrección sobre `App.tsx`, para verificar que la prueba `npm run test:smoke` detecta esta regresión y que la corrección la resuelve.

## 2. Análisis del riesgo 3: disponibilidad del backend en la interfaz

La transición `.then` de `getBackendHealth()` en `useEffect` convierte una respuesta asíncrona en un estado de interfaz (`available`/`offline`/`checking`). Si esa transición asigna `offline` incluso cuando la respuesta fue exitosa, el usuario ve un mensaje incorrecto ("Backend: offline") que no corresponde al resultado real del chequeo, y podría interpretarse como una caída del servicio cuando en realidad el doble del backend respondió correctamente.

- **Probabilidad (media):** la respuesta exitosa depende de que esa única línea de transformación esté escrita correctamente; un error de una palabra en esa rama introduce el valor equivocado sin que el resto de la app falle.
- **Impacto (medio):** en esta línea base aún no se guardan incidencias reales ni se ejecutan atenciones, así que el efecto se limita a desorientar sobre el estado del backend en pantalla, no a pérdida de datos operativos.
- **Mitigación:** mantener la correspondencia estricta entre una respuesta exitosa del backend y el estado `available`, comprobada mediante la prueba smoke existente con su doble determinista.
- **Prioridad (3, la más baja de las tres):** los riesgos 1 y 2 comprometen consistencia de datos y autorización sobre incidencias reales; este riesgo solo afecta la representación en pantalla del estado inicial, por eso queda en tercer lugar.

## 3. Plan y predicción antes de modificar App.tsx

- **Archivo:** `App.tsx`.
- **Lugar:** rama `.then()` de `getBackendHealth()` dentro de `useEffect`.
- **Cambio temporal:** sustituir `.then(() => active && setStatus('available'))` por `.then(() => active && setStatus('offline'))`.
- **Comando detector:** `npm run test:smoke`.
- **Predicción:** la prueba seguirá encontrando el título `CampusOps`, pero fallará al esperar el texto `available` en `backend-status`, porque recibirá `Backend: offline` — aunque el doble del backend (mock) responda exitosamente. El fallo es de transformación de estado en la interfaz, no de conectividad real.
- **Corrección prevista:** restaurar `setStatus('available')` en la rama de éxito y repetir exactamente el mismo comando; debe volver a pasar con código de salida 0.

## 4. Comprobación original

| Momento | Comando | Resultado real | Código de salida | Log |
|---|---|---|---|---|
| Estado original | `npm run test:smoke` | 1 suite, 1 test aprobados | 0 | `reports/week-01/logs/fernanda-smoke-antes.txt` |
| Falla provocada | `npm run test:smoke` | 1 suite, 1 test fallidos. `Expected substring: "available"` / `Received string: "Backend: offline"` | 1 | `reports/week-01/logs/fernanda-smoke-falla.txt` |
| Corrección | `npm run test:smoke` | 1 suite, 1 test aprobados | 0 | `reports/week-01/logs/fernanda-smoke-corregido.txt` |

## 5. Falla observada: comando, mensaje y código de salida

Comando: `npm run test:smoke`. Mensaje: `Expected substring: "available"` / `Received string: "Backend: offline"`, en la aserción de `course-tests/smoke.test.tsx:16`. Código de salida: 1.

## 6. Síntoma y causa, explicados por separado

- **Síntoma:** el texto renderizado en `backend-status` no contiene `available`; contiene `offline`, aunque el título `CampusOps` sí se renderiza correctamente.
- **Causa:** la rama `.then()` de `getBackendHealth()` en `App.tsx` asignaba `setStatus('offline')` en vez de `setStatus('available')` para una respuesta exitosa del backend simulado (el mock de `getBackendHealth` resuelve `{ ok: true, ... }`). No hubo ningún fallo de conectividad real: el doble del backend respondió correctamente en todo momento.

## 7. Corrección y nueva ejecución del mismo comando

Se restauró `App.tsx` a su versión original con `git checkout -- App.tsx` (confirmado con `git diff -- App.tsx` vacío) y se repitió exactamente `npm run test:smoke`, que volvió a pasar con código de salida 0.

## 8. Comparación entre predicción y resultado

La predicción se cumplió exactamente: se anticipó que el título seguiría renderizando pero que la prueba fallaría esperando `available` y recibiendo `Backend: offline`, y eso fue exactamente lo observado, sin ninguna otra diferencia en la salida ni en el resto del repositorio.

## 9. Conclusión, límites y relación con el riesgo de la interfaz

El experimento confirma que la prueba `npm run test:smoke` detecta correctamente una regresión en la transformación de estado de la interfaz cuando una respuesta exitosa del backend se traduce incorrectamente a `offline`. Esto respalda directamente el Riesgo 3 del registro del equipo: la mitigación propuesta (mantener la correspondencia entre respuesta exitosa y `available`, verificada con la prueba smoke) es efectiva para este escenario reversible. El experimento no demuestra conectividad a un servidor real, ni mitiga los riesgos 1 (sincronización/reasignación offline) o 2 (duplicación por reintentos), que siguen pendientes de los hitos correspondientes. La fila del Riesgo 3 en `docs/risk-register.md` ya describe correctamente el evento, la probabilidad, el impacto, la mitigación y la comprobación observados en este experimento, por lo que se conserva sin modificaciones; se conservan también las otras dos filas y el total de tres riesgos del equipo.