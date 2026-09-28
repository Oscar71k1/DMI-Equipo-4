# Aportaciones del equipo 4 — Semana 04

**Actividad:** Controles de seguridad y privacidad de CampusOps.
**Fecha de corte:** 28 de septiembre de 2026.
**Estado:** avance parcial, pendiente de consolidación final.

Este documento resume el trabajo comprobable en los commits y registros revisados hasta esta fecha. Complementa [individual.json](../evidence/week-04/individual.json). Las responsabilidades asignadas se distinguen de los cambios efectivamente publicados; el trabajo que permanezca en otra computadora aún debe incorporarse para poder verificarlo.

## Resumen por integrante

| Integrante | Parte asignada | Aportación verificable hasta ahora | Estado |
|---|---|---|---|
| Oscar | Implementación, integración y comprobaciones | Almacenamiento con Expo SecureStore, consumidor de sesión, sanitización conectada a la aplicación, pruebas de integración y documentación base | Implementado y probado con dobles; verificación nativa opcional no realizada; cierre oficial en preparación |
| Fernanda | Pruebas de seguridad y reportes | Puertos de almacenamiento, contrato del consumidor, pruebas de almacenamiento/telemetría y registros previos a la implementación | Código de pruebas incorporado; reportes de cierre y revisión posterior pendientes |
| Jarumi | Inventario de datos, decisión técnica y revisión individual | Ampliación documental, comparación de alternativas y revisión declarada en b1d44b4 | Integrado con correcciones de Oscar/Codex; pendiente confirmación personal, sin log nuevo de ejecución |

## Oscar: implementación e integración

**Identificador registrado:** `3523110017`.
**Rama:** `week4/security-audit-Oscar-Flores-Cerqueda`.

Oscar, con asistencia de Codex para implementar, documentar y ejecutar comprobaciones, integró estas partes:

- Implementación de `redactForTelemetry`: recorre objetos y listas, normaliza claves, oculta campos sensibles y conserva contexto técnico sin modificar la entrada. El adaptador evaluable y el logger usan la misma función.
- Adaptador `ExpoSecureTokenStorage`, con Expo SecureStore como mecanismo de persistencia y configuración de respaldo Android.
- Implementación de `createSessionStore` sobre el contrato propuesto por Fernanda: guardar, recuperar y eliminar, serializar operaciones y devolver errores controlados sin copiar el token a preferencias ordinarias.
- Conexión en `createCampusOps` y pantalla `SessionStoragePanel` para comprobar el ciclo de una sesión ficticia sin mostrar el token. Este flujo no autentica al actor de demostración.
- Pruebas adicionales de integración: recuperación al volver a montar la pantalla, borrado, fallas, orden de operaciones y sanitización.
- Base de [controles de seguridad](security-controls.md), [decisión técnica](../evidence/week-04/engineering.json), actualización del diagrama e incorporación de la consigna y rúbrica locales al repositorio.

**Commits:**

- `411e1ecbb96f571d38ce0f61c3254b162dc4d1ba`: implementación, integración y documentación.
- `9d8b52447431ea5cc7be208e21cb87249bba5cb0`: decisión y resultados de comprobaciones.

La ejecución final pasó **63 pruebas en 12 suites**, incluyendo las pruebas de Fernanda y regresiones de semanas 1 a 4. También pasaron TypeScript, ESLint y la exportación Android de Expo. Los resultados están en [pruebas de integración](../reports/week-04/logs/oscar-integration-tests.txt), [tipos](../reports/week-04/logs/oscar-typecheck.txt), [lint](../reports/week-04/logs/oscar-lint.txt) y [exportación](../reports/week-04/logs/oscar-bundle.txt).

Durante la preparación se corrigió un error de lint y se observó un timeout en el primer render de una prueba nueva. Esa prueba pasó al repetirla; se amplió su tiempo máximo a 30 segundos para la carga inicial de React Native y la ejecución completa posterior pasó. Las comprobaciones se hicieron en Windows con Node 24.21.0 y dobles del módulo nativo: no acreditan todavía cifrado real en dispositivo ni reproducción final con el entorno indicado por la consigna.

## Fernanda: contratos y pruebas de seguridad

**Identificador registrado:** `a3523110496`.
**Rama:** `codex/semana-04-fernanda`.
**Commit:** `bd5edf89bfa1ded9e599f6683f92f5e652da103a`.

Fernanda aportó:

