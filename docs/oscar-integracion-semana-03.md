# Oscar — integración y controles de CI de Semana 03

Trabajo de `3523110017` realizado con asistencia de Codex en `codex/semana-03-oscar`. Se conserva React Native, Expo y TypeScript. La aportación cubre CI, regresiones, revisión del escáner de secretos y evidencia técnica. Las guías del equipo reflejan ese alcance.

## Cambios y responsabilidad

El workflow de Semana 03 fija Node 22.22.0, conserva `make setup`, la exportación Android, `make verify-week-03` y `make public-test-week-03`. Se mantienen `contents: read`, checkout del SHA del PR o evento y `fetch-depth: 2`. Se añaden las pruebas de arquitectura e incidencias de Semana 02 y los controles del detector original de secretos.

Los pasos con `tee` usan `shell: bash`: GitHub los ejecuta con `-e -o pipefail`, de modo que guardar el log no convierte un error del comando en éxito ([semántica documentada por GitHub](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#jobsjob_idstepsshell)). Los logs se suben mediante el paso de artefactos con `if: always()`. Un paso anterior también genera `reports/week-03/ci-execution.json` con SHA, URL, evento y resultados de los pasos, sin copiar variables de entorno completas ni outputs de las acciones. Su estado corresponde al momento previo a la subida; la conclusión final se verifica en GitHub.

La comprobación que necesita una etiqueta se ejecuta únicamente en el evento de `refs/tags/week-03-final`. Antes se recupera esa referencia y se comprueba su igualdad con HEAD. La validación de los JSON permanece obligatoria en `make public-test-week-03` para todas las ejecuciones. Una rama de desarrollo no simula tener la etiqueta final; tampoco se cambia el SHA de un PR para hacerlo coincidir con otra versión.

## Control revisado: exposición de credenciales en el repositorio

`tests/secret_scanner_test.py` importa y ejercita `scan_secrets` del evaluador original, sin modificarlo. Sus casos comprueban:

1. Una configuración pública ficticia no produce hallazgos.
2. Un marcador sintético temporal produce el hallazgo esperado con ruta y clase de patrón; retirar ese archivo devuelve una lista vacía. El diagnóstico no contiene el valor del marcador.
3. Un archivo dentro de `node_modules` queda fuera del escaneo, como establece el detector. Es una limitación explícita, no una prueba de que las dependencias carezcan de secretos.

Este control ayuda a detectar credenciales reconocibles en archivos inspeccionados antes de publicar artefactos. No recorre todo el historial Git, no reconoce todos los formatos y no demuestra autorización de incidencias o asignaciones. Tampoco sustituye la sanitización de logs de la aplicación. La configuración ficticia, el marcador y sus archivos viven en un directorio temporal, que se limpia al terminar cada prueba.

## Experimento de propagación de errores

Predicción: introducir una asignación de número a una variable `string` en un archivo TypeScript del proyecto debe hacer fallar el control de tipos dentro de `make verify-week-03`. El job debe conservar su estado fallido y subir el reporte/diagnóstico mediante los pasos finales. Retirar únicamente ese archivo debe permitir aprobar otra vez la comprobación de reproducción y las regresiones. La ausencia de entregables del equipo puede mantener fallido el paso público: es una causa distinta y no se presenta como éxito global.

El experimento se conserva por SHA, URL de Actions, paso, resultado y artefacto en `reports/week-03/oscar-ci.json`. Los logs y la predicción previa están en `reports/week-03/logs/`. Esas evidencias indican qué se ejecutó realmente; este procedimiento no equivale por sí solo a una comprobación aprobada.

## Comandos de reproducción

Con Node 22.22.0, npm y Python disponibles:

```sh
python3 tests/secret_scanner_test.py
npm test -- --ci --runInBand --runTestsByPath tests/architecture.test.ts tests/incidents.test.tsx
make verify-week-03
make public-test-week-03
```

En Windows se utiliza el entorno descrito en [entorno-windows.md](entorno-windows.md), con `PYTHON=python` cuando sea necesario. La prueba Python también se ejecuta con `python tests/secret_scanner_test.py`. La exportación Android de Expo no constituye una instalación de APK.

## Integración pendiente

Al comenzar esta aportación no existían ramas remotas de Semana 03 de Jarumi o Fernanda. Quedan a cargo del reparto acordado el modelo de amenazas y `engineering.json` de Jarumi, y los demás controles de seguridad, sus pruebas y `security.json` de Fernanda. Oscar incorporará sus comandos reales al workflow cuando estén disponibles. No se añaden pruebas inexistentes ni se simulan respuestas para aprobar.

`evidence/week-03/individual.json` contiene sólo el aporte de Oscar mientras falten los registros reales de sus compañeras. Es evidencia parcial, no el archivo final de tres integrantes que exige el evaluador. No se crea `week-03-final` hasta integrar y validar el trabajo completo. Las etiquetas de las semanas anteriores permanecen intactas.
