# Guía de trabajo de Fernanda — CampusOps, semana 1

**Estado: aportación de Fernanda completada e integrada en `main`.** Esta guía conserva las indicaciones de preparación entregadas antes de su trabajo; sus pasos y el texto para IA son una referencia de esa etapa. El resultado realizado está en [fernanda-diagnostico.md](fernanda-diagnostico.md) y en [individual.json](../evidence/week-01/individual.json). El estado de la entrega y los archivos que se evalúan están en el [índice del equipo](GUIA_EQUIPO_SEMANA_01.md). Las rutas se actualizaron a la organización actual.

**Tu responsabilidad:** trabajar un solo riesgo, el riesgo 3 sobre la disponibilidad del backend mostrada en la interfaz, y ejecutar de forma independiente su falla controlada, diagnóstico y corrección.

**Alcance de esta guía:** tu único riesgo asignado es el riesgo 3. Conserva las otras dos filas del registro: la consigna exige tres riesgos en total para el equipo. La consigna pide una falla controlada del equipo; repetirla de forma independiente es la aportación propuesta para ti. Los tres logs indicados abajo corresponden a tres momentos de ese único experimento: antes, durante la falla y después de corregirla.

**Tu rama:** `semana-01-fernanda`.

**Tus archivos:** `docs/fernanda-diagnostico.md`, tres logs propios en `reports/week-01/logs/`, tu registro en `evidence/week-01/individual.json` y, únicamente si identificas una mejora sustantiva, la fila del riesgo 3 en `docs/risk-register.md`.

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

Tu revisión del **riesgo 3** aporta a **Definición del caso**. Tu ejecución independiente del fallo y de su corrección aporta a **Diagnóstico de falla**. Tu revisión, logs, commit y registro personal respaldan **Evidencia individual**.

Tu responsabilidad es un solo riesgo. Documenta su evento, consecuencia, probabilidad e impacto justificados, mitigación, comprobación observable y motivo de su prioridad. El registro del equipo debe conservar los tres riesgos; tu tarea se centra en la disponibilidad mostrada por la interfaz.

## 1. Preparar tu cuenta y tu copia

1. Acepta la invitación de colaboración al repositorio **https://github.com/Oscar71k1/DMI-Equipo-4**. Si no recibiste la invitación, solicítala.
2. Usa tu propia cuenta de GitHub. Ten a mano tu identificador escolar y el identificador oficial del equipo. No deduzcas el identificador del equipo a partir del nombre del repositorio.
3. Abre PowerShell en una carpeta donde quieras guardar el proyecto. Si ya tienes una copia, revisa `git status --short` antes de actualizarla; no borres cambios existentes.
4. Si no tienes una copia, ejecuta:

```powershell
git clone https://github.com/Oscar71k1/DMI-Equipo-4.git DMI-Equipo-4-Fernanda
cd DMI-Equipo-4-Fernanda
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
git switch -c semana-01-fernanda
make setup
make feedback
```

Si tu rama ya existe, usa `git switch semana-01-fernanda` después de revisar el estado; no la borres ni la recrees. Si falla la instalación o una herramienta, conserva el mensaje y resuelve el entorno antes de atribuirte una comprobación exitosa. No cambies versiones del proyecto, pruebas ni umbrales para ocultar un error.

## 2. Trabajar el riesgo 3 y preparar tu predicción

Lee `docs/risk-register.md`, `docs/problem-definition.md`, `docs/procedimiento-falla.md`, `App.tsx` y `course-tests/smoke.test.tsx`.

### Tu único riesgo asignado

Trabaja la fila de prioridad 3 de `docs/risk-register.md`: **la interfaz muestra incorrectamente la disponibilidad del backend**, por ejemplo `offline` después de una respuesta exitosa. Identifica el riesgo por su contenido si la tabla cambió de orden.

Explica qué transición causa el estado incorrecto, cómo desorienta al usuario y por qué la prueba smoke existente puede detectarlo. Justifica la probabilidad y el impacto usando el alcance actual del starter. La mitigación debe relacionar una respuesta exitosa con `available`, y la comprobación debe conservar la salida del fallo y la de su corrección.

Desarrolla tu análisis con tus propias palabras. No basta con copiar la fila y atribuírtela. Conserva las otras dos filas y el total de tres riesgos del equipo.

