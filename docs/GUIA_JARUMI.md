# Guía de trabajo de Jarumi — CampusOps, semana 1

**Estado: aportación de Jarumi completada e integrada en `main`.** Esta guía conserva las indicaciones de preparación entregadas antes de su trabajo; sus pasos y el texto para IA son una referencia de esa etapa. El resultado realizado está en [jarumi-criterios.md](jarumi-criterios.md) y en [individual.json](../evidence/week-01/individual.json). El estado de la entrega y los archivos que se evalúan están en el [índice del equipo](GUIA_EQUIPO_SEMANA_01.md). Las rutas se actualizaron a la organización actual.

**Tu responsabilidad:** trabajar un solo riesgo, el riesgo 1 sobre reasignación durante trabajo sin conexión; revisar el problema y los criterios de aceptación relacionados y registrar tu propia aportación.

**Alcance de esta guía:** la consigna no exige tres incidencias ni tres escenarios por estudiante. Exige al menos tres criterios de aceptación en el documento del equipo (paso 5) y exactamente tres riesgos por equipo (paso 6). Tu obligación individual es una aportación técnica verificable con un commit propio y una prueba o revisión que puedas explicar (pasos 4 y 12). Los escenarios de ejemplo de esta guía son opcionales.

**Tu riesgo asignado:** riesgo 1, un cambio de atención sin conexión sobrescribe una reasignación posterior. El reparto acordado te asigna sólo este riesgo; conserva las otras dos filas del registro del equipo.

**Tu rama:** `semana-01-jarumi`.

**Tus archivos:** `docs/jarumi-criterios.md`, `reports/week-01/logs/jarumi-prueba-publica.txt`, tu registro en `evidence/week-01/individual.json` y, únicamente si identificas una mejora sustantiva, la fila del riesgo 1 en `docs/risk-register.md` y la sección relacionada de `docs/problem-definition.md`.

## Qué evalúa la rúbrica oficial

Fuente: `RUBRICA.md` y `LEEME_PRIMERO.md` del repositorio. La actividad vale **8 puntos**; el quiz individual vale **3 puntos por separado**. Los siguientes valores corresponden a la actividad completa, no a puntos adicionales por cada archivo ni por cada riesgo.

| Criterio | Puntos | Qué debe encontrar quien evalúa |
|---|---:|---|
| Reproducción | 2.5 | Un SHA válido que identifique una versión instalable y todas las comprobaciones obligatorias aprobadas. No basta con que un comando pase en una copia distinta de la entregada. |
| Definición del caso | 2.0 | Problema específico de CampusOps, alcance incluido y excluido, actores, flujo, **exactamente tres riesgos del equipo priorizados** y criterios de aceptación verificables. El paso 5 exige al menos tres criterios de aceptación en el documento del equipo. |
| Diagnóstico de falla | 1.5 | Evidencia real del fallo y de su corrección, comando ejecutado, diferencia entre síntoma y causa y pruebas originales sin alterar. |
| Decisión técnica | 1.5 | Una decisión real que compare al menos dos alternativas, explique el beneficio y el costo o limitación aceptados y se conecte con una comprobación real. |
| Evidencia individual | 0.5 | Una aportación verificable de cada uno de los tres integrantes: commit propio, archivos y una prueba o revisión que pueda explicar. |
| **Total** | **8.0** | **Los archivos presentes deben contener evidencia suficiente y coherente.** |

### Archivos obligatorios que revisa la actividad

Estos cinco archivos deben conservar sus nombres y rutas. Los documentos personales de revisión y logs son evidencia de apoyo; no sustituyen las plantillas obligatorias.

| Archivo | Contenido que se evalúa |
|---|---|
| `docs/problem-definition.md` | Problema, alcance, actores, flujo y al menos tres criterios de aceptación observables para el equipo. |
| `docs/risk-register.md` | **Exactamente tres riesgos en total**, ordenados por prioridad, con probabilidad e impacto justificados, mitigación y forma de comprobarla. |
| `reports/week-01/baseline.json` | Observaciones reales de falla y corrección: `fail` y `pass`, comandos, resultados y SHA válido. |
| `evidence/week-01/engineering.json` | Decisión, al menos dos alternativas, beneficio/costo, comprobación y SHA válido. |
| `evidence/week-01/individual.json` | Exactamente tres registros personales. Cada estudiante completa únicamente el suyo con datos y commits reales. |

