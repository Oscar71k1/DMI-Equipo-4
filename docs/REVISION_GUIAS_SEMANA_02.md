# Revisión de las guías — Semana 02

Revisión documental del 14 de septiembre de 2026, sobre esta copia local. Fuentes: [aclaración previa](../ACLARACION_ANTES_DE_INICIAR.md), [actividad](assignments/week-02.md), [preparación y evidencias](assignments/week-02-repository.md), [rúbrica](assignments/week-02-rubric.md) y archivos del repositorio.

**Conclusión:** las guías de Jarumi y Fernanda cubren los requisitos de la actividad como instrucciones de trabajo. No demuestran que la entrega ya esté implementada o aprobada. Falta definir expresamente la aportación de Oscar para esta semana; su documento actual corresponde a Semana 01.

## Cobertura de la consigna

| Requisito | Dónde se cubre | Resultado de la revisión |
|---|---|---|
| Leer primero la aclaración; conservar repositorio y stack | Paso 1 de ambas guías y preparación de cada copia | Cubierto. No se pide reiniciar ni elegir otro stack. |
| Comparar dos arquitecturas internas | Jarumi, paso 5 | Cubierto: capas globales frente a funcionalidades con capas internas; prueba, complejidad, proveedor y consecuencias. |
| Dibujar cuatro límites y dependencias dirigidas | Jarumi, pasos 4 y 6 | Cubierto: UI, application, domain, infrastructure y composición explícita. |
| Incluir perfiles y límites de incidencias, sesión, persistencia y proveedores | Jarumi, paso 6; Fer, pasos 1 y 5 | Cubierto. Los tres perfiles están identificados y las funciones futuras se marcan como previstas. |
| Evitar UI → infraestructura | Ambas, diseño y corrección | Cubierto. Incluye el cliente heredado y evita esconder accesos mediante reexportaciones. |
| Lista/detalle ejecutables con datos ficticios | Fer, paso 5 | Cubierto mediante modelo, puerto, casos de uso, fake, composición y UI. |
| Sustituir componentes por sus interfaces | Fer, paso 7; Jarumi, pasos 5 y 9 | Cubierto con prueba de otro proveedor compatible y justificación relacionada. |
| Contrastar imports reales con el dibujo | Jarumi, paso 7; Fer, paso 8 | Cubierto con una prueba adicional sobre código real. |
| Detectar, explicar y corregir la contradicción de AC-03 | Jarumi, pasos 8–9; Fer, pasos 6 y 8 | Cubierto: predicción, antes, causa, efecto, corrección y después. |
| ADR, Mermaid y reporte de dependencias | Jarumi, pasos 5, 6 y 9 | Se indican las rutas oficiales y el contenido. Falta producir los resultados. |
| Justificación en engineering.json | Jarumi, paso 9 | Incluye alternativas, decisión, trade-off, requisitos y verificaciones reales. |
| Evidencia de los tres integrantes | Paso 10 de ambas guías | Se exige el archivo conjunto con tres registros reales; falta concretar el trabajo nuevo de Oscar. |
| Reproducción, tag y SHA | Jarumi, paso 12; Fer, paso 11 | El orden oficial está explicado, pero el cierre no tiene un responsable nominal en estas dos guías. |
| Rúbrica y alcance semanal | Ambas guías | Puntajes correctos; no anticipan login, persistencia, geolocalización o sincronización. |

Las referencias de pasos corresponden a [la guía de Jarumi](GUIA_JARUMI_SEMANA_02.md) y [la guía de Fernanda](GUIA_FERNANDA_SEMANA_02.md).

## Ajustes de esta revisión

En la guía de Jarumi se corrigió el separador de una tabla y se aclaró que el detector debe ser una comprobación básica adaptada al proyecto. No se necesita implementar un analizador universal de TypeScript para cumplir la actividad.

Las dos guías ya distinguen los casos adicionales de prueba de los hitos futuros. La lista vacía, un ID inexistente y un error controlado ayudan a comprobar el esqueleto; no convierten esta semana en una implementación completa de resiliencia o sesión.

No se cambió el reparto de implementación de Fer ni se modificaron las pruebas oficiales, el evaluador, el workflow o la app durante esta revisión.

