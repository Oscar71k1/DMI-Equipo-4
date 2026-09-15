# Guía de Fer — Semana 02: construir un esqueleto que respete la arquitectura

Fer, tu trabajo es hacer que CampusOps abra una lista de incidencias ficticias, permita ver su detalle y mantenga separadas las pantallas, los casos de uso, los contratos y la fuente de datos. Debes demostrar que otro proveedor de prueba puede sustituir al primero y corregir la dependencia prohibida que se contraste con el diseño.

**Esta guía describe trabajo por realizar. No certifica que la app, las pruebas o los reportes ya estén terminados.** Jarumi se encargará del ADR, diagrama, detector de dependencias y reporte de arquitectura; tú aportarás el esqueleto y sus comprobaciones. Los nombres de archivos propuestos son un acuerdo para coordinarse, no un árbol obligatorio impuesto por el curso.

**Rama propuesta:** `codex/semana-02-fernanda`. **Entrega:** 14 de septiembre de 2026, 23:59, hora de Ciudad de México. **Quiz personal:** Semana 2 — Arquitectura y patrones, 3 preguntas y 3 puntos separados de la actividad de 8 puntos.

## 1. Lecturas obligatorias y alcance real

Lee primero [ACLARACION_ANTES_DE_INICIAR.md](../ACLARACION_ANTES_DE_INICIAR.md). Después revisa:

1. [Actividad](assignments/week-02.md), equivalente local de `ACTIVITY_STUDENT_FACING.md`.
2. [Preparación, comandos y evidencias](assignments/week-02-repository.md), equivalente local de `STARTER_AND_REPOSITORY.md`.
3. [Rúbrica](assignments/week-02-rubric.md), equivalente local de `RUBRIC_PUBLIC.md`.
4. [Caso CampusOps](CAMPUSOPS.md), [ADR existente](adr/ADR-001-architecture.md), [contrato de evidencias](EVIDENCE_CONTRACT.md) y [guía de Jarumi](GUIA_JARUMI_SEMANA_02.md).

Mantén el mismo repositorio y React Native + Expo + TypeScript. Esta semana implementas **lista y detalle con datos sintéticos en memoria**. No necesitas login, permisos por perfil, base de datos, persistencia entre reinicios, mapas, permisos de ubicación, sincronización ni un backend de incidencias real. Esos límites sí deben aparecer previstos en el diseño de Jarumi.

Tu trabajo de Semana 01 se conserva como historial. Volver a cambiar `available` por `offline` no acredita la contradicción arquitectónica de esta semana: ahora deben detectar y corregir un import o dependencia que rompa el diseño.

## 2. Tus archivos y los acuerdos con Jarumi

| Parte | Lo que harás |
|---|---|
| Dominio | Modelo mínimo de incidencia y puerto de consulta, usando el vocabulario existente. |
| Aplicación | Casos de uso de lista/detalle que reciben el puerto, sin construir proveedores. |
| Infraestructura | Fake determinista en memoria que cumple ese puerto. |
| UI | Lista, selección, detalle, regreso y mensajes de estado. |
| Composición | Conectar fake, casos de uso y pantallas en un lugar explícito. |
| Compatibilidad anterior | Mantener el título y la comprobación de salud que espera el smoke, detrás de sus límites. |
| Pruebas | Crear `tests/incidents.test.tsx` y ejecutar el detector de Jarumi cuando esté disponible. |
| Evidencia propia | Guardar logs y completar únicamente tu registro en `evidence/week-02/individual.json`. |

Jarumi mantiene `docs/adr/ADR-001-architecture.md`, `docs/architecture.mmd`, `tests/architecture.test.ts`, `reports/week-02/dependencies.json` y `evidence/week-02/engineering.json`. Entrégale las rutas reales, las decisiones que cambien durante tu implementación y tus resultados. No mantengan dos versiones incompatibles del contrato.

Antes de implementar acuerden estos puntos:

- Campos mínimos de incidencia y nombres de operaciones.
- Retorno de lista vacía y de identificador inexistente.
- Qué recibe cada pantalla y dónde se construyen los casos de uso.
- Ubicación del puerto y adaptador de salud heredados.
- Momento para que Jarumi capture la dependencia original antes de tu corrección.

Puedes diseñar pantallas y el fake mientras Jarumi prepara el detector; conserva disponible el estado anterior que documentarán. Si la corrección ya existe, podrán hacer una comprobación temporal controlada, descrita en su guía, sin inventar resultados históricos.

