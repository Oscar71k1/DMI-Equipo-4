# Contrato de datos del cliente CampusOps (semana 5)

Este documento describe las rutas del backend didáctico de `docs/CAMPUSOPS_API.md` y `course-backend/campusops.mjs`. Sus actores y tokens son fixtures sintéticos de pruebas, no autenticación de producción. La interfaz llama acciones de aplicación; el transporte HTTP vive en `src/api/incidentClient.ts`, el parser compartido en `src/course-evaluation/index.ts` y el mapeo de DTO a dominio en `src/infrastructure/IncidentMapper.ts`.

## Solicitudes y respuestas

Todas las rutas de incidencias envían `Authorization: Bearer course-valid-token` y `X-Course-Actor` con uno de los actores documentados. `GET /v1/incidents` no lleva cuerpo y devuelve HTTP 200 con `{ "items": [DTO, ...] }`. Un arreglo vacío es una respuesta válida. `GET /v1/incidents/:id` codifica el ID como segmento de URL; devuelve HTTP 200 con un DTO visible, 404 para un ID inexistente y 403 si el actor no puede verlo.

`POST /v1/incidents` envía `Content-Type: application/json`, una `Idempotency-Key` estable de al menos ocho caracteres y `{ category, description, location }`. La categoría pertenece al conjunto de dominio, y descripción y ubicación son textos no vacíos. El servidor deriva `reporterId` del actor. Una creación nueva devuelve HTTP 201 con `{ incident: DTO, operationId, duplicate: false }`. El replay con igual actor, ruta, clave y cuerpo devuelve HTTP 200 y `duplicate: true`; reutilizar la clave con otro cuerpo produce 409.

El DTO tiene la forma `{ id, version, status, payload }`; los campos propios de la incidencia están dentro de `payload`. Campos adicionales del sobre se ignoran para compatibilidad futura. El parser devuelve `{ ok: true, value }` o `{ ok: false, error: 'contract' }` y comprueba que `id` y `status` sean textos no vacíos, `version` sea entero no negativo, y `payload` sea objeto o `null`. Rechaza entrada completa nula, campos obligatorios ausentes, tipos incorrectos y arreglos como payload. El parser no muta la entrada.

## Validación y conversión al dominio

1. **Transporte:** el cliente distingue `timeout`, `network`, error HTTP de servidor (`server`) y rechazo HTTP (`http`, con código). Un fallo al decodificar JSON se clasifica como `contract`. Ninguna excepción de transporte se propaga con el texto arbitrario original. Cada solicitud cancela con `AbortController` al superar el límite y limpia su temporizador.
2. **Sobre remoto:** `parseRemoteResource` aplica las reglas del DTO anteriores. Un estado textual no vacío puede pasar el parser general aunque el dominio todavía no lo reconozca.
3. **Dominio:** el mapper requiere uno de los cinco estados del dominio, categoría válida, descripción, ubicación textual, reportante no vacío y asignado nulo o no vacío. Convierte `payload.location` en `{ source: 'manual', label }` y refleja el estado coherente en `Incident.status` y `Incident.work.status`. No crea coordenadas ni completa campos faltantes. La versión se conserva junto al resultado de mapeo, ya que `Incident` todavía no define ese metadato.

Un `payload: null` es un DTO válido; el mapper produce el estado explícito `unavailable`, conservando `id`, `status` y `version`. No representa una incidencia de dominio completa y el repositorio de dominio actual, que sólo expone `Incident`, no puede convertir ese resultado en un objeto `Incident`; al pedir el flujo de dominio, falla de forma controlada como contrato insuficiente. Lista vacía, detalle 404 y payload nulo son situaciones distintas.

## Errores y límites conocidos

Las formas de error del cliente son `IncidentClientError.kind`: `timeout`, `network`, `server`, `http` o `contract`. Para errores HTTP conserva el status numérico, no el cuerpo de respuesta. Lista, detalle y creación validan los sobres antes de devolver datos. La composición usa el cliente remoto en lugar del repositorio en memoria. La UI existente convierte rechazos de consulta a un mensaje genérico y seguro.

La pantalla actual todavía no incluye un formulario de creación ni representa `unavailable` como un estado visual separado; estas acciones están disponibles en la composición/cliente, pero la integración de UI de creación queda pendiente. `Incident` tampoco almacena `reporterId`, por lo que el mapeo valida su presencia sin descartarlo como si fuera un campo de dominio ya implementado. Estas limitaciones deben considerarse al evaluar la cobertura de AC-02.
