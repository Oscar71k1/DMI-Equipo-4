# Revisión de Oscar — riesgo 2 e integración de semana 1

Equipo 4. Aportación preparada en la sesión de Oscar con asistencia de Codex. La lectura de archivos, los cambios y los comandos indicados se realizan mediante esa asistencia; no se presentan como una ejecución manual independiente. Oscar debe poder explicar el análisis y los resultados de su entrega.

## Objetivo

Revisar el riesgo 2, duplicación por reintentos después de perder una respuesta, contra `docs/CAMPUSOPS.md` y el criterio de aceptación 7 de `docs/problem-definition.md`. Integrar las aportaciones de Jarumi y Fernanda conservando su autoría, comprobar la legibilidad de sus logs y cerrar la evidencia del equipo con referencias Git verificables.

## Predicción registrada antes de las comprobaciones de cierre

La revisión debe encontrar que reintentar una operación ya ejecutada conserva su clave y contenido y no crea un segundo evento. Como la sincronización aún no está implementada, la revisión documental no debe confundirse con una prueba ejecutada de idempotencia. Espero que `make feedback`, `make verify-week-01` y `make public-test-week-01` pasen una vez integradas las aportaciones y completados los datos y SHA de evidencia: los cambios de integración afectan documentos y reportes, y la app, sus dependencias y las pruebas originales permanecen iguales. Si una herramienta falla por el entorno, registraré ese resultado por separado y resolveré el entorno sin modificar las pruebas ni el evaluador.

## Análisis del riesgo 2

- **Evento:** el servicio ejecuta una resolución o un cierre, pero la respuesta se pierde. La aplicación interpreta el timeout como una operación pendiente y la reenvía.
- **Consecuencia:** si cada envío se procesa como nuevo, aparecen eventos o evidencias duplicados y el historial representa más acciones de las que ocurrieron. Un timeout no demuestra que el servidor haya rechazado la primera operación.
- **Probabilidad:** media. El caso contempla interrupciones y reintentos, pero este fallo requiere que la pérdida ocurra después de ejecutar la operación y antes de recibir su confirmación. No se emplean estadísticas inventadas.
- **Impacto:** alto. La duplicación afecta la fiabilidad del historial y las decisiones sobre atención y cierre; no es sólo una repetición visual.
- **Mitigación:** persistir antes del envío la identidad y el contenido de la operación. El servicio debe deduplicar por esa identidad, rechazar una clave reutilizada con otro contenido y permitir confirmar el resultado previo. La cola sólo retira operaciones confirmadas y conserva la clave al reiniciar o reintentar.
- **Comprobación propuesta para el hito correspondiente:** con la incidencia ficticia `INC-DEMO-02`, enviar una resolución con clave `OP-DEMO-02`, simular la pérdida de su respuesta y reenviar el mismo contenido y clave. Debe existir un solo evento confirmado. Al reenviar esa clave con un contenido distinto, la operación debe rechazarse sin alterar el evento original. Esta secuencia describe una comprobación futura; no se afirma que se haya implementado ni ejecutado en semana 1.
- **Prioridad:** segunda. Su impacto es alto, pero depende de una ventana de pérdida de respuesta más específica que el conflicto por reasignación del riesgo 1. Supera al riesgo 3 porque afecta la consistencia del historial, mientras que el starter actual sólo expone el estado de disponibilidad en pantalla.

## Hallazgos de la revisión documental

El criterio 7 exige un solo evento para la misma clave y contenido y el rechazo de la misma clave con contenido diferente. El apartado «Sin conexión, conflicto e idempotencia» del caso exige conservar la identidad y retirar de la cola sólo operaciones confirmadas. La fila del riesgo 2 recoge esos requisitos y justifica probabilidad, impacto, mitigación y comprobación. Se conserva la fila existente porque el análisis no identifica una contradicción que requiera cambiarla. El registro mantiene exactamente tres riesgos, cada uno con una revisión individual: Jarumi revisa el 1, Oscar el 2 y Fernanda el 3.

