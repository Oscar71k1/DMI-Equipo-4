# Semana 04: controles de almacenamiento y telemetría

## Criterios y procedencia

La [consigna](assignments/week-04.md) y la [rúbrica](assignments/week-04-rubric.md) estaban disponibles localmente sin seguimiento Git. Se incluyen sin cambiar su contenido. Sus IDs son AC-01 (reproducción, 2.5), AC-02 (comportamiento, 2), AC-03 (falla/exposición, 1.5), AC-04 (decisión, 1.5) y AC-05 (aportación, 0.5). Para la decisión de almacenamiento y sanitización: `requirementIds: ["AC-02", "AC-03", "AC-04"]`. Tener estos IDs no acredita por sí solo los criterios.

## Inventario observado

| Dato / origen | Destino, persistencia y acceso | Control y comprobación | Límite |
|---|---|---|---|
| Token ficticio de la demostración UI | `SessionStoragePanel` → `createSessionStore` → `SecureTokenStorage` → `ExpoSecureTokenStorage`; persistencia nativa, lectura sólo por el consumidor de sesión | `save/read/clear`, nunca preferencias ordinarias; pruebas `secure-storage` y `session-integration` | Está en memoria mientras se usa. No es autenticación ni cambia el actor local. |
| Nombres, email e IDs de personas | Fixtures de dominio/repositorios en memoria; sin persistencia añadida | Copias de campos permitidos; redacción recursiva de claves sensibles en telemetría; pruebas `security-audit` y `telemetry` | El dato de negocio autorizado sigue existiendo en memoria; ocultarlo no lo borra. |
| Ubicación, fotos/evidencia y comentarios/historial | Modelo/fixtures de incidencias; UI autorizada en memoria | Se redacta el valor completo al convertir a telemetría; `session-integration`, prueba pública semana 04 | No se eliminan datos legítimos del modelo por sanitizar un log. No hay subida de fotos implementada. |
| Logs de consultas/asignación | `InMemorySecurityLogger`, sólo memoria y copias al leer | Lista permitida `event/incidentId/actorRole/granted` seguida por `redactForTelemetry` | Los IDs técnicos deben seguir siendo controlados; no introducir texto libre en ellos. |
| Errores de almacenamiento | Resultado `storage-error`, mensaje fijo en UI, evento técnico fijo al logger | Nunca se reenvía error nativo, stack o token; falla de borrado no anuncia éxito | Puede permanecer el token nativo si falla borrar; reintentar. No equivale a revocación remota. |
| Salud del backend | `courseBackend` → puerto → `createHealthQuery` → UI | Rechazo se convierte en `offline`, sin error bruto | Cliente sólo usa `/health`; no hay login remoto en este flujo. |
| Configuración y evidencias | URL pública del backend, `.env.example`, Git/reportes | Exclusiones `.env*` y pruebas `security-audit`; sólo datos ficticios | Escaneo del cierre y reportes del equipo aún pendientes; no publicar secretos en logs de prueba. |

## Decisión y flujo real

Se confirma el puerto propuesto por Fernanda: `save(token): Promise<void>`, `read(): Promise<string | null>`, `clear(): Promise<void>`. Se conserva el consumidor `createSessionStore` con `persistToken/restoreToken/clearToken`, compatible con sus pruebas. Su dependencia opcional `preferences` sólo mantiene compatibilidad; el consumidor nunca la utiliza para tokens.

Se elige **Expo SecureStore 57.0.4**, instalado mediante `npx expo install expo-secure-store` para Expo 57, con lockfile. El adaptador usa una clave privada de la app y `WHEN_UNLOCKED_THIS_DEVICE_ONLY`. `app.json` activa el plugin con exclusión de respaldos Android. En Android usa preferencias cifradas mediante Keystore; en iOS, Keychain. Fuente: [documentación oficial de SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/), consultada el 28 de septiembre de 2026.

`createCampusOps` inyecta el adaptador al consumidor. La pantalla recupera la sesión ficticia al montarse, permite guardarla y eliminarla; sólo presenta estados, nunca el valor. Reiniciar la app permite comprobar recuperación. La sesión de prueba está separada de la identidad de demostración fija `reporter-1`. El login, refresco, revocación del servidor y uso del token en solicitudes autenticadas siguen fuera de esta implementación.

Las operaciones se serializan: un guardado pendiente termina antes del borrado posterior. Cualquier fallo de lectura, escritura o borrado devuelve `storage-error`; no hay respaldo en texto plano, ni éxito falso, ni registro del error original. El consumidor tampoco convierte una falla del logger en fuga o rechazo no controlado.

Alternativas comparadas:

- Memoria volátil: reduce persistencia y dependencias, pero pierde el token al reiniciar; no demuestra almacenamiento cifrado persistente.
- Preferencias o archivo ordinario: simples y persistentes, pero sin la protección requerida para credenciales; descartados para tokens.
- SecureStore: protege en reposo y mantiene el token entre ejecuciones; añade dependencia nativa, manejo de fallas y verificación por plataforma.

## Amenazas, límites y revisión

- R-01/R-02: conservar autorización local de consultas/asignaciones y regresiones `security.test.ts`; no atribuir autenticación real a un actor fijo.
- R-03: sanitización recursiva, normalización de claves, listas, copia sin mutación y contexto técnico preservado. El adaptador evaluable reexporta la misma función de dominio consumida por aplicación e infraestructura. Además se ocultan `message`, `errorMessage`, `stack` y objetos `Error`; ciclos se representan con `[CIRCULAR]`. No es un detector semántico de secretos en cualquier cadena: los emisores reales deben limitar campos y usar códigos controlados.
- R-04: exclusión de archivos privados y revisión de artefactos; falta consolidar el escaneo de secretos de la entrega completa.
- R-05: exposición del almacenamiento. Pruebas de guardar/recuperar/borrar, falla nativa, falta de respaldo ordinario, concurrencia y ausencia del marcador en UI/logs/resultados de error.

La protección en reposo no cubre dispositivos comprometidos, memoria de ejecución, capturas ni credenciales copiadas a otros destinos. Keychain puede conservar datos tras reinstalar; Android elimina las claves al desinstalar y requiere excluir datos de respaldos. Un fallo de borrado deja su estado incierto y debe comunicarse. Las pruebas con dobles comprueban lógica y llamadas al adaptador, **no cifrado real**. Queda pendiente ejecutar el ciclo en dispositivo/emulador y revisar respaldos nativos; no se afirma que ya esté verificado.

Los puertos, el esqueleto del consumidor y las pruebas `tests/secure-storage.test.ts` y `tests/telemetry.test.ts` proceden de Fernanda, commit `bd5edf89bfa1ded9e599f6683f92f5e652da103a`. La implementación, integración y pruebas adicionales fueron preparadas con asistencia de IA en la rama de Oscar. No se atribuyen a Jarumi una revisión personal ni commits que no realizó. Su inventario/borrador mencionado no estaba en esta copia; este documento sirve como base de integración y no sustituye su revisión individual.

Predicción técnica previa a las pruebas: fallar el almacén debe devolver estado seguro sin copiar el marcador ficticio al logger o preferencias; fallar el borrado debe conservar el aviso de falla. Los resultados ejecutados y comandos se consignan en `evidence/week-04/engineering.json`. La entrega del equipo aún necesita reportes de Fernanda, tres aportaciones verificables y verificación/etiqueta final coordinadas.
