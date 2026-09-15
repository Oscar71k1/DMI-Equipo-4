# Guía de Jarumi — Semana 02: decidir, dibujar y comprobar la arquitectura

Jarumi, tu trabajo es convertir la arquitectura en una decisión que se pueda explicar y comprobar: revisar el ADR, dibujar las responsabilidades, crear una prueba que inspeccione dependencias reales y documentar una contradicción antes y después de corregirla. Fer construirá el esqueleto que contrastarás con ese diseño. Tu aportación incluye una prueba técnica y análisis propio; no termina al dibujar cuatro cajas.

**Esta es una guía para realizar el trabajo, no evidencia de que ya se hizo.** Los nombres de archivos nuevos y la organización propuesta son acuerdos de trabajo para ustedes; el curso permite otras estructuras equivalentes. No se presentan resultados de pruebas todavía no ejecutadas.

**Rama propuesta:** `codex/semana-02-jarumi`. **Entrega de la actividad:** 14 de septiembre de 2026, 23:59, hora de Ciudad de México. **Quiz individual:** Semana 2 — Arquitectura y patrones, 3 preguntas y 3 puntos aparte de los 8 de la actividad.

## 1. Lee esto primero y entiende el objetivo

Lee los archivos en este orden:

1. [ACLARACION_ANTES_DE_INICIAR.md](../ACLARACION_ANTES_DE_INICIAR.md), completo y antes de modificar algo.
2. [Actividad de Semana 02](assignments/week-02.md), equivalente local de `ACTIVITY_STUDENT_FACING.md`.
3. [Preparación y entrega](assignments/week-02-repository.md), equivalente local de `STARTER_AND_REPOSITORY.md`.
4. [Rúbrica de Semana 02](assignments/week-02-rubric.md), equivalente local de `RUBRIC_PUBLIC.md`.
5. [Caso CampusOps](CAMPUSOPS.md), [contrato de evidencias](EVIDENCE_CONTRACT.md) y [ADR existente](adr/ADR-001-architecture.md).

Las guías de Semana 01 quedan como historial. Esta semana tu tarea ya no consiste en analizar un riesgo de reasignación: consiste en comprobar la separación de responsabilidades.

El resultado mínimo de la app es **una lista de incidencias ficticias y el detalle de la incidencia seleccionada**. Debe ser posible cambiar quién proporciona esos datos sin reescribir pantallas y casos de uso. Continúan en el mismo repositorio con React Native, Expo y TypeScript; no elijan de nuevo el stack ni creen otro proyecto.

Sesión, persistencia, ubicación y los tres perfiles deben quedar localizados en el diseño. No se pide implementar autenticación, permisos, base de datos, mapas, cola offline ni integraciones reales nuevas esta semana. Conservar la comprobación de salud heredada tampoco significa conectar las incidencias a un backend real.

## 2. Tu reparto con Fer

| Parte | Tu responsabilidad | Coordinación con Fer |
|---|---|---|
| Decisión | Revisar y completar `docs/adr/ADR-001-architecture.md`. | Acordar contratos antes de implementar. |
| Dibujo | Crear `docs/architecture.mmd` y ajustarlo al código final. | Confirmar rutas y dependencias realmente utilizadas. |
| Prueba de arquitectura | Crear `tests/architecture.test.ts` que lea el código real. | Comunicar qué import viola qué regla y verificar su corrección. |
| AC-03 | Registrar el antes y después en `reports/week-02/dependencies.json`. | Fer corrige el esqueleto; tú vuelves a ejecutar el detector. |
| Justificación | Completar `evidence/week-02/engineering.json` con observaciones verificadas. | Incorporar resultados del esqueleto con su procedencia. |
| Evidencia personal | Completar sólo tu registro en `evidence/week-02/individual.json`. | El archivo final tiene exactamente tres integrantes. |

Tus logs pueden vivir en `reports/week-02/logs/jarumi-*.txt`. Son apoyo para los JSON obligatorios. No hace falta crear otro documento narrativo si el ADR y el reporte ya explican lo necesario.

