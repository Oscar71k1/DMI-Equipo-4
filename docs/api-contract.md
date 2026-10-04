# Contrato de API — CampusOps (Semana 05)

**Autora:** Jarumi
**Backend:** `http://127.0.0.1:4310` (didáctico, en memoria, se reinicia al reiniciar el proceso)

## Autenticación de prueba

Todas las rutas de CampusOps requieren:
- `Authorization: Bearer course-valid-token` (fixture público, no es autenticación real de producción)
- `X-Course-Actor: <actorId>` — uno de: `reporter-1`, `reporter-2`, `technician-1`, `technician-2`, `coordinator-1`

Ningún rol se debe confiar si viene enviado solo por el cliente; el servidor es quien determina los permisos reales según el actor autenticado.

## Operaciones

### 1. Lista — `GET /v1/incidents`

**Solicitud:** sin cuerpo, con los headers de autenticación.

**Respuesta a validar:**
- HTTP 200 con `{ items: [...] }`
- El contenido de `items` varía según el actor: un reportante ve solo sus propios reportes, un técnico ve sus asignaciones, un coordinador ve todas
- `items: []` es una lista vacía **válida** — no es un error

### 2. Detalle — `GET /v1/incidents/:id`

**Solicitud:** ID codificado en la URL.

**Respuesta a validar:**
- HTTP 200 con un DTO de la incidencia, si el actor tiene permiso de verla
- HTTP 404 si el ID no existe
- HTTP 403 si el actor no tiene permiso sobre esa incidencia específica (existe, pero no es visible para él)

Ejemplo real de prueba: la incidencia `campus-inc-001` pertenece a `reporter-1`, está asignada a `technician-1`, versión 1. Si `reporter-2` intenta consultarla, debería recibir 403, no datos.

### 3. Creación — `POST /v1/incidents`

**Solicitud:** JSON con `category` (debe pertenecer a `IncidentCategory`), `description` (texto no vacío), `location` (texto). Requiere header `Idempotency-Key` estable de al menos 8 caracteres. Solo el **reportante** puede crear — técnicos y coordinadores no tienen este permiso.

**Respuesta a validar:**
- Primera creación: HTTP 201 con `{ incident: DTO, operationId, duplicate: false }`
- Reintento con la misma `Idempotency-Key`: HTTP 200 con `duplicate: true` (no se duplica el registro)
- El servidor obtiene `reporterId` del actor autenticado, **nunca** del cuerpo de la solicitud

## Niveles de validación

### Nivel 1 — Transporte

Distinguir:
- Respuesta HTTP exitosa vs código de error (ej: 500, representado como error de servidor aunque su cuerpo no tenga forma de DTO)
- Desconexión de red
- Timeout
- Fallo al decodificar el cuerpo como JSON (ej: escenario `malformed`, que devuelve `{"items": [}` — JSON roto a propósito)

### Nivel 2 — Sobre remoto (DTO)

El "sobre" tiene la forma `{ id, version, status, payload }`. Se valida que:
- `id` sea texto no vacío
- `status` sea texto no vacío (sin validar aún que sea un valor específico del dominio)
- `version` sea un entero no negativo
- `payload` sea un objeto **o `null`** — ambos son válidos a este nivel
- Se rechaza: un arreglo como `payload`, tipos incorrectos, campos requeridos ausentes, o una entrada nula completa
- Se ignoran campos adicionales que el sobre pueda traer en el futuro

La firma de este parser es: éxito `{ ok: true, value }`; fallo `{ ok: false, error: 'contract' }`.

### Nivel 3 — Dominio

Aunque el sobre sea válido, el **mapper de incidencias** (quien convierte DTO → `Incident`) exige más:
- `status` debe ser uno de los valores reales del dominio (`open`, `assigned`, `in_progress`, `resolved`, `closed`) — no cualquier texto
- Deben existir los campos necesarios dentro de `payload` para construir un `Incident` completo

## El caso central: `payload: null` (escenario `X-Course-Scenario: nullable`)

El backend soporta el escenario `nullable`, que devuelve un DTO con `payload: null` a propósito — representa una incidencia que **existe** (tiene `id`, `status`, `version`) pero cuyo contenido detallado aún no está disponible.

**Comportamiento correcto:**
1. El parser de Nivel 2 **acepta** este DTO como válido (`payload: null` es una de las formas permitidas)
2. El mapper de Nivel 3 **NO debe** construir un `Incident` completo con campos inventados (como `category: "unknown"`, `description: ""`)
3. En su lugar, se debe representar un estado explícito, distinto de "lista vacía" y distinto de "error" — por ejemplo: `{ kind: 'unavailable', id, status }`
4. La UI debe mostrar algo honesto como "Detalles no disponibles por el momento", nunca datos inventados presentados como reales

**Por qué importa:** si la UI inventara datos para rellenar los campos vacíos, un coordinador no podría distinguir entre "esta incidencia realmente no tiene categoría asignada" (un dato real incompleto) y "la app no tenía información todavía" (un hueco técnico) — ambos se verían idénticos en pantalla, lo cual podría llevar a una decisión equivocada sobre la incidencia real.

## Conversión DTO → Dominio

- `payload` (el contenido específico de CampusOps) se traduce a los campos propios de `Incident`: `category`, `description`, `location`, `work`
- `payload.location`, si es textual, se convierte a `{ source: 'manual', label: <texto> }`
- `work.status` debe ser coherente con el `status` general del DTO
- `assignedTechnicianId` dentro de `work` debe validarse antes de usarse (no asumir que siempre viene bien formado)
- `version` del sobre se conserva en algún lugar del modelo de aplicación, para no perder ese metadato remoto al convertir
- No se fabrican coordenadas, categoría, descripción ni `reporterId` — todo viene del servidor o se marca explícitamente como no disponible

## Manejo de errores propuesto

Unión discriminada con categorías: `contract` (el sobre no tiene forma válida), `timeout`, `server` (error HTTP 5xx), `network` (desconexión), y rechazo HTTP con código técnico (ej: 403, 404). Se distingue también el estado `unavailable` (payload null válido), que no es un error.

La UI actual solo tiene un mensaje de error genérico; se debe ampliar para conservar la causa distinguible internamente, mostrando siempre un mensaje seguro al usuario (sin exponer detalles técnicos del servidor, como vimos en la auditoría de la semana 4).

## Logs y sanitización

Al registrar información sobre estas operaciones, conservar solo: código de estado, contexto técnico permitido (como `incidentId`, `correlationId`, `attempt`, `durationMs`). Nunca registrar: el cuerpo completo de la respuesta remota, cabeceras de sesión, ubicación, descripción, o el mensaje de una excepción sin revisar (puede contener texto sensible incrustado).