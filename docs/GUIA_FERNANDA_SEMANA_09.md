# Guía de Fernanda — Semana 09

Tu parte propuesta es implementar reintentos seguros, conservar la identidad de las operaciones y demostrar una respuesta perdida después de guardar. Continúas el trabajo de sincronización de semana 8. Jarumi se encarga de ubicación, caché y captura manual; Oscar coordina la integración y el cierre.

Actualizada el 28 de octubre de 2026. Entrega: **2 de noviembre de 2026, 23:59, hora de Ciudad de México**. Esta guía describe trabajo por realizar: no acredita pruebas ejecutadas ni una implementación terminada. El reparto y las rutas nuevas son propuestas del equipo, no requisitos adicionales del docente.

## 1. Material revisado y preparación

Lee [actividad](assignments/week-09.md), [entrega](assignments/week-09-repository.md), [rúbrica](assignments/week-09-rubric.md), [API](CAMPUSOPS_API.md), [CampusOps](CAMPUSOPS.md), [evidencias](EVIDENCE_CONTRACT.md) e [instalación](../INSTALL.md).

La captura muestra `course-tests/`, `docs/` e `INSTALL.md`; no permite comprobar el contenido completo del ZIP. Se revisaron sus equivalentes locales y el workflow `.github/workflows/week-09-integracion-resiliente-feedback.yml`. El instructivo exige incluir `.github`, aunque no aparezca en la captura. No vuelvas a instalar el starter ni reemplaces carpetas completas: combina el paquete y revisa conflictos preservando trabajo anterior.

En este checkout, `planRetry` y `selectIncidentLocation` todavía llaman a `pending(...)`. Las pruebas públicas tienen cuatro casos y no demuestran por sí solas caché, interfaz, persistencia ni ausencia de duplicados. Los indicadores de modificación de Git no prueban que haya cambios semánticos: el diff de la prueba y del contrato no mostró cambios de contenido respecto a HEAD. Se está documentando lo que exige el material disponible, sin atribuir una comparación con un ZIP anterior no disponible.

La revisión encontró la rama local `week5/fix-evidence-sha`, SHA `92eb23eafaec287813149c73a47b72fd1c19c209`, con cambios sin guardar. **No tomar ese checkout como base final de semana 8 ni copiar el SHA de las guías anteriores.** Antes de empezar, integren y comprueben la versión vigente de semanas 6 y 8. La revisión de esta guía no actualizó referencias remotas ni certificó esa base.

En tu propio clon, revisa primero:

```powershell
git status --short --branch
git log -5 --oneline
git config user.name
git config user.email
node --version
npm --version
python --version
make --version
```

Usa Node 22.22.0 y las versiones fijadas por el proyecto. Guarda tu trabajo pendiente en su rama; no uses reset ni limpiezas para iniciar. Una vez acordada e integrada la base, crea desde ella `codex/fernanda-semana-09` y ejecuta `make setup`. Si Windows sólo reconoce `python`, los targets del evaluador aceptan `PYTHON=python`, por ejemplo `make verify-week-09 PYTHON=python`. Cada comando se revisa por separado; una falla no equivale a aprobación.

## 2. Contrato y reparto con Jarumi

| Responsable propuesto | Alcance |
|---|---|
| Fernanda | Política configurable de reintento, ejecutor de solicitudes, replay de resolución/cierre y pruebas de duplicación. |
| Jarumi | Adaptador externo de geocodificación, caché, selección de ubicación, formulario manual y sus pruebas. |
| Oscar | Composición real, regresiones, consolidación de contratos/reportes, revisión técnica propia y entrega. |

Conserven cola durable, versión base, identidad y contenido de semana 8, sesión de semana 6 y sanitización previa. Si falta una de esas piezas en la base integrada, documenten y resuelvan el bloqueo antes de afirmar que funciona el flujo completo.

Propón `src/application/retryPolicy.ts` para la lógica y `tests/week9-retry.test.ts` para pruebas nuevas. Adapta esas rutas si ya existe una pieza equivalente. Oscar consolida los wrappers de `src/course-evaluation/index.ts`, contratos y composición para evitar ediciones simultáneas. El wrapper debe llamar a la misma lógica que usa la app.