Fer trabaja principalmente en `src/domain/`, `src/application/`, `src/infrastructure/`, `src/ui/`, `src/composition/`, `App.tsx` y `tests/incidents.test.tsx`. Consulta [su guía](GUIA_FERNANDA_SEMANA_02.md) para entender los puntos de entrega entre ustedes. Eviten editar simultáneamente el mismo JSON.

## 3. Preparar tu copia sin perder trabajo

Usa tu copia del repositorio `https://github.com/Oscar71k1/DMI-Equipo-4`. Si aún no tienes una, clónalo; clonar una copia del mismo repositorio no es reiniciar el proyecto:

```powershell
git clone https://github.com/Oscar71k1/DMI-Equipo-4.git DMI-Equipo-4-Jarumi
cd DMI-Equipo-4-Jarumi
```

Si ya tienes una copia, abre su carpeta y revisa primero:

```powershell
git status --short
git branch --show-current
git remote -v
```

Conserva y revisa cualquier cambio pendiente antes de actualizar o cambiar de rama. No uses borrados, `reset --hard` ni sustituciones masivas para limpiar la carpeta.

Confirma que el paquete de Semana 02 esté integrado, incluidos `ACLARACION_ANTES_DE_INICIAR.md`, `docs/assignments/week-02*` y `.github/workflows/week-02-arquitectura-justificable-feedback.yml`. Si falta, sigue `INSTALL.md` combinando carpetas y revisando conflictos; no sobrescribas a ciegas trabajo existente. En la copia usada para redactar esta guía había archivos del paquete aún sin seguimiento de Git: tenerlos en disco no significa que ya estén en GitHub.

Configura tu identidad local con tus datos reales, nunca los de otra persona:

```powershell
git config user.name "TU NOMBRE DE AUTOR"
git config user.email "TU CORREO DE AUTOR"
git config user.name
git config user.email
```

Comprueba Node.js **22.22.0**, npm, Git, GNU Make y Python 3, según la guía oficial. Usa `nvm use 22.22.0` sólo si tienes nvm instalado. Con tu árbol de trabajo revisado y sin cambios que interfieran:

```powershell
git switch main
git pull --ff-only origin main
git switch -c codex/semana-02-jarumi
make setup
make feedback
```

Si tu rama ya existe, usa `git switch codex/semana-02-jarumi`. Ejecuta los comandos uno por uno y comprueba el resultado antes de seguir. Un fallo de instalación o de `make feedback` requiere diagnóstico; no equivale automáticamente a la contradicción arquitectónica de AC-03.

En Windows, si `python3` no está disponible pero `python --version` devuelve Python 3, puedes ejecutar los objetivos semanales con `make PYTHON=python verify-week-02`, y análogamente los otros objetivos. Registra el comando que realmente usaste. Los problemas de entorno ya conocidos se explican en [entorno-windows.md](entorno-windows.md); no cambies dependencias para esconderlos.

## 4. Entender las cuatro responsabilidades

Imagina que una persona toca una incidencia:

1. **UI:** recibe el toque y muestra el detalle. No sabe si los datos vienen de memoria o de un servidor.
2. **Application:** ejecuta la acción «obtener incidencia por identificador» y pide datos a un contrato.
3. **Domain:** define qué es una incidencia y qué operaciones promete ese contrato.
4. **Infrastructure:** proporciona una implementación del contrato. Ahora responde con datos ficticios estables en memoria.

El **contrato o puerto** es la promesa de operaciones. El **adaptador** cumple esa promesa. La **inyección** consiste en entregar la implementación al crear el caso de uso, en vez de construirla dentro de él. La **raíz de composición** es el lugar que conecta esas piezas al iniciar la app.

La dirección de los imports esperados es:

```text
UI             -> application
application    -> domain
infrastructure -> domain
composition    -> application + infrastructure
App.tsx        -> UI + composition   (sólo montaje)
```

