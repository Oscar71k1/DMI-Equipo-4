# Preparación del historial Git desde el checkout

## Configuración vigente

El Makefile, `package.json`, las pruebas y el evaluador coinciden con el paquete inicial. `make setup` ejecuta únicamente `npm ci`; no queda ningún script adicional de preparación en `tools/`. El 9 de septiembre de 2026, Oscar solicitó configurar el checkout de [week-01-feedback.yml](../.github/workflows/week-01-feedback.yml):

```yaml
- name: Checkout
  uses: actions/checkout@v4
  with:
    ref: ${{ github.event.pull_request.head.sha || github.sha }}
    fetch-depth: 2
```

En una solicitud de cambios se selecciona el commit de la rama propuesta; en los demás eventos se usa el SHA del evento. La profundidad 2 obtiene ese commit y su padre inmediato. El workflow inicial `starter-feedback.yml` conserva su contenido original. Ningún comando de evaluación, condición de fallo, prueba ni umbral cambia.

Al dar un SHA explícito a checkout, su descarga no crea por sí sola la referencia local `week-01-final`. El modo `evidence` la necesita para el control `frozen_sha`. Por eso, antes del paso original de validación congelada, se descarga la etiqueta real del remoto únicamente en los eventos de esa etiqueta:

```yaml
- name: Fetch final evidence tag
  if: startsWith(github.ref, 'refs/tags/week-01-final')
  run: git fetch --no-tags --depth=2 origin "${GITHUB_REF}:${GITHUB_REF}"
```

Este paso no crea una etiqueta arbitraria en HEAD ni reemplaza las comprobaciones: obtiene la referencia publicada y el evaluador comprueba que apunte al SHA evaluado. En ejecuciones de rama y pull request no se ejecuta. El comportamiento del checkout por SHA se puede revisar en el [código original de actions/checkout](https://github.com/actions/checkout/blob/v4/src/ref-helper.ts).


## Problema y causa

El paso 14 de `LEEME_PRIMERO.md` permite que los JSON apunten al padre inmediato si el último commit modifica únicamente `reports/` y `evidence/`. El checkout original obtenía un solo commit y el evaluador no podía consultar `git rev-parse HEAD^`. El síntoma era `commitSha must be HEAD or its direct evidence-only parent`, aunque la relación fuera válida en una copia con historial suficiente.

Actualizar archivos y ejecutar `git commit --amend` genera otro SHA; no mantiene el identificador del commit modificado ni descarga el historial. El cierre debe seguir los pasos 9 a 15: commit técnico con configuración y documentos terminados, JSON con ese SHA, comprobaciones, commit exclusivo de evidencias y etiqueta final.

## Comprobación del ajuste

Se reprodujo el problema con el commit real `a4349d0f7d2153235e486e6f5ae1e976a3f5224b`, cuyos JSON apuntan a su padre `4ba75a4ab463f14a9bc5fcb61ba0b251dfc74267`. Las copias aisladas obtuvieron por SHA una referencia de rama y otra de etiqueta, usando `git fetch --no-tags --depth=1` y luego `--depth=2`. Los JSON permanecieron intactos.

| Caso | Resultado real |
|---|---|
| Rama y etiqueta con profundidad 1 | El evaluador original rechazó ambos SHA por no poder comprobar el padre. |
| Las mismas copias con profundidad 2 | Aprobó baseline y engineering; `git rev-list --count HEAD` devolvió 2 y se conservaron HEAD, referencia y archivos. |
| Etiqueta de la copia aislada con profundidad 2 | El modo original `evidence` aprobó sus 10 controles, incluido `frozen_sha`, con código 0. |

La salida completa está en [oscar-checkout-depth2.txt](../reports/week-01/logs/oscar-checkout-depth2.txt). Esta reproducción demuestra el efecto de la profundidad; la ejecución del workflow publicado comprueba además la resolución de la referencia en Actions.

La comprobación específica de checkout por SHA, sobre `de23553dae79b0f4b32541cbee48d64b2cc49c1f`, mostró que el padre ya estaba disponible y ambos JSON pasaban, pero `frozen_sha` fallaba por la etiqueta ausente. Omitir `--no-tags` por sí solo tampoco la obtuvo. Al descargar explícitamente `refs/tags/week-01-final:refs/tags/week-01-final` desde el remoto aislado, los 10 controles originales pasaron; se conservaron HEAD, archivos y profundidad 2. Salida: [oscar-checkout-sha-etiqueta.txt](../reports/week-01/logs/oscar-checkout-sha-etiqueta.txt). Esta prueba sí reproduce la selección por SHA del bloque solicitado.


Antes de las comprobaciones completas del nuevo cierre, se espera que pasen `make feedback`, `make verify-week-01` y `make public-test-week-01`: se conserva el material original y se regeneran los SHA tras el cambio de configuración. Los logs `-depth2.txt` registran las comprobaciones del primer ajuste. Tras añadir la descarga explícita de la etiqueta, los resultados reales del cierre se registrarán en los logs `-depth2-final.txt` y en los reportes estructurados. La evidencia congelada se ejecutará después de etiquetar.

## Decisión y límites

Se elige descargar dos commits desde el checkout para satisfacer la consulta del padre inmediato sin añadir preparación al Makefile ni a npm. Descargar el historial completo también funciona, con mayor descarga; los scripts de preparación anteriores recuperaban ese historial durante la instalación y añadían mantenimiento. La configuración vigente usa la opción solicitada por Oscar y mantiene la instalación original.

La profundidad 2 basta para la relación entre el trabajo técnico y su commit de evidencias. Para revisar todas las aportaciones antiguas debe usarse un clon completo. Este arreglo de preparación respalda el criterio de reproducción de la rúbrica; no sustituye la falla controlada de interfaz, los tres riesgos ni la decisión de ingeniería de la actividad.

## Antecedentes históricos

Las secciones siguientes describen versiones anteriores, ya retiradas. Sus logs conservan resultados de esas versiones; no son instrucciones de instalación vigentes.

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

Para reproducir la profundidad usada en Actions, con las herramientas del curso instaladas:

```bash
git clone --depth 2 --branch week-01-final https://github.com/Oscar71k1/DMI-Equipo-4.git CampusOps-verificacion
cd CampusOps-verificacion
git rev-parse HEAD
git rev-parse HEAD^
make setup
make feedback
make verify-week-01
make public-test-week-01
make evidence-week-01
```

La copia sigue siendo superficial: lo necesario aquí es disponer del padre inmediato. El Makefile no descarga historial. En Windows se aplica la [preparación local de Python y npm](entorno-windows.md). Para revisar los commits de los tres integrantes, se omite `--depth 2` al clonar.

## Integridad

```bash
git diff --exit-code 635d471c3bce751720adbe0e2c50bcd245520d51 -- Makefile course-tests tools App.tsx package.json package-lock.json .github/workflows/starter-feedback.yml
git diff 635d471c3bce751720adbe0e2c50bcd245520d51 -- .github/workflows/week-01-feedback.yml
```

La primera comparación debe terminar sin diferencias. La segunda muestra las tres líneas solicitadas del bloque `with` y las tres líneas del paso condicionado que descarga la etiqueta real. No se alteran las pruebas ni el evaluador.
