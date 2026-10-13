# Actividad Semana 6 — Diagnóstico de una sesión bajo concurrencia

**Nombre:** Oscar Flores Cerqueda   
**Grupo:** A

> **Alcance de la prueba:** usé `createIncidentClient` de `src/api/incidentClient.ts` para ejecutar en paralelo listar incidencias, consultar un detalle y crear una incidencia. El backend local respondió a esas solicitudes. Luego el propio test hizo una llamada manual al endpoint de refresh; el cliente no lo invocó automáticamente. Por tanto, sí observé el comportamiento del cliente HTTP de la app ante tres 401, pero no probé la interfaz, el borrado del token ni la navegación al login.

## 1. Inspección de mi proyecto

| Elemento | Archivo o ubicación real en mi proyecto | ¿Qué hace? |
|---|---|---|
| Cliente HTTP | `src/api/incidentClient.ts` | Envía solicitudes con `Authorization: Bearer ${token}`. Si la respuesta no es exitosa, genera `IncidentClientError`; para un 401 no inicia refresh ni reintenta. |
| Access token | `src/api/incidentClient.ts` | El cliente usa `course-valid-token` como valor por defecto o el valor proporcionado en la configuración. |
| Refresh token | No está integrado en el cliente de la app. El backend local expone `POST /v1/session/refresh` en `course-backend/server.mjs`. | El backend local acepta el refresh de prueba; el cliente de la app no llama ese endpoint. |
| Manejo de 401 | `src/api/incidentClient.ts` | Convierte respuestas HTTP no exitosas en un error `http` que conserva el status. No renueva tokens ni reintenta. |
| Cierre de sesión | `src/application/createSessionStore.ts`; almacenamiento en `src/infrastructure/ExpoSecureTokenStorage.ts` | `clearToken()` limpia el token almacenado. No encontré una conexión automática entre un 401, limpiar la sesión y volver al login. |

## 2. Mi predicción

A = listar incidencias  
B = consultar detalle de incidencia  
C = crear incidencia

**Cantidad de refresh automáticos que espero del cliente actual:** 0.

**Explicación:** `createIncidentClient` en `src/api/incidentClient.ts` construye la autorización desde un token fijo/configurado. Su función `request` convierte una respuesta no exitosa en `IncidentClientError`. No encontré allí una llamada a `/v1/session/refresh`, una promesa compartida de refresh ni un reintento tras 401. Las tres operaciones disponibles son `listIncidents`, `getIncidentDetail` y `createIncident`.

## 3. Caso A — Refresh exitoso

**Lo que ejecuté:** ejecuté `listIncidents`, `getIncidentDetail` y `createIncident` en paralelo mediante `createIncidentClient` en `tests/week6-concurrency.test.ts`, con un token inválido y el backend local activo. Las tres solicitudes recibieron 401. Después, el test inició manualmente `POST /v1/session/refresh` con `course-refresh-0`.

- Cantidad de 401 observados: **3**.
- Cantidad de refresh ejecutados: **1 manual desde el script**.
- Cantidad de reintentos: **0**.
- Resultado final de A: **401; no se reintentó**.
- Resultado final de B: **401; no se reintentó**.
- Resultado final de C: **401; no se reintentó**.
- Resultado del refresh manual: **200**; el backend devolvió tokens de prueba.

**¿Mi predicción fue correcta?** Sí para el cliente HTTP: las tres operaciones concurrentes recibieron 401 y el cliente no inició refresh automático ni reintentos. El refresh con resultado 200 fue una llamada manual separada del test; no lo hizo `createIncidentClient`.

**¿Qué parte específica produjo el resultado?** `request()` en `src/api/incidentClient.ts` convierte cada respuesta no exitosa en `IncidentClientError`. El cliente no contiene una llamada a `/v1/session/refresh`; esa solicitud manual está separada en el test.

**Evidencia:** toma una captura directa de la salida de `tests/week6-concurrency.test.ts` para `evidencia-caso-a.png`. Ejecuta el comando indicado al final del reporte con `npm run backend` activo.

## 4. Caso B — Refresh fallido

**Mi predicción:** las tres operaciones del cliente recibirán 401 sin refresh automático. La llamada manual al backend con `invalid_refresh` responderá 401; no espero que esta prueba por sí sola limpie la sesión ni navegue al login.

**Lo observado:** en `tests/week6-concurrency.test.ts`, las tres operaciones ejecutadas por el cliente recibieron 401. Después, el test envió manualmente `POST /v1/session/refresh` con `invalid_refresh`; el backend respondió `401` con `{ code: 'invalid_grant' }`.

- ¿Se eliminó la sesión?: **No comprobado; el script solo consultó el backend.**
- ¿Regresó al login?: **No comprobado; no se ejecutó la navegación de la app.**
- ¿Hubo más de un refresh después del fallo?: **No; se envió un intento manual.**
- ¿Alguna petición quedó sin terminar?: **No en el script: la solicitud de refresh terminó con 401. El estado de peticiones dentro de la app no se comprobó.**

**Evidencia:** toma una captura directa de la salida del segundo test para `evidencia-caso-b.png`.

## 5. Mi decisión técnica

El primer cambio sería agregar un manejador de autenticación alrededor de `request()` en `src/api/incidentClient.ts`.  
Cuando varias operaciones reciban 401, compartirían una sola promesa de refresh.  
Las demás esperarían esa promesa en vez de iniciar otra renovación.  
Si el refresh funciona, actualizaría el token y reintentaría cada solicitud original una sola vez.  
Si falla, llamaría `clearToken()` de `src/application/createSessionStore.ts`.  
Después la interfaz tendría que llevar al usuario al login y dejar de reintentar.

## 6. Reflexión final

Si dos refresh devuelven tokens distintos y ambos escriben en almacenamiento, el token que se guarde al final podría reemplazar al otro. La app y el backend podrían quedar usando generaciones diferentes; entonces una solicitud podría volver a recibir 401 o la sesión podría fallar. Compartir una sola renovación evita esa carrera.