## 3. Preparar tu entorno y rama

Si no tienes copia local:

```powershell
git clone https://github.com/Oscar71k1/DMI-Equipo-4.git DMI-Equipo-4-Fernanda
cd DMI-Equipo-4-Fernanda
```

Si ya tienes una, abre esa carpeta. Revisa antes de actualizar:

```powershell
git status --short
git branch --show-current
git remote -v
```

No borres cambios locales ni recrees el proyecto para preparar Semana 02. Confirma que estén los archivos del paquete semanal, incluida `.github`. Si faltan, sigue `INSTALL.md`, combina carpetas y revisa los conflictos antes de sobrescribir. En la copia usada para redactar estas guías había archivos semanales aún sin seguimiento: verifícalos en tu rama y en GitHub.

Configura sólo tu identidad de este repositorio:

```powershell
git config user.name "TU NOMBRE DE AUTOR"
git config user.email "TU CORREO DE AUTOR"
git config user.name
git config user.email
```

Ten tus identificadores oficiales de estudiante y equipo; no los deduzcas del nombre del repositorio. Usa tu cuenta de GitHub.

La guía oficial fija Node.js **22.22.0** y requiere npm, Git, GNU Make y Python 3. Si utilizas nvm, selecciona esa versión. Con cambios locales resguardados y revisados:

```powershell
git switch main
git pull --ff-only origin main
git switch -c codex/semana-02-fernanda
make setup
make feedback
```

Si la rama ya existe, usa `git switch codex/semana-02-fernanda`. Ejecuta uno por uno y observa el resultado. Soluciona fallos del entorno antes de afirmar que el estado inicial era correcto. No cambies versiones ni desactives pruebas para pasar.

En Windows, los problemas conocidos están en [entorno-windows.md](entorno-windows.md). Si sólo tienes `python` y éste es Python 3, puedes usar `make PYTHON=python verify-week-02` y el mismo ajuste en los otros objetivos semanales. Guarda el comando real, no uno distinto en el reporte.

## 4. Comprender la separación con un ejemplo

Cuando tocas «Lámpara de aula ficticia sin encender», ocurre lo siguiente:

1. La **pantalla** conserva el identificador seleccionado y pide el detalle.
2. El **caso de uso** solicita esa incidencia mediante `getById(id)`.
3. El **puerto del dominio** define qué debe devolver esa operación.
4. El **fake de infraestructura** busca el identificador en sus datos y responde.
5. La pantalla presenta el resultado o «Incidencia no encontrada».

La pantalla sabe pedir una operación, pero no conoce el arreglo del fake. El caso de uso conoce un contrato, pero no sabe qué clase concreta recibió. En composición se decide cuál implementación se entrega.

Cambiar proveedor significa crear otra implementación compatible y conectarla desde composición. Para demostrar esa separación ahora bastan dos fuentes de prueba con respuestas distintas. No hace falta conectar un servidor real.

## 5. Construir por piezas, en este orden

Esta estructura es una propuesta coherente con el ADR inicial. Ajusten nombres juntos si es necesario:

```text
src/
  domain/
    Incident.ts
    IncidentRepository.ts
    BackendHealthPort.ts
  application/
    createIncidentQueries.ts
    createHealthQuery.ts
  infrastructure/
    InMemoryIncidentRepository.ts
    CourseBackendHealthAdapter.ts
  ui/
    CampusOpsScreen.tsx
    IncidentListScreen.tsx
    IncidentDetailScreen.tsx
  composition/
    createCampusOps.ts
  campusops/contracts.ts            vocabulario existente: conservar
  api/courseBackend.ts             cliente heredado: conservar si se usa
App.tsx                            montaje de dependencias y UI
tests/incidents.test.tsx            tus pruebas nuevas
tests/architecture.test.ts          detector de Jarumi
```

No crees carpetas vacías para simular que sesión, ubicación y persistencia ya existen. Se pueden documentar como límites futuros.

### A. Dominio: datos y contrato

Lee `src/campusops/contracts.ts`. Ya contiene `CampusRole`, `IncidentStatus`, `IncidentCategory` y otros tipos del caso. Reutiliza los que necesites; no cambies el vocabulario público por comodidad. Jarumi debe clasificar ese archivo como dominio compartido en su detector, aunque se conserve su ruta.

