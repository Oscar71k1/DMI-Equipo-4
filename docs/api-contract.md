# Contrato de API — CampusOps (Semana 05)

**Autora:** Jarumi
**Backend:** `http://127.0.0.1:4310` (didactico, en memoria, se reinicia al reiniciar el proceso)

Este documento describe las rutas reales del backend didactico (`docs/CAMPUSOPS_API.md`, `course-backend/campusops.mjs`) y como el cliente las consume. El transporte HTTP vive en `src/api/incidentClient.ts`, el parser compartido del sobre remoto en `src/course-evaluation/index.ts` (funcion `parseRemoteResource`) y el mapeo de DTO a dominio en `src/infrastructure/IncidentMapper.ts`.

## Autenticacion de prueba

Todas las rutas de CampusOps requieren:
- `Authorization: Bearer course-valid-token` (fixture publico, no es autenticacion real de produccion)
- `X-Course-Actor: <actorId>` — uno de: `reporter-1`, `reporter-2`, `technician-1`, `technician-2`, `coordinator-1`

Ningun rol se debe confiar si viene enviado solo por el cliente; el servidor es quien determina los permisos reales segun el actor autenticado.

## Operaciones

### 1. Lista — `GET /v1/incidents`

**Solicitud:** sin cuerpo, con los headers de autenticacion.

**Respuesta a validar:**
- HTTP 200 con `{ items: [...] }`
- El contenido de `items` varia segun el actor: un reportante ve solo sus propios reportes, un tecnico ve sus asignaciones, un coordinador ve todas
- `items: []` es una lista vacia **valida** — no es un error

### 2. Detalle — `GET /v1/incidents/:id`

**Solicitud:** ID codificado en la URL.

**Respuesta a validar:**
- HTTP 200 con un DTO de la incidencia, si el actor tiene permiso de verla
- HTTP 404 si el ID no existe
- HTTP 403 si el actor no tiene permiso sobre esa incidencia especifica (existe, pero no es visible para el)

Ejemplo real de prueba: la incidencia `campus-inc-001` pertenece a `reporter-1`, esta asignada a `technician-1`, version 1. Si `reporter-2` intenta consultarla, deberia recibir 403, no datos.

El cliente (`getIncidentDetail`) ademas verifica que el `id` devuelto por el servidor coincida con el que se pidio; si no coincide, se trata como error de contrato.

### 3. Creacion — `POST /v1/incidents`

**Solicitud:** JSON con `category` (debe pertenecer a `IncidentCategory`), `description` (texto no vacio), `location` (texto). Requiere `Content-Type: application/json` y header `Idempotency-Key` estable de al menos 8 caracteres ASCII imprimibles (el cliente valida ese formato antes de llamar al servidor; si no cumple, rechaza localmente como error de contrato). Solo el **reportante** puede crear — tecnicos y coordinadores no tienen este permiso.

**Respuesta a validar:**
- Primera creacion: HTTP 201 con `{ incident: DTO, operationId, duplicate: false }`
- Reintento con la misma `Idempotency-Key`, mismo actor, misma ruta y mismo cuerpo: HTTP 200 con `duplicate: true` (no se duplica el registro)
- Reutilizar la misma `Idempotency-Key` con un cuerpo distinto: HTTP 409 (conflicto)
- El servidor obtiene `reporterId` del actor autenticado, **nunca** del cuerpo de la solicitud

## Niveles de validacion

### Nivel 1 — Transporte

El cliente distingue, mediante `IncidentClientError.kind`:
- `timeout` — se agoto el limite de espera (controlado con `AbortController`, temporizador limpiado siempre en `finally`)
- `network` — fallo de conexion (fetch lanzo excepcion sin ser timeout)
- `server` — codigo HTTP 5xx (error de servidor, aunque su cuerpo no tenga forma de DTO)
- `http` — rechazo HTTP con codigo tecnico (ej. 403, 404, 409) que no es 5xx
- `contract` — fallo al decodificar el cuerpo como JSON, o el sobre no tiene forma valida

Ninguna excepcion de transporte se propaga con su texto original sin filtrar.

### Nivel 2 — Sobre remoto (DTO)

Implementado en `parseRemoteResource` (`src/course-evaluation/index.ts`). El "sobre" tiene la forma `{ id, version, status, payload }`. Se valida que:
- `id` sea texto no vacio
- `status` sea texto no vacio (sin validar aun que sea un valor especifico del dominio)
- `version` sea un entero no negativo
- `payload` sea un objeto **o `null`** — ambos son validos a este nivel
- Se rechaza: un arreglo como `payload`, tipos incorrectos, campos requeridos ausentes, o una entrada nula completa
- Se ignoran campos adicionales que el sobre pueda traer en el futuro

