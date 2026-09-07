# Cierre de integración — equipo 4, semana 1

Revisión y comandos de integración realizados en la sesión de Oscar con asistencia de Codex el 6 de septiembre de 2026. Este documento registra los resultados observados; el puntaje corresponde a la evaluación docente y no se deduce automáticamente de que las comprobaciones públicas pasen.

## Versiones y aportaciones

El SHA técnico vigente se consulta en el campo `commitSha` de [baseline.json](../reports/week-01/baseline.json) y [engineering.json](../evidence/week-01/engineering.json); ambos deben coincidir. La versión final se obtiene con `git rev-list -n 1 week-01-final`. El commit posterior sólo debe contener archivos de `reports/` y `evidence/`, según el paso 14 de `LEEME_PRIMERO.md`.

| Integrante | Riesgo revisado | Commit técnico propio | Evidencia principal |
|---|---|---|---|
| Oscar | 2: duplicación por reintentos e integración documental | `bb6c47ba1dd299483cf8f55e6dabaced77a68bdd` y `6d7d06c036c9f6cf254dd3912badb83e550383af` | `docs/oscar-integracion.md` y `reports/week-01/logs/oscar-feedback-rubrica.txt` |
| Jarumi | 1: reasignación durante trabajo sin conexión | `22dc628e5a423047cfcf76d49777eae31641a209` | `docs/jarumi-criterios.md` y `reports/week-01/logs/jarumi-prueba-publica.txt` |
| Fernanda | 3: disponibilidad incorrecta en la interfaz | `780833cc8ee890ea21211cbd1ff64ec951e5a55b` | `docs/fernanda-diagnostico.md` y sus tres logs de smoke |

