# Modelo de amenazas — CampusOps

## Alcance actual

Esta versión de CampusOps tiene implementadas las capas de dominio, aplicación, infraestructura, composición y UI para listar y consultar incidencias con datos ficticios en memoria (Semana 02). No existe todavía sesión, autenticación ni persistencia de usuarios reales — los perfiles (`reporter`, `technician`, `coordinator`) están definidos en el vocabulario de dominio (`CampusRole`), y existen controles locales para R-01 y R-02 ejercitados con actores ficticios. No están conectados a sesión autenticada ni a las pantallas; no se presenta la app como protegida en producción.

Está previsto para hitos posteriores: almacenamiento persistente, sincronización con detección de conflictos, geolocalización con proveedor externo, y notificaciones.

## Activos

- **Sesión/tokens:** aunque todavía no está implementada, en el futuro identificará quién es cada usuario y qué puede hacer. Si se expusiera o se falsificara, alguien podría actuar como otro perfil (por ejemplo, hacerse pasar por coordinador).

- **Fotografías:** evidencia visual de una incidencia (por ejemplo, un cable dañado o una fuga). Si se expusieran fuera de quienes deben verlas, podrían revelar ubicaciones específicas del campus o información que el reportante no quería compartir públicamente.

- **Ubicaciones:** el lugar exacto donde ocurre una incidencia. Exponerlas indebidamente podría revelar patrones de uso de espacios del campus o ubicaciones sensibles (como laboratorios).

- **Incidencias:** el registro completo (descripción, categoría, estado, historial). Alterarlas sin autorización compromete la confiabilidad de todo el sistema de seguimiento.

- **Asignaciones:** quién es responsable de atender cada incidencia (`assignedTechnicianId`). Alterarlas indebidamente puede dejar una falla real sin atención mientras el sistema aparenta que sí está cubierta.

- **Credenciales:** cualquier secreto, token o configuración sensible del proyecto. Si se expusieran en el código o configuración pública del repositorio, permitirían acceso no autorizado fuera de la app.

- **Logs/reportes de CI:** los archivos que se generan al correr pruebas y evaluaciones. Si conservaran datos sensibles (ubicaciones, fotos, información personal), quedarían expuestos públicamente porque el repositorio es público.

## Fronteras

- **Persona → app:** el punto donde un usuario (reportante, técnico o coordinador) interactúa con la interfaz. Actualmente no hay autenticación real, por lo que cualquier persona que abra la app tiene el mismo nivel de acceso — esta frontera todavía no distingue perfiles de forma segura.

- **App → servicio:** donde la aplicación pide datos a un backend. Actualmente implementado de forma parcial: existe el indicador de salud heredado (`courseBackend`) y el repositorio de incidencias en memoria (`InMemoryIncidentRepository`), que simula esta frontera sin un servidor real todavía.

- **Servicio → almacenamiento:** donde los datos se guardan de forma persistente. **Futura** — esta semana los datos viven en memoria (se pierden al reiniciar la app), no hay base de datos real.

- **App → proveedor externo:** por ejemplo, un servicio de mapas o geocodificación. **Futura** — todavía no implementada en el proyecto.

- **Repositorio → GitHub Actions → artefactos:** donde el código sube a GitHub, se ejecutan pruebas automáticas, y se generan reportes/logs descargables. **Ya existe y está activa** — es la frontera que atiende R-03 y R-04, porque cualquier dato que se filtre en logs o configuración queda expuesto públicamente en el repositorio.

## Amenazas

| Prioridad | Riesgo | Prioridad y motivo | Control propuesto | Verificación propuesta | Riesgo residual |
|---|---|---|---|---|---|
| 1 | R-02 Alterar asignaciones | Alta: compromete la integridad del sistema, no solo la confidencialidad. Si alguien sin autorización cambia `assignedTechnicianId` o `status`, el sistema puede "mentir" sobre si una falla real ya fue atendida, dejando el problema físico sin resolver mientras nadie se entera. | Validar el rol (`CampusRole`) y la asignación vigente antes de modificar una incidencia; solo un coordinador puede reasignar, solo el técnico asignado puede cambiar su propio progreso. | Un reportante intenta cambiar `assignedTechnicianId` de una incidencia y se rechaza; un coordinador autorizado sí puede reasignar; un técnico ya reasignado no puede modificar el caso que perdió. | Sin sesión real implementada, la validación de rol depende de datos que aún no vienen autenticados de un servidor; falta la comprobación de concurrencia si dos cambios llegan al mismo tiempo. |
| 2 | R-01 Consultar incidencias ajenas | Alta: revela descripción, fotos y ubicación a quien no debería verlas, aunque no altera el estado del sistema. | Validar identidad y permiso sobre cada incidencia en el servicio; no basta con ocultar botones en la interfaz. | Un reportante ficticio A intenta consultar el detalle de una incidencia de B por su id; se rechaza sin devolver datos. A sí puede consultar las suyas. | Una prueba local de política no prueba la seguridad de un servidor futuro real. |
| 3 | R-03 Filtrar datos en logs | Alta: los artefactos de CI (reportes, logs) son públicos porque el repositorio es público; cualquier dato sensible ahí queda expuesto a cualquiera. | Permitir solo campos técnicos necesarios en los logs y sanitizar mensajes de error antes de guardarlos. | Capturar la salida de una ejecución con datos sintéticos y comprobar que no aparecen tokens, ubicaciones, fotos ni información personal. | Un nuevo punto de registro agregado después puede saltarse el sanitizador si no se revisa. |
| 4 | R-04 Exponer credenciales | Alta: el repositorio es público; cualquier secreto expuesto en código o configuración queda accesible a cualquiera de inmediato. | Evitar secretos en código/configuración pública (usar `.env` fuera del repo) y ejecutar un escaneo obligatorio de secretos en CI. | El detector de secretos en CI rechaza un marcador sintético de prueba (como un token falso) y deja de fallar cuando se retira. | El escaneo por patrones no detecta todos los formatos posibles de secreto, ni revisa el historial completo de commits anteriores. |

