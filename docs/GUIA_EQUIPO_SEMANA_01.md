# Cómo incorporarse y terminar la semana 1

Repositorio del equipo: https://github.com/Oscar71k1/DMI-Equipo-4

Entrega: 7 de septiembre de 2026, 23:59, hora de Ciudad de México. Deben participar exactamente tres personas. La guía obligatoria es `LEEME_PRIMERO.md`: leerla completa y seguir su secuencia. Este archivo es un apoyo opcional para organizar invitaciones y aportaciones; no agrega requisitos de evaluación ni sustituye las instrucciones del ZIP corregido.

Conservar todo el trabajo completado y copiar del ZIP corregido únicamente los archivos que falten. Las pruebas predeterminadas, los workflows, el evaluador público y sus criterios deben permanecer como en el paquete original. La falla controlada se introduce temporalmente en el código de la aplicación y se corrige allí; nunca se edita, elimina, ignora o desactiva una prueba para conseguir que pase.

## 1. Oscar invita a sus dos compañeros

Cada compañero debe crear o usar su propia cuenta de GitHub y enviarle a Oscar su nombre de usuario. La invitación la inicia Oscar, como propietario del repositorio:

1. Abrir el repositorio y entrar a **Settings**.
2. En **Access**, entrar a **Collaborators**.
3. Elegir **Add people**, buscar al compañero y confirmar la invitación a esa cuenta.
4. Repetir con el otro compañero.

Cada invitado debe aceptar la invitación recibida de GitHub. No basta con que Oscar la envíe. No compartan una cuenta ni las credenciales.

Referencia: [invitaciones a repositorios personales, GitHub Docs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/repository-access-and-collaboration/inviting-collaborators-to-a-personal-repository).

## 2. Oscar publica el avance antes de que comiencen

Los archivos preparados en la computadora de Oscar sólo aparecen en GitHub después de subir sus commits. Desde la carpeta del proyecto debe comprobar qué va a publicar con `git status --short` y `git log -3 --oneline` y subir el avance guardado:

```bash
git push origin main
```

Todavía no crear `week-01-final`: faltan aportaciones personales y evidencia. `individual.json` conserva campos pendientes deliberadamente. Si los compañeros cambian documentos o configuración, también habrá que actualizar el SHA de `baseline.json` y `engineering.json` al finalizar.

## 3. Cada compañero prepara su copia

Instalar Git, Node.js 22.22.0 con npm, GNU Make y Python 3. Abrir una terminal en la carpeta donde quiera guardar el proyecto y ejecutar:

```bash
git clone https://github.com/Oscar71k1/DMI-Equipo-4.git
cd DMI-Equipo-4
git config user.name "TU NOMBRE"
git config user.email "TU CORREO DE AUTOR EN GITHUB"
git config user.name
git config user.email
```

Cambiar los textos en mayúsculas por datos propios. Se puede usar el correo privado `noreply` que muestre la configuración de correo de la propia cuenta de GitHub. Esta configuración local sólo afecta este repositorio. Al subir cambios, autenticar la cuenta propia mediante el mecanismo de GitHub que tenga configurado cada persona.