UI también puede usar tipos puros de dominio si así lo acuerdan y documentan. Dominio no importa UI, application, infrastructure, React, Expo, HTTP ni almacenamiento. Application no importa una implementación concreta de infrastructure. UI no llega a infrastructure por un archivo intermedio que vuelva a exportarla.

**Una flecha de dependencia no representa el viaje de una respuesta.** Los datos pueden regresar desde el fake a la pantalla durante la ejecución, pero eso no permite dibujar un import `application -> infrastructure` si la aplicación sólo conoce el puerto del dominio.

## 5. Revisar el ADR y acordar el contrato con Fer

Ya hay un borrador en `docs/adr/ADR-001-architecture.md`. Léelo y mejora sus razones; no te atribuyas todo su contenido previo como aportación nueva.

Debe comparar al menos estas dos alternativas internas, u otras dos realmente distintas:

| Criterio | Capas globales: UI, application, domain, infrastructure | Organización por funcionalidad con capas internas |
|---|---|---|
| Facilidad de prueba | Los casos de uso se prueban inyectando un puerto; los límites se revisan por carpeta. | También admite puertos y pruebas; hay que controlar dependencias entre funcionalidades. |
| Complejidad actual | Pocas divisiones para una lista y un detalle; una función queda repartida en varios archivos. | Agrupa una función, pero añade decisiones sobre carpetas y contratos compartidos. |
| Cambio de proveedor | Se reemplaza el adaptador y se ajusta composición si el contrato sigue siendo compatible. | Igual posibilidad, con atención a los adaptadores compartidos entre funcionalidades. |

No afirmes que la segunda alternativa es imposible de probar. Explica por qué la primera, propuesta en el ADR actual, tiene un costo razonable **para el tamaño actual de CampusOps**. Incluye contexto, alternativas, decisión, consecuencias, beneficio/costo y cuándo revisarían esa decisión. Cambiar proveedor no es gratis: aún exige adaptación de datos, manejo de errores y pruebas del nuevo adaptador.

Antes de que Fer implemente, acuerden por escrito en el ADR:

- Qué campos mínimos tiene una incidencia, reutilizando el vocabulario de `src/campusops/contracts.ts` cuando corresponda.
- Que `list()` devuelve una promesa de una lista de incidencias y `getById(id)` una promesa de una incidencia o `null`.
- Que una lista vacía es un resultado válido y un identificador inexistente produce `null`, no un detalle inventado.
- Qué mensaje mostrará la UI para lista vacía, no encontrada o error.
- Dónde estará la composición y cómo se conservará el indicador de salud heredado a través de un contrato.
- Cómo se clasifica `src/campusops/contracts.ts`: vocabulario de dominio compartido, aunque su ruta original se conserve.

Es un contrato propuesto, no código que ya exista. Si acuerdan otra forma equivalente, actualicen ambas implementaciones, pruebas y documentos de forma consistente.

## 6. Dibujar la solución completa, sin fingir funciones futuras

Crea `docs/architecture.mmd` como texto Mermaid, sin envolver su contenido en bloques Markdown. Usa los nombres literales **UI, application, domain, infrastructure** y flechas dirigidas.

Incluye:

- Pantalla de lista y pantalla de detalle dentro de UI.
- Casos de uso de consulta dentro de application.
- Modelo y puerto de incidencias dentro de domain.
- Fake de incidencias en memoria dentro de infrastructure.
- Composición como pieza separada que construye adaptadores y los entrega a aplicación/UI.
- Los perfiles **reportante (`reporter`), técnico (`technician`) y coordinador (`coordinator`)**.
- Límites previstos de **sesión, persistencia y ubicación/proveedores**, marcados expresamente «previsto; no implementado en Semana 02».
- El indicador de salud heredado, su caso de uso/puerto y su adaptador si permanecen en la app.

Usa una leyenda que distinga dependencias de código, relaciones de uso de los perfiles y límites futuros. Las líneas de los perfiles no significan que exista autorización implementada. No inventes un archivo de sesión, almacenamiento o ubicación que aún no está en el repositorio. La información guardada en memoria se pierde al reiniciar; no es persistencia real.