## Integración y trazabilidad

- Jarumi: commit técnico `22dc628e5a423047cfcf76d49777eae31641a209`, con su revisión del riesgo 1 y su log de prueba pública.
- Fernanda: commit técnico `780833cc8ee890ea21211cbd1ff64ec951e5a55b`, con su revisión del riesgo 3 y sus logs de estado original, falla y corrección.
- Las ramas se integran conservando los commits originales. Los SHA y los archivos listados en los dos registros individuales existen en el historial; cada registro conserva la aportación de su autora.
- Se convierten a UTF-8 los tres logs que estaban en UTF-16 y se normalizan sus finales de línea. Los mensajes, resultados, tiempos y códigos de salida se conservan; el historial Git permite recuperar los bytes originales.
- Se añade a la revisión de Jarumi una aclaración posterior sobre el criterio 9 y la prueba pública. Se conserva su predicción original.
- El equipo y la matrícula de Oscar fueron confirmados en la conversación: `teamId` es `4` y `studentId` es `3523110017`.
- Se corrige el antecedente documental del checkout: el workflow sí recibió `fetch-depth: 0` para leer el padre del commit de evidencias. Las pruebas y el evaluador quedan idénticos a los del commit inicial.

## Comprobaciones y límites

Los comandos previstos son `make feedback`, `make verify-week-01` y `make public-test-week-01`. Las salidas de cierre se conservan en `reports/week-01/logs/` y los resultados estructurados en `reports/week-01/verify.json` y `reports/week-01/public-tests.json`. El resultado real y la explicación de esta sesión se registran después de ejecutar en el objeto de Oscar de `evidence/week-01/individual.json`.

Un resultado aprobado de estas comprobaciones acredita la línea base y la estructura de evidencia que revisan. No demuestra sincronización, idempotencia, permisos de negocio ni conectividad con un servidor real. La evidencia de la falla de interfaz conserva sus observaciones originales y la repetición independiente documentada por Fernanda.

## Revisión posterior de coherencia documental

Se contrastaron los archivos Markdown y los cinco entregables de semana 1 contra `LEEME_PRIMERO.md`, `RUBRICA.md` y `course-contracts.json`. La versión etiquetada inicial contenía los cinco archivos requeridos y sus registros completos, pero la guía opcional conservaba el reparto propuesto y pendientes anteriores a la integración. También había instrucciones generales que colocaban el comando de evidencia antes de la etiqueta.

La revisión sustituye esa guía por un índice de los archivos reales, conserva un riesgo por integrante, ordena los comandos de README y SUBMISSION conforme al paso 15, distingue la auditoría de seguridad actual de la del paquete original e identifica el diagnóstico de Actions como antecedente histórico. En el JSON individual se añade una aclaración a la explicación de Jarumi sin reescribir su predicción. Las rutas de verificación de ingeniería se expresan completas.

Antes de repetir las comprobaciones de esta revisión, la predicción es que seguirán pasando al actualizar los SHA de evidencia: los ajustes afectan documentación y claridad de los registros, y no cambian la aplicación, las dependencias, el evaluador ni las pruebas. Los resultados reales de esta repetición se registran en los reportes y en `docs/cierre-integracion.md` después de ejecutar los comandos.

## Organización de los documentos en docs

Se trasladan las revisiones, el procedimiento de falla, el diagnóstico histórico, la nota de Windows y el cierre a la raíz de `docs/`. Las guías personales se incorporan como indicaciones de preparación cuyas aportaciones ya están completadas. El índice conserva la correspondencia con las rutas de los commits originales de Jarumi y Fernanda; sus autorías, predicciones y resultados permanecen identificados.

Antes de validar esta reorganización, la predicción es que los cinco entregables obligatorios seguirán disponibles y las comprobaciones originales pasarán al actualizar las rutas de referencia y el SHA técnico de los reportes. La aplicación y las pruebas se mantienen sin diferencias. Los resultados reales se registrarán en los logs de `reports/week-01/` y en el registro individual de Oscar después de ejecutar los comandos.