Crea las carpetas necesarias:

```powershell
New-Item -ItemType Directory -Force -Path docs,reports/week-01/logs
```

Crea `docs/fernanda-diagnostico.md` con estas secciones:

1. **Objetivo de la revisión y del experimento.**
2. **Análisis del riesgo 3: disponibilidad del backend en la interfaz.**
3. **Plan y predicción antes de modificar App.tsx.**
4. **Comprobación original.**
5. **Falla observada: comando, mensaje y código de salida.**
6. **Síntoma y causa, explicados por separado.**
7. **Corrección y nueva ejecución del mismo comando.**
8. **Comparación entre predicción y resultado.**
9. **Conclusión, límites y relación con el riesgo de la interfaz.**

Para tu único riesgo revisa y documenta:

- Si el evento y su consecuencia están claros.
- Si la probabilidad tiene una justificación coherente.
- Si el impacto está explicado.
- Si la mitigación propone una acción concreta.
- Si su comprobación describe un resultado observable.
- Si su posición en la prioridad está justificada.

Si encuentras una mejora necesaria, corrige **sólo la fila de tu riesgo 3** en `docs/risk-register.md` y explica el motivo en tu revisión. Si la fila ya es suficiente, justifica tu conclusión con el análisis y el experimento que realices. Conserva las otras dos filas. Para justificar por qué tu riesgo ocupa la tercera prioridad puedes leerlas como contexto, sin desarrollar sus análisis ni cambiar su orden.

Distingue las mitigaciones futuras de sincronización de la prueba disponible ahora. La prueba smoke no demuestra que la sincronización ni los permisos de negocio estén implementados.

## 3. Ejecutar personalmente la falla y la corrección

Haz el experimento sólo después de que el proyecto original pase `make feedback`. Conserva la secuencia siguiente.

### A. Anotar el plan antes de cambiar el código

En tu documento escribe:

- Archivo: `App.tsx`.
- Lugar: rama `.then` de `getBackendHealth()`.
- Cambio temporal: enviar a `offline` una respuesta que fue exitosa.
- Comando detector: `npm run test:smoke`.
- Predicción: el test seguirá encontrando el título, pero fallará esperando `available` al recibir `Backend: offline`.
- Corrección prevista: restaurar `setStatus('available')` y repetir el mismo comando.

Lee la prueba original para explicar por qué esa predicción tiene sentido: el backend usado por ese test es un doble que resuelve correctamente. No modifiques el doble ni las aserciones.

### B. Guardar una ejecución original

```powershell
npm run test:smoke 2>&1 | Tee-Object -FilePath reports/week-01/logs/fernanda-smoke-antes.txt
$fernandaBeforeExit = $LASTEXITCODE
Add-Content -LiteralPath reports/week-01/logs/fernanda-smoke-antes.txt -Value "EXIT_CODE=$fernandaBeforeExit"
```

Continúa únicamente si pasó y el código es 0. Si falla, resuelve primero el problema original y conserva lo observado.

### C. Provocar sólo el cambio planeado

Busca esta línea en `App.tsx`:

```typescript
.then(() => active && setStatus('available'))
```

Cámbiala temporalmente por:

```typescript
.then(() => active && setStatus('offline'))
```

Si esa línea no existe o el archivo ya tenía cambios ajenos, no hagas una sustitución a ciegas: revisa el estado antes de continuar.

Ejecuta:

```powershell
npm run test:smoke 2>&1 | Tee-Object -FilePath reports/week-01/logs/fernanda-smoke-falla.txt
$fernandaFailureExit = $LASTEXITCODE
Add-Content -LiteralPath reports/week-01/logs/fernanda-smoke-falla.txt -Value "EXIT_CODE=$fernandaFailureExit"
git diff -- App.tsx
```

El resultado esperado es un fallo, pero debes registrar **lo que realmente apareció**. Copia a tu documento el mensaje relevante y el código de salida.

Explica por separado:

- **Síntoma:** qué texto o aserción no cumplió la ejecución.
- **Causa:** qué instrucción del código produjo ese texto incorrecto pese a una respuesta exitosa del doble.

No describas el fallo como una caída de un servidor real.

### D. Corregir y volver a comprobar

Restaura la línea original:

```typescript
.then(() => active && setStatus('available'))
```

Repite el mismo comando:

```powershell
npm run test:smoke 2>&1 | Tee-Object -FilePath reports/week-01/logs/fernanda-smoke-corregido.txt
$fernandaCorrectedExit = $LASTEXITCODE
Add-Content -LiteralPath reports/week-01/logs/fernanda-smoke-corregido.txt -Value "EXIT_CODE=$fernandaCorrectedExit"
git diff --exit-code -- App.tsx course-tests tools/course_public_evaluator.py package.json package-lock.json Makefile .github
```

La prueba corregida debe pasar con código 0. El diff debe quedar vacío. Si algo no coincide, investiga y corrige la causa; no guardes la app con la falla activa ni modifiques una prueba para conseguir un aprobado.

## 4. Completar el análisis técnico

En `docs/fernanda-diagnostico.md` registra una tabla con **estado original, falla y corrección**. Para cada fila incluye comando exacto, resultado real, código de salida y ruta del log.

Después explica:

- Por qué la predicción coincidió o no con la observación.
- Por qué la corrección resuelve la causa.
- Qué demuestra el test sobre el estado de la interfaz.
- Por qué no demuestra conectividad a un servidor real ni mitigación de los otros dos riesgos.
- Por qué el experimento es relevante para el riesgo de mostrar incorrectamente la disponibilidad.
- Qué cambiaste en la fila del riesgo 3, si hiciste una mejora, y por qué conservaste su prioridad. Comprueba que las otras dos filas sigan intactas.

Una revisión técnica puede ser una aportación significativa aunque el archivo `App.tsx` termine exactamente igual que al inicio. Lo verificable es tu análisis, tu experimento y tus salidas propias.

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
git add -- docs/risk-register.md docs/fernanda-diagnostico.md reports/week-01/logs/fernanda-smoke-antes.txt reports/week-01/logs/fernanda-smoke-falla.txt reports/week-01/logs/fernanda-smoke-corregido.txt
git diff --cached --stat
git commit -m "docs: analizar riesgo de interfaz y verificar diagnostico con Fernanda"
git rev-parse HEAD
git show --stat --format=fuller HEAD
```

Copia el SHA completo de **40 caracteres**. Éste es **tu SHA de aportación técnica**. Verifica que el autor sea tu identidad y que los archivos mostrados correspondan a tu trabajo.

## 6. Completar únicamente tu registro individual

Abre `evidence/week-01/individual.json`. Tu lugar asignado es **el objeto número 3 de `members`**, es decir, **`members[2]` si la IA usa índices desde cero**.

- Conserva exactamente tres objetos.
- No completes ni cambies los objetos 1 y 2.
- Si tu posición ya contiene datos reales de otra persona, no los sobrescribas: informa del conflicto.
- Conserva `schemaVersion: 1` y `week: 1`.
- Usa el identificador oficial confirmado en `teamId`. Si ya hay un valor distinto del que te dieron, acláralo antes de cambiarlo. Si no conoces ese dato o tu identificador escolar, solicita los datos; no inventes valores.
- No cambies `baseline.json` ni `engineering.json` para intentar resolver validaciones generales del equipo.

Completa los campos de tu objeto así:

| Campo | Qué debes escribir |
|---|---|
| `studentId` | Tu identificador escolar real, según la indicación del docente. |
| `commitShas` | Una lista con el SHA completo de tu commit técnico del paso 5. No uses un commit de otra persona. |
| `files` | Rutas de tus archivos significativos; incluye `docs/fernanda-diagnostico.md` y los demás que realmente trabajaste. |
| `tests` | Los comandos o pruebas que realmente ejecutaste. En tu tarea: las ejecuciones originales, fallida y corregida de la prueba smoke; describe el contexto de cada una. |
| `reviews` | Describe tu revisión del riesgo 3: qué comparaste, cómo se relaciona con tu experimento y qué conclusión obtuviste. |
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
git commit -m "docs: registrar evidencia individual de Fernanda"
git rev-parse HEAD
git push -u origin semana-01-fernanda
```

## 7. Entregar tu rama para revisión