## Riesgo que atenderíamos primero

Atenderíamos primero R-02 (alterar asignaciones) porque compromete la integridad del sistema, no solo la confidencialidad: permite que el sistema "mienta" sobre si una falla real del campus ya fue atendida, lo cual puede dejar un problema físico sin resolver mientras el registro aparenta que está cubierto. Este riesgo también coincide con el trabajo que Fernanda ya está construyendo (autorización con `CampusRole` y `assignedTechnicianId`), por lo que es el más comprobable con evidencia real esta semana. R-01 queda en segundo lugar porque, aunque también es grave, solo compromete confidencialidad sin alterar el estado del sistema. R-03 y R-04 son amenazas más generales de infraestructura (CI/repositorio), reales pero con menor conexión directa al negocio de CampusOps que R-01 y R-02.

## Límites

Las pruebas de esta semana comprueban la lógica de autorización dentro de la aplicación (con datos ficticios en memoria), no un servidor real: no existe todavía sesión, autenticación ni persistencia real, así que no se puede demostrar que estas reglas resistirían un ataque contra un backend en producción. La comprobación de R-03 y R-04 se limita a los patrones y campos que el equipo decidió sanitizar/vigilar; no garantiza que un formato de secreto no contemplado, o un nuevo punto de registro agregado después, quede cubierto automáticamente. Los riesgos relacionados con sincronización, conflictos de concurrencia y almacenamiento persistente permanecen fuera del alcance de esta semana y se abordarán en hitos posteriores.

## Controles locales comprobables tras la revisión de integración

| Riesgo | Implementación | Verificación concreta | Límite |
|---|---|---|---|
| R-01 | `canViewIncident` compara `reporterId` para reportantes y la asignación almacenada para técnicos; `createAuthorizedIncidentQueries` lee del repositorio. | En `tests/security.test.ts`: consulta propia, ajena e inexistente para reportante y técnico; pérdida de lectura tras reasignar. | Actor ficticio suministrado por el test; la UI pública de Semana 02 no tiene sesión ni usa estos casos de uso. |
| R-02 | `canAssignIncident` permite únicamente coordinadores. `createAssignIncidentUseCase` recibe un ID y el puerto actualiza el registro almacenado; no autoriza usando copias aportadas por el llamador. | Reportante, técnico asignado y técnico ajeno rechazados sin invocar escritura; coordinador aceptado; ID ausente; copia antigua y mutaciones externas no recuperan acceso. | `canModifyIncident` es una política de progreso separada, no permiso de reasignación. No se implementa todavía una operación de progreso ni concurrencia distribuida. |
| R-03 | `InMemorySecurityLogger` copia sólo event, incidentId, actorRole y granted, y devuelve copias del historial. | El test aporta token, ubicación y fotos ficticias como campos extra: no se almacenan. Cambiar la entrada o la respuesta no altera el historial. | Lista de campos del logger local; no sanitizador universal de strings ni de errores/red de la app. |
| R-04 | Detector original del curso, conservado sin cambios. | `python tests/secret_scanner_test.py`: configuración pública, marcador sintético detectado/retirado y exclusión documentada de dependencias. | Patrones y rutas limitados, sin revisión completa del historial. |

La revisión inicial de R-02 no ejercitaba al técnico asignado que intenta reasignar ni la reutilización de una copia vieja; ambas regresiones se añadieron en la sesión de Oscar con asistencia de Codex. Los resultados históricos de 3 pruebas se conservan como tales, no como prueba de esas garantías nuevas.

El YAML queda sin cambios por indicación expresa de Oscar. Su lista actual de regresiones no incluye `tests/security.test.ts`; estas pruebas se ejecutaron explícitamente en la revisión y deben incorporarse a CI cuando se autorice editar el workflow. No se declara que ya se ejecutan automáticamente.