Al cerrar el trabajo del equipo deben pasar las comprobaciones de los pasos 13 a 15 de `LEEME_PRIMERO.md`. `make evidence-week-01` se ejecuta después de crear la etiqueta final; no corresponde adelantar ese cierre al preparar una aportación individual.

### Condiciones que afectan la calificación

- Sin SHA válido o sin reproducción, la rúbrica asigna 0 a la parte automática y limita el total a 4.8/8.
- Modificar, desactivar o ignorar una prueba para ocultar una falla impide acreditar el diagnóstico.
- La exposición de un secreto o dato personal real limita la actividad a 4.8/8; una credencial expuesta debe revocarse.
- Sin evidencia individual, ese criterio vale 0.
- Las capturas sólo complementan: no reemplazan archivos, comandos, reportes ni evidencia reproducible.

**No hay una exigencia de tres incidencias por estudiante.** Los tres riesgos y el mínimo de tres criterios de aceptación corresponden a los documentos del equipo. Cada persona necesita una aportación propia comprobable.

### Cómo se relaciona tu tarea con la rúbrica

Tu revisión del **riesgo 1** y de los criterios relacionados aporta a **Definición del caso** y a **Evidencia individual**. Comprueba que el documento del problema tenga alcance, actores, flujo y al menos tres criterios verificables en total. Centra tu análisis del riesgo en la reasignación durante trabajo sin conexión. Tu revisión debe explicar qué verificaste, qué encontraste y por qué; una matriz de escenarios es opcional.

Tu responsabilidad es un solo riesgo. Documenta su evento, consecuencia, probabilidad e impacto justificados, mitigación, comprobación observable y motivo de su prioridad. Tu documento personal, tu log y tu commit respaldan tu propio objeto de `individual.json`.

## 1. Preparar tu cuenta y tu copia

1. Acepta la invitación de colaboración al repositorio **https://github.com/Oscar71k1/DMI-Equipo-4**. Si no recibiste la invitación, solicítala.
2. Usa tu propia cuenta de GitHub. Ten a mano tu identificador escolar y el identificador oficial del equipo. No deduzcas el identificador del equipo a partir del nombre del repositorio.
3. Abre PowerShell en una carpeta donde quieras guardar el proyecto. Si ya tienes una copia, revisa `git status --short` antes de actualizarla; no borres cambios existentes.
4. Si no tienes una copia, ejecuta:

```powershell
git clone https://github.com/Oscar71k1/DMI-Equipo-4.git DMI-Equipo-4-Jarumi
cd DMI-Equipo-4-Jarumi
```

5. **Antes de modificar archivos**, lee completo `LEEME_PRIMERO.md`. Después lee `RUBRICA.md` y `docs/CAMPUSOPS.md`. Esta guía sólo organiza tu aportación; la secuencia obligatoria de entrega está en `LEEME_PRIMERO.md`.
6. Configura tu identidad para este repositorio. Sustituye los textos en mayúsculas por tus propios datos:

```powershell
git config user.name "TU NOMBRE DE AUTOR"
git config user.email "TU CORREO DE AUTOR DE GITHUB"
git config user.name
git config user.email
```

Puedes usar el correo privado `noreply` de tu cuenta de GitHub. No uses la identidad de otra persona ni compartas contraseñas o tokens.

7. Comprueba el entorno: Node.js **22.22.0**, npm, Git, GNU Make y Python 3. Si utilizas nvm:

```powershell
nvm use 22.22.0
node --version
npm --version
git --version
make --version
python --version
```

8. Crea tu rama desde una copia actualizada de `main` y prepara el proyecto:

```powershell
git switch main
git pull --ff-only origin main
git switch -c semana-01-jarumi
make setup
make feedback
```

