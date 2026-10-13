# Estado de integración — Semana 06

Esta rama consolida el trabajo de Jarumi y Fernanda con una sola coordinación de sesión conectada a las solicitudes del cliente.

## Cambios consolidados

- Login y refresh usan el backend didáctico mediante un adaptador; access token, refresh token e identidad se guardan juntos en almacenamiento seguro.
- El cliente de incidencias pasa las solicitudes por la misma coordinación single-flight; comparte el refresh, limita cada operación a un reintento y descarta respuestas de una sesión invalidada por logout o cambio de actor.
- La interfaz muestra el estado de sesión y el selector de actores ficticios deja claro que es una ayuda de prueba.
- La política de acciones se valida en la aplicación y el backend conserva su validación independiente. Reportantes crean; técnicos asignados inician/resuelven; coordinación asigna, prioriza, cierra/reabre.
- El diagrama muestra restauración, expiración, renovación compartida, fallo y logout.

## Evidencia anterior y pendientes

Los reportes de Fernanda y Jarumi fueron generados contra commits de sus ramas antes de esta integración y esta corrección. Sus observaciones y logs se conservan como historial, pero no son evidencia de aprobación para el estado actual de esta rama. No se actualizaron los resultados ni SHA porque no se ejecutaron los checks sobre esta versión.

Antes de crear `week-06-final`, el equipo aún debe ejecutar `make feedback`, `make verify-week-06`, `make public-test-week-06` y `make evidence-week-06` en la secuencia indicada por `docs/assignments/week-06-repository.md`; corregir cualquier falla sin editar pruebas ni el evaluador; y completar la evidencia de los tres integrantes y la decisión de ingeniería con observaciones reales.