Referencia: [configuración de Git, GitHub Docs](https://docs.github.com/en/get-started/git-basics/set-up-git).

Si usan nvm en Windows, seleccionar la versión explícita:

```bash
nvm use 22.22.0
node --version
npm --version
make --version
python --version
make setup
make feedback
```

`node --version` debe mostrar `v22.22.0`. Si no usan nvm, comprobar que su instalación activa tenga esa versión. Si la terminal no encuentra una herramienta recién instalada, abrir una terminal nueva. En PowerShell, cuando Python esté disponible como `python`, configurar para esta sesión antes de ejecutar las verificaciones semanales:

```powershell
$env:PYTHON = 'python'
```

El evaluador público se conserva idéntico al del paquete original. En esta computadora se detectó que Python para Windows no localiza `npm` al lanzarlo desde el evaluador, aunque `npm run test:smoke` funciona desde PowerShell. Resolver la compatibilidad del entorno antes del cierre, usando un entorno compatible con las herramientas originales o solicitando al docente una indicación de entorno. No parchear el evaluador ni presentar un fallo de herramientas como la falla controlada. Las ejecuciones previas con un lanzador modificado no acreditan la validación final del paquete original.

Leer `docs/CAMPUSOPS.md`, `RUBRICA.md`, `docs/problem-definition.md` y `docs/risk-register.md`. La instalación original debe pasar antes de provocar una falla. Un problema de instalación no cuenta como la falla controlada del equipo.

## 4. Reparto propuesto: cada persona produce evidencia propia

Los documentos iniciales y el procedimiento fueron preparados con asistencia de Codex. Cada integrante debe comprender, revisar y comprobar su aportación antes de registrarla como propia. Ejecutar comandos personalmente y explicar resultados aporta evidencia; copiar salidas de otra sesión no demuestra ejecución propia. El reparto y los archivos de revisión propuestos abajo son opcionales: el equipo puede elegir otras aportaciones técnicas verificables dentro de `LEEME_PRIMERO.md`; los registros obligatorios siguen siendo las plantillas del paquete.

| Responsable | Trabajo concreto | Archivo propio y comprobación |
|---|---|---|
| Oscar | Revisar la preparación del entorno y la decisión técnica, repetir el diagnóstico y explicar por qué una respuesta exitosa debe producir `available`. Integrar los cambios del equipo. | Documentos y correcciones que realmente haya revisado; guardar predicción, ejecución personal de `make feedback` y del diagnóstico y resultados. |
| Compañero 2 | Revisar alcance, actores y criterios de aceptación contra `docs/CAMPUSOPS.md`. Construir una matriz de al menos tres escenarios con datos sintéticos, actor, estado inicial, acción, resultado esperado y modo de comprobarlo. Incluir resolución frente a cierre y conflicto por reasignación. Corregir ambigüedades que encuentre. | Crear `docs/reviews/revision-caso.md` con la matriz, referencias a los criterios, hallazgos y conclusión. Registrar qué comportamientos siguen pendientes de implementación. Ejecutar personalmente la prueba pública de semana 1. |
| Compañero 3 | Revisar y justificar la prioridad de los tres riesgos. Repetir de forma independiente la falla y la corrección del procedimiento, comparar predicción con salida y explicar síntoma, causa y límites del test. | Crear `docs/reviews/revision-diagnostico.md` con la revisión, comandos y resultados; corregir el registro de riesgos si hay un hallazgo. Guardar sus propias salidas en `reports/week-01/logs/` con nombres distintos. |

La matriz del compañero 2 describe escenarios futuros; no debe afirmar que la aplicación ya los ejecuta. El compañero 3 no debe atribuir a la prueba smoke la comprobación de sincronización, permisos o un servidor real. El equipo debe discutir y adoptar o ajustar la decisión de `engineering.json`.

## 5. Compañero 2: rama, revisión y comprobación

```bash
git switch main
git pull --ff-only origin main
git switch -c semana-01-caso
```

Crear la carpeta `docs/reviews` si no existe, elaborar `revision-caso.md` y editar `problem-definition.md` únicamente si encuentra una mejora sustantiva. Antes de la prueba, escribir qué espera y por qué. Después ejecutar:

```bash
npm test -- --ci --runInBand course-tests/public/week-01.test.ts
git diff -- docs/problem-definition.md
```

Anotar el resultado real. Esta prueba comprueba partes básicas del reporte y documentos; no valida por sí sola la calidad de la matriz. La revisión debe aportar el razonamiento que el test no puede evaluar. Guardar y subir sólo sus archivos:

```bash
git add docs/problem-definition.md docs/reviews/revision-caso.md
git commit -m "docs: revisar escenarios y criterios de CampusOps"
git rev-parse HEAD
git push -u origin semana-01-caso
```

## 6. Compañero 3: rama y diagnóstico independiente

```bash
git switch main
git pull --ff-only origin main
git switch -c semana-01-diagnostico
```

Crear `docs/reviews/revision-diagnostico.md`, revisar los riesgos y seguir `evidence/week-01/procedimiento-falla.md`. Primero anotar la predicción; después modificar temporalmente sólo la transición de éxito de `App.tsx`, ejecutar `npm run test:smoke`, guardar el fallo, restaurar el código y repetir el mismo comando. En PowerShell puede conservar sus salidas así:

```powershell
npm run test:smoke 2>&1 | Tee-Object -FilePath reports/week-01/logs/companero-3-falla.txt
```

Después de restaurar el código:

```powershell
npm run test:smoke 2>&1 | Tee-Object -FilePath reports/week-01/logs/companero-3-corregido.txt
```

Confirmar que `git diff -- App.tsx course-tests` no muestra cambios. Explicar en su revisión qué esperaba, qué recibió y por qué. Un fallo esperado durante el experimento no debe quedar activo al terminar.

```bash
git add docs/risk-register.md docs/reviews/revision-diagnostico.md reports/week-01/logs/companero-3-falla.txt reports/week-01/logs/companero-3-corregido.txt
git commit -m "docs: verificar riesgos y repetir diagnostico controlado"
git rev-parse HEAD
git push -u origin semana-01-diagnostico
```

## 7. Integrar y reunir las aportaciones

Cada compañero envía a Oscar la rama y el SHA completo de su commit. Puede abrir un pull request hacia `main` en GitHub para que Oscar revise el cambio. Integrar conservando los commits originales de los integrantes (por ejemplo, con **Create a merge commit**), de modo que los SHA que registren sigan presentes en el historial. Resolver los conflictos antes de continuar.

Cada persona debe entregar estos datos reales a quien consolide `individual.json`:

- Identificador escolar indicado por el docente y el identificador oficial del equipo.
- SHA completo de su commit y archivos donde hizo una aportación significativa.
- Pruebas ejecutadas o revisión técnica realizada, con al menos una de las dos.
- Predicción escrita antes de comprobar, comando exacto, resultado observado y explicación.

El nombre del repositorio no sustituye el identificador oficial del equipo. No completar un registro con el commit, salida o trabajo de otra persona. La evidencia de Oscar también debe reflejar lo que él personalmente comprobó.

## 8. Oscar cierra la entrega cuando estén las tres aportaciones

1. Con todo integrado en `main`, actualizar su copia con `git pull --ff-only origin main`. Repetir las comprobaciones y el diagnóstico desde esa versión; los logs preparados antes son un antecedente y no sustituyen comprobar el SHA final.
2. Terminar y guardar todos los cambios de código, configuración y documentos. Obtener `git rev-parse HEAD`: éste será el SHA del trabajo técnico definitivo.
3. Actualizar `baseline.json` y `engineering.json` con ese mismo SHA y observaciones actuales. Completar `individual.json` con exactamente tres aportaciones comprobables. A partir de aquí sólo cambiar `reports/` y `evidence/`.
4. Buscar `REEMPLAZAR` en los tres JSON y revisar que no queden campos pendientes. Ejecutar `make feedback`, `make verify-week-01` y `make public-test-week-01`. Si algo falla, corregir la causa y repetir. Si cambia código o documentos, volver al punto 2 y obtener otro SHA.
5. Cuando todo pase, ejecutar los pasos 14 a 17 de `LEEME_PRIMERO.md`: commit exclusivo de evidencias, etiqueta anotada, `make evidence-week-01`, comprobación de `failure.json`, subida de rama y etiqueta y entrega en Classroom. No crear la etiqueta antes de completar lo anterior.

En Classroom sólo se entrega:

```text
Repositorio: https://github.com/Oscar71k1/DMI-Equipo-4
Etiqueta: week-01-final
SHA: el SHA completo que devuelva git rev-list -n 1 week-01-final
```