Anota rutas reales en los componentes implementados. Si conservan `src/api/courseBackend.ts`, clasifícalo como infraestructura heredada y muestra su relación real. El diagrama debe explicar esa dependencia; no basta con ocultarla cambiando de nombre una carpeta.

## 7. Crear una prueba de arquitectura que revise imports

**Hallazgo de esta copia:** `course-tests/public/week-02.test.ts` comprueba palabras en el diagrama y en el ADR y busca una flecha prohibida en el texto del diagrama. No recorre los imports TypeScript. Por eso su aprobación sola no demuestra que el código respete los límites.

Crea `tests/architecture.test.ts` como prueba adicional del equipo, sin alterar las pruebas públicas. El nombre es una propuesta que deben conservar en los comandos de esta guía o ajustar de forma consistente si lo cambian.

El curso pide una prueba **básica** de arquitectura. Basta con comprobar los límites acordados sobre las formas de importar que existan en este repositorio y demostrar que detecta una infracción real. El parser de TypeScript es una opción de implementación; no necesitan construir un analizador universal ni admitir sintaxis o alias que el proyecto no utiliza. Documenten el alcance de su detector.

La prueba debe:

1. Leer los archivos `.ts` y `.tsx` de producción y el punto de entrada `App.tsx`; excluir dependencias instaladas, archivos generados y pruebas.
2. Extraer imports y reexportaciones reales; preferir el parser de TypeScript ya disponible frente a una búsqueda de texto frágil. Incluir imports de tipos, reexportaciones y, si aparecen, `require` o imports dinámicos literales.
3. Resolver rutas relativas, archivos `index` y los alias que realmente use el proyecto. Un alias no debe ocultar un acceso prohibido.
4. Clasificar cada origen y destino por responsabilidad. Incluir `src/api/` como infraestructura heredada y `src/campusops/contracts.ts` como dominio compartido.
5. Rechazar UI hacia infraestructura, aplicación hacia infraestructura y dominio hacia capas externas o SDKs. Detectar también accesos a red/almacenamiento en UI/application y atajos mediante reexportaciones.
6. Permitir imports internos de la misma capa y la composición explícita, sin dar permiso a una pantalla de importar composición para conseguir el adaptador.
7. Informar archivo origen, import/destino y regla violada; fallar con una aserción real si encuentra una infracción.

**Atención a `App.tsx`:** actualmente contiene presentación y un import directo de `src/api/courseBackend`. Mientras tenga esa lógica visual, cuenta como UI y la infracción debe detectarse. Sólo puede tratarse como montaje cuando Fer extraiga las pantallas y lo deje con esa única responsabilidad. No lo excluyas para conseguir un resultado verde.

Puedes usar fixtures temporales creados por la prueba para verificar que detecta una arista prohibida, sin modificar archivos de producción durante cada ejecución. Esos casos complementan la comprobación de los imports reales; una prueba que sólo inspeccione un arreglo de dependencias escrito a mano no cumple el objetivo.

Comando propuesto, ejecutable **después de crear la prueba**:

```powershell
npm test -- --runInBand --runTestsByPath tests/architecture.test.ts
```

Además de la prueba, registra el inventario inspeccionado: por ejemplo, pares de origen/destino con sus capas en `dependencies.json`. El formato mínimo oficial no prescribe un nombre para ese campo extra; pueden llamarlo `edges`. Debe proceder del escaneo o de una revisión real, no copiar las flechas deseadas del diagrama.

## 8. AC-03: observar la contradicción y comprobar su corrección

La contradicción debe ser arquitectónica. Repetir el experimento de Semana 01 cambiando `available` por `offline` no demuestra una dependencia prohibida esta semana.

### A. Prepara el experimento antes de la corrección

Coordina con Fer para capturar la versión anterior antes de que quite el import. Revisa `App.tsx`: en la copia inicial importa `getBackendHealth` directamente desde `./src/api/courseBackend` y además dibuja la interfaz.

