# Fernanda — Semana 03: comprobar CI y demostrar una falla

Tu objetivo es que **un fallo real se detecte, se vea en los resultados y sólo quede resuelto al corregir su causa**. Lee primero la [guía común](GUIA_EQUIPO_SEMANA_03.md) y acuerda con Jarumi los riesgos R-01 a R-04.

## 1. Entender qué ejecuta el workflow

Revisa `.github/workflows/week-03-ci-amenazas-feedback.yml`, `Makefile`, `package.json` y `tools/course_public_evaluator.py`. No necesitas reescribirlos para empezar.

| Paso del paquete | Qué comprueba realmente |
|---|---|
| `make setup` | Ejecuta `npm ci` con el lockfile. |
| `npm run bundle:release` | Exporta el paquete Android de Expo; no es un APK instalado. |
| `make verify-week-03` | Escanea secretos e integridad del workflow y ejecuta tipos, lint, auditoría y smoke. |
| `make public-test-week-03` | Revisa entregables/JSON, repite controles y ejecuta la prueba pública de Semana 03. |
| `make evidence-week-03` | Valida evidencias y que `week-03-final` apunte a HEAD. |
| Subida de artefactos | Conserva `reports/week-03/**` y `evidence/week-03/**`, incluso si un paso falló, mediante `if: always()`. |

Conserva `permissions: contents: read`. No añadas permisos de escritura para resolver problemas de lectura. No desactives checks, ignores errores ni conviertas la ausencia de pruebas en éxito.

**Dos detalles que debes revisar antes del cierre:** el paquete selecciona Node `22`, mientras la guía pide `22.22.0`; y el checkout por defecto no trae todo el historial y las etiquetas. La validación necesita el tag final y puede necesitar el padre directo del commit de evidencias. Coordina con Óscar los ajustes mínimos de versión e historial (por ejemplo `fetch-depth: 0` en checkout), manteniendo todos los pasos obligatorios. Compruébalos en Actions. Antes de existir la etiqueta, la validación final puede fallar legítimamente; registra el motivo, no elimines esa comprobación.

## 2. Preparar pruebas ligadas a los riesgos

El test público lee el workflow y busca conceptos en `threat-model.md`; no verifica por sí mismo permisos ni sanitización. Crea pruebas adicionales del equipo, por ejemplo `tests/security.test.ts`, que llamen controles reales del proyecto.

Acuerda con Jarumi estos casos mínimos:

- Consulta propia permitida y consulta ajena denegada, sin filtrar datos.
- Asignación autorizada permitida y modificación por actor no autorizado rechazada.
- Datos sintéticos sensibles ausentes en los logs; datos técnicos útiles conservados.
- Escaneo de secretos capaz de rechazar una entrada sintética y aprobar el estado corregido.

No construyas respuestas constantes únicamente para aprobar. Si un servicio todavía no existe, puedes probar una política real aislada con actores ficticios, pero documenta ese límite: no demuestra autorización de un servidor desplegado. No adelantes todo el sistema de autenticación de otra semana. Identifica los controles pendientes y evita presentarlos como terminados.

Cuando la prueba exista, ejecútala explícitamente:

```powershell
npm test -- --ci --runInBand --runTestsByPath tests/security.test.ts
```

El nombre de archivo es una propuesta. Si lo cambian, actualicen comandos y documentos. Añadan la ejecución obligatoria de estas pruebas al workflow: el evaluador no descubre automáticamente sus pruebas propias al seleccionar las públicas.

## 3. Demostrar un fallo sin esconderlo

Hagan el experimento en tu rama `codex/semana-03-fernanda`, partiendo de un estado conocido. Una opción sencilla es introducir **temporalmente un error de tipos** en un archivo TypeScript real incluido por el proyecto, por ejemplo asignar un número a una variable declarada como texto. No cambies una prueba para hacerla fallar artificialmente ni uses credenciales reales.

