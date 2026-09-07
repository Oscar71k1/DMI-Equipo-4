# Preparación del historial Git con el workflow original

Los workflows conservan su versión inicial. La preparación del historial está implementada directamente en el Makefile y se ejecuta antes de instalar las dependencias con `make setup`. La carpeta `tools/` contiene únicamente `course_public_evaluator.py`, con su contenido original. Las pruebas y los comandos de comprobación también permanecen originales.

## Problema y causa

El checkout original de GitHub Actions descarga un solo commit. La guía de entrega pide que `baseline.json` y `engineering.json` apunten al commit técnico anterior al commit exclusivo de evidencias. El evaluador original consulta `git rev-parse HEAD^` y compara los archivos cambiados entre esos dos commits. Una copia superficial no permite esa consulta, aunque contenga los archivos finales del proyecto.

El síntoma es `commitSha must be HEAD or its direct evidence-only parent`. La causa, en este caso, es la ausencia del historial necesario. Esta incidencia de preparación es distinta de la falla controlada de interfaz de la actividad.

## Cambio realizado y alternativas

Se conserva la instalación con `npm ci` y se prepara el historial mediante un requisito previo en [Makefile](../Makefile):

```make
setup: prepare-git-history
	$(NPM) ci

prepare-git-history:
	$(PYTHON) -c "$(CAMPUSOPS_PREPARE_HISTORY)"
```

La variable `CAMPUSOPS_PREPARE_HISTORY` contiene el código de preparación, legible en el propio Makefile. Make une sus líneas antes de pasarlo a Python; no se crea ni se importa un archivo Python adicional. Se comprueba si existe un repositorio y si es superficial. Si el paquete todavía no tiene `.git`, continúa con la instalación, como necesita el paso 2 de la guía. Si el historial ya está completo, continúa sin hacer una descarga.

Si la copia es superficial, ejecuta:

```bash
git fetch --unshallow --no-tags --no-recurse-submodules origin
```

Después comprueba que el historial esté completo y que `HEAD` conserve el mismo SHA. Si Git falla, el script devuelve un error y Make detiene la preparación. No cambia reportes, SHA declarados, ramas de trabajo, pruebas ni resultados.

`--no-tags` conserva la referencia de la etiqueta que ya creó el checkout de Actions. Para ejecutar desde `week-01-final`, el checkout puede crear esa referencia directamente en el commit; intentar descargarla de nuevo como etiqueta anotada produce un conflicto aunque apunte al mismo commit. Recuperar el historial de commits no requiere sustituir esa referencia. La validación original de `frozen_sha` sigue comprobando que la etiqueta corresponda al SHA evaluado.

Se consideraron dos ubicaciones para la misma preparación: configurar `fetch-depth` en el checkout, o recuperar el historial desde `make setup`. Se elige la segunda para conservar ambos workflows exactamente como en el paquete inicial, conforme a la preferencia de Oscar. Después se integró el código en el Makefile para conservar también la composición original de `tools/`. El costo es mantener ese bloque de preparación y necesitar Git, Python y acceso a `origin` cuando falte historial; esos requisitos ya forman parte del entorno del curso y de Actions. Un cambio de ubicación no elimina la necesidad de descargar el historial.

## Antecedentes de la preparación con un archivo separado

La verificación se ejecutó con asistencia de Codex en copias aisladas, usando el helper en preparación y el evaluador original. La copia superficial se creó desde `7acbbb8a4a452827eee5528d6703a5ef351bf4bd`, la entrega anterior; no se modificaron sus JSON para cambiar el resultado. La salida completa está en [oscar-preparacion-git.txt](../reports/week-01/logs/oscar-preparacion-git.txt).

| Caso comprobado | Resultado observado |
|---|---|
| Repositorio completo sin remoto configurado | Código 0, sin descarga. |
| Paquete sin `.git`, situado dentro de otro repositorio | Código 0; no se actuó sobre el repositorio de la carpeta padre. |
| Copia creada con `git clone --depth 1 --no-local`, antes de preparar | El evaluador original rechazó los SHA de baseline y engineering por no poder consultar el padre. |
| La misma copia con un remoto inexistente temporal | Código 128; se conservó el SHA y la copia siguió siendo superficial. El error no se ocultó. |
| La copia superficial con su remoto correcto, después de preparar | Código 0, historial completo, mismo SHA, rama y estado de archivos. El evaluador original aprobó baseline y engineering. |
| Segunda ejecución sobre la copia ya preparada | Código 0, sin descargar otra vez. |