En tu evidencia anota primero tu predicción: «La prueba detectará que la pantalla conoce un cliente de infraestructura; espero un error que identifique ese import». Describe el efecto: cambiar ese proveedor afecta la pantalla y obliga a conocer sus detalles para probarla.

Registra el SHA de origen y el estado local. Si hay cambios sin commit, consérvalos en un diff revisado para que el experimento pueda reconstruirse. Crea la carpeta de logs:

```powershell
New-Item -ItemType Directory -Force -Path reports/week-02/logs
git rev-parse HEAD
git status --short
npm test -- --runInBand --runTestsByPath tests/architecture.test.ts 2>&1 | Tee-Object -FilePath reports/week-02/logs/jarumi-arquitectura-antes.txt
$jarumiBeforeExit = $LASTEXITCODE
Add-Content -LiteralPath reports/week-02/logs/jarumi-arquitectura-antes.txt -Value "EXIT_CODE=$jarumiBeforeExit"
```

Para AC-03, lo esperado aquí es una aserción fallida **por la dependencia concreta** y código distinto de 0. Un error de sintaxis de tu test o una herramienta ausente no sirve como esa evidencia. Si pasa, revisa si Fer ya corrigió la dependencia o si tu detector está incompleto.

Si el código ya fue corregido, no inventes una falla histórica. Acuerden una infracción temporal y reversible en una copia de desarrollo, guarda el diff exacto, ejecuta el detector y restaura sólo ese cambio. Por ejemplo, un import real UI → fake de infraestructura que el detector deba rechazar. No subas la app con la infracción activa ni modifiques el test para provocarla artificialmente.

### B. Fer corrige; tú explicas por qué

Comparte con Fer el archivo, el import, la salida y la regla del ADR. La corrección acordada debe separar presentación, caso de uso, puerto y adaptador. Mover la llamada a un archivo que la pantalla sigue usando como cliente directo no resuelve el límite.

Conserva el diff de la corrección o las referencias de Git que permitan ver los cambios. Distingue **síntoma** —la prueba denuncia una arista prohibida— de **causa** —la pantalla importa un cliente concreto— y **efecto** —acopla presentación al proveedor—.

### C. Repite el mismo detector sobre el código corregido

Cuando los cambios de Fer estén disponibles en tu copia:

```powershell
npm test -- --runInBand --runTestsByPath tests/architecture.test.ts 2>&1 | Tee-Object -FilePath reports/week-02/logs/jarumi-arquitectura-despues.txt
$jarumiAfterExit = $LASTEXITCODE
Add-Content -LiteralPath reports/week-02/logs/jarumi-arquitectura-despues.txt -Value "EXIT_CODE=$jarumiAfterExit"
npm run test:smoke
```

El detector debe pasar con código 0 y el smoke heredado también. Verifica que la lista/detalle de Fer sigan funcionando. Guarda el resultado real, incluso si contradice tu predicción. Un resultado fallido después de corregir significa que aún hay trabajo pendiente.

## 9. Completar `dependencies.json` y `engineering.json`

`reports/week-02/dependencies.json` debe contener los siguientes campos:

| Campo | Contenido |
|---|---|
| `schemaVersion` | Número `1`. |
| `week` | Número `2`. |
| `commitSha` | SHA completo de la versión final de código comprobada; revisa la regla de cierre del paso 12. |
| `generatedAt` | Fecha/hora real ISO 8601. Puedes obtenerla con `(Get-Date).ToUniversalTime().ToString('o')`. |
| `checks` | Lista de observaciones con `id`, `status`, `scenarioType`, `command`, `evidence`. |

Incluye al menos estas observaciones, con identificadores diferentes:

| Observación | `status` si realmente ocurrió | `scenarioType` | Evidencia necesaria |
|---|---|---|---|
| Antes de corregir | `fail` | `failure` | Import prohibido, salida/código real, ruta del log y referencia al estado anterior. |
| Después de corregir | `pass` | `nominal` | Mismo detector, salida/código real, ruta del log y explicación del cambio. |
| Límite del detector, si lo ejecutaste | Según observación real | `boundary` | Caso que demuestra que una dependencia prohibida no pasa inadvertida. |

