# Aportación de Oscar — integración y revisión de Semana 02

Trabajo realizado en la sesión de Oscar (`3523110017`) con asistencia de Codex. Las ejecuciones nuevas se atribuyen a esta sesión, no a Jarumi ni a Fernanda. Se conserva la autoría de sus commits y sus observaciones históricas. El quiz no forma parte de esta integración.

## Integración y correcciones de la evidencia de Jarumi

La rama `origin/codex/semana-02-fernanda`, terminada en `8673096`, ya estaba integrada en `main`. Se integró `origin/codex/semana-02-jarumi`, terminada en `6086d7f`, mediante un merge que conserva sus commits. Sus reportes no estaban en `main`.

Se corrigió `reports/week-02/dependencies.json`: el evaluador exige que `checks[].evidence` sea una cadena no vacía, pero contenía objetos. Ahora cada observación tiene evidencia textual y conserva íntegro el objeto anterior en `details`. La falla histórica UI → infraestructura sigue registrada como `fail`; no se convirtió en una aprobación del estado final. Los logs originales en UTF-16 se recodificaron a UTF-8 para poder inspeccionarlos, sin cambiar los resultados.

En `engineering.json` se añadió la relación con AC-05 y se precisó el alcance del smoke heredado: comprueba el título y el indicador de salud; la navegación lista/detalle se demuestra en `tests/incidents.test.tsx`. Las comprobaciones de cierre se añaden aparte de las observaciones históricas. El archivo individual mantiene los registros originales de Jarumi y Fernanda y completa el de Oscar con su identidad ya usada en Semana 01.

El SHA `b9ee826` de la evidencia histórica describe el código anterior. El detector fue agregado después, en `e5e15dd`; no basta hacer checkout de `b9ee826` para ejecutar un test que aún no existía. El historial y el log conservan la dependencia `App.tsx → src/api/courseBackend.ts` y su corrección posterior mediante un puerto.

## Revisión técnica de la ruta completa

1. `App.tsx` monta `CampusOpsScreen` con las acciones construidas por `createCampusOps`.
2. `CampusOpsScreen` pasa `listIncidents` a la lista. Al seleccionar una fila conserva su identificador y pasa `getIncidentDetail` al detalle.
3. `createIncidentQueries` coordina `list()` y `getById(id)` mediante `IncidentRepository`, definido en dominio. No importa el fake ni composición.
4. `InMemoryIncidentRepository` implementa el puerto, devuelve datos ficticios y copia registros, ubicación y trabajo para evitar mutaciones externas.
5. Para sustituir el proveedor se implementa el mismo puerto y se cambia el ensamblaje en composición. UI y aplicación conservan sus contratos. El nuevo proveedor todavía necesita adaptación de datos y pruebas propias.

La consulta de salud pasa por `createHealthQuery`, `BackendHealthPort` y `CourseBackendHealthAdapter`. `App.tsx` sólo conoce composición para montar la aplicación: no contiene llamadas directas al cliente. La prueba existente de reexportación impide que aplicación use composición como atajo hacia infraestructura. Sesión, persistencia y ubicación siguen representadas como responsabilidades futuras; los tres perfiles no implican autenticación implementada.

## Aporte verificable de Oscar

Se amplió `tests/architecture.test.ts` con una comparación automática entre las dependencias internas extraídas del código y las flechas continuas de `docs/architecture.mmd`. Comprueba que las rutas declaradas existan y que no falten ni sobren aristas. Así se detecta un dibujo desactualizado aunque los imports reales sigan respetando las capas.

La comprobación sigue la convención del diagrama actual: nodos con rutas `.ts`/`.tsx`, flechas continuas para imports y punteadas para perfiles o funciones futuras. No es un parser universal de Mermaid. Reutiliza el detector del proyecto, cuyos límites son rutas relativas y expresiones con literales; no demuestra el comportamiento de proveedores futuros ni resuelve alias no usados por este repositorio.

Predicción previa: la integración debe conservar lista/detalle, sustitución, casos de error y smoke heredado; el diagrama actual debe coincidir con los imports. La predicción y los resultados observados se conservan por separado en [los logs](../reports/week-02/logs/) y en el registro de Oscar de [individual.json](../evidence/week-02/individual.json).

## Reproducción y alcance

Se usa Node 22.22.0 y npm 10.9.4. En Windows se prepara GNU Make y el adaptador de npm descrito en [entorno-windows.md](entorno-windows.md), fuera del repositorio. El evaluador y las pruebas públicas permanecen originales. En los YAML sólo se incorpora el bloque solicitado de checkout con `ref` explícito y `fetch-depth: 2` donde faltaba.

Los comandos de validación son:

```sh
npm ci
npm test -- --ci --runInBand --runTestsByPath tests/architecture.test.ts tests/incidents.test.tsx course-tests/smoke.test.tsx course-tests/public/week-01.test.ts course-tests/public/week-02.test.ts
make feedback
make verify-week-02
make public-test-week-02
```

El cierre usa un commit técnico seguido de un commit exclusivo de `reports/` y `evidence/`. Los reportes indican el SHA técnico probado. `make evidence-week-02` comprueba la etiqueta local `week-02-final` después de crearla; su salida posterior se conserva localmente. Los resultados definitivos están en `reports/week-02/verify.json`, `public-tests.json` y `failure.json`, no se deducen de esta lista de comandos.

La exportación Android de Expo no equivale a generar ni instalar un APK. No se afirma una prueba manual en dispositivo ni una entrega en Classroom. Las fechas registradas son las de las ejecuciones reales, sin retrocederlas al plazo de la actividad.
