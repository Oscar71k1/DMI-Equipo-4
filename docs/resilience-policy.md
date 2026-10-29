# Política de Resiliencia, Reintentos e Idempotencia — Semana 09

**Responsable (Política de Reintento y Replay):** Fernanda  
**Fecha:** 29 de octubre de 2026  
**Módulos Clave:** `src/application/retryPolicy.ts`, `src/application/retryExecutor.ts`, `tests/week9-lost-response.test.ts`

---

## 1. Política de Reintentos Configurable (`planRetry`)

El sistema implementa una función pura de decisión que evalúa el método HTTP, el estado del error, el número de intento actual y la presencia de identidad estable.

### 1.1 Límite de Intentos y Backoff Progresivo
- **Límite Estricto:** Se permiten reintentos únicamente para `attempt < 4`. A partir del intento 4, la política devuelve `retry: false` para evitar bucles infinitos y saturación de recursos.
- **Demoras Progresivas:** Para fallas transitorias sin cabecera de espera explícita, se aplica una secuencia de backoff:
  - Intento 1: 250 ms
  - Intento 2: 500 ms
  - Intento 3: 1000 ms
  - Intento 4+: 0 ms (Detenido)

### 1.2 Tratamiento de `Retry-After` (429 Too Many Requests)
- Cuando el servidor responde con status `429` e incluye el valor numérico `retryAfterMs`, la política respeta estrictamente ese tiempo (`delayMs = retryAfterMs`) sin aplicar jitter ni truncamiento prematuro.

---

## 2. Requisito de Identidad Estable para POST

- **Regla de Seguridad:** Todo reintento de una solicitud `POST` requiere obligatoriamente una clave de idempotencia estable (`Idempotency-Key` no vacía).
- Si se presenta un fallo transitorio o timeout en un `POST` sin clave, la política rechaza el reintento devolviendo `{ retry: false, delayMs: 0, requiresStableIdempotencyKey: true }`.
- Si cuenta con clave estable, el reintento se autoriza preservando intactos la ruta, el actor y el cuerpo del mensaje original.

---

## 3. Clasificación de Fallas

| Estado / Tipo | Clasificación | Acción de la Política |
|---|---|---|
| `timeout` (AbortError / Socket Timeout) | Transitorio | Reintentar con backoff (si cuenta con clave estable en POST). |
| `429` (Too Many Requests) | Transitorio | Reintentar respetando `retryAfterMs`. |
| `500`, `502`, `503`, `504` | Transitorio | Reintentar con backoff progresivo. |
| `400`, `401`, `403`, `404`, `422` | Definitivo | No reintentar (`retry: false, delayMs: 0`). |
| `409` (Conflict) | Definitivo / Integridad | Detener y reportar conflicto o clave duplicada. |

---

## 4. Respuesta Perdida tras Guardar (`timeout_after_commit`) y Replay

- **Problema:** Un cliente envía una solicitud (ej. `resolve`), el servidor aplica la mutación y confirma el commit, pero la respuesta tarda más del timeout configurado del cliente (1500 ms en el simulador vs 100–300 ms en pruebas). El cliente experimenta un `timeout`, pero la mutación ya existe en el servidor.
- **Protocolo de Recuperación:**
  1. La operación se mantiene en cola local como pendiente; no se elimina ni se asume fallida definitivamente.
  2. El cliente reintenta la solicitud reutilizando exactamente el mismo `operationId`, `baseVersion` y cuerpo JSON.
  3. El servidor detecta la clave en su registro de idempotencia, no incrementa la versión ni agrega eventos duplicados, y responde con `{ incident, operationId, duplicate: true }`.
  4. El cliente recibe la confirmación con `duplicate: true`, actualiza la caché local y retira la operación de la cola de pendientes.
- **Caso Negativo (Colisión de Clave):** Si se reenvía la misma clave con un cuerpo modificado, el servidor rechaza la transacción con `409 Idempotency key reused`, señalando violación de integridad.