El `fail` histórico describe lo detectado durante el desarrollo; no significa que deba permanecer un fallo en la app final. No lo cambies a `pass` sólo porque ese fallo era esperado. Añade junto a las observaciones la causa, el efecto, la corrección, las dependencias inspeccionadas y la referencia al diff/estado anterior. El `commitSha` principal describe la versión corregida; identifica el estado anterior por separado.

`evidence/week-02/engineering.json` debe tener:

- `schemaVersion: 1`, `week: 2`, `commitSha` válido.
- `decision`: conclusión específica sobre la arquitectura de CampusOps.
- `alternatives`: lista de al menos dos textos sustantivos y diferentes, coherentes con el ADR.
- `tradeoff`: texto que explique el beneficio y el costo aceptado, incluyendo testabilidad, complejidad y sustitución de proveedor.
- `requirementIds`: lista de criterios relacionados, usando exclusivamente identificadores `AC-01` a `AC-05`; no declares cobertura de uno que no justificas.
- `verification`: lista de objetos con `command`, `result` y `evidence`, todos con contenido real.

Relaciona la decisión con la prueba de sustitución de Fer y con tu detector. Si citas un log de Fer, identifica que procede de su ejecución; tu registro individual sólo debe atribuirte lo que tú ejecutaste o revisaste. Declara la asistencia material de IA y cómo revisaron su resultado, como pide la guía oficial.

## 10. Guardar tu aporte y tu evidencia individual

Puedes compartir un primer commit del ADR, diagrama y prueba con Fer para que implemente el acuerdo. Al final actualiza los documentos con el código real y sus resultados. No hace falta publicar un estado con una infracción temporal activa.

Antes de cada commit revisa archivos nuevos y cambios:

```powershell
git status --short
git diff --check
git diff -- docs/adr/ADR-001-architecture.md docs/architecture.mmd tests/architecture.test.ts
```

Agrega por rutas tus archivos técnicos existentes, revisa lo preparado y guarda con tu identidad:

```powershell
git add -- docs/adr/ADR-001-architecture.md docs/architecture.mmd tests/architecture.test.ts
git diff --cached --stat
git diff --cached
git commit -m "test: documentar y comprobar arquitectura con Jarumi"
git rev-parse HEAD
git show --stat --format=fuller HEAD
```

Conserva el SHA completo de tu aportación técnica. En `evidence/week-02/individual.json`, usa `schemaVersion: 1`, `week: 2`, `teamId` oficial y exactamente tres objetos en `members` para el equipo.

**Identifica tu objeto por tu `studentId` real**, no por una posición supuesta. No inventes los identificadores ni completes los resultados de otras personas. Si el archivo aún no existe, acuerden su creación y que cada integrante proporcione su registro; seguirá pendiente hasta contener los tres aportes reales. No reutilicen las pruebas y predicciones de Semana 01 como si fueran nuevas.

| Tu campo | Qué escribir |
|---|---|
| `studentId` | Tu identificador registrado con el docente. |
| `commitShas` | Lista con al menos tu SHA técnico real de 40 caracteres. |
| `files` | Archivos de tu aporte, incluida la prueba de arquitectura. |
| `tests` | Comandos que ejecutaste y contexto de antes/después. |
| `reviews` | Qué contrastaste entre ADR, dibujo e imports y tu conclusión. |
| `prediction` | Lo que escribiste antes de ejecutar el detector. |
| `command` | Comando exacto de tu comprobación. |
| `observedResult` | Salida relevante, pruebas aprobadas/fallidas y código real. |
| `explanation` | Por qué ocurrió, cómo se corrigió y qué no demuestra el detector. |