Los commits originales de las compañeras son antecesores de la integración. Se conservaron sus identificadores, commits, archivos, predicciones y resultados. Se completó el objeto de Oscar y el identificador compartido del equipo con los datos confirmados. La revisión posterior añadió una aclaración identificada como nota de integración en la explicación de Jarumi, para precisar qué comprueba la prueba pública sin reconstruir su predicción. Los SHA citados existen y tienen el autor esperado. Los documentos trasladados a `docs/` conservan su autoría: la tabla de rutas anteriores y actuales del [índice](GUIA_EQUIPO_SEMANA_01.md#trazabilidad-de-los-documentos-trasladados) permite localizar cada archivo en el commit de su autora.

## Comprobaciones registradas en la revisión anterior

| Comando | Resultado observado | Archivo |
|---|---|---|
| `make feedback` | Código 0. Typecheck, lint y smoke aprobados; 1 suite y 1 prueba de smoke aprobadas; auditoría dentro del umbral crítico original; exportación Android completada con 581 módulos. | `reports/week-01/logs/oscar-feedback-rubrica.txt` |
| `make verify-week-01` | `status: pass`, 9 comprobaciones aprobadas, código 0. | `reports/week-01/logs/oscar-verify-rubrica.txt` |
| `make public-test-week-01` | `status: pass`, 13 comprobaciones aprobadas, código 0; los tres JSON obligatorios pasan su validación. | `reports/week-01/logs/oscar-public-rubrica.txt` |

En esa revisión, sobre `6d7d06c036c9f6cf254dd3912badb83e550383af`, el reporte de verificación fue generado a las `2026-09-06T22:54:14.386427+00:00` y el público a las `2026-09-06T22:54:42.731443+00:00`. La auditoría informó una vulnerabilidad moderada y terminó correctamente con el umbral crítico definido por el proyecto; no se modificó ese umbral ni se actualizaron dependencias durante el cierre.

## Relación con la rúbrica

| Criterio | Valor | Dónde se encuentra la evidencia |
|---|---:|---|
| Reproducción | 2.5 | SHA técnico, logs de comandos y reportes `verify.json` y `public-tests.json`; la etiqueta se verifica después del commit de evidencias mediante `make evidence-week-01`. |
| Definición del caso | 2.0 | `docs/problem-definition.md`: alcance, actores, flujo y nueve criterios; `docs/risk-register.md`: exactamente tres riesgos priorizados y justificados. Las tres revisiones individuales explican un riesgo cada una. |
| Diagnóstico de falla | 1.5 | `baseline.json`, `procedimiento-falla.md`, logs originales de falla/corrección y repetición independiente de Fernanda. Síntoma y causa se distinguen y las pruebas se conservan originales. |
| Decisión técnica | 1.5 | `engineering.json`: tres alternativas, decisión concreta, beneficio/costo, límites y verificaciones enlazadas con logs reales. |
| Evidencia individual | 0.5 | `individual.json`: tres registros completos, commits propios, archivos, predicciones, pruebas o revisiones, resultados y explicación. La asistencia en la sesión de Oscar es explícita. |

## Integridad y ajustes documentados

Se comprobó con `git diff --exit-code 635d471c3bce751720adbe0e2c50bcd245520d51 -- .github/workflows course-tests tools/course_public_evaluator.py App.tsx package.json package-lock.json` que esos archivos coinciden con el inicio. El resultado fue código 0, sin diferencias. Los workflows se restauraron al original. La preparación del historial ahora está integrada en el propio Makefile, antes de `npm ci`; `tools/` contiene únicamente el evaluador original. Los comandos de comprobación y sus umbrales siguen iguales. La razón y los casos comprobados se explican en [preparacion-historial-git.md](preparacion-historial-git.md).

Tres logs se convirtieron de UTF-16 a UTF-8, normalizando finales de línea y líneas vacías, sin cambiar mensajes, tiempos ni códigos de salida. Los bytes anteriores siguen accesibles en los commits originales. La aclaración de la revisión de Jarumi se añadió después de su texto, conservando su predicción y su resultado.

Los reportes locales antiguos que mostraban errores del entorno se conservaron fuera del repositorio como antecedentes; los reportes de cierre aquí citados proceden de las nuevas ejecuciones originales y aprobadas. La adaptación local de Windows se documenta en [entorno-windows.md](entorno-windows.md), con su fuente en `evidence/week-01/entorno-windows/npm-launcher.cs`; GitHub Actions usa npm directamente en Ubuntu.

## Alcance de los resultados

Las comprobaciones públicas verifican la línea base y aspectos estructurales de la evidencia. No acreditan que los flujos futuros de idempotencia, sincronización, permisos o conectividad real estén implementados. La predicción del cierre coincidió con las comprobaciones observadas y la revisión documental del riesgo 2, con estos límites explícitos.

El congelamiento se realiza con el commit exclusivo de evidencias, la etiqueta anotada y después `make evidence-week-01`, conforme al paso 15. `reports/week-01/failure.json` lo genera el evaluador después de etiquetar y no se agrega mediante un commit posterior. El workflow también genera y publica ese reporte como artefacto académico al evaluar la etiqueta. La identidad final se obtiene con `git rev-list -n 1 week-01-final`, y el reporte generado comprueba que la etiqueta apunta al SHA evaluado.

## Revisión de los documentos de la entrega

Se revisaron los archivos Markdown del repositorio, su contexto y las rutas de los entregables. Los cinco archivos exigidos por `course-contracts.json` existen y están versionados; los entregables de semana 1 no conservan campos de plantilla. Los documentos y logs son legibles en UTF-8. El problema contiene nueve criterios y el registro mantiene tres riesgos priorizados con los seis elementos exigidos por el paso 6.

Se sustituyó la guía opcional de incorporación, que conservaba tareas propuestas y pendientes antiguos, por un índice de las aportaciones y rutas reales. README y SUBMISSION sitúan `make evidence-week-01` después de etiquetar. SECURITY distingue el resultado moderado observado en septiembre de los resultados del paquete de agosto. El diagnóstico de errores anteriores de Actions se identifica como histórico. La explicación de Jarumi incluye la aclaración de la referencia al criterio 9 y las verificaciones de ingeniería utilizan rutas completas.

Esta revisión comprueba la presencia, coherencia y trazabilidad de la evidencia visible. Los resultados de los evaluadores originales se registran en la tabla de comprobaciones; la matriz de rúbrica identifica la evidencia de cada criterio sin asignarse una calificación automática.

Los logs con sufijo `-cierre.txt` conservan la integración inicial y los terminados en `-rubrica.txt` conservan la revisión del SHA `6d7d06c036c9f6cf254dd3912badb83e550383af`. Los reportes estructurados [verify.json](../reports/week-01/verify.json) y [public-tests.json](../reports/week-01/public-tests.json) se actualizan en cada cierre: sus campos `commitSha`, `evaluatedAt`, `status` y `checks` identifican la ejecución vigente. Así se distinguen los resultados históricos de la versión entregada.

## Reorganización de la documentación

Se trasladaron los siete documentos de revisión, diagnóstico y cierre a la raíz de `docs/`, se incorporaron las dos guías personales como referencias de preparación completada y se actualizaron enlaces y referencias de los JSON. El [índice del equipo](GUIA_EQUIPO_SEMANA_01.md) contiene la correspondencia entre rutas anteriores y actuales. Los logs de las ejecuciones históricas conservan sus contenidos originales; la reorganización no cambia las aportaciones ni los SHA de las compañeras.

Esta modificación documental requiere fijar otro SHA técnico y repetir `make feedback`, `make verify-week-01` y `make public-test-week-01` antes del commit exclusivo de evidencias. Los resultados de esa repetición se registran en los JSON y logs de `reports/week-01/`; después se comprueba la etiqueta con `make evidence-week-01`. Los documentos no incorporan un SHA final literal que quede obsoleto al crear el commit de evidencias.

## Preparación del historial desde Makefile

La actualización posterior traslada la recuperación del historial al paso `make setup` que ya ejecuta el workflow original. Se comprobaron el error de SHA en una copia superficial y su resolución tras descargar el historial; el SHA, la rama y el estado de los archivos se conservaron. Un remoto inexistente produjo código 128, mientras que las copias completas y el paquete sin Git terminaron con código 0 sin descargar. El log es `reports/week-01/logs/oscar-preparacion-git.txt`; esta comprobación de preparación no sustituye la falla controlada de interfaz.

Las salidas completas del nuevo cierre se registran en `reports/week-01/logs/` con el sufijo `-historial.txt`, junto con `verify.json` y `public-tests.json`. Sus campos de SHA, fecha y resultado identifican la versión comprobada. Los registros históricos con otros sufijos se conservan como antecedentes.

La ejecución inicial de Actions desde la etiqueta detectó un conflicto al intentar descargar nuevamente una referencia que checkout ya había creado en el commit. Se reprodujo el caso y se corrigió el helper a `--no-tags`, conservando la referencia y descargando el historial necesario. El evaluador original de evidencia congelada aprobó en esa reproducción. El detalle y los logs están en [preparacion-historial-git.md](preparacion-historial-git.md#corrección-del-caso-de-etiqueta-en-actions); las comprobaciones completas posteriores utilizan el sufijo `-etiqueta.txt`.

La revisión posterior elimina el archivo Python adicional y conserva esa preparación directamente en Makefile. Las copias aisladas de rama y etiqueta pasaron la comprobación sin ese archivo; se verificaron también el paquete sin Git, la copia completa y la propagación de errores. El log es `reports/week-01/logs/oscar-makefile-integrado.txt`; las comprobaciones completas posteriores utilizan el sufijo `-makefile.txt`.