Si tu rama ya existe, usa `git switch semana-01-jarumi` después de revisar el estado; no la borres ni la recrees. Si falla la instalación o una herramienta, conserva el mensaje y resuelve el entorno antes de atribuirte una comprobación exitosa. No cambies versiones del proyecto, pruebas ni umbrales para ocultar un error.

## 2. Trabajar el riesgo 1 y revisar los criterios relacionados

Lee la fila de prioridad 1 de `docs/risk-register.md`: **un cambio de atención hecho sin conexión sobrescribe una reasignación posterior de coordinación**. Identifica el riesgo por su contenido si la tabla cambió de orden. En `docs/jarumi-criterios.md`, desarrolla con tus propias palabras:

1. **Evento y consecuencia:** qué ocurre si el técnico A trabaja sin conexión, coordinación reasigna a B y A sincroniza con información anterior; qué asignación o estado quedaría incorrecto.
2. **Probabilidad y motivo:** justifica tu estimación usando el caso de CampusOps, sin inventar estadísticas.
3. **Impacto y motivo:** explica las consecuencias para la responsabilidad del técnico, la autorización y la conservación del trabajo.
4. **Mitigación:** explica cómo conservar versión base, autor y cambio pendiente, comprobar la asignación vigente y comunicar el conflicto.
5. **Comprobación prevista:** describe un caso con datos ficticios en el que B conserve la asignación, el cambio obsoleto no se imponga, el trabajo de A siga recuperable y se informe del conflicto.
6. **Prioridad:** justifica por qué este riesgo está primero en el registro. Puedes leer las otras filas como contexto; no necesitas desarrollar sus análisis.
7. **Conclusión de tu revisión:** indica qué parte de la fila está bien sustentada y qué mejorarías. La sincronización aún es futura; registra su comprobación como propuesta, no como una prueba ejecutada.

Si identificas una mejora real, modifica **sólo la fila de tu riesgo** en `docs/risk-register.md` y explica el cambio. Conserva las otras dos filas y el total de tres riesgos. No basta con copiar el texto existente y atribuírtelo: tu aportación debe mostrar tu análisis y sus conclusiones. Si la fila ya es suficiente, documenta por qué, sin hacer cambios cosméticos.

Lee `docs/problem-definition.md` y compáralo con `docs/CAMPUSOPS.md`. Comprueba:

- Que el problema describa una situación concreta del campus ficticio.
- Que estén separados alcance incluido y fuera de alcance.
- Que reportante, técnico y coordinador tengan responsabilidades distintas.
- Que resolver una incidencia y cerrarla sean operaciones distintas.
- Que los criterios de aceptación tengan condiciones observables.
- Que existan al menos tres criterios de aceptación en el documento del equipo y que los relacionados con reasignación sean coherentes con tu riesgo 1.
- Que el documento no presente funciones futuras como si ya estuvieran implementadas.

Crea las carpetas necesarias:

```powershell
New-Item -ItemType Directory -Force -Path docs,reports/week-01/logs
```

Crea `docs/jarumi-criterios.md` con estas secciones:

1. **Objetivo de la revisión:** qué vas a comprobar y qué documentos compararás.
2. **Predicción antes de la comprobación:** qué esperas de la revisión y de la prueba pública, y por qué.
3. **Análisis del riesgo 1 y sus criterios:** incluye los siete puntos anteriores, qué criterios revisaste y por qué son o no verificables. Puedes apoyarte en una matriz de escenarios con datos sintéticos; no hay una cantidad individual obligatoria.
4. **Hallazgos:** ambigüedades o contradicciones encontradas y cambios propuestos. Si no encuentras defectos, justifica concretamente por qué los criterios revisados son consistentes; no escribas sólo “todo bien”.
5. **Cambios realizados:** archivos y secciones que ajustaste, si fue necesario.
6. **Comando y resultado real:** completa esta sección después de ejecutar la prueba.
7. **Explicación y límites:** qué confirma la revisión, qué confirma la prueba automática y qué funciones siguen sin implementarse.

Si utilizas una matriz, estas columnas te ayudarán a justificar el análisis: **escenario, actor, estado inicial, datos sintéticos, acción, resultado esperado, criterio o sección del caso que lo respalda y cómo se comprobaría cuando esté implementado**.

