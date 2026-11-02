# Guía de Jarumi — Semana 09

Tu parte propuesta es integrar geocodificación mediante un adaptador con caché y mantener la captura manual cuando el proveedor falle. Continúas el trabajo de almacenamiento de semana 8. Fernanda se encarga de reintentos e idempotencia; Oscar coordina integración y cierre.

Actualizada el 28 de octubre de 2026. Entrega: **2 de noviembre de 2026, 23:59, hora de Ciudad de México**. Esta guía describe tareas pendientes y comprobaciones a ejecutar; no acredita una implementación terminada. El reparto y las rutas nuevas son propuestas del equipo.

## 1. Material revisado y preparación

Lee [actividad](assignments/week-09.md), [entrega](assignments/week-09-repository.md), [rúbrica](assignments/week-09-rubric.md), [API](CAMPUSOPS_API.md), [CampusOps](CAMPUSOPS.md), [evidencias](EVIDENCE_CONTRACT.md) e [instalación](../INSTALL.md).

La captura muestra `course-tests/`, `docs/` e `INSTALL.md`; no permite inspeccionar todos los archivos del ZIP. Se revisaron sus equivalentes locales y `.github/workflows/week-09-integracion-resiliente-feedback.yml`. Incluyan también `.github`, como exige el instructivo, aunque no aparezca en la captura. Combinen carpetas sin borrar historial, reemplazar el proyecto ni sobrescribir cambios propios.

En este checkout, `selectIncidentLocation` y `planRetry` aún llaman a `pending(...)`. Hay cuatro pruebas públicas: validación/fallback, POST con clave ante timeout, GET 429/límite y POST sin clave. Pasarlas no demuestra caché, interfaz ni funcionamiento de un proveedor real. El diff de la prueba y del contrato no mostró cambios de contenido respecto a HEAD; no hay una comparación verificada contra otro ZIP anterior.

La rama local revisada es `week5/fix-evidence-sha`, SHA `92eb23eafaec287813149c73a47b72fd1c19c209`, con trabajo sin guardar. No asumir que contiene la entrega integrada de semanas 6 y 8. No reutilizar como vigente el SHA de una guía anterior. Primero acuerden y comprueben la base actual con cola durable, sesión y sincronización; esta revisión no consultó cambios remotos.

En tu propio clon:

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

Usa Node 22.22.0 y dependencias fijadas. Guarda cambios pendientes en su rama antes de cambiar de base. Desde la base integrada acordada crea `codex/jarumi-semana-09` y ejecuta `make setup`. Si Windows sólo reconoce `python`, usa por ejemplo `make verify-week-09 PYTHON=python`; no cambies el evaluador para esconder problemas de entorno.

## 2. Reparto y puntos de integración

| Responsable propuesto | Alcance |
|---|---|
| Jarumi | Adaptador real y doble controlado, caché, selección de ubicación, captura manual y pruebas. |
| Fernanda | Política/ejecutor de reintentos, misma identidad de operación y respuesta perdida. |
| Oscar | Composición, contratos compartidos, regresiones, consolidación y entrega con aportación técnica propia. |

Propón `src/domain/LocationProvider.ts`, `src/infrastructure/GeocodingAdapter.ts`, `src/application/selectIncidentLocation.ts` y `tests/week9-location.test.ts`. Reutiliza componentes existentes cuando corresponda; estos nombres aún no representan archivos implementados. El formulario existente es `src/ui/IncidentCreateForm.tsx`. Coordina su conexión con `src/composition/createCampusOps.ts`.

Oscar consolida `src/course-evaluation/index.ts` para que delegue en la misma lógica que usa el formulario. Fernanda entrega el plan y ejecutor común de reintentos: no construyas otro bucle en el adaptador. Acuerden quién modifica dependencias si son necesarias y no cambien ambos el lockfile.

## 3. Selección y captura manual

1. Implementa `selectIncidentLocation(provider: unknown, manualLabel: string)` con la firma publicada y `IncidentLocation` existente. No confíes en un cast de TypeScript para validar JSON.
2. Acepta únicamente un objeto con `label` textual no vacío, latitud numérica finita entre -90 y 90 y longitud numérica finita entre -180 y 180. El cero es válido: no uses comprobaciones de verdad/falsedad para coordenadas.
3. Devuelve `{ source: 'provider', label, latitude, longitude }` cuando sea válido. Para null, error como dato, objeto incompleto, tipos incorrectos o coordenadas inválidas, devuelve exactamente `{ source: 'manual', label: manualLabel }`, sin coordenadas inventadas.
4. El contrato presupone una etiqueta manual no vacía. Valida en la interfaz edificio, zona o referencia antes de continuar; muestra un mensaje si sólo hay espacios. Define y prueba cómo manejas espacios del proveedor sin alterar arbitrariamente el texto manual esperado por el contrato.
5. Permite introducir la ubicación manual sin esperar a que todos los reintentos terminen. Conserva el texto si hay timeout, 429 o desconexión. Ignora respuestas tardías que intentarían sustituir la elección manual del usuario.
6. Lleva la ubicación elegida hasta la creación real de la incidencia. El backend publica `location` textual: proyecta la etiqueta al formato aceptado y conserva los metadatos adicionales sólo donde el modelo acordado los soporte. Una nueva propiedad en la pantalla no demuestra que se haya guardado.