`tests` y `reviews` son listas; al menos una debe tener contenido. El resto de los campos narrativos son textos. El detector no demuestra por sí solo que todas las reglas de negocio ni los futuros proveedores funcionen.

Para revisar sintaxis, ejecuta sólo cuando los tres JSON ya existan:

```powershell
python -c "import json; from pathlib import Path; paths=['reports/week-02/dependencies.json','evidence/week-02/engineering.json','evidence/week-02/individual.json']; [json.loads(Path(p).read_text(encoding='utf-8')) for p in paths]; print('Sintaxis JSON valida')"
```

Esto sólo verifica sintaxis; no confirma identidad, SHA, veracidad ni cobertura. Guarda los archivos JSON como UTF-8 sin BOM. Revisa el diff de tu registro y guarda tus evidencias en un commit separado cuando corresponda al flujo de integración.

## 11. Compartir cambios con Fer sin pisarse

Secuencia propuesta:

1. Comparte ADR y contratos acordados; Fer puede iniciar el esqueleto.
2. Captura la contradicción original antes de que se corrija; comparte el detector y el hallazgo.
3. Fer entrega su implementación y resultados de lista/detalle.
4. Integra en tu copia la versión revisada, vuelve a ejecutar el detector y ajusta dibujo/ADR.
5. Completa los reportes usando esa versión real, no un árbol anterior.

Usen pull requests hacia la rama principal registrada (`main` en estas guías). Cuando debas incorporar cambios ya integrados, con el árbol limpio puedes ejecutar `git fetch origin` y `git merge origin/main` desde tu rama. Si hay conflicto, combina lo necesario y vuelve a probar; no aceptes todos los cambios de un lado a ciegas.

Publica tu rama después de guardar tu aporte y evidencia revisada:

```powershell
git push -u origin codex/semana-02-jarumi
```

Tu pull request debe describir decisión, archivos, comandos/resultados, SHA técnico y pendientes. Conserva la trazabilidad de los commits usados en `individual.json`; si se cambia la estrategia de integración, comprueben que sus SHAs y autorías sigan siendo verificables. No uses `push --force` como forma rutinaria de resolver conflictos.

## 12. Comprobación final que deben entender ambas

La entrega es del equipo de tres. Tus documentos, los de Fer y el código deben describir una misma versión. La ausencia del tercer registro real no se resuelve inventándolo.

Con los cinco archivos obligatorios completos, ejecuten y conserven salidas de:

```powershell
make feedback
make verify-week-02
make public-test-week-02
```

También ejecuten sus pruebas nuevas de arquitectura y de incidencias explícitamente: no supongan que un objetivo del curso las incluye sólo por existir.

La regla oficial de SHA evita una autorreferencia imposible: primero se guarda **todo el código, configuración y documentos**, se consulta su SHA y se usa en los reportes. Luego se guarda un único commit final que sólo cambie `reports/` y `evidence/`. El SHA reportado puede ser HEAD o su padre directo si HEAD sólo contiene evidencias. Después de integrar ramas, los SHAs generales pueden quedar antiguos: hay que comprobar y actualizar sobre la versión integrada. Los SHAs de aportación personal identifican sus commits técnicos, no tienen que ser el SHA final.

La etiqueta conjunta es `week-02-final`. `make evidence-week-02` se ejecuta **después de crearla**, nunca como requisito para que una contribución individual inicial pueda existir. El reporte local que genere ese último comando no obliga a crear otro commit tras etiquetar. Para el cierre completo sigan [la secuencia oficial](assignments/week-02-repository.md); no creen ni muevan la etiqueta por separado en cada rama.

En Classroom se entrega enlace del repositorio, `week-02-final` y SHA completo de la etiqueta. Deben estar publicados en GitHub. Un workflow durante el desarrollo puede señalar archivos o etiqueta todavía pendientes: conserven el mensaje y distingan ese pendiente de un fallo real de implementación; no alteren el workflow para ocultarlo.

## 13. Lista de revisión y explicación personal