Un modelo mínimo propuesto puede incluir `id`, `title`, `description` y `status`. Los datos serán ficticios. No implementes todas las transiciones de estado ni permisos futuros sólo para poder mostrar esos campos.

Ejemplo orientativo del puerto, para acordarlo antes con Jarumi:

```typescript
import type { Incident } from './Incident';

export interface IncidentRepository {
  list(): Promise<readonly Incident[]>;
  getById(id: string): Promise<Incident | null>;
}
```

El puerto dice qué se puede pedir. No contiene React, componentes, `fetch`, almacenamiento, Expo ni el arreglo ficticio.

### B. Aplicación: coordinar mediante el puerto

Propón una función `createIncidentQueries(repository)` que reciba `IncidentRepository` y devuelva acciones como `listIncidents()` y `getIncidentDetail(id)`.

- El caso de uso delega en el puerto y mantiene el resultado acordado.
- No importa `InMemoryIncidentRepository`.
- No construye un fake ni una conexión internamente.
- No mezcla JSX, mensajes visuales ni estado de navegación.
- Devuelve `null` cuando el contrato indica que no existe el identificador.

Una delegación pequeña es suficiente esta semana. No agregues capas sin una responsabilidad concreta sólo para aumentar el número de archivos.

### C. Infraestructura: datos en memoria estables

Crea `InMemoryIncidentRepository` con los mismos métodos del puerto. Usa dos o tres incidencias sintéticas con identificadores fijos. Esa cantidad es una sugerencia para demostrar selección, no un requisito por integrante.

El fake debe:

- Responder lo mismo ante las mismas entradas.
- Devolver el registro correspondiente al identificador, no siempre la primera incidencia.
- Permitir una colección vacía y devolver `null` si no encuentra el identificador.
- Evitar compartir estado mutable entre pruebas; permitir recibir datos iniciales ayuda a sustituir escenarios.
- No depender de red, fechas aleatorias, ubicación real ni credenciales.

«En memoria» significa que los datos no sobreviven al reinicio. No lo describas en el ADR como almacenamiento persistente.

### D. Composición: conectar sin filtrar el proveedor a las pantallas

En `src/composition/createCampusOps.ts`, construye el fake y entrégalo a los casos de uso. Devuelve las acciones que necesita la UI.

`App.tsx` puede montar esas acciones y pasarlas a una pantalla contenedora. Mantén estables las dependencias durante la vida de la app: reconstruirlas en cada render puede disparar efectos y consultas repetidas. No crees una instancia nueva en cada ejecución de un componente sin controlar su ciclo de vida.

Las pantallas no importan composition para obtener el fake. Reciben acciones mediante props o un contexto definido sin depender de infraestructura. La excepción de composición es explícita y pequeña; no convierte cualquier componente en un lugar permitido para conectar proveedores.

### E. UI: lista, detalle y estados simples

Implementa:

1. Lista con título identificable de cada incidencia.
2. Acción de selección por identificador.
3. Detalle que muestre los datos de esa selección.
4. Acción para regresar a la lista.
5. Estado de carga y mensajes claros para lista vacía, no encontrada y error de consulta.

Para dos vistas basta un estado local de selección; no instales una biblioteca de navegación sólo para cumplir este esqueleto si el proyecto no la necesita. Usa componentes accesibles y textos de botones comprensibles.

La UI no importa `src/infrastructure`, `src/api/courseBackend`, SDKs de almacenamiento o proveedores. No pongas `fetch` en una pantalla ni exportes el fake a través de un archivo de application para disimular su origen.

## 6. Conservar la Semana 01 mientras corriges el acoplamiento

En la copia inicial, `App.tsx` dibuja la pantalla y llama directamente a `getBackendHealth` desde `src/api/courseBackend.ts`. Ese es un candidato real a la contradicción que Jarumi documentará. **Acuerden capturar el antes antes de quitarlo.**

El smoke existente en `course-tests/smoke.test.tsx` comprueba:

- Que la app muestre `CampusOps`.
- Que exista `testID="backend-status"`.
- Que, cuando el doble de `getBackendHealth` responde bien, ese indicador contenga `available`.

Para conservarlo sin mantener el import UI → cliente:

1. Define un puerto de salud pequeño y puro en domain.
2. Crea un caso de uso en application que reciba ese puerto.
3. Implementa un adaptador en infrastructure que llame al `getBackendHealth` existente.
4. Inyecta ese adaptador en composición.
5. Haz que la UI consulte el caso de uso y conserve el comportamiento observable `checking`, `available` u `offline` según el resultado.

Así conservas la función previa a través de límites claros. El test seguirá usando su doble del cliente existente. No cambies el test, no elimines el indicador y no escribas `available` fijo para engañarlo. El estado del backend tampoco debe bloquear la lista/detalle de incidencias ficticias.

La conservación de este indicador es trabajo heredado: no te obliga a implementar login ni una API real de incidencias. Si falta un servidor durante uso manual, la UI puede indicar `offline` mientras el fake sigue funcionando.

Ejecuta después de la refactorización:

```powershell
npm run test:smoke
```

Si falla, revisa montaje, comportamiento y conexión del adaptador. Explica la causa antes de seguir.

## 7. Probar lo que prometiste, incluyendo sustitución

Crea `tests/incidents.test.tsx` con pruebas que ejerciten la implementación real. Usa la infraestructura de Jest y React Native Testing Library ya instalada; no escribas adaptadores del evaluador que devuelvan resultados prefijados para semanas futuras.

| Caso | Acción | Qué debe observarse |
|---|---|---|
| Lista/detalle | Renderizar, seleccionar una incidencia y regresar. | Se muestran los datos de esa incidencia; el regreso recupera la lista. |
| Selección distinta | Seleccionar otra incidencia con datos diferentes. | No se reutiliza siempre el primer detalle. |
| Lista vacía | Inyectar un repositorio sin registros. | Mensaje de lista vacía, sin cierre inesperado. |
| ID inexistente | Consultar un identificador ausente y mostrar ese resultado. | `null` en aplicación y estado no encontrada en UI. |
| Sustitución | Ejecutar las mismas acciones con otra implementación del puerto. | Cambian los datos observados sin editar UI ni application. |
| Error controlado | Inyectar un proveedor de prueba que rechace la consulta. | Mensaje de error; sin promesa rechazada sin manejar. |

El flujo lista/detalle y la sustitución sostienen el requisito central. Los casos vacíos, inexistentes y error son comprobaciones acotadas propuestas para justificar el esqueleto; no obligan a construir todos los estados de red de hitos posteriores.

Para probar sustitución, no basta cambiar los títulos dentro del mismo archivo de pantalla. Crea en la prueba otro objeto que cumpla `IncidentRepository`, entrégalo a la misma fábrica de casos de uso y verifica que se consultó y mostró su respuesta. Al menos una prueba debe recorrer UI → aplicación → fake real; no reemplaces toda la lógica por mocks de resultados.

Antes de ejecutar, escribe tu predicción con tus palabras, por ejemplo: «Al cambiar el repositorio inyectado, espero ver el nuevo título sin tocar la pantalla». Es una expectativa, no una observación.

Después de crear el archivo:

```powershell
New-Item -ItemType Directory -Force -Path reports/week-02/logs
npm test -- --runInBand --runTestsByPath tests/incidents.test.tsx 2>&1 | Tee-Object -FilePath reports/week-02/logs/fernanda-incidencias.txt
$fernandaIncidentsExit = $LASTEXITCODE
Add-Content -LiteralPath reports/week-02/logs/fernanda-incidencias.txt -Value "EXIT_CODE=$fernandaIncidentsExit"
npm run test:smoke 2>&1 | Tee-Object -FilePath reports/week-02/logs/fernanda-smoke.txt
$fernandaSmokeExit = $LASTEXITCODE
Add-Content -LiteralPath reports/week-02/logs/fernanda-smoke.txt -Value "EXIT_CODE=$fernandaSmokeExit"
```

No afirmes una cantidad de tests aprobados antes de leer la salida. Si cambias la implementación después, vuelve a ejecutar las comprobaciones afectadas y actualiza sus referencias.

Prueba también la app en el entorno Android configurado siguiendo `README.md`. `npm run start` usa un cliente de desarrollo; úsalo si ya lo tienes instalado. Si necesitas generar/instalar la app nativa y tienes el entorno requerido, sigue el flujo `npm run android` del proyecto. Recorre lista → detalle → regresar y registra dispositivo/emulador y resultado. `make feedback` exporta un paquete de Expo; ese paquete no prueba por sí solo instalación de un APK ni interacción manual.