1. Guarda el SHA base y predice qué check fallará.
2. Introduce el cambio mínimo y guarda el diff que permita repetirlo. Revisa que el diagnóstico no incluya datos sensibles.
3. Ejecuta `make verify-week-03`, conserva salida y código distinto de cero. Confirma que el motivo es el error introducido, no un problema de instalación.
4. Si publicas ese commit de experimento, conserva la URL de la ejecución fallida de Actions y descarga sus artefactos. Un log local por sí solo no demuestra el comportamiento de GitHub.
5. Corrige sólo el error introducido, mantén activo el detector y repite exactamente la comprobación. El resultado corregido debe ser cero.
6. Revisa en Actions que un fallo impida el éxito del job y aun así se intente subir la evidencia disponible. Guarda también el enlace de la ejecución corregida.

Ese experimento demuestra el bloqueo del proceso. **Además** ejecuta las pruebas negativas de los controles de seguridad del paso 2; el error de tipos no demuestra por sí solo la protección de incidencias.

Para capturar una ejecución en PowerShell, usa este bloque y cambia el nombre del log para la corrección:

```powershell
New-Item -ItemType Directory -Force -Path reports/week-03/logs
make verify-week-03 2>&1 | Tee-Object -FilePath reports/week-03/logs/fernanda-antes.txt
$campusCheckExit = $LASTEXITCODE
Add-Content reports/week-03/logs/fernanda-antes.txt "EXIT_CODE=$campusCheckExit"
Write-Output "Resultado real: $campusCheckExit"
```

Este bloque conserva el resultado para un experimento manual; no lo uses como envoltorio de CI que termine aprobando un error. En CI deja que el comando propague su fallo. En Windows aplica la variante `PYTHON=python` si tu entorno la necesita y registra ese comando exacto.

## 4. Preparar `security.json`

Sigue el contrato de la guía común. Para cada control añade su identificador, escenario, comando y observación real con ruta de log. Usa identificadores distintos para el antes y el después del experimento. Conserva:

- SHA base y diff o commit del fallo para reproducirlo.
- Diagnóstico y código de salida anterior.
- Explicación de la causa y qué línea/cambio la corrigió.
- Comando, código y evidencia del estado corregido.
- Enlaces de Actions y nombres de artefactos cuando estén disponibles.

El evaluador genera sus propios reportes `generated-*`, pero **no redacta `security.json` por ti**. El SHA general del reporte debe actualizarse al cierre conjunto. No sustituyas resultados observados por lo que esperabas ver.

El detector del curso busca patrones conocidos y excluye algunas carpetas: una salida sin hallazgos no demuestra ausencia absoluta de secretos. Si pruebas el detector con un marcador ficticio, genéralo en un archivo temporal, conserva sólo el diagnóstico necesario y retíralo antes de la verificación final. Evita dejar el patrón detectable en documentación/logs que el mismo escáner revisa.

## 5. Compartir y cerrar tu parte

Revisa `git status --short`, `git diff --check`, los diffs y el contenido de archivos nuevos. Guarda sólo las rutas de tu aporte y obtén el SHA completo con `git rev-parse HEAD`. Verifica autoría con `git show --stat --format=fuller HEAD`.

Completa tu registro en `individual.json` con predicción, comandos, observaciones y explicación propios. Entrega a Jarumi las rutas y resultados para ajustar el modelo. Publica:

```powershell
git push -u origin codex/semana-03-fernanda
```

Solicita revisión e integración. No crees un tag final independiente: Óscar coordina el cierre común después de integrar las tres aportaciones.

## Terminaste tu parte cuando…

- [ ] El workflow ejecuta todas las comprobaciones y las pruebas propias.
- [ ] Los controles tienen casos permitidos y negativos verificables.
- [ ] El fallo obligatorio devuelve error y conserva diagnóstico/artefactos.
- [ ] La corrección pasa sin debilitar las comprobaciones.
- [ ] `security.json` enlaza resultados reales y coincide con el modelo de Jarumi.
- [ ] Tu commit y registro individual muestran lo que hiciste y puedes explicarlo.

Practica: «¿qué hace `npm ci`?», «¿por qué un fallo debe detener el job?», «¿qué conserva `if: always()`?» y «¿por qué una exportación Expo no prueba instalación de un APK?».
