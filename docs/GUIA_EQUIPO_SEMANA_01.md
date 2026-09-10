# Índice de la entrega — equipo 4, semana 1

Este archivo relaciona el trabajo integrado con la rúbrica. Sustituye la propuesta inicial de invitaciones, ramas y reparto, que permanece en el historial Git. Las instrucciones oficiales son [LEEME_PRIMERO.md](../LEEME_PRIMERO.md) y [RUBRICA.md](../RUBRICA.md).

## Archivos obligatorios

| Archivo | Contenido presente |
|---|---|
| [problem-definition.md](problem-definition.md) | Problema concreto del campus ficticio, alcance incluido y excluido, tres actores, flujo y nueve criterios de aceptación observables. |
| [risk-register.md](risk-register.md) | Exactamente tres riesgos ordenados, con evento y consecuencia, probabilidad e impacto justificados, mitigación y forma de comprobarla. Se explica por qué el riesgo 1 se atendería primero. |
| [baseline.json](../reports/week-01/baseline.json) | Índice de la falla reproducida, su causa, la corrección y las comprobaciones de cierre, con comandos, resultados y rutas a logs reales. |
| [engineering.json](../evidence/week-01/engineering.json) | Decisión sobre la comprobación determinista de la interfaz, tres alternativas, beneficio/costo, límites y verificaciones. |
| [individual.json](../evidence/week-01/individual.json) | Equipo 4 y tres integrantes, con sus identificadores, commits, archivos, predicciones, comandos, resultados y explicaciones. |

## Aportaciones integradas

| Integrante | Riesgo revisado | Documento propio | Comprobación documentada |
|---|---|---|---|
| Jarumi | 1: un cambio sin conexión sobrescribe una reasignación posterior | [jarumi-criterios.md](jarumi-criterios.md) | Revisión contra el criterio 6 y ejecución de la prueba pública de semana 1. |
| Oscar | 2: un reintento después de perder una respuesta duplica eventos | [oscar-integracion.md](oscar-integracion.md) | Revisión contra el criterio 7, integración de las ramas y ejecución asistida de feedback y evaluadores. |
| Fernanda | 3: la interfaz interpreta incorrectamente una respuesta exitosa del backend | [fernanda-diagnostico.md](fernanda-diagnostico.md) | Experimento independiente con smoke: estado original aprobado, falla detectada y corrección aprobada. |

Cada persona revisó un riesgo. Los tres riesgos corresponden al equipo; la consigna no pide tres incidencias ni tres escenarios por estudiante. Las revisiones explican conclusiones concretas, aunque las filas originales del registro no necesitaran correcciones. Los commits originales de Jarumi y Fernanda se conservaron al integrar sus ramas.

La predicción original de Jarumi se conserva. Su documento contiene una aclaración posterior: el criterio 9 corresponde a la prueba smoke de la interfaz y la prueba pública revisa estados de baseline y referencias documentales básicas. La asistencia en el trabajo de Oscar está identificada en su revisión y en su registro individual.

## Relación con la rúbrica

| Criterio | Puntos de la actividad | Evidencia para revisarlo |
|---|---:|---|
| Reproducción | 2.5 | SHA técnico y etiqueta; instalación y comandos originales; reportes y logs de cierre. |
| Definición del caso | 2.0 | Problema, alcance, actores, flujo, criterios observables y tres riesgos priorizados. |
| Diagnóstico de falla | 1.5 | Plan anterior al cambio, síntoma y causa diferenciados, salidas de falla y corrección con el mismo comando, pruebas originales. |
| Decisión técnica | 1.5 | Alternativas distintas, elección concreta, beneficio y costo, comprobación real. |
| Evidencia individual | 0.5 | Tres registros completos y aportaciones trazables a sus archivos y commits. |
| Total de la actividad | 8.0 | El quiz individual de 3 puntos se evalúa por separado. |

El [registro de cierre](cierre-integracion.md) enlaza las salidas y sus resultados. El [plan y diagnóstico de la falla](procedimiento-falla.md) conserva el cambio reversible en `App.tsx`; el [diagnóstico histórico de Actions](diagnostico-github-actions.md) explica problemas de versiones anteriores que ya se resolvieron.

## Documentación centralizada en esta carpeta

Los documentos de trabajo generados están directamente en `docs/`. Los cinco entregables obligatorios conservan sus nombres y rutas según la guía docente; los JSON y los logs continúan en `evidence/` y `reports/`.