No confundas un fallo del entorno Android con una prueba de que la navegación funciona. Conserva el mensaje si impide esa comprobación e informa qué sí pudiste verificar.

## 8. Corregir y verificar la contradicción de AC-03

Jarumi habrá creado `tests/architecture.test.ts` y guardado un fallo real por la dependencia prohibida. Revísalo: debes poder explicar por qué el código anterior contradecía el ADR.

Al terminar tu separación, ejecuta su detector disponible en tu rama:

```powershell
npm test -- --runInBand --runTestsByPath tests/architecture.test.ts 2>&1 | Tee-Object -FilePath reports/week-02/logs/fernanda-arquitectura.txt
$fernandaArchitectureExit = $LASTEXITCODE
Add-Content -LiteralPath reports/week-02/logs/fernanda-arquitectura.txt -Value "EXIT_CODE=$fernandaArchitectureExit"
```

Debe identificar y revisar todas las capas, el cliente heredado y el montaje. No cambies reglas para permitir el import que debías corregir. Tampoco muevas toda la pantalla a una carpeta llamada `composition` para excluirla del control.

Entrega a Jarumi:

- Referencia de la versión anterior, archivos cambiados y diff de la corrección.
- Explicación de la causa: la UI dependía de un cliente concreto.
- Explicación del cambio: la UI recibe acciones de application, ésta conoce el puerto y composición conecta el adaptador.
- Tus logs del detector, smoke y casos de incidencias, con códigos reales.
- Las rutas finales, para que actualice el diagrama y el reporte.

Jarumi volverá a ejecutar el detector sobre el estado corregido. En `dependencies.json` se conserva el fallo histórico y el éxito final; no se entrega la dependencia prohibida activa. Si encontraron otra discrepancia entre dibujo y código, corríjanla también y documenten la solución final.

## 9. Guardar tu contribución técnica

Revisa antes de guardar:

```powershell
git status --short
git diff --check
git diff --stat
git diff -- App.tsx src tests/incidents.test.tsx
```

Inspecciona también los archivos nuevos, porque `git diff` no muestra su contenido mientras no tengan seguimiento. Confirma que pruebas públicas, evaluador y workflows no cambiaron para ocultar errores.

Agrega únicamente las rutas que realmente creaste o modificaste para tu aporte. Si seguiste el árbol propuesto:

```powershell
git add -- App.tsx src/domain src/application src/infrastructure src/ui src/composition tests/incidents.test.tsx
git diff --cached --stat
git diff --cached
git commit -m "feat: separar lista y detalle de incidencias con Fernanda"
git rev-parse HEAD
git show --stat --format=fuller HEAD
```

No ejecutes ese `git add` si alguna ruta no existe: adáptalo a tus archivos. Si tocaste justificadamente otra ruta, revísala y agrégala de forma explícita. No añadas todos los archivos de otras personas con `git add .`.

Copia tu SHA técnico completo de 40 caracteres y confirma que el autor sea tu identidad. No hace falta que ese SHA sea el SHA final de entrega; identifica tu aportación concreta.

## 10. Registrar sólo tu evidencia personal

El archivo oficial es `evidence/week-02/individual.json`. Tiene `schemaVersion: 1`, `week: 2`, `teamId` oficial y exactamente tres registros en `members`.

Encuentra el tuyo por **tu `studentId`**, no por un índice heredado de Semana 01. Completa sólo tu registro. Si aún no existe el archivo, coordinen la creación y la aportación de los tres objetos reales; no rellenes datos ajenos, no copies resultados antiguos y no inventes identificadores.

| Campo | Tu contenido |
|---|---|
| `studentId` | Tu identificador registrado. |
| `commitShas` | Lista con al menos tu SHA técnico propio de 40 caracteres. |
| `files` | Rutas significativas del esqueleto y pruebas que trabajaste. |
| `tests` | Lista de pruebas y comandos que tú ejecutaste. |
| `reviews` | Lista de revisiones que realizaste, como contrato/implementación o diagrama/imports. |
| `prediction` | Tu expectativa escrita antes de probar, sin adaptarla después al resultado. |
| `command` | El comando concreto con el que comprobaste tu aportación. |
| `observedResult` | Resultado observado, cantidad real de pruebas y código de salida. |
| `explanation` | Por qué el resultado demuestra tu cambio y cuáles son sus límites. |

