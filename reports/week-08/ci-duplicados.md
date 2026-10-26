# Duplicados y ámbito de las comprobaciones del PR 17

Se inspeccionaron los 22 checks de `82d33e30979d748b1b38ec18620b57e09f13f9a6`: 11 aprobados y 11 fallidos. No eran 11 pruebas de código diferentes.

| Fallos observados | Causa y tratamiento |
|---|---|
| 7 evaluaciones oficiales de semanas 1–4 | Ejecutaban tags históricos en el PR actual; semanas 2–4 se repetían por push/PR. Sus jobs completos se trasladaron a workflows de tag o ejecución manual. No se modificaron tags ni resultados antiguos. |
| 2 ejecuciones de Week 05 | Las pruebas de incidencias pasaban, pero `make public-test-week-05` comparaba reportes históricos contra el SHA de semana 8. La validación de evidencia se conserva en la evaluación de week-05-final; las mismas regresiones actuales permanecen en el PR. |
| 2 ejecuciones de Week 08 | Fallaban en `frozen_sha` porque no existe week-08-final. Se elimina la doble ejecución push/PR, pero el control sigue fallando hasta cerrar la entrega correctamente. |

## Evidencia consultada

- [Week 05, PR: error de SHA de los reportes históricos](https://github.com/Oscar71k1/DMI-Equipo-4/actions/runs/40421703887/job/121917470749).
- [Week 08, PR: falta week-08-final](https://github.com/Oscar71k1/DMI-Equipo-4/actions/runs/40421703874/job/121917470231).
- [Week 02: regresión actual y evaluación histórica distintas](https://github.com/Oscar71k1/DMI-Equipo-4/actions/runs/40421704027).

## Cambio de configuración

Los workflows del código actual responden a pull_request, push a main y ejecución manual. Un push a una rama del PR ya no inicia una segunda copia. Hay ocho jobs previstos por PR: starter, semanas 1–6 y semana 8.

Las evaluaciones históricas de semanas 1–5 responden al push de su etiqueta exacta o a workflow_dispatch; cada una sigue comprobando su propio tag, pruebas y evidencias. Semana 6 mantiene su workflow final existente. Se conservaron literalmente los jobs actuales e históricos de semanas 1–4; se verificó su igualdad estructural con la versión anterior mediante el parser YAML.

No se borraron tests, no se cambió el evaluador y no se usó continue-on-error ni passWithNoTests. Tampoco se borraron ejecuciones anteriores de GitHub. La vista del PR mostrará los checks del nuevo SHA y el historial seguirá disponible.

## Validación de la configuración

Se analizaron 14 archivos YAML con claves únicas. Resultado: ocho jobs por PR, cero por push a rama de trabajo, seis evaluaciones históricas conservadas. Se comprobó la coincidencia de cada etiqueta con su checkout y su comando evidence, y que los cuatro jobs históricos trasladados conservaran todos sus pasos.

El código comprobado es `877c6a17dada896761b54da98f3af2e73ae305b2`; los resultados actualizados se encuentran en migration-tests.json, verify.json y public-tests.json. Los reportes se guardan en un commit exclusivo de evidencias posterior. La prueba Android y la corroboración individual siguen pendientes; el PR permanece en borrador.

El workflow de semana 8 también conserva el disparador de publicación de `week-08-final`, para comprobar la entrega al crear su etiqueta. Esto no duplica los pushes de la rama de trabajo.