| Documento | Uso |
|---|---|
| [procedimiento-falla.md](procedimiento-falla.md) | Plan anterior al experimento, síntoma, causa y corrección. |
| [cierre-integracion.md](cierre-integracion.md) | Integración, matriz de rúbrica y referencias a comprobaciones reales. |
| [diagnostico-github-actions.md](diagnostico-github-actions.md) | Antecedentes de errores de validación ya resueltos. |
| [entorno-windows.md](entorno-windows.md) | Reproducción del evaluador original en Windows. |
| [preparacion-historial-git.md](preparacion-historial-git.md) | Checkout de Semana 1 con profundidad 2 y referencia explícita; Makefile original y antecedentes de preparación. |
| [GUIA_JARUMI.md](GUIA_JARUMI.md) | Indicaciones de preparación de Jarumi; aportación ya completada. |
| [GUIA_FERNANDA.md](GUIA_FERNANDA.md) | Indicaciones de preparación de Fernanda; aportación ya completada. |

Las tres revisiones individuales están enlazadas en la tabla de aportaciones. Las guías personales conservan el reparto de un riesgo por persona y explican qué evalúa la rúbrica; son antecedentes de preparación y no evidencia de una ejecución nueva.

### Trazabilidad de los documentos trasladados

El traslado cambia la ruta de consulta actual. Los SHA originales de Jarumi y Fernanda permanecen en `individual.json`; la reorganización corresponde a la sesión asistida de Oscar. Para consultar la aportación en su commit original se utiliza la ruta anterior de esta tabla. `git log --follow -- docs/jarumi-criterios.md` y el comando equivalente de Fernanda permiten seguir el cambio de nombre.

| Ruta en los commits anteriores | Ruta actual |
|---|---|
| `docs/reviews/oscar-integracion.md` | [docs/oscar-integracion.md](oscar-integracion.md) |
| `docs/reviews/jarumi-criterios.md` | [docs/jarumi-criterios.md](jarumi-criterios.md) |
| `docs/reviews/fernanda-diagnostico.md` | [docs/fernanda-diagnostico.md](fernanda-diagnostico.md) |
| `evidence/week-01/procedimiento-falla.md` | [docs/procedimiento-falla.md](procedimiento-falla.md) |
| `evidence/week-01/diagnostico-github-actions.md` | [docs/diagnostico-github-actions.md](diagnostico-github-actions.md) |
| `evidence/week-01/cierre-integracion.md` | [docs/cierre-integracion.md](cierre-integracion.md) |
| `evidence/week-01/entorno-windows/LEEME.md` | [docs/entorno-windows.md](entorno-windows.md) |

Las instrucciones oficiales `LEEME_PRIMERO.md` y `RUBRICA.md` se conservan en la raíz del proyecto. Los archivos README y SECURITY mantienen sus ubicaciones habituales.

## Reproducción y congelamiento

1. Usar Node 22.22.0, npm, Git, GNU Make y Python 3. Instalar con `make setup` y ejecutar `make feedback`.
2. Verificar que los documentos y los tres registros individuales estén completos. Fijar el SHA técnico antes de completar las referencias de los reportes.
3. Ejecutar `make verify-week-01` y `make public-test-week-01`; ambos deben indicar `status: pass`.
4. Guardar únicamente `reports/` y `evidence/` en el commit exclusivo de evidencias. Su padre inmediato es el SHA técnico que referencian `baseline.json` y `engineering.json`.
5. Crear la etiqueta anotada `week-01-final` y después ejecutar `make evidence-week-01`. Confirmar `status: pass` en `reports/week-01/failure.json` y no crear otro commit para añadirlo.
6. Publicar rama y etiqueta y obtener el SHA con `git rev-list -n 1 week-01-final`. Si la etiqueta ya existe, estos pasos describen el proceso de cierre; no se debe sustituir su destino sin acordar la actualización de la entrega.

En Windows, la [nota de entorno](entorno-windows.md) documenta cómo ejecutar el evaluador original con la instalación disponible, sin modificarlo. En GitHub Actions se utiliza npm directamente sobre Ubuntu.

## Alcance de las comprobaciones

El starter comprueba `CampusOps` y `Backend: available` con un doble de backend. La semana 1 no acredita que la sincronización, idempotencia, permisos de negocio o integración con un servidor real estén implementados. Las comprobaciones propuestas de los riesgos 1 y 2 corresponden a hitos posteriores. La auditoría registra una advertencia moderada con el umbral crítico original, tal como se explica en [SECURITY.md](../SECURITY.md).

Las pruebas, aserciones y el evaluador se conservan originales. La evidencia debe corresponder a los resultados reales y a los commits de cada integrante. Ninguna cantidad adicional de archivos, escenarios o commits sustituye la calidad de la explicación.

## Entrega en Classroom

Se entrega únicamente la URL pública del repositorio, la etiqueta y el SHA completo que realmente apunta a ella. No se envía el ZIP ni se sustituyen los reportes por capturas:

```text
Repositorio: https://github.com/Oscar71k1/DMI-Equipo-4
Etiqueta: week-01-final
SHA: obtener el valor completo con git rev-list -n 1 week-01-final
```
