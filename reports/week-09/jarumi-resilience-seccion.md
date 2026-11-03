# Sección de Resiliencia: Adaptador de Geocodificación y Captura Manual
**Responsable:** Jarumi

## 1. Adaptador HTTP y Cancelación Real
- `GeocodingAdapter` aísla las peticiones HTTP al servicio de geocodificación.
- Implementa `AbortController` acoplado a `setTimeout` para cancelar peticiones que excedan el timeout.
- Se asegura la limpieza inmediata de temporizadores (`clearTimeout`).
- Redirecciona fallos de red, timeouts y respuestas `HTTP 429` a la captura manual sin lanzar excepciones no controladas.

## 2. Estrategia de Caché (`GeocodingCache`)
- **Clave normalizada:** Convierte consultas a minúsculas y elimina espacios extras (`query.trim().toLowerCase()`).
- **Filtrado estricto:** Solo guarda respuestas confirmadas por el proveedor (`source === 'provider'`). No almacena errores ni coordenadas fabricadas.
- **Expulsión:** Aplica límite de capacidad FIFO e invalidación por TTL (time-to-live).

## 3. Captura Manual y Fallback (`selectIncidentLocation`)
- Valida en runtime coordenadas finitas en rangos `[-90, 90]` y `[-180, 180]`, reconociendo `0` como coordenada numérica válida.
- Conserva el texto de etiquetas de forma exacta sin recortes arbitrarios.
- Ante `null`, objetos incompletos o coordenadas fuera de límite, devuelve `{ source: 'manual', label: manualLabel }` sin inventar coordenadas.