## 4. Adaptador, caché y ejecución externa

1. Seleccionen un proveedor real de mapas o geocodificación; basta uno. Antes de integrarlo consulten su documentación oficial vigente y documenten URL, fecha, atribución, límites, términos de caché y restricciones. Esta guía no certifica un proveedor ni sus cuotas actuales.
2. Aísla el HTTP y transforma su respuesta en el contrato de CampusOps. Configura URL, timeout y transporte para poder usar el proveedor real y el doble docente por separado. No envíes `X-Course-Actor` ni las cabeceras del backend docente al servicio externo.
3. Captura rechazo de conexión, HTTP 429, JSON inválido y timeout como resultado no disponible. Implementa cancelación con `AbortController` y limpieza del temporizador. Un `Promise.race` que deja peticiones vivas no demuestra cancelación.
4. Añade caché con clave normalizada que contemple proveedor y parámetros relevantes. Define TTL, máximo de entradas, política de expulsión y qué ocurre al expirar, conforme a las restricciones del proveedor. Son decisiones que deben quedar documentadas, no valores exigidos por el docente.
5. Cachea únicamente respuestas válidas según la política elegida. No conviertas un error en una ubicación válida ni guardes coordenadas fabricadas. Evita llamadas duplicadas concurrentes para la misma consulta; si usas datos vencidos, identifícalos y documenta cuándo se permiten.
6. Prueba que una consulta repetida antes de vencer usa caché y no llama otra vez al transporte; al expirar, vuelve a consultar. Comprueba también entrada inválida, límite de entradas y consultas concurrentes. Usa un reloj controlado para estas pruebas.
7. Ejecuta una consulta externa real desde el adaptador integrado, con una incidencia sintética y sin personas o domicilios privados. Una consulta ficticia puede no tener coincidencias; registra honestamente ese resultado. Guarda proveedor, fecha, comando, código de respuesta, alcance y evidencia sanitizada. El doble local no sirve como evidencia externa.
8. No provoques fallos agotando cuotas de terceros. Los fallos reproducibles se hacen con el doble local y transporte controlado.

## 5. Matriz de fallos y pruebas

Inicia `npm run backend` en otra terminal. El doble es `GET /v1/geocoding?q=...`, con cabeceras de actor y autorización del contrato. En escritorio usa `http://127.0.0.1:4310`; en emulador Android, `http://10.0.2.2:4310`. No expongas el simulador a Internet.

| Caso | Cómo reproducirlo | Resultado a comprobar |
|---|---|---|
| Éxito | `X-Course-Scenario: success` | Ubicación de proveedor; `(0, 0)` válido. |
| Incompleto | `incomplete` o `nullable` | Captura manual conservada, sin coordenadas. |
| Inválido | `invalid_coordinates` | Rechazo seguro de coordenadas. |
| JSON incorrecto | `malformed` | Error capturado y alternativa manual. |
| Timeout | `slow`, que demora 1200 ms, con timeout de prueba menor, por ejemplo 200 ms | Cancelación real y formulario utilizable. |
| Límite | `rate_limited` | 429 con Retry-After de 1 s; coordinar con Fernanda espera o alternativa. |
| Desconexión | Transporte inyectado que rechaza, y prueba de app sin red | Sin cierre inesperado ni pérdida del texto manual. |
| Caché | Repetir consulta y después avanzar reloj más allá del TTL | Conteos de llamadas y expiración verificables. |

No existe una variante publicada llamada `disconnect`: no la inventes como cabecera docente. Para la desconexión usa rechazo controlado de transporte y una ejecución sin red documentada. `nullable` del doble devuelve un objeto incompleto; añade una prueba unitaria explícita con null.

Añade límites exactos ±90/±180, fuera de rango, `NaN`, infinito, números como cadenas, arrays y etiqueta vacía. Comprueba que la función no muta la entrada. Añade una prueba de interfaz que escriba ubicación manual tras la falla y verifique el valor que llega al repositorio.

Escribe tu predicción antes de ejecutar. Una vez creadas las pruebas propuestas:

```powershell
npm test -- --runInBand tests/week9-location.test.ts
npm test -- --runInBand course-tests/public/week-09.test.ts
npm run typecheck
npm run lint
npm run backend:self-test
```

Registra además el comando de tu prueba de interfaz y la ejecución real del adaptador. No mezcles resultados observados con resultados esperados. Los datos ficticios del doble son pruebas controladas, no geocodificación externa.

Tu parte de `fault-injection.json` debe identificar escenario, comando, respuesta de CampusOps, caché usada o no, resultado de fallback y referencia al log sanitizado. Revisa con Fernanda el caso conjunto: 429 no dispara solicitudes inmediatas y la app permite captura manual durante la espera.

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