## Preparación con los workflows originales

Tras la reorganización, Oscar solicitó conservar el workflow original y resolver la descarga del historial desde el Makefile. La revisión asistida restaura ambos workflows y añade a `make setup` el script `tools/prepare_git_history.py`, antes de `npm ci`. El script recupera el historial real de las copias superficiales, conserva el SHA de trabajo y propaga los errores de Git. El evaluador, las pruebas y sus comandos permanecen originales.

Se comprobó en copias aisladas que la validación original de baseline y engineering falla antes de recuperar el historial y pasa después, sin modificar esos JSON. También se comprobaron un paquete sin Git, un repositorio completo sin remoto, un remoto inaccesible y la repetición de la preparación. Los casos, resultados y límites están en [preparacion-historial-git.md](preparacion-historial-git.md), con la salida en `reports/week-01/logs/oscar-preparacion-git.txt`.

Antes de ejecutar las comprobaciones completas, espero que pasen porque la preparación recupera el padre del commit que exige el evaluador, mientras que el código de aplicación y sus pruebas no cambian. El resultado real se añadirá al registro individual y los logs de cierre después de cada ejecución.

## Preparación integrada directamente en Makefile

En una revisión posterior se eliminó el archivo `tools/prepare_git_history.py` y se trasladó la preparación a `make prepare-git-history`, requisito previo de `make setup`. La carpeta `tools/` vuelve a contener únicamente el evaluador original. El código retirado permanece consultable en los commits de preparación anteriores; la ruta vigente de esta aportación es `Makefile`.

La comprobación asistida en copias superficiales de rama y etiqueta pasó sin el archivo eliminado: se recuperó el historial y se conservaron el SHA, la referencia y los archivos. También se comprobaron el paquete sin Git, el historial completo, la repetición y el error real de un remoto inaccesible. El procedimiento y las salidas están en [preparacion-historial-git.md](preparacion-historial-git.md#integración-directa-en-makefile) y `reports/week-01/logs/oscar-makefile-integrado.txt`. La predicción antes de ejecutar las comprobaciones completas es que pasarán al conservar la preparación y el material original de evaluación; sus resultados se registrarán después de ejecutar.


## Checkout de Semana 1 con profundidad 2

El 9 de septiembre Oscar solicitó añadir al checkout `ref: ${{ github.event.pull_request.head.sha || github.sha }}` y `fetch-depth: 2`, conservando el Makefile original. La revisión asistida confirmó que Makefile, package.json, pruebas y evaluador ya estaban restaurados; no se añadió preparación en npm ni un archivo nuevo en tools.

Antes de ejecutar las comprobaciones completas se espera que el checkout disponga del padre inmediato y el evaluador acepte un commit final que sólo cambie reports/ y evidence/. En copias aisladas sobre el SHA real a4349d0f7d2153235e486e6f5ae1e976a3f5224b se observó rechazo con profundidad 1 y aprobación con profundidad 2, conservando SHA, referencias y archivos. La copia de etiqueta pasó además los 10 controles del modo evidence. La salida real es reports/week-01/logs/oscar-checkout-depth2.txt; los resultados completos posteriores se registrarán en los logs -depth2.txt y en los reportes JSON.


Antes de publicar se reprodujo también la selección explícita por SHA de checkout. Con profundidad 2, baseline y engineering pasaron, pero la etiqueta no existía localmente y frozen_sha falló. Descargar la etiqueta real del remoto aislado con `git fetch --no-tags --depth=2 origin refs/tags/week-01-final:refs/tags/week-01-final` permitió aprobar los 10 controles originales, conservando HEAD y archivos. El workflow incorpora ese paso únicamente para eventos de week-01-final. La salida está en reports/week-01/logs/oscar-checkout-sha-etiqueta.txt. La predicción para repetir el cierre es que la configuración final permitirá validar también la etiqueta en Actions; sus resultados completos se registrarán en los logs -depth2-final.txt.