Estos son ejemplos opcionales para apoyar tu revisión. No necesitas desarrollarlos todos:

| Escenario | Aspectos que debes precisar |
|---|---|
| J-01. Crear una incidencia | Reportante, categoría, descripción y ubicación ficticias; identificación del reporte y estado inicial `open`. Explica qué datos deben poder consultarse después. |
| J-02. Resolver y cerrar | Técnico asignado registra atención y resolución; coordinación realiza el cierre. Incluye el intento de cierre por un técnico y qué debe ocurrir con el estado. |
| J-03. Reasignación durante trabajo sin conexión | Técnico A inicia atención offline y coordinación asigna el caso a B. Explica qué información debe conservarse, qué cambio no debe imponerse y qué conflicto debe comunicarse. |

Estos escenarios son una revisión de requisitos. **No afirmes que los probaste en una aplicación completa ni implementes pantallas, login o sincronización.**

Si encuentras una mejora necesaria, ajusta sólo la sección correspondiente de `docs/problem-definition.md` y explica el motivo en tu revisión. No hagas cambios cosméticos sólo para producir un commit.

## 3. Ejecutar la prueba pública existente

Escribe primero tu predicción en el documento. Después ejecuta en PowerShell:

```powershell
npm test -- --ci --runInBand course-tests/public/week-01.test.ts 2>&1 | Tee-Object -FilePath reports/week-01/logs/jarumi-prueba-publica.txt
$jarumiTestExit = $LASTEXITCODE
Add-Content -LiteralPath reports/week-01/logs/jarumi-prueba-publica.txt -Value "EXIT_CODE=$jarumiTestExit"
```

Lee toda la salida. Registra en tu documento el resultado real y el código de salida. Si no pasa, documenta el mensaje y su causa; no escribas que pasó ni cambies la prueba.

La prueba pública comprueba aspectos básicos del reporte y de los documentos. **No comprueba los flujos de negocio que describas en tu revisión.** Explica esa diferencia.

## 4. Revisar tu entrega antes del commit

Confirma que:

- Tu análisis tiene conclusiones justificadas; si utilizaste escenarios, incluyen datos ficticios concretos.
- Trabajaste sólo el riesgo 1 e incluiste evento, consecuencia, probabilidad e impacto justificados, mitigación, comprobación prevista y prioridad. Las otras dos filas se conservaron.
- Cada resultado esperado se conecta con una sección del caso o un criterio.
- Los hallazgos tienen una conclusión técnica.
- La predicción se escribió antes de comprobar.
- El resultado registrado coincide con el log que generaste.
- No se modificaron pruebas, evaluador, workflows ni código de la app.

## 5. Guardar tu aportación técnica con tu identidad

Antes de guardar, revisa:

```powershell
git status --short
git diff --check
git diff --exit-code -- App.tsx course-tests tools/course_public_evaluator.py package.json package-lock.json Makefile .github
```

El último comando debe terminar con código 0 y sin diferencias: tu aportación no debe dejar cambios en esos archivos protegidos. Revisa también tu nuevo documento y las salidas guardadas, porque los archivos nuevos no aparecen en un `git diff` normal.

Guarda exclusivamente tus archivos:

```powershell
git add -- docs/problem-definition.md docs/risk-register.md docs/jarumi-criterios.md reports/week-01/logs/jarumi-prueba-publica.txt
git diff --cached --stat
git commit -m "docs: analizar riesgo de reasignacion y criterios con Jarumi"
git rev-parse HEAD
git show --stat --format=fuller HEAD
```

Copia el SHA completo de **40 caracteres**. Éste es **tu SHA de aportación técnica**. Verifica que el autor sea tu identidad y que los archivos mostrados correspondan a tu trabajo.

## 6. Completar únicamente tu registro individual

Abre `evidence/week-01/individual.json`. Tu lugar asignado es **el objeto número 2 de `members`**, es decir, **`members[1]` si la IA usa índices desde cero**.

