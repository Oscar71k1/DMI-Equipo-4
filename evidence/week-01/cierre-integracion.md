# Cierre de integración — equipo 4, semana 1

Revisión y comandos de integración realizados en la sesión de Oscar con asistencia de Codex el 6 de septiembre de 2026. Este documento registra los resultados observados; el puntaje corresponde a la evaluación docente y no se deduce automáticamente de que las comprobaciones públicas pasen.

## Versiones y aportaciones

SHA del trabajo técnico integrado: `bb6c47ba1dd299483cf8f55e6dabaced77a68bdd`. `baseline.json` y `engineering.json` referencian este SHA. El commit posterior sólo debe contener archivos de `reports/` y `evidence/`, según el paso 14 de `LEEME_PRIMERO.md`.

| Integrante | Riesgo revisado | Commit técnico propio | Evidencia principal |
|---|---|---|---|
| Oscar | 2: duplicación por reintentos | `bb6c47ba1dd299483cf8f55e6dabaced77a68bdd` | `docs/reviews/oscar-integracion.md` y `reports/week-01/logs/oscar-feedback-cierre.txt` |
| Jarumi | 1: reasignación durante trabajo sin conexión | `22dc628e5a423047cfcf76d49777eae31641a209` | `docs/reviews/jarumi-criterios.md` y `reports/week-01/logs/jarumi-prueba-publica.txt` |
| Fernanda | 3: disponibilidad incorrecta en la interfaz | `780833cc8ee890ea21211cbd1ff64ec951e5a55b` | `docs/reviews/fernanda-diagnostico.md` y sus tres logs de smoke |

Los commits originales de las compañeras son antecesores de la integración. Sus objetos de `individual.json` se conservaron íntegramente; sólo se completó el objeto de Oscar y el identificador compartido del equipo con los datos confirmados. Cada SHA citado existe, tiene el autor esperado y contiene los archivos indicados en su registro individual.

## Comprobaciones reales anteriores al commit de evidencias

| Comando | Resultado observado | Archivo |
|---|---|---|
| `make feedback` | Código 0. Typecheck, lint y smoke aprobados; 1 suite y 1 prueba de smoke aprobadas; auditoría dentro del umbral crítico original; exportación Android completada con 581 módulos. | `reports/week-01/logs/oscar-feedback-cierre.txt` |
| `make verify-week-01` | `status: pass`, 9 comprobaciones aprobadas, código 0. | `reports/week-01/verify.json` y `reports/week-01/logs/oscar-verify-cierre.txt` |
| `make public-test-week-01` | `status: pass`, 13 comprobaciones aprobadas, código 0; los tres JSON obligatorios pasan su validación. | `reports/week-01/public-tests.json` y `reports/week-01/logs/oscar-public-cierre.txt` |

El reporte de verificación fue generado a las `2026-09-06T22:35:34.545537+00:00` y el público a las `2026-09-06T22:36:02.441253+00:00`. La auditoría informó una vulnerabilidad moderada y terminó correctamente con el umbral crítico definido por el proyecto; no se modificó ese umbral ni se actualizaron dependencias durante el cierre.

## Relación con la rúbrica

| Criterio | Valor | Dónde se encuentra la evidencia |
|---|---:|---|
| Reproducción | 2.5 | SHA técnico, logs de comandos y reportes `verify.json` y `public-tests.json`; la etiqueta se verifica después del commit de evidencias mediante `make evidence-week-01`. |
| Definición del caso | 2.0 | `docs/problem-definition.md`: alcance, actores, flujo y nueve criterios; `docs/risk-register.md`: exactamente tres riesgos priorizados y justificados. Las tres revisiones individuales explican un riesgo cada una. |
| Diagnóstico de falla | 1.5 | `baseline.json`, `procedimiento-falla.md`, logs originales de falla/corrección y repetición independiente de Fernanda. Síntoma y causa se distinguen y las pruebas se conservan originales. |
| Decisión técnica | 1.5 | `engineering.json`: tres alternativas, decisión concreta, beneficio/costo, límites y verificaciones enlazadas con logs reales. |
| Evidencia individual | 0.5 | `individual.json`: tres registros completos, commits propios, archivos, predicciones, pruebas o revisiones, resultados y explicación. La asistencia en la sesión de Oscar es explícita. |

## Integridad y ajustes documentados

Se comprobó con `git diff --exit-code 635d471c3bce751720adbe0e2c50bcd245520d51 -- course-tests tools/course_public_evaluator.py App.tsx package.json package-lock.json Makefile` que esos archivos coinciden con el inicio. El resultado fue código 0, sin diferencias. El checkout del workflow conserva el ajuste anterior `fetch-depth: 0`, necesario para consultar el padre del commit de evidencias; las pruebas y sus umbrales siguen iguales.

Tres logs se convirtieron de UTF-16 a UTF-8, normalizando finales de línea y líneas vacías, sin cambiar mensajes, tiempos ni códigos de salida. Los bytes anteriores siguen accesibles en los commits originales. La aclaración de la revisión de Jarumi se añadió después de su texto, conservando su predicción y su resultado.

Los reportes locales antiguos que mostraban errores del entorno se conservaron fuera del repositorio como antecedentes; los reportes de cierre aquí citados proceden de las nuevas ejecuciones originales y aprobadas. La adaptación local de Windows se documenta en `evidence/week-01/entorno-windows/`; GitHub Actions usa npm directamente en Ubuntu.

## Alcance de los resultados

Las comprobaciones públicas verifican la línea base y aspectos estructurales de la evidencia. No acreditan que los flujos futuros de idempotencia, sincronización, permisos o conectividad real estén implementados. La predicción del cierre coincidió con las comprobaciones observadas y la revisión documental del riesgo 2, con estos límites explícitos.

La secuencia restante es guardar exclusivamente la evidencia, crear la etiqueta final, ejecutar `make evidence-week-01` y subir/comprobar rama y etiqueta. `reports/week-01/failure.json` lo genera el evaluador después de etiquetar y no se agrega mediante un commit posterior. El workflow también genera y publica ese reporte como artefacto académico al evaluar la etiqueta.