La firma de este parser es: exito `{ ok: true, value }`; fallo `{ ok: false, error: 'contract' }`.

### Nivel 3 — Dominio

Implementado en `mapRemoteIncident` (`src/infrastructure/IncidentMapper.ts`). Aunque el sobre sea valido, el mapper exige mas:
- `status` debe ser uno de los cinco valores reales del dominio (`open`, `assigned`, `in_progress`, `resolved`, `closed`)
- `category` debe pertenecer a `IncidentCategory`
- `description`, `location` y `reporterId` deben ser texto no vacio
- `assignedTechnicianId` debe ser `null` o texto no vacio
- Si algo de esto falla, se lanza un error de datos de dominio invalidos (distinto del error de contrato de Nivel 2)

`Incident` (`src/domain/Incident.ts`) si incluye el campo `reporterId`; se valida su presencia como parte del mapeo.

## El caso central: `payload: null` (escenario `X-Course-Scenario: nullable`)

El backend soporta el escenario `nullable`, que devuelve un DTO con `payload: null` a proposito — representa una incidencia que **existe** (tiene `id`, `status`, `version`) pero cuyo contenido detallado aun no esta disponible.

**Comportamiento correcto (verificado en `IncidentMapper.ts`):**
1. El parser de Nivel 2 **acepta** este DTO como valido (`payload: null` es una de las formas permitidas)
2. El mapper de Nivel 3 **NO construye** un `Incident` completo con campos inventados
3. En su lugar, devuelve el estado explicito `{ kind: 'unavailable', id, status, version }`
4. La UI debe mostrar algo honesto como "Detalles no disponibles por el momento", nunca datos inventados presentados como reales — **pendiente:** la UI actual todavia no representa `unavailable` como un estado visual separado

**Por que importa:** si la UI inventara datos para rellenar los campos vacios, un coordinador no podria distinguir entre "esta incidencia realmente no tiene categoria asignada" (un dato real incompleto) y "la app no tenia informacion todavia" (un hueco tecnico) — ambos se verian identicos en pantalla, lo cual podria llevar a una decision equivocada sobre la incidencia real.

## Conversion DTO -> Dominio

- `payload` (el contenido especifico de CampusOps) se traduce a los campos propios de `Incident`: `category`, `description`, `location`, `work`, `reporterId`
- `payload.location`, si es textual, se convierte a `{ source: 'manual', label: <texto> }`
- `work.status` debe ser coherente con el `status` general del DTO
- `assignedTechnicianId` dentro de `work` debe validarse antes de utilizarse (no se asume que siempre viene bien formado)
- `version` del sobre se conserva junto al resultado del mapeo (en `IncidentMapping`), ya que `Incident` todavia no define ese metadato dentro de si mismo
- No se fabrican coordenadas, categoria, descripcion ni `reporterId` — todo viene del servidor o se marca explicitamente como no disponible

## Manejo de errores propuesto

Union discriminada con categorias: `contract` (el sobre no tiene forma valida), `timeout`, `server` (error HTTP 5xx), `network` (desconexion), y `http` (rechazo HTTP con codigo tecnico, ej. 403, 404, 409). Se distingue tambien el estado `unavailable` (payload null valido), que no es un error.

La UI actual solo tiene un mensaje de error generico; se debe ampliar para conservar la causa distinguible internamente, mostrando siempre un mensaje seguro al usuario (sin exponer detalles tecnicos del servidor, como se establecio en la auditoria de la semana 4).

## Logs y sanitizacion

Al registrar informacion sobre estas operaciones, conservar solo: codigo de estado, contexto tecnico permitido (como `incidentId`, `correlationId`, `attempt`, `durationMs`). Nunca registrar: el cuerpo completo de la respuesta remota, cabeceras de sesion, ubicacion, descripcion, o el mensaje de una excepcion sin revisar (puede contener texto sensible incrustado).

## Pendientes conocidos (fuera de alcance de esta revision)

- La pantalla aun no incluye un formulario de creacion; la capacidad existe en composicion/cliente pero no esta conectada a la UI.
- La UI no representa el estado `unavailable` de forma visual distinta a un error.
- Faltan pruebas propias del cliente para: timeout, HTTP 500, mapeo completo DTO->dominio y creacion (incluyendo el caso 409). Se dejan como verificacion pendiente en `evidence/week-05/engineering.json` hasta que el equipo las ejecute.