- Conserva exactamente tres objetos.
- No completes ni cambies los objetos 1 y 3.
- Si tu posición ya contiene datos reales de otra persona, no los sobrescribas: informa del conflicto.
- Conserva `schemaVersion: 1` y `week: 1`.
- Usa el identificador oficial confirmado en `teamId`. Si ya hay un valor distinto del que te dieron, acláralo antes de cambiarlo. Si no conoces ese dato o tu identificador escolar, solicita los datos; no inventes valores.
- No cambies `baseline.json` ni `engineering.json` para intentar resolver validaciones generales del equipo.

Completa los campos de tu objeto así:

| Campo | Qué debes escribir |
|---|---|
| `studentId` | Tu identificador escolar real, según la indicación del docente. |
| `commitShas` | Una lista con el SHA completo de tu commit técnico del paso 5. No uses un commit de otra persona. |
| `files` | Rutas de tus archivos significativos; incluye `docs/jarumi-criterios.md` y los demás que realmente trabajaste. |
| `tests` | Los comandos o pruebas que realmente ejecutaste. En tu tarea: la prueba pública de semana 1; añade otras únicamente si las ejecutaste. |
| `reviews` | Describe tu revisión del riesgo 1 y de sus criterios: qué comparaste y qué conclusión obtuviste. |
| `prediction` | La predicción que escribiste **antes** de comprobar. No la adaptes después para que coincida con el resultado. |
| `command` | El comando exacto que utilizaste para comprobar tu aportación, con sus argumentos. |
| `observedResult` | La salida que obtuviste, incluida la cantidad de pruebas aprobadas o fallidas y el código de salida. |
| `explanation` | Por qué ocurrió ese resultado, su relación con tu trabajo y qué cosas no demuestra esa prueba. |

No dejes simultáneamente `tests` y `reviews` vacíos. No atribuyas a tu ejecución los resultados de un archivo generado por otra persona.

Comprueba que el JSON se puede leer:

```powershell
python -c "import json; from pathlib import Path; json.loads(Path('evidence/week-01/individual.json').read_text(encoding='utf-8')); print('JSON valido')"
git diff -- evidence/week-01/individual.json
```

Revisa que el diff sólo afecte tu objeto y, si correspondía, el identificador oficial compartido del equipo. Guarda esa evidencia en un segundo commit:

```powershell
git add -- evidence/week-01/individual.json
git commit -m "docs: registrar evidencia individual de Jarumi"
git rev-parse HEAD
git push -u origin semana-01-jarumi
```

## 7. Entregar tu rama para revisión

Abre un pull request en GitHub con **base `main`** y **compare `semana-01-jarumi`**. En su descripción escribe:

- Qué revisaste o corregiste.
- Qué archivo documenta tu aportación.
- Qué comandos ejecutaste y sus resultados reales.
- El SHA completo de tu commit técnico.
- Cualquier problema o requisito que siga pendiente.

Entrega el enlace del pull request y tu SHA técnico. Para conservar la trazabilidad de ese SHA, los commits originales deben mantenerse al integrar; no reescribas el historial ni uses `push --force`.

Tu tarea termina con tu aportación documentada, tus pruebas ejecutadas, tu registro individual completado con datos reales y tu rama publicada. **No crees la etiqueta `week-01-final` ni entregues en Classroom por tu cuenta.** Las referencias globales de evidencia y las comprobaciones finales se actualizan después de integrar las aportaciones.

Un workflow general puede seguir fallando mientras falten otros registros o se consolide el SHA del equipo. Informa del mensaje; no modifiques pruebas, evaluador, workflows ni datos ajenos para ponerlo en verde.

## Texto para copiar en una IA

Copia este texto en la IA con acceso a tu copia del repositorio:

```text
Soy Jarumi y voy a realizar únicamente mi aportación a la semana 1 de CampusOps.
Repositorio: https://github.com/Oscar71k1/DMI-Equipo-4.
Trabaja en mi copia local y en la rama semana-01-jarumi.

Antes de modificar archivos, lee completo LEEME_PRIMERO.md, después RUBRICA.md y docs/CAMPUSOPS.md. Revisa git status para conservar cualquier trabajo existente. Pídeme una sola vez los datos que falten: mi nombre y correo de autor Git, mi identificador escolar y el identificador oficial del equipo. No inventes datos y no solicites contraseñas ni tokens. Configura sólo mi identidad local en este repositorio.

Comprueba el entorno exigido y la instalación original. No actualices versiones ni cambies herramientas del curso para ocultar errores.

Aplica la rúbrica oficial: reproducción 2.5 puntos; definición del caso 2.0; diagnóstico de falla 1.5; decisión técnica 1.5; evidencia individual 0.5. Mi tarea respalda principalmente definición del caso y evidencia individual. Verifica el mínimo de tres criterios de aceptación del equipo y la relación de los criterios pertinentes con mi riesgo 1. El equipo conserva tres riesgos en total, pero yo trabajo sólo uno. No exijas tres incidencias ni tres escenarios por estudiante. Los documentos de revisión no sustituyen las cinco plantillas obligatorias ni autorizan a completar registros ajenos.

Mi único riesgo asignado es el riesgo 1 de docs/risk-register.md: un cambio de atención sin conexión sobrescribe una reasignación posterior. Documenta mi análisis propio del evento, consecuencia, probabilidad y motivo, impacto y motivo, mitigación, comprobación observable prevista y justificación de su prioridad. Usa el caso de un técnico A que trabaja offline, coordinación reasigna a B y A sincroniza. Distingue la comprobación futura de sincronización de las pruebas que realmente ejecutemos. Mejora sólo la fila de mi riesgo si encuentras un problema sustantivo; conserva las otras dos filas. Si ya es suficiente, justifica esa conclusión en mi revisión; no te atribuyas el texto existente como trabajo nuevo.

Mi tarea es revisar docs/problem-definition.md contra docs/CAMPUSOPS.md y crear docs/jarumi-criterios.md. Incluye:

1. Objetivo y documentos comparados.
2. Predicción escrita antes de la comprobación.
3. Un análisis de mi riesgo 1 y de los criterios relacionados, con conclusiones sobre su claridad y comprobación. La consigna no pide tres incidencias ni tres escenarios por estudiante. Puedes utilizar el conflicto por reasignación como apoyo, sin imponer una cantidad de escenarios.
4. Si utilizas escenarios, incluye actor, estado inicial, datos sintéticos, acción, resultado esperado, referencia al caso o criterio y método futuro de comprobación.
5. Hallazgos, conclusión razonada y mejoras sustantivas si hacen falta.
6. Comando exacto, resultado real, explicación y límites.

Modifica docs/problem-definition.md sólo si encuentras una mejora justificada en la sección relacionada. En docs/risk-register.md limita cualquier cambio a la fila de mi riesgo 1. No implementes la aplicación ni presentes los escenarios futuros como pruebas ya ejecutadas.

Ejecuta la prueba existente:
npm test -- --ci --runInBand course-tests/public/week-01.test.ts
Conserva su salida y código de retorno en reports/week-01/logs/jarumi-prueba-publica.txt. Si falla, registra el error real. No edites ni desactives pruebas, evaluador, workflows, Makefile o scripts npm. No cambies baseline.json ni engineering.json.

Muéstrame qué revisamos y qué demuestra realmente el resultado para que pueda explicarlo. Guarda mi revisión, las mejoras justificadas y mi log en un commit con mi identidad. Obtén su SHA completo de 40 caracteres.

Después completa únicamente members[1], segundo objeto de evidence/week-01/individual.json, con mis datos y mi commit técnico real. Si contiene datos de otra persona, detente antes de sobrescribirlo. Conserva exactamente tres objetos y no rellenes los registros ajenos. Usa sólo pruebas y revisiones que hicimos en esta sesión y la predicción que escribimos antes. El teamId debe ser el oficial confirmado.

Valida la sintaxis del JSON y revisa el diff. Guarda mi evidencia individual en un segundo commit y publica mi rama. Prepara un pull request hacia main con archivos, comandos, resultados y SHA técnico. No crees etiquetas finales, no reescribas historial y no intentes aprobar los registros pendientes de otras personas.
```