Abre un pull request en GitHub con **base `main`** y **compare `semana-01-fernanda`**. En su descripción escribe:

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
Soy Fernanda y voy a realizar únicamente mi aportación a la semana 1 de CampusOps.
Repositorio: https://github.com/Oscar71k1/DMI-Equipo-4.
Trabaja en mi copia local y en la rama semana-01-fernanda.

Antes de modificar archivos, lee completo LEEME_PRIMERO.md, después RUBRICA.md y docs/CAMPUSOPS.md. Revisa git status y conserva cualquier trabajo existente. Pídeme una sola vez los datos que falten: mi nombre y correo de autor Git, mi identificador escolar y el identificador oficial del equipo. No inventes datos y no solicites contraseñas ni tokens. Configura sólo mi identidad local en este repositorio.

Comprueba el entorno requerido y ejecuta make setup y make feedback. La instalación original debe pasar antes del experimento. No cambies versiones, pruebas ni umbrales para ocultar errores.

Aplica la rúbrica oficial: reproducción 2.5 puntos; definición del caso 2.0; diagnóstico de falla 1.5; decisión técnica 1.5; evidencia individual 0.5. Mi tarea respalda definición del caso mediante mi único riesgo asignado, el riesgo 3, diagnóstico de falla mediante mi experimento y evidencia individual mediante mi commit y registro. No presentes esos puntos como una calificación garantizada ni los documentos personales como sustitutos de las plantillas obligatorias.

Lee docs/risk-register.md, docs/problem-definition.md, docs/procedimiento-falla.md, App.tsx y course-tests/smoke.test.tsx. Crea docs/fernanda-diagnostico.md. Trabaja sólo el riesgo 3: la interfaz muestra incorrectamente la disponibilidad del backend. Documenta mi análisis del evento, consecuencia, probabilidad justificada, impacto justificado, mitigación, comprobación y prioridad. Si identificas una mejora sustantiva, modifica sólo la fila de mi riesgo en docs/risk-register.md y explica el motivo; conserva las otras dos filas y el total de tres riesgos. Si ya es suficiente, justifica esa conclusión. No me atribuyas el texto existente como trabajo nuevo. La consigna no exige tres incidencias por persona y este reparto me asigna un solo riesgo.

Antes de tocar App.tsx, escribe el plan, la predicción y cómo restaurarás el archivo. Ejecuta personalmente npm run test:smoke y guarda la salida original en reports/week-01/logs/fernanda-smoke-antes.txt.

Sólo si la ejecución original pasa, cambia temporalmente en App.tsx la rama de éxito:
.then(() => active && setStatus('available'))
por:
.then(() => active && setStatus('offline'))

Ejecuta exactamente npm run test:smoke y conserva la salida y el código de retorno en reports/week-01/logs/fernanda-smoke-falla.txt. Registra el mensaje real, distingue síntoma y causa y explica por qué el doble exitoso produce una interfaz incorrecta.

Restaura la línea original, repite npm run test:smoke y guarda la salida y código de retorno en reports/week-01/logs/fernanda-smoke-corregido.txt. Comprueba que App.tsx y los archivos de pruebas, evaluador, workflows, Makefile y scripts npm no tengan diferencias pendientes. Nunca modifiques el test ni dejes la falla activa.

Completa mi revisión con tabla antes/falla/corrección, comandos exactos, resultados, predicción comparada, explicación, límites y relación con el riesgo de interfaz. No afirmes que probamos un backend real o que implementamos sincronización. No cambies baseline.json ni engineering.json.

Muéstrame el diagnóstico para que pueda explicarlo. Guarda mi revisión, mis logs y las mejoras justificadas a mi único riesgo en un commit con mi identidad y obtén su SHA completo.

Después completa únicamente members[2], tercer objeto de evidence/week-01/individual.json, con mis datos y mi SHA técnico real. Si contiene datos de otra persona, detente antes de sobrescribirlo. Conserva exactamente tres objetos y no rellenes registros ajenos. Usa sólo las pruebas y revisiones realmente realizadas y mi predicción anterior. El teamId debe ser el oficial confirmado.

Valida la sintaxis del JSON y revisa el diff. Guarda mi evidencia individual en un segundo commit y publica mi rama. Prepara un pull request hacia main con archivos, comandos, resultados y SHA técnico. No crees etiquetas finales, no reescribas historial y no intentes aprobar los registros pendientes de otras personas.
```