Mantén la firma pública de `planRetry`: entrada con `method: 'GET' | 'POST'`, `status: number | 'timeout'`, `attempt`, `retryAfterMs?`, `idempotencyKey?`; salida con `retry`, `delayMs`, `requiresStableIdempotencyKey`. La configuración puede vivir en una factoría interna inyectable; no rompas la firma para añadir parámetros obligatorios.

## 3. Implementación paso a paso

1. Define y documenta política configurable: número máximo de intentos, demora base, tope de backoff y presupuesto temporal. El contrato público nunca permite reintentar desde `attempt >= 4`. Interpreta el intento como la solicitud que acaba de fallar: después del intento 3 puede programarse el 4; después del 4 se termina. El usuario no debe poder reiniciar inadvertidamente el contador de la misma operación con cada render.
2. Valida números. Toda demora devuelta debe ser finita y no negativa. Prueba `NaN`, infinito, negativos e intentos fuera de contrato. Una configuración inválida se rechaza o se normaliza con una política documentada; nunca termina en un bucle ni una espera indefinida.
3. Sin `Retry-After`, aumenta progresivamente la espera hasta el tope. Puedes elegir como propuesta 250, 500 y 1000 ms para intentos 1, 2 y 3; esos valores no son una exigencia docente. Usa reloj/espera inyectables para comprobar límites sin depender del tiempo de Internet.
4. El contrato público exige que GET + 429 + intento 1 + `retryAfterMs: 800` devuelva exactamente `{ retry: true, delayMs: 800, requiresStableIdempotencyKey: false }`. No añadas jitter que rompa ese resultado. Convierte en el adaptador la cabecera HTTP en segundos o fecha a milisegundos, y prueba valores inválidos. Si una espera válida supera el presupuesto permitido, detén o difiere la operación según la política: nunca recortes la espera para llamar antes de lo permitido.
5. Para POST sin clave estable, devuelve exactamente `{ retry: false, delayMs: 0, requiresStableIdempotencyKey: true }`. Una cadena vacía o sólo espacios no es identidad útil. POST + timeout + intento 1 + clave estable debe permitir reintentar y devolver `requiresStableIdempotencyKey: false`.
6. Distingue fallas transitorias de rechazos definitivos. Documenta qué 5xx y timeout admiten reintento. Un 403, un 422 o un 409 de conflicto no se arreglan reenviando ciegamente. La expiración de sesión sigue la coordinación previa; evita multiplicar reintentos entre capa de sesión, cliente y cola.
7. Conecta el plan a un ejecutor real: debe esperar, contar intentos, abortar por timeout y detenerse. La función pura sólo decide; no demuestra que el transporte respete la decisión. Conserva la operación pendiente cuando no hay confirmación. Ante desconexión no hagas polling infinito.
8. Conserva la misma clave, ruta, actor y cuerpo durante el replay. Persiste la identidad antes del primer envío. No regeneres `baseVersion`, diagnóstico, ID de evidencia o contenido en el reintento; una operación nueva exige una intención nueva explícita.

## 4. Respuesta perdida reproducible

El doble incluido ya ofrece `X-Course-Scenario: timeout_after_commit`; guarda el cambio y retrasa la respuesta 1500 ms. No lo reemplaces por un mock que falla antes de escribir.

