# Comprobación nativa de almacenamiento — Android

Este procedimiento está pendiente de ejecución. Comprueba el módulo nativo en una instalación de CampusOps, usando exclusivamente la sesión ficticia incorporada en la pantalla. No reemplaza las pruebas de fallas con dobles ni demuestra resistencia absoluta a un dispositivo comprometido.

## Preparar el dispositivo y ejecutar

Necesitas Android Studio con SDK/Platform Tools y Java configurados, más un emulador iniciado desde Device Manager o un teléfono con depuración USB autorizada. En esta sesión no se encontró `adb` en PATH ni en la ubicación habitual del SDK; si lo instalaste en otra ruta, agrega su carpeta `platform-tools` al PATH.

Desde la raíz del repositorio, en PowerShell:

```powershell
git rev-parse HEAD
node --version
adb devices
npm ci
npm run android -- --device
```

Selecciona el dispositivo. Expo genera `android/` si no existe, compila e instala la app; conserva abierta la terminal del servidor de desarrollo. El script del proyecto ejecuta `expo run:android`. No necesitas agregar Expo Dev Client para este procedimiento. Si hay varios dispositivos conectados, selecciona uno y usa `adb -s SERIAL` en todos los comandos posteriores. Comprueba con `git status --short` cualquier cambio que produzca la generación nativa; no sobrescribas archivos ajenos ni uses `prebuild --clean` para resolverlo automáticamente.

Para reproducir exactamente el entorno académico usa Node 22.22.0 según la consigna. Una exportación `bundle:release` por sí sola no instala una app nativa. Expo Go puede servir para una comprobación preliminar de SecureStore, pero no verifica la configuración de respaldo del binario propio de CampusOps.

## Ciclo que debes observar

1. En CampusOps, pulsa **Eliminar sesión de prueba** para establecer un estado inicial conocido. Debe mostrar **Sesión de prueba eliminada**. Si muestra error, consérvalo como fallo y no continúes como si se hubiera borrado.
2. Pulsa **Guardar sesión de prueba**. Debe mostrar **Sesión de prueba guardada**, sin mostrar el valor del token.
3. Fuerza el cierre del proceso, sin borrar datos ni desinstalar:

   ```powershell
   adb shell am force-stop mx.edu.dmi.engineeringapp
   ```

4. Abre CampusOps desde su icono, manteniendo disponible el servidor de desarrollo. Debe mostrar **Sesión de prueba recuperada**. Esto distingue la persistencia de un simple estado React en memoria.
5. Pulsa **Eliminar sesión de prueba**, espera la confirmación y vuelve a forzar el cierre y abrir. Ahora debe mostrar **Sin sesión de prueba guardada**.

El backend puede estar offline: el control de almacenamiento funciona localmente y no autentica al reportante ficticio. No uses `pm clear` ni reinstales entre guardar y recuperar, porque eso cambiaría lo que estás probando.

## Inspección de preferencias en una compilación debug

Haz esta inspección **después de guardar y antes de eliminar**. La implementación instalada de SecureStore usa `shared_prefs/SecureStore.xml`. `run-as` necesita una compilación debuggable; si responde acceso denegado, registra la limitación, no la interpretes como prueba de ausencia.

```powershell
$campusPrefs = adb shell run-as mx.edu.dmi.engineeringapp cat shared_prefs/SecureStore.xml
if ($LASTEXITCODE -ne 0) { throw 'No se pudo inspeccionar SecureStore' }
$campusMarker = 'campusops-' + 'synthetic-session-week04'
"Entrada almacenada: $([bool]($campusPrefs -match 'campusops.session.token'))"
"Token visible en texto plano: $([bool]($campusPrefs -match [regex]::Escape($campusMarker)))"
```

Se espera entrada presente y token plano ausente. No imprimas ni adjuntes el XML completo. Después de eliminar, repite la lectura: la entrada debe desaparecer. Comprueba además la recuperación/ausencia al reiniciar, pues inspeccionar un archivo no prueba por sí solo que el módulo pueda descifrar o que el borrado haya terminado correctamente.

Revisa `android/app/src/main/AndroidManifest.xml` y los XML de respaldo referenciados bajo `android/app/src/main/res/xml/`: el dominio `sharedpref` debe excluir `SecureStore`. El plugin configura esta exclusión al generar el binario. Esto acredita inspección de configuración, no una restauración de respaldo ejecutada.

## Registros y evidencia

Para revisar logs de la app, después de abrirla obtén su PID y, en otra terminal, captura mientras repites guardar/eliminar:

```powershell
$campusAppPid = (adb shell pidof -s mx.edu.dmi.engineeringapp).Trim()
if (-not $campusAppPid) { throw 'CampusOps no está ejecutándose' }
$campusNativeLog = Join-Path $env:TEMP 'campusops-week04-native.log'
adb logcat --pid=$campusAppPid -v time > $campusNativeLog
```

Detén la captura con Ctrl+C. Cada cierre forzado cambia el PID: vuelve a obtenerlo para una nueva captura. Inspecciona localmente el archivo buscando el marcador ficticio sin publicar líneas completas; registra solamente el conteo. No conviertas ausencia en este intervalo/PID en una garantía de todos los logs del dispositivo.

Conserva en un registro de revisión: fecha, persona que ejecutó, SHA de Git, dispositivo/emulador, versión Android, tipo de build, comandos, resultado de cada paso, conteos y capturas de los estados. Si algo falla, conserva el fallo. No marques los pasos como aprobados antes de observarlos. Después integra esas observaciones como nuevas comprobaciones en `negative-tests.json` o en un reporte nativo separado enlazado desde la evidencia, y actualiza el SHA al consolidar la entrega.

Las fallas nativas de lectura/escritura/borrado se cubren actualmente por inyección de fallas en las pruebas automatizadas; este procedimiento no afirma haberlas provocado en Android. Cifrado real del módulo, persistencia y eliminación lógica pueden observarse aquí; borrado forense y protección frente a root quedan fuera del alcance.

## Reportes automatizados reproducibles

```powershell
python -B tools/generate_week04_reports.py
```

El generador ejecuta Jest, prueba el detector original, busca marcadores ficticios en artefactos y ejecuta el escaneo del checkout. Escribe los dos reportes y `reports/week-04/logs/week04-checks.json`; devuelve un código distinto de cero si un control falla. No altera el evaluador ni las pruebas oficiales. No realiza la comprobación nativa.

Fuentes consultadas: [Expo CLI: compilación local](https://docs.expo.dev/more/expo-cli/#compiling) y [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/).
