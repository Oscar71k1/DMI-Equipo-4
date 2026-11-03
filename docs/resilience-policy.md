# Política de resiliencia — semana 09

Versión integrada sobre `origin/main` 9a351f2. Se conservan SQLiteIncidentStore, OfflineWorkPanel, sesión, sanitización y pruebas previas. Los tres commits nuevos de Fernanda se incorporaron mediante cherry-pick conservando su autoría; las correcciones posteriores y ubicación se implementaron con Codex a solicitud de Oscar. La autoría de esos cambios no se atribuye a Jarumi.

## Proveedor y comprobación externa

Usamos **Open-Meteo Geocoding / GeoNames**, vía `GeocodingAdapter`, para referencias aproximadas de localidad. No resuelve edificios del campus ni geolocaliza al usuario. No requiere permiso GPS y nunca se infieren coordenadas para una ubicación manual. La UI informa el alcance y muestra atribución; la etiqueta elegida llega al campo `location` textual del backend. Se puede completar o sustituir manualmente antes de enviar.

Fuentes oficiales consultadas el 2 de noviembre de 2026: [API de geocodificación](https://open-meteo.com/en/docs/geocoding-api) y [términos](https://open-meteo.com/en/terms). El servicio gratuito es para uso no comercial, bajo CC BY 4.0, y publica límites inferiores a 10 000 llamadas/día, 5 000/hora y 600/minuto. No garantiza disponibilidad. Este ejercicio académico no usa cuenta de pago ni credenciales; ante un uso comercial se debe revisar licencia y plan. Se atribuyen Open-Meteo y GeoNames; el adaptador transforma la respuesta a nuestro contrato.

`node lab/week9-external.cjs` hace una consulta real por el adaptador y repite mediante caché. Emplea una localidad pública como referencia para una incidencia inventada, sin datos personales ni coordenadas en el log. El resultado observado está en `reports/week-09/logs/external.json`. No se ejecuta durante CI: fallas y cuotas se reproducen con el doble/control de transporte.

## Caché y alternativa manual

`createLocationService` mantiene caché LRU en memoria por instancia de proveedor, consulta normalizada, idioma y formato fijos. TTL configurable de 5 minutos, máximo configurable de 32 entradas y como máximo 32 consultas distintas en vuelo. Las consultas idénticas comparten promesa. Sólo se cachea una respuesta validada; nunca errores, datos incompletos o expirados. No hay persistencia de coordenadas entre sesiones ni descarga masiva. Cambiar proveedor requiere otra instancia. Se conserva atribución y se respetan las condiciones de reutilización de datos publicadas.

`selectIncidentLocation` acepta etiqueta no vacía y coordenadas numéricas finitas dentro de [-90,90]/[-180,180], incluidos los ceros. Rechaza arrays, null, errores, tipos incorrectos e incompletos. Devuelve la etiqueta manual sin coordenadas. La interfaz exige referencia no vacía y permanece utilizable mientras busca. Una edición manual invalida una respuesta tardía. El timeout aborta el transporte; el límite temporal también termina la espera si un doble ignora abort.

Los escenarios `success`, `incomplete`, `invalid_coordinates`, `malformed`, `slow`, `rate_limited` del doble docente y el rechazo controlado por desconexión no requieren Internet. El endpoint docente sólo se usa en pruebas; ninguna cabecera de actor/token docente se envía al proveedor externo.

## Política y ejecución de reintentos

`createRetryPolicy` configura `maxAttempts` (1..4), `baseDelayMs` (250 por defecto) y `maxDelayMs` (10000 por defecto, máximo permitido 60000). Los intentos son solicitudes ya fallidas: desde 4 nunca se agenda otro. El backoff normal es 250, 500, 1000 ms. Se rechazan configuraciones no finitas e intentos fraccionarios. La salida siempre es finita y no negativa.

Se reintentan timeout, 429 y 5xx; se informa el fallo para desconexión, errores de contrato/JSON, 403/422 y otros rechazos definitivos. 409 conserva la intención y requiere resolución explícita. Los 401 pasan por la coordinación de sesión existente, sin otro bucle de refresh.

`Retry-After` admite segundos o fecha HTTP futura y se convierte a milisegundos. Un valor válido se respeta sin truncarlo hacia abajo. Si supera el máximo de espera, se detiene el reintento automático; no se llama antes de ese plazo. Los valores inválidos usan el backoff normal. El contrato GET/429/intento 1/800 ms devuelve exactamente 800 ms. No usamos jitter para conservar ese contrato comprobable.

`createRetryExecutor` aplica deadline real, abort, máximo de 4 solicitudes y presupuesto total configurable de 30 s (timeout por intento 5 s). Rechaza tiempos inválidos, limpia timers y no confunde errores de contrato con timeout. El cliente HTTP activa esta política en la composición real; las pruebas de capas antiguas pueden usar el cliente sin reintento para comprobar una solicitud aislada. Una reconexión o pulsación explícita puede iniciar otro ciclo acotado con la misma intención; no existe polling automático infinito.

## Escrituras, respuesta perdida y estado seguro

POST sólo se repite con identidad estable. La solicitud se serializa una vez; clave y cuerpo se conservan. Resolver/cerrar usan la cola durable de SQLite: se prepara la solicitud antes del envío y sólo se confirma con un acuse válido. Al reiniciar se recupera la solicitud original. Una clave usada con contenido diferente recibe 409. Un timeout significa resultado incierto, nunca certeza de que no se guardó.

La creación conserva clave/cuerpo en el formulario durante un reintento incierto y bloquea cambios/doble envío. Limitación: esa creación no se incorpora a la cola durable y su intención en memoria no sobrevive al cierre del formulario; la garantía durable demostrada esta semana corresponde a resolución/cierre. Tras un error de creación se debe consultar el listado antes de abrir una nueva intención.

`tests/week9-integration.test.ts` usa backend HTTP real local, SQLite en disco, una resolución autorizada tras inicio, evidencia sintética, pérdida de respuesta después de commit y reapertura de SQLite. Comprueba misma solicitud, `duplicate: true`, una transición, una evidencia y rechazo de otro contenido con la misma clave. Las pruebas de Fernanda con servidor simulado se conservan como complemento. No hay subsistema de notificaciones en esta app/backend: el reporte declara ese alcance y no inventa envíos observados.

## Evidencia y decisiones

Los logs incluyen sólo estado técnico, intentos, demora planificada/observada, duración, conteos y comprobaciones de igualdad. No incluyen tokens, cuerpos, coordenadas ni texto de incidencias. Los tiempos virtuales se distinguen de HTTP/timeout real. Cada reporte identifica comando, SHA y resultados observados. Se prefiere caché acotada y captura manual a bloquear todo el reporte; se acepta precisión de localidad y almacenamiento efímero. Se prefiere replay idempotente a generar otra operación; se acepta conservar una intención incierta y requerir revisión ante conflicto.

La revisión comunicada por Jarumi identificó la base atrasada de Fernanda y documentos docentes faltantes. Sus aportes previos de SQLite se conservan y se referencian como históricos; la implementación nueva asistida no se presenta como ejecución personal de Jarumi. Los registros individuales diferencian esas fuentes.

## Aportación publicada por Jarumi

Jarumi publicó su propia implementación de geocodificación con Nominatim, caché y captura manual. Sus commits y resultados corresponden a [su revisión de semana 9](https://github.com/Oscar71k1/DMI-Equipo-4/tree/bc6cb5f881288d705260709fb330b899081a6053). La versión integrada del equipo usa Open-Meteo. El [registro documental](jarumi-semana-09.json) distingue las pruebas de ambas versiones.