1. Ejecuta `npm run backend` en otra terminal y prepara un estado sintético limpio. El servidor guarda en memoria: no lo reinicies entre el primer envío y el replay. En Android emulado usa `http://10.0.2.2:4310`; las pruebas de escritorio usan `http://127.0.0.1:4310`.
2. Usa los actores y cabeceras publicados en `CAMPUSOPS_API.md`. Lleva `campus-inc-001` al estado permitido con `start` y después prueba `resolve` como `technician-1`; alternativamente, prepara `resolved` y prueba `close` como `coordinator-1`. Obtén la versión vigente, no la adivines.
3. Guarda una operación con clave estable y el cuerpo completo. Envía a `/v1/incidents/:id/actions` con la variante indicada y un timeout de prueba menor de 1500 ms, por ejemplo 300 ms. Ese valor sólo es una configuración de prueba.
4. Comprueba por lectura del servidor que el cambio sí quedó guardado aunque el cliente informó timeout. Mantén la operación pendiente hasta confirmar el resultado; no informes que definitivamente no ocurrió.
5. Reenvía exactamente la misma operación y verifica el sobre `{ incident, operationId, duplicate }`. El replay debe devolver `duplicate: true`, sin otra transición ni incremento adicional de versión/historial por esa misma operación.
6. Registra contadores antes/después de eventos, evidencias y notificaciones en las capas donde existan. Si el backend no implementa notificaciones, instrumenta el puerto real o un observador de prueba de la aplicación y declara ese alcance; no inventes un contador del servidor. Si el flujo genera una notificación, debe emitirse una sola vez.
7. Prueba la misma clave con contenido diferente: el servidor debe rechazarla con 409. Prueba además respuesta perdida seguida de reinicio de la app: la cola recupera clave y cuerpo; el servidor sigue vivo.

`npm run backend:self-test` comprueba el simulador y sirve como regresión, pero no sustituye una prueba que atraviese el cliente y la cola de CampusOps.

## 5. Pruebas y registro personal

| Caso propio | Observación que debes guardar |
|---|---|
| GET 429 con 800 ms | Plan exacto y ejecutor sin solicitud anticipada. |
| Timeout en intentos 1, 2, 3, 4 y 5 | Esperas progresivas; cero reintentos desde 4. |
| POST sin clave / con clave | Bloqueo seguro / reenvío conservando contenido. |
| Valores no finitos, negativos y configuración extrema | Demoras finitas, salida acotada y política explicada. |
| 403, 409, 422 | Error o conflicto visible sin repetición automática ciega. |
| Respuesta perdida y replay | Estado guardado, una sola mutación y efectos no duplicados. |
| Reinicio y reconexión | Misma identidad recuperada, sin perder operación pendiente. |

Antes de implementar escribe tu predicción. Después de crear las pruebas propuestas:

```powershell
npm test -- --runInBand tests/week9-retry.test.ts
npm test -- --runInBand course-tests/public/week-09.test.ts
npm run typecheck
npm run lint
npm run backend:self-test
```

Añade un archivo de pruebas de integración para la respuesta perdida y registra su comando exacto. Guarda salida y código de salida real, revisando los datos antes de subir logs. No marques una prueba como aprobada por lo que esperabas que ocurriera. Revisa también la prueba de Jarumi que demuestra captura manual tras un 429.

Tu aportación a `retry-metrics.json` debe incluir por escenario: intento, estado técnico, espera planificada, espera observada, duración, motivo de parada y conteos antes/después. Identifica si los tiempos son de reloj virtual o de una ejecución real; conserva ambos tipos de prueba con su alcance. Usa correlaciones sintéticas y `payloadUnchanged` comprobado, sin copiar tokens, cuerpos ni ubicaciones a la telemetría.

Entrega a Oscar tus commits propios, archivos, pruebas y resultados. La sección siguiente describe la consolidación común y el orden de cierre.

## 6. Documentos y evidencias del equipo

Los cinco entregables son obligatorios y describen la misma versión comprobada:

| Ruta | Contenido y responsable propuesto |
|---|---|
| `docs/resilience-policy.md` | Jarumi documenta proveedor, ejecución externa, caché y captura manual; Fernanda añade cuándo reintentar, detenerse o informar fallo. Oscar consolida. |
| `reports/week-09/fault-injection.json` | Fallos de ubicación y respuesta perdida tras guardar; ambas aportan casos con comandos y resultados reales. |
| `reports/week-09/retry-metrics.json` | Intentos, tiempos, límites y conteos de efectos; Fernanda aporta ejecutor/replay y Jarumi aporta caché/429. |
| `evidence/week-09/engineering.json` | Decisión técnica conjunta relacionada con requisitos y pruebas. |
| `evidence/week-09/individual.json` | Un solo archivo con exactamente tres integrantes y evidencia técnica propia de cada uno. |