## La parte de Oscar: propuesta pendiente de confirmar

No se encontró una guía de Oscar para Semana 02. [oscar-integracion.md](oscar-integracion.md) documenta el riesgo 2 y la integración de **Semana 01**. Sus commits y resultados antiguos no acreditan automáticamente un aporte nuevo.

Si Oscar asumirá **integración, revisión técnica y reproducción final**, esta es una aportación coherente con el reparto actual:

1. Revisar los cambios de ambas y combinar la solución conservando los commits y autorías que se citan como evidencia.
2. Revisar técnicamente una ruta completa: selección en UI → caso de uso → puerto → fake. Comparar esa ruta con el Mermaid y explicar qué cambia al sustituir el proveedor.
3. Comprobar que la corrección de AC-03 conserva el smoke anterior y que la excepción de composición no esconde lógica de pantalla acoplada al cliente.
4. Reproducir personalmente las pruebas de arquitectura e incidencias sobre la versión integrada, además de los comandos oficiales. Registrar predicción anterior a la ejecución, resultados, limitaciones y cualquier corrección propia necesaria.
5. Guardar una revisión técnica nueva, por ejemplo en `docs/oscar-integracion-semana-02.md`, con archivos inspeccionados, conclusiones y referencias a logs propios. Este archivo es una forma propuesta de evidenciar el aporte, no otro entregable obligatorio del docente.
6. Guardar esa aportación con su identidad y completar únicamente su registro de `evidence/week-02/individual.json` con su SHA técnico, archivos, prueba/revisión y explicación. Un simple «subí el proyecto» o un commit vacío no explica una contribución técnica verificable.
7. Coordinar con Jarumi la actualización de los SHA generales y resultados del reporte sobre la versión integrada. Ella mantiene la justificación y la evidencia del experimento; no deben sobrescribir sus observaciones ni atribuirse sus ejecuciones.
8. Realizar el cierre conjunto siguiendo la secuencia oficial: todo el código/documentos guardados, verificaciones reales, commit final exclusivo de reportes/evidencias, etiqueta `week-02-final`, `make evidence-week-02` y publicación de repositorio, tag y SHA completo.

Esta propuesta cubre el hueco de integración y aporta evidencia propia a AC-01/AC-05, con revisión transversal de AC-02 a AC-04. No garantiza puntaje ni supone que Oscar ya haya aceptado o realizado ese trabajo. Si su parte prevista es otra, debe ajustarse el reparto antes de editar los mismos archivos.

## Lo que existe y lo que falta en esta copia

| Elemento inspeccionado | Estado observado |
|---|---|
| Guías de Jarumi y Fernanda de Semana 02 | Existen localmente; aún sin seguimiento de Git. |
| ADR-001 | Existe un borrador; aún sin seguimiento de Git y con verificaciones pendientes. |
| `docs/architecture.mmd` | No existe. |
| `reports/week-02/dependencies.json` | No existe. |
| `evidence/week-02/engineering.json` | No existe. |
| `evidence/week-02/individual.json` | No existe. |
| `tests/architecture.test.ts` y `tests/incidents.test.tsx` | No existen. |
| Esqueleto propuesto de capas | No existe en `src/`; permanecen los archivos del starter. |
| `App.tsx` | Muestra el indicador de salud; conserva el import directo del cliente y no implementa lista/detalle. |
| Etiqueta local `week-02-final` | No aparece en `git tag --list week-02-final`. |

El estado observado se limita a esta copia. No se consultaron ramas de compañeras ni el estado remoto de GitHub en esta revisión.

La prueba pública `course-tests/public/week-02.test.ts` inspecciona el texto del ADR y del diagrama. El evaluador semanal invoca esa prueba pública y no añade automáticamente las pruebas nuevas propuestas en `tests/`. Por eso ambas guías indican ejecutarlas explícitamente. Deben conservarse las pruebas del curso y las comprobaciones anteriores que correspondan al proyecto.

No se ejecutaron pruebas funcionales ni comandos de evaluación para esta revisión documental, y no se generaron reportes de aprobación. La cobertura de las guías es suficiente como plan; el cumplimiento de la entrega se decidirá con código y evidencia reales de la versión final.
