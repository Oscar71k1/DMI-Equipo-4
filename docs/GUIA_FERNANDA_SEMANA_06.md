# Guía de trabajo de Fernanda — CampusOps, semana 6

**Responsabilidad acordada:** renovación concurrente single-flight, expiración con reloj controlable, reintentos limitados, manejo de refresh fallido/obsoleto y evidencia de concurrencia. Esta guía organiza el trabajo; los requisitos oficiales están en `docs/assignments/week-06.md`, `docs/assignments/week-06-repository.md` y `docs/assignments/week-06-rubric.md`.

**Rama sugerida:** `semana-06-fernanda`. Trabaja en una rama propia y publica sólo esa rama si el equipo lo acuerda. **No hagas push a `main`**, no crees ni muevas la etiqueta final y no integres cambios sin coordinación con la persona responsable de integración.

## Límites de trabajo

- No edites, desactives, filtres ni reemplaces archivos bajo `course-tests/` o `tests/`. Ejecuta las pruebas existentes sin cambiar su contenido; incluye `tests/week6-concurrency.test.ts`, aunque sea un archivo nuevo/local del equipo.
- No edites `tools/course_public_evaluator.py`, workflows ni otro worker/evaluador, ni ajustes umbrales o comandos para ocultar fallas.
- Revisa `git status --short --branch` antes de empezar. Hay que preservar todo cambio local existente; si un archivo de tu alcance ya está modificado, averigua su autoría y coordina antes de editarlo.
- El backend y sus tokens/actores son fixtures ficticios de prueba, no autenticación de producción.

## Tu aportación

Lee `actividad-semana-6.md`, los tres documentos `docs/assignments/week-06*.md`, `docs/EVIDENCE_CONTRACT.md` y `docs/CAMPUSOPS_API.md`. Inspecciona especialmente:

- `src/course-evaluation/contracts.ts` y `src/course-evaluation/index.ts`
- `src/api/incidentClient.ts` y los puertos/transporte HTTP existentes
- `src/application/createSessionStore.ts` y `src/domain/SecureTokenStorage.ts`
- el flujo de login/refresh en `course-backend/campusops.mjs` (sólo lectura)
- las pruebas actuales de sesión y concurrencia (sólo lectura/ejecución)

Anota primero qué comportamiento existe y qué falta. En este starter, `coordinateRefresh` está pendiente; el test de concurrencia local puede hacer refresh manual y no prueba por sí solo que la app lo coordine automáticamente. Distingue observaciones del cliente, llamadas manuales al backend y resultados de pruebas de la aplicación.

### A. Implementar la coordinación real

Implementa `coordinateRefresh` respetando la firma y los eventos `AuthEvent` publicados. Modela generaciones de sesión para distinguir una respuesta 401 antigua de una respuesta asociada a la sesión vigente. Si coinciden varios 401, una única promesa/operación de refresh debe compartirse; cada solicitud sólo puede reintentarse dentro del límite definido y una sola vez por generación. No renueves otra vez si la respuesta tardía ya quedó cubierta por un refresh completado.

Conecta la función a la sesión y al cliente HTTP real; una máquina pura que sólo devuelve un contador fijo no satisface el requisito. Usa inyección de reloj/control de tiempo para poder avanzar hasta la expiración determinísticamente sin `sleep` impredecible. Coordina con Jarumi las interfaces de sesión y logout antes de tocar módulos compartidos.

### B. Fallos, obsolescencia y cierre

Comprueba en la lógica real los casos de refresh exitoso, refresh rechazado, resultado obsoleto y logout mientras hay solicitudes/refresh en curso. Al fallar o quedar obsoleta la renovación, transiciona una vez a estado no autenticado, limpia el token persistido y evita reintentos en bucle. Logout invalida la generación activa: una respuesta de refresh que llegue después no debe resucitar ni volver a persistir la sesión.

No registres access token, refresh token, encabezados de autorización ni cuerpos que puedan contenerlos. Los logs sólo pueden describir eventos técnicos sanitizados.

### C. Diagrama y evidencia

Coordina con Jarumi `docs/session-state-machine.mmd` para que un solo diagrama cubra login, sesión válida, expiración, refresh compartido, refresh fallido/obsoleto, logout y estado anónimo, coincidiendo con el código.

Prepara la evidencia real para `reports/week-06/concurrency.json`: número de solicitudes concurrentes, cantidad de renovaciones compartidas, reintentos observados y límite, más los casos de refresh fallido/obsoleto/logout. Debe contener `schemaVersion: 1`, `week: 6`, `commitSha`, fecha ISO y `checks` con comandos y resultados reales; incluye al menos un caso `boundary` o `failure`. No presentes una llamada manual al endpoint como refresh automático del cliente.

Tus resultados respaldan especialmente AC-02 y AC-03, además de AC-05. Para `evidence/week-06/individual.json`, acuerda tu objeto con el responsable de integración y edita sólo ese registro. Registra únicamente predicción previa, pruebas ejecutadas, archivos y SHA propios, comando exacto y observación verificable. Para `engineering.json`, entrega una nota sobre single-flight/generaciones frente a renovaciones independientes, con el costo aceptado y las comprobaciones observadas; el responsable integra una decisión compartida.

## Comprobación y cierre de rama

No cambies pruebas para acomodar la implementación. Ejecuta las pruebas existentes y los checks de equipo indicados: `make feedback`, `make verify-week-06` y `make public-test-week-06`. Conserva fallos reales y notifícalos; no cambies el evaluador, worker, workflow ni thresholds. La ejecución de pruebas puede producir archivos auxiliares: revisa el diff antes de guardarlos.

Antes del commit, comprueba que tu diff sólo contenga cambios acordados de implementación y tus documentos/reportes, que no altere pruebas/evaluador/worker, y que `git diff --check` no encuentre problemas. Guarda tu SHA completo (40 caracteres) para evidencia. Publica únicamente tu rama; no hagas push directo a `main`. El responsable de integración consolidará código, reportes, los tres registros individuales, `week-06-final` y SHA final del equipo después de la verificación.