Al menos una de las listas `tests` o `reviews` debe tener contenido. No escribas «hice la app» como toda tu explicación. Un ejemplo de idea que debes desarrollar con tus resultados es: «La misma pantalla recibió consultas construidas con dos implementaciones del puerto; cambió el detalle mostrado sin modificar la UI. Esto demuestra sustitución en ese contrato, no conexión a un servidor real».

Declara la ayuda material de IA y cómo revisaste código y pruebas. Debes poder explicar personalmente qué cambiaste.

Valida la sintaxis cuando el archivo exista:

```powershell
python -c "import json; from pathlib import Path; json.loads(Path('evidence/week-02/individual.json').read_text(encoding='utf-8')); print('Sintaxis JSON valida')"
git diff -- evidence/week-02/individual.json
```

Guarda el JSON como UTF-8 sin BOM. La validación de sintaxis no acredita que el contenido sea verdadero ni que los tres aportes estén completos. Revisa que sólo cambiaste tu registro y conserva los demás.

Guarda tu evidencia y tus logs revisados en un commit aparte, agregándolos por ruta. No completes `engineering.json` y `dependencies.json` por tu cuenta mientras los edita Jarumi; entrégale la información para que la incorpore y revisa después que describa el código real.

## 11. Compartir tu rama y completar las comprobaciones

Si necesitas cambios ya integrados en `main`, con el árbol limpio usa `git fetch origin` y `git merge origin/main` desde tu rama. Si el detector aún está en la rama de Jarumi, acuerden su incorporación revisando ese cambio; no vuelvas a implementarlo con reglas distintas. Resuelve conflictos conservando el contrato acordado y vuelve a probar.

Publica tu rama:

```powershell
git push -u origin codex/semana-02-fernanda
```

Prepara un pull request hacia `main` con comportamiento implementado, archivos, comandos/resultados, SHA técnico y pendientes. No presentes pruebas de otra versión como si correspondieran al código actual. Mantengan verificables los commits citados como aportaciones; no reescribas historial con `push --force` para resolver un conflicto ordinario.

Con los cambios de ambas disponibles, ejecuta las pruebas nuevas explícitamente:

```powershell
npm test -- --runInBand --runTestsByPath tests/incidents.test.tsx tests/architecture.test.ts
make feedback
make verify-week-02
make public-test-week-02
```

Ejecuta uno por uno, registra salidas y atiende los fallos. Las pruebas de ustedes pueden no estar incluidas en los objetivos del curso. El `npm test` sin selección puede abarcar hitos futuros que aún están pendientes; no implementes esos hitos ni elimines sus pruebas sólo por ejecutarlos accidentalmente.

Los cinco archivos obligatorios, además del código y pruebas, son:

| Archivo | Qué debes revisar aunque Jarumi prepare parte de él |
|---|---|
| `docs/adr/ADR-001-architecture.md` | Las dos alternativas y la elección explican tu código. |
| `docs/architecture.mmd` | Las rutas, capas y dependencias corresponden a tu implementación. |
| `reports/week-02/dependencies.json` | Incluye comandos, resultados, fallo anterior y corrección final. |
| `evidence/week-02/engineering.json` | La decisión está vinculada con pruebas y resultados reales. |
| `evidence/week-02/individual.json` | Tiene exactamente tres aportaciones reales, incluida la tuya. |

Al integrar ramas, los campos generales `commitSha` de reportes pueden quedar desactualizados. La secuencia oficial guarda primero todo el código, configuración y documentos, consulta ese SHA, comprueba la versión y termina con **un commit que sólo modifica `reports/` y `evidence/`**. Así el SHA reportado puede ser el padre directo del commit final de evidencias. Tus SHAs personales siguen identificando tu aporte técnico.

La etiqueta conjunta es `week-02-final`; `make evidence-week-02` se ejecuta después de crearla. No crees una etiqueta final independiente en tu rama. El reporte local generado después de etiquetar no se añade mediante otro commit de código. Sigan [el orden oficial completo](assignments/week-02-repository.md) para publicar y entregar enlace del repositorio, etiqueta y SHA completo, todos correspondientes a la misma versión.

Si un workflow falla por registros o etiqueta todavía ausentes durante el desarrollo, informa el mensaje y el pendiente. No lo tomes como prueba de que tu código ya pasa ni cambies las comprobaciones para esconderlo.

## 12. Cómo saber que terminaste tu parte

