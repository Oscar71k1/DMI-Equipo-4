# Validación de semana 8 en Android por USB

El APK debe contener el JavaScript para poder abrirse sin Metro. Usar Node 22.22.0,
JDK 17 y el Android SDK. `JAVA_HOME` apunta al JDK y `ANDROID_HOME` al SDK.
La compilación instala los componentes SDK/NDK/CMake faltantes si sus licencias
ya están aceptadas. La primera ejecución puede tardar varios minutos.

## Preparar el APK y el backend

Desde la raíz del repositorio, en PowerShell:

```powershell
$env:EXPO_PUBLIC_COURSE_BACKEND_URL='http://127.0.0.1:4310'
npm ci
npm run native:generate
./android/gradlew.bat -p android assembleRelease -PreactNativeArchitectures=arm64-v8a --max-workers=2 --console=plain
```

La arquitectura del comando corresponde al teléfono arm64 usado en esta prueba.
El proyecto generado usa la firma de desarrollo de la plantilla; este APK es para
validación académica. No es un paquete firmado para publicar en una tienda.

En otra terminal, `npm run backend`. Mantener ese proceso vivo durante todo el caso:
su estado y sus claves de idempotencia viven en memoria.

```powershell
adb devices
adb install -r android/app/build/outputs/apk/release/app-release.apk
adb reverse tcp:4310 tcp:4310
adb shell am start -W -n mx.edu.dmi.engineeringapp/.MainActivity
```

Si hay varios dispositivos, añadir `-s <serial>` a los comandos ADB; no publicar
el serial en las evidencias. El reenvío USB conecta el puerto local del teléfono
con el backend de la computadora. El plugin `plugins/withLocalBackend.js` permite
HTTP únicamente para `127.0.0.1` y `localhost`; los demás destinos requieren HTTPS.
Esto se regenera desde `app.json`, sin editar a mano el manifiesto ignorado.

## Ejecutar y registrar el caso

1. Usar los actores ficticios y la incidencia inicial del backend. Entrar como
   técnico, abrir la incidencia y guardar una copia local.
2. Cortar sólo el acceso al backend con `adb reverse --remove tcp:4310`. Guardar
   un inicio y una nota identificable. Registrar los dos IDs y el contenido real.
3. Cerrar el proceso con `adb shell am force-stop mx.edu.dmi.engineeringapp`.
   Comprobar que `adb shell pidof mx.edu.dmi.engineeringapp` ya no devuelve un PID.
   Reabrir con el comando anterior, sin restablecer el reenvío. Comparar ambos IDs
   y la nota recuperada; no basta con que la pantalla abra.
4. Desde la computadora y con el actor de coordinación, reasignar la incidencia
   a `technician-2` mediante el backend real. Registrar su versión y asignación.
5. Restablecer `adb reverse tcp:4310 tcp:4310` y sincronizar desde el técnico
   original. Comprobar que el rechazo conserva inicio y nota y que el backend
   mantiene la reasignación. Un 403 es el resultado esperado cuando se revoca el
   acceso; no se debe forzar una lectura con otro actor desde la app del técnico.
6. Revisar el conflicto y aceptar explícitamente el estado del servidor. Verificar
   que ambas operaciones quedan como historial con los mismos IDs y contenido.
   Cerrar y reabrir otra vez, volver a sincronizar y consultar el backend: no debe
   aparecer el inicio antiguo ni la nota retenida ni duplicarse ningún efecto.

La sesión didáctica vence a los 60 segundos. Ejecutar el primer cierre/reapertura
dentro de una sesión vigente y registrar los tiempos. Si vence sin conexión,
registrar la exigencia de autenticación y comprobar después que la cola persiste;
no ampliar el TTL ni cambiar el reloj para ocultar ese límite.

Guardar comandos, resultados, horas, modelo/Android, SHA fuente y hash del APK,
con capturas de CampusOps y respuestas del backend sin tokens. Una prueba fallida
se documenta como fallida. Los tests de Node no sustituyen este procedimiento.

## Referencias de configuración

- [React Native: JDK 17 y entorno Android](https://reactnative.dev/docs/set-up-your-environment).
- [Android: configuración de seguridad por destino](https://developer.android.com/privacy-and-security/security-config).