- [ ] Puedo explicar dos alternativas sin volver a elegir el stack.
- [ ] El ADR explica testabilidad, complejidad, cambio de proveedor y consecuencias.
- [ ] El diagrama contiene las cuatro capas, tres perfiles y límites actuales/futuros con una leyenda clara.
- [ ] La prueba recorre imports reales, incluido el cliente heredado y la responsabilidad de `App.tsx`.
- [ ] Hay una contradicción observada con causa, efecto, evidencia anterior y corrección verificada.
- [ ] `dependencies.json` conserva un caso nominal final y uno de falla/límite; no contiene salidas inventadas.
- [ ] `engineering.json` conecta requisito, alternativas, decisión, costo/beneficio, prueba y resultado.
- [ ] Mi evidencia tiene identidad, SHA, archivos y explicación propios.
- [ ] Entiendo qué falta antes de la entrega conjunta y contestaré mi quiz por separado.

Practica estas respuestas con tus palabras: ¿por qué infrastructure depende del contrato de domain?, ¿qué archivo cambiaría al sustituir el fake?, ¿qué diferencia hay entre un diagrama correcto y código correcto?, ¿qué import falló y por qué?, ¿qué demuestra tu prueba y qué queda fuera?

La rúbrica suma AC-01 reproducción **2.5**, AC-02 comportamiento **2**, AC-03 falla **1.5**, AC-04 decisión **1.5** y AC-05 aportación **0.5**. Los primeros tres suman 6 automáticos; los otros dos, 2 semiautomáticos. Son puntos del trabajo completo, no puntos garantizados para ti. Un flag solicita corroboración y no descuenta por sí solo; no hay porcentaje fijo para nivel parcial. Consulta los límites de la rúbrica: G1/G2/G3 pueden limitar a 4.8/8 y G4, sin evidencia individual, a 5.6/8 individual; se aplica el límite más restrictivo si coinciden.

## Texto para usar con una IA

```text
Soy Jarumi. Ayúdame a realizar y entender únicamente mi aportación de Semana 02 de CampusOps en el mismo repositorio del equipo. Lee primero ACLARACION_ANTES_DE_INICIAR.md, después docs/GUIA_JARUMI_SEMANA_02.md y las tres instrucciones oficiales de docs/assignments/week-02*. Revisa git status y conserva los cambios existentes. Usa la rama codex/semana-02-jarumi. No inventes identidad, studentId, teamId, commits ni resultados; solicita sólo los datos reales que falten.

Mi alcance es revisar el ADR existente comparando dos arquitecturas internas por testabilidad, complejidad y cambio de proveedor; acordar con Fer los contratos; crear docs/architecture.mmd con UI, application, domain, infrastructure, tres perfiles y límites previstos; crear tests/architecture.test.ts que inspeccione imports reales y registrar la contradicción antes/después en reports/week-02/dependencies.json. Completa engineering.json sólo con decisiones y verificaciones reales. La implementación principal del esqueleto corresponde a Fer según su guía; coordina los cambios y evita editar sus archivos simultáneamente.

La prueba pública actual sólo inspecciona texto del ADR/diagrama: no la confundas con un escaneo de imports. Incluye en el detector el cliente heredado src/api/courseBackend.ts y considera App.tsx UI mientras conserve presentación. Captura el import prohibido antes de su corrección, con predicción previa, estado del código, comando, salida y código de retorno. Verifica después la corrección real con el mismo detector y conserva la prueba smoke. No alteres pruebas públicas, evaluador o workflows para ocultar errores.

Explícame cada decisión y pídeme que formule la predicción antes del experimento. Distingue observación, expectativa y pendientes. Guarda mi aporte con mi identidad y completa únicamente mi registro individual por studentId con mi SHA real. Declara la ayuda de IA y cómo la verifiqué. Comprueba los JSON y comparte mi rama/pull request con resultados reales. No publiques una etiqueta final por mi cuenta ni atribuyas a otras personas trabajo que no hicieron. No implementes hitos futuros. Al terminar explícame qué puedo demostrar y qué falta para el cierre conjunto.
```