La predicción antes de ejecutar las comprobaciones completas de esta versión es que `make setup` preparará el historial que necesita el evaluador y que las comprobaciones de aplicación seguirán pasando: el cambio no toca su código ni sus pruebas. Los resultados completos del cierre se guardan en los logs y reportes de `reports/week-01/` y en el registro individual de Oscar. La comprobación final en GitHub Actions debe corresponder al SHA de la entrega actual.

## Corrección del caso de etiqueta en Actions

La [ejecución de la etiqueta sobre 98e3bfb](https://github.com/Oscar71k1/DMI-Equipo-4/actions/runs/34082203744) se detuvo en `Reproducible setup`. La comprobación inicial con `git clone --depth 1` no representaba la forma particular en que Actions obtiene una etiqueta a partir de su SHA. Se reprodujo esa forma de checkout en dos copias nuevas utilizando el mismo commit, el mismo nombre de etiqueta y el mismo evaluador original.

Con el helper anterior, `git fetch --unshallow --tags` devolvió código 1 y el mensaje `would clobber existing tag`. Con el helper corregido a `--no-tags`, se recuperó el historial con código 0; `HEAD`, la referencia de la etiqueta y el estado de los archivos permanecieron iguales. Después, el evaluador original en modo `evidence` aprobó todos sus controles, incluido `frozen_sha`. La reproducción completa se conserva en [oscar-checkout-etiqueta.txt](../reports/week-01/logs/oscar-checkout-etiqueta.txt).

En esa revisión se modificó únicamente el helper de preparación. Los logs con sufijo `-etiqueta.txt` conservan sus comprobaciones completas. Después se retiró el archivo separado, manteniendo la corrección `--no-tags` dentro del Makefile.

## Integración directa en Makefile

Se eliminó `tools/prepare_git_history.py` y se trasladó su función al objetivo `prepare-git-history` del Makefile. La comprobación se realizó con copias aisladas de rama y etiqueta, usando el checkout superficial por SHA que utiliza Actions. En cada copia se retiró el archivo Python adicional antes de ejecutar el nuevo objetivo de Make; `tools/` contenía únicamente el evaluador original.

Ambas copias rechazaron los SHA de evidencia antes de preparar el historial y los aprobaron después. Se conservaron `HEAD`, la referencia seleccionada y el estado de los archivos. La validación original de evidencia congelada también aprobó en el caso de etiqueta. Un repositorio completo sin remoto y un paquete sin `.git` terminaron sin descargar; con un remoto inexistente, Git devolvió 128 y Make detuvo la preparación con código 2. La segunda ejecución sobre una copia ya preparada terminó sin descargar otra vez. La salida real está en [oscar-makefile-integrado.txt](../reports/week-01/logs/oscar-makefile-integrado.txt).

Antes de las comprobaciones completas de este cambio, se espera que `make setup` y los comandos de evaluación sigan pasando: la preparación conserva su función, los archivos obligatorios mantienen sus rutas y el código de la aplicación, el evaluador y las pruebas permanecen originales. Los nuevos logs con sufijo `-makefile.txt` y los reportes estructurados registran los resultados de esa versión.

## Reproducción desde la etiqueta publicada

En una carpeta nueva, con las herramientas del curso instaladas:

```bash
git clone --depth 1 --branch week-01-final https://github.com/Oscar71k1/DMI-Equipo-4.git CampusOps-verificacion
cd CampusOps-verificacion
git rev-parse --is-shallow-repository
git rev-parse HEAD
make setup
git rev-parse --is-shallow-repository
git rev-parse HEAD
make feedback
make verify-week-01
make public-test-week-01
make evidence-week-01
```

La primera consulta de superficialidad debe indicar `true` y la segunda `false`; el SHA debe coincidir antes y después. En Windows se aplica la [preparación local de Python y npm](entorno-windows.md). El reporte de evidencia congelada se genera después de que la etiqueta ya existe, siguiendo la guía.

## Integridad y relación con la rúbrica

El ajuste respalda la reproducción y la comprobación del SHA. La falla y corrección de interfaz, los tres riesgos y la decisión de ingeniería de la actividad mantienen su evidencia original. Esta reparación de preparación no sustituye esos entregables.

La comparación con el inicio se hace sin incluir el Makefile, cuyo cambio está expresamente documentado:

```bash
git diff --exit-code 635d471c3bce751720adbe0e2c50bcd245520d51 -- .github/workflows course-tests tools/course_public_evaluator.py App.tsx package.json package-lock.json
```

Los diagnósticos anteriores que describen `fetch-depth: 0` permanecen como antecedentes. En la versión actual los workflows están restaurados y la descarga corresponde a `make setup`.