Los reportes llevan `schemaVersion: 1`, `week: 9`, `commitSha` completo, `generatedAt` ISO 8601 y `checks`. Cada check lleva `id`, `status` (`pass`, `fail` o `not_applicable`), `scenarioType` (`nominal`, `boundary` o `failure`), `command` y `evidence`. Cada reporte incluye al menos un caso límite o de falla. Añadan métricas particulares del escenario como campos complementarios o archivos enlazados: el sobre mínimo no demuestra por sí mismo ausencia de duplicados.

No confundan el campo `evidence` del reporte, que es una descripción técnica requerida, con volcar evidencia de una incidencia. Saniticen los datos de transporte antes de construir el reporte. No registren autorización, tokens, coordenadas, referencias privadas ni texto libre sensible. Para métricas bastan IDs sintéticos, duración, estado, conteos y comparaciones comprobadas de igualdad.

`engineering.json` lleva `schemaVersion`, `week`, `commitSha`, `decision`, al menos dos `alternatives` distintas, `tradeoff`, `requirementIds` válidos entre AC-01 y AC-05 y `verification`. Cada verificación incluye `command`, `result` y `evidence`. Comparen alternativas concretas, por ejemplo fallar toda la captura frente a conservar ubicación manual, o repetir toda escritura frente a repetir sólo con identidad estable. Expliquen beneficio, costo y resultado observado; no escriban una justificación que contradiga el código.

`individual.json` lleva `schemaVersion: 1`, `week: 9`, `teamId` registrado y tres `members`. Cada persona completa `studentId`, `commitShas`, `files`, `tests`, `reviews`, `prediction`, `command`, `observedResult` y `explanation`. Incluyan al menos un SHA propio completo, un archivo técnico y una prueba o revisión. Los actores ficticios del simulador no son matrículas. No atribuyan commits ajenos ni completen observaciones sin ejecutar. Declaren asistencia material de IA y cómo verificaron sus resultados.

Para obtener datos reales:

```powershell
git rev-parse HEAD
(Get-Date).ToUniversalTime().ToString('o')
git log --format='%H %an %s' -10
```

Conserven logs sanitizados bajo `reports/week-09/logs/` y referencias reproducibles. Una captura complementa la evidencia, pero no sustituye una prueba ejecutable. No creen los JSON finales con placeholders ni copien resultados de una semana anterior. Los targets generan reportes del evaluador; no redactan por ustedes estos cinco entregables.

## 7. Integración, comprobación y entrega

Una sola persona coordina este cierre. Fernanda y Jarumi trabajan en ramas propias y PR; no hacen push directo a main ni crean etiquetas finales por separado. La base entregada debe quedar integrada en la rama principal registrada según las reglas del equipo. Completen esa integración antes de fijar los SHA de evidencias.

1. Integrar ambas partes con la cola y sesión anteriores. Probar captura manual desde la app, proveedor real, caché, 429, timeout, desconexión y replay tras guardar. Ejecutar regresiones de semanas 6 y 8; conservar todas las pruebas y no alterar expectativas para aparentar éxito.
2. Guardar código, configuración, pruebas y documentos —incluidas estas guías— en un commit técnico **A**. Obtener su SHA completo. Completar reportes y evidencias con `commitSha = A` y observaciones de esa versión.
3. Ejecutar y revisar por separado los checks oficiales:

```powershell
make feedback
make verify-week-09
make public-test-week-09
```

4. Si hay correcciones de código o documentación, guardar una nueva versión técnica A, actualizar las evidencias y repetir las comprobaciones correspondientes. No reutilizar el SHA de código anterior.
5. Guardar **un único commit final B**, hijo directo de A, que cambie exclusivamente `reports/` y `evidence/`. Revisar los archivos preparados antes de confirmar; agregar rutas explícitas y no usar `git add .` con trabajo ajeno pendiente. Los `commitSha` pueden apuntar a A porque B sólo contiene evidencias.