- `SecureTokenStorage`, con las operaciones `save`, `read` y `clear`.
- `PreferencesStorage`, utilizado en las pruebas para detectar escrituras indebidas en preferencias ordinarias.
- El contrato y esqueleto de `createSessionStore`, con `persistToken`, `restoreToken` y `clearToken`. La implementación de ese commit aún estaba pendiente.
- [Pruebas de almacenamiento](../tests/secure-storage.test.ts): ciclo normal, fallas de lectura/escritura/borrado y ausencia del marcador sensible en logs, consola y resultados de error.
- [Pruebas de telemetría](../tests/telemetry.test.ts): campos sensibles, contexto técnico, anidación, normalización de claves y conservación de la entrada.
- Registros de la fase anterior a la implementación, conservados en su commit bajo `reports/week-04/logs/fernanda-almacenamiento-antes.txt` y `fernanda-telemetry-antes.txt`.

Sus registros muestran **5 pruebas de almacenamiento fallidas** y **4 de telemetría fallidas**, ambas ejecuciones con código 1, porque las funciones aún lanzaban errores de implementación pendiente. Son evidencia del estado inicial, no resultados aprobados.

Después de integrar la implementación, estas pruebas pasaron en la sesión de Oscar. La autoría de las pruebas sigue siendo de Fernanda; la ejecución posterior registrada corresponde a la integración de Oscar. Los dos logs originales permanecen en la rama de Fernanda y todavía no están incorporados a la rama actual.

**Límite de prueba identificado:** TEL-04 sólo verifica que `errorMessage` sea una cadena; por sí sola no demuestra que desaparezca el contenido sensible. Las comprobaciones adicionales de redacción corresponden a las pruebas de integración de Oscar.

Quedan pendientes sus reportes de cierre, la revisión personal de la implementación integrada y la declaración de asistencia utilizada en su trabajo.

## Jarumi: evidencia documental y revisión pendiente

**Identificador registrado:** `3523110055`.
**Rama:** `codex/semana-04-jarumi`.
**Commits:** `7df961df1aed7d3a2d33cee19a4064c4fb4907e6` y `b1d44b4b48867547ca5721cc25c7a69aefb2ca9e`.

Jarumi amplió `docs/security-controls.md`, comparó memoria volátil, preferencias ordinarias y SecureStore en `engineering.json` y añadió una declaración de revisión fechada el 28 de septiembre de 2026. Su revisión indica que examinó el adaptador y los controles y confirmó la ausencia de tokens o errores crudos en el manejo de fallas.

La integración de Oscar/Codex conserva sus commits y corrige los problemas encontrados: formato de `engineering.json`, referencia de la versión evaluada, inventario incompleto y afirmaciones no sustentadas de HTTPS, AsyncStorage, TelemetryLogger y protección absoluta. También sitúa la captura de errores en `createSessionStore` y aclara que una falla de borrado puede dejar el token almacenado.

Su predicción y comando quedaron consignados en el commit, pero el resultado de 63 pruebas coincide con el registro anterior de Oscar y no viene acompañado de un log nuevo. Por ello, `individual.json` registra la revisión documental de Jarumi y distingue el resultado citado de una nueva ejecución personal. No se le atribuyen la implementación ni las pruebas de integración de Oscar.

Jarumi debe confirmar y poder explicar la revisión y las correcciones. Si desea acreditar una ejecución propia, debe incorporar su registro. La validación estructural del archivo individual no sustituye la corroboración del curso.

## Cómo se relacionan las aportaciones

Fernanda definió el puerto y las pruebas que describen el comportamiento esperado. Oscar implementó el consumidor y adaptador nativo, conectó el flujo a la aplicación y ejecutó las comprobaciones de integración. Jarumi aportó la ampliación documental, comparación de alternativas y revisión declarada; la integración corrige sus conclusiones para que coincidan con el código y mantiene la trazabilidad de cada aportación.

El archivo `individual.json` y este resumen se consolidaron con asistencia de Codex en la sesión de Oscar. Son registros de avance basados en evidencia disponible; cada integrante debe revisar y confirmar su apartado. No sustituyen la explicación personal solicitada por el curso.

## Pendientes para cerrar la entrega

1. Confirmar con Jarumi la revisión documental integrada y las correcciones; adjuntar log propio si declara una ejecución nueva.
2. Mantener actualizados los reportes `secret-scan.json` y `negative-tests.json`, ya generados por Oscar/Codex con resultados reales, al fijar la versión final.
3. Confirmar los tres registros individuales y completar la corroboración personal pendiente.
4. Documentar el límite de las pruebas con dobles. La comprobación en dispositivo/emulador es una recomendación adicional opcional; no se exige explícitamente en la consigna.
5. Ejecutar la verificación final del equipo, actualizar las referencias de evidencia y coordinar la etiqueta `week-04-final`.

Las pruebas aprobadas de integración son un avance verificable. La entrega completa y el cumplimiento de AC-05 aún requieren los pendientes anteriores.
