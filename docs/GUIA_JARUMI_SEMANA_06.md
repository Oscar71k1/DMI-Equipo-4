# Guía de trabajo de Jarumi — CampusOps, semana 6

**Responsabilidad acordada:** flujo de autenticación y ciclo de sesión, transiciones de interfaz, almacenamiento seguro y autorización por perfil. Esta guía es un reparto de trabajo; los requisitos que prevalecen están en `docs/assignments/week-06.md`, `docs/assignments/week-06-repository.md` y `docs/assignments/week-06-rubric.md`.

**Rama sugerida:** `semana-06-jarumi`. Trabaja en una rama propia y publica únicamente esa rama si el equipo acuerda usar GitHub. **No hagas push a `main`**, no crees ni muevas la etiqueta final y no integres cambios sin coordinación con el responsable de integración.

## Límites de trabajo

- No edites, desactives, filtres ni reemplaces archivos bajo `course-tests/` o `tests/`.
- No edites `tools/course_public_evaluator.py` ni otro worker/evaluador, ni ajustes umbrales, workflows o comandos para ocultar una falla.
- No alteres trabajo local previo de otra persona. Antes de empezar revisa `git status --short --branch`; separa tus cambios por archivo y consulta al equipo si el mismo archivo ya tiene cambios.
- Usa sólo identidades y tokens ficticios del backend didáctico. El actor de prueba no es autenticación de producción.

## Tu aportación

Lee primero `actividad-semana-6.md`, `docs/assignments/week-06.md`, `docs/assignments/week-06-repository.md`, `docs/assignments/week-06-rubric.md`, `docs/CAMPUSOPS_API.md`, `docs/CAMPUSOPS.md` y el flujo actual en:

- `src/application/createSessionStore.ts`
- `src/infrastructure/ExpoSecureTokenStorage.ts`
- `src/composition/createCampusOps.ts`
- `src/domain/Actor.ts` y `src/domain/incidentAuthorization.ts`
- `src/application/createAuthorizedIncidentQueries.ts` y `src/application/createAssignIncidentUseCase.ts`
- `src/ui/CampusOpsScreen.tsx` y las pantallas de incidencias

Documenta qué ya existe y qué falta antes de editar. El almacenamiento seguro existente no equivale por sí solo a login, expiración, refresh, estado autenticado ni logout conectado a la interfaz.

### A. Integrar el ciclo de sesión

Implementa/conecta el inicio de sesión, la restauración de una sesión válida, el estado de expiración, la salida a renovación y el logout con los puertos y composición existentes. Conserva una transición explícita a estado no autenticado cuando la renovación falla o la sesión queda obsoleta. Logout debe dejar el almacenamiento sin token, incluso si había una operación de guardado en curso.

Coordina con Fernanda antes de tocar módulos de renovación compartida. Ella es responsable de `coordinateRefresh` y de la coordinación single-flight; tú consumes su resultado para actualizar el estado de la sesión y la navegación. Acuerden interfaces antes de editar archivos compartidos.

El diagrama final `docs/session-state-machine.mmd` debe reflejar las transiciones efectivamente implementadas. Puedes preparar la sección de estados y transiciones de login/logout, pero coordina el archivo final con Fernanda para integrar renovación y expiración en un único diagrama sin contradicciones.

### B. Aplicar perfiles y autorización

Conecta los perfiles reportante, técnico y coordinador con las operaciones de CampusOps. Verifica que la autorización ocurra en la lógica de aplicación/dominio y que una solicitud incompatible sea rechazada aunque se invoque sin pasar por un botón de la interfaz. El técnico sólo resuelve una incidencia asignada; coordinación cierra o reabre. Revisa que las consultas respeten visibilidad por actor.

El encabezado `X-Course-Actor` y los actores de `docs/CAMPUSOPS_API.md` sirven únicamente para probar el backend. No los describas como identidad o autorización de producción y no confíes en un rol arbitrario enviado por el cliente.

### C. Revisión segura

- Los tokens sólo se persisten en el almacenamiento seguro de Expo; no los guardes en preferencias, estado serializado, logs, errores ni reportes.
- Comprueba el resultado de lectura, escritura y borrado. Un error de almacenamiento debe producir un resultado controlado y no filtrar mensajes nativos, cuerpos HTTP ni valores de token.
- Evita afirmar que el flujo está completo hasta observarlo conectado en la app y reproducir los casos requeridos.

## Comprobación y evidencia

No cambies pruebas. Revisa las pruebas existentes y ejecútalas como están; guarda el comando, resultado real y salida relevante. Para la entrega del equipo, las comprobaciones requeridas son `make feedback`, `make verify-week-06` y `make public-test-week-06`. Si alguna falla, conserva el fallo y avisa al equipo; no edites el test o el evaluador para conseguir verde.

Tu parte respalda sobre todo AC-02 (login/sesión/logout y autorización) y AC-05 (aportación individual). Aporta al reporte `reports/week-06/auth-tests.json` evidencia real de login, expiración, autorización, fallo y cierre, incluyendo al menos un caso de límite o falla. No inventes observaciones ni sobrescribas el trabajo de otra persona.

En `evidence/week-06/individual.json` hay exactamente tres integrantes: coordina con el responsable de integración qué objeto te corresponde y edita sólo ese registro. No inventes `studentId`, `teamId`, SHA, comandos ni resultados. Incluye tu commit real, archivos trabajados, pruebas o revisión, predicción previa, comando, resultado observado y explicación.

Para la justificación compartida de `evidence/week-06/engineering.json`, entrega al equipo una nota con la decisión de sesión, al menos dos alternativas consideradas, beneficio y costo aceptado, requisito AC relacionado y una comprobación observada. El responsable del archivo consolida la versión del equipo.

## Cierre de tu rama

Antes de commit, confirma que el diff sólo contiene tus archivos de aplicación/interfaz y la documentación que acordaste; revisa `git diff --check` y el autor del commit. Conserva un SHA completo de 40 caracteres para tu evidencia individual. No incluyas cambios de pruebas, evaluador/worker ni cambios ajenos. Publica tu rama y abre/actualiza una solicitud de integración dirigida a `main` sólo si el equipo acordó ese flujo; **no hagas push directo a `main`**. La etiqueta `week-06-final`, el commit final de evidencias y la entrega se hacen una sola vez para el equipo, después de integrar y verificar.