```powershell
git diff --cached --name-only
# Después de guardar el commit exclusivo de evidencias:
git diff --name-only HEAD~1 HEAD
git status --short
git tag --list week-09-final
```

6. Sin trabajo de entrega pendiente y sólo si la etiqueta no existe, el integrador crea la etiqueta en B y comprueba evidencias:

```powershell
git tag -a week-09-final -m "DMI week 09 final"
make evidence-week-09
```

7. Si falla, no enviar todavía. Corregir la causa y coordinar una nueva versión coherente. No sobrescribir una etiqueta ya entregada sin autorización docente. El reporte de esta última comprobación se conserva localmente: no crear otro commit sólo para añadirlo después de fijar la etiqueta.
8. Publicar la versión mediante el flujo de ramas/PR del equipo, conservando el commit B y su etiqueta; no usar squash/rebase después de fijar la entrega, porque cambiaría su identidad. El integrador publica la etiqueta cuando los checks pasan:

```powershell
git push origin week-09-final
git rev-list -n 1 week-09-final
git ls-remote origin refs/tags/week-09-final 'refs/tags/week-09-final^{}'
```

Confirmar en GitHub la versión y todos sus archivos, además de la etiqueta. Para etiqueta anotada, el SHA del commit corresponde a la referencia remota terminada en `^{}`; el objeto etiqueta tiene otro SHA.

El workflow nuevo ejecuta `evidence-week-09` también en ramas sin etiqueta y usa checkout sin configurar profundidad adicional. Si falla por etiqueta o historial faltantes, distinguirlo de una falla funcional; preparar el historial/tag de la versión correcta manteniendo las comprobaciones, sin desactivarlas. Identificar la causa no convierte un check fallido en aprobado.

Entrega en Classroom:

```text
Repositorio: https://github.com/Oscar71k1/DMI-Equipo-4
Etiqueta: week-09-final
SHA completo: [salida real de git rev-list -n 1 week-09-final]
```

El enlace se obtuvo de `git remote -v`; esta guía no acredita que la etiqueta ya esté publicada. El SHA final no se sustituye por el SHA de tu aportación individual. El bundle de Expo tampoco acredita por sí solo un APK instalado.

## 8. Calendario y criterio de terminado

| Fecha sugerida | Resultado |
|---|---|
| 28 de octubre | Verificar base integrada y paquete docente; acordar contratos y reparto. |
| 29 de octubre | Jarumi: adaptador/selector/caché. Fernanda: política y ejecutor de reintentos. |
| 30 de octubre | Interfaz manual, ejecución externa y caso de respuesta perdida. |
| 31 de octubre | Regresiones, pruebas conjuntas y revisión cruzada. |
| 1 de noviembre | Documentación, métricas y evidencia de los tres integrantes. |
| 2 de noviembre, con margen antes de las 23:59 | Checks, commit de evidencias, etiqueta, publicación y entrega. |

La actividad vale 8 puntos: AC-01 reproducción 2.5; AC-02 funcionamiento 2; AC-03 manejo de falla 1.5; AC-04 decisión justificada 1.5; AC-05 aportación individual 0.5. Los tres primeros suman 6 puntos automáticos; los dos últimos, 2 semiautomáticos. Los flags sólo solicitan corroboración y el nivel parcial no tiene un porcentaje fijo.

La rúbrica establece límites: falta de SHA/reproducción, flujo central ausente o exposición sensible pueden limitar a 4.8/8; sin evidencia individual, el máximo individual es 5.6/8. Si coinciden límites, se aplica el más restrictivo una sola vez. Consulten el texto completo de la rúbrica.

Antes de cerrar, cada integrante debe poder explicar su cambio, reproducir su prueba y señalar dónde se registra su resultado. La entrega está lista cuando la app conserva utilidad ante fallos, el reintento está acotado, la misma operación no duplica efectos y toda la evidencia corresponde a la versión etiquetada.