- [ ] La app muestra una lista sintética y abre el detalle seleccionado; permite regresar.
- [ ] El modelo y puerto son puros y los casos de uso reciben el repositorio.
- [ ] El fake se puede sustituir sin editar UI ni application; una prueba lo demuestra.
- [ ] Lista vacía, ID ausente y error controlado muestran resultados comprensibles.
- [ ] La UI no importa infraestructura ni obtiene el fake por una reexportación o composición.
- [ ] El smoke de Semana 01 sigue pasando con su comportamiento real, sin tocar sus aserciones.
- [ ] El detector de Jarumi verifica el estado corregido y el diagrama coincide.
- [ ] Guardé logs reales, mi commit técnico y mi registro individual.
- [ ] Compartí con Jarumi las rutas y resultados necesarios para los reportes.
- [ ] Sé qué queda pendiente para la entrega conjunta y contestaré mi quiz individual.

Practica estas preguntas: ¿por qué `getById` pertenece al contrato?, ¿quién construye el fake?, ¿qué cambia si el proveedor es otro?, ¿por qué el fake no es persistencia?, ¿cómo conservaste el smoke al quitar el acceso directo de la UI?, ¿qué demuestra tu prueba de sustitución?

La rúbrica del trabajo completo suma reproducción **2.5**, comportamiento **2**, manejo de falla **1.5**, decisión **1.5** y aportación individual **0.5**. AC-01 a AC-03 suman 6 puntos automáticos y AC-04/AC-05, 2 semiautomáticos. Los puntos no se garantizan por crear archivos. Un flag sólo pide corroboración y el parcial no tiene porcentaje fijo. Los límites G1/G2/G3 pueden dejar el máximo en 4.8/8; G4, sin evidencia individual, en 5.6/8 individual. Consulta la rúbrica y aplica el límite más restrictivo si coinciden.

## Texto para usar con una IA

```text
Soy Fernanda (Fer). Ayúdame a realizar y entender mi aportación de Semana 02 de CampusOps en el repositorio existente. Lee primero ACLARACION_ANTES_DE_INICIAR.md, después docs/GUIA_FERNANDA_SEMANA_02.md, el ADR y las instrucciones oficiales de docs/assignments/week-02*. Revisa git status y conserva el trabajo previo. Usa codex/semana-02-fernanda y mi identidad real; solicita sólo los datos que falten, sin inventar studentId, teamId, commits ni resultados.

Mi tarea es implementar el esqueleto de lista/detalle de incidencias ficticias con separación UI, application, domain e infrastructure, puerto sustituible e inyección desde composición. Acordaremos los contratos con Jarumi, quien mantiene ADR, diagrama, detector de arquitectura y reportes generales. No edites simultáneamente sus archivos. Antes de quitar la dependencia original App.tsx -> src/api/courseBackend.ts, coordina la captura del fallo real de arquitectura con Jarumi.

Conserva el vocabulario de src/campusops/contracts.ts y las pruebas originales. El smoke espera CampusOps, backend-status y available cuando responde su doble exitoso. Mantén esa función mediante puerto, caso de uso y adaptador, sin hardcodear el resultado ni importar el cliente en UI. La lista/detalle usa memoria y debe funcionar aunque el indicador de salud esté offline. No implementes sesión, persistencia, permisos, ubicación, sincronización ni adaptadores de evaluación de semanas futuras.

Crea pruebas reales en tests/incidents.test.tsx para lista/detalle, selección distinta, vacío, ID inexistente, sustitución del puerto y error controlado. Explícame cada pieza y ayúdame a formular mi predicción antes de ejecutar. Guarda logs y códigos reales. Ejecuta el detector de Jarumi cuando esté disponible, conserva el smoke y atiende las inconsistencias sin alterar las pruebas públicas ni el evaluador. Verifica la app en el entorno disponible y distingue exportación, pruebas y uso manual.

Guarda mi aporte técnico con mi identidad, obtén mi SHA y completa únicamente mi registro en individual.json identificado por studentId. No me atribuyas ejecuciones ajenas. Declara la ayuda de IA y cómo la revisé. Entrega a Jarumi la corrección, rutas y resultados para dependencies.json y engineering.json. Comparte mi rama y pull request con evidencia real; no crees una etiqueta final independiente. Al terminar explícame qué puedo demostrar y qué sigue pendiente para el cierre conjunto.
```
