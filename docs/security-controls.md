# Inventario de Controles de Seguridad e Inventario de Datos - Semana 04

## 1. Inventario de Datos

| Tipo de Dato | Clasificación | Almacenamiento Primario | Cifrado en Reposo | Cifrado en Tránsito | Retención / Limpieza |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Token de Sesión (JWT / Auth Token) | Confidencial | Expo SecureStore (Android Keystore / iOS Keychain) | Sí (Cifrado por SO) | Sí (TLS 1.3 / HTTPS) | Se borra explícitamente al cerrar sesión (`clearToken`) o en falla. |
| Preferencias de Usuario (Tema, Idioma) | Público / Interno | PreferencesStorage (AsyncStorage / KeyValue) | No | N/A | Persistente hasta desinstalar la app. |
| Logs de Telemetría e Incidencias | Interno / Sensible | TelemetryLogger (Memoria / Consola) | No | Sí (HTTPS) | Se sanitizan tokens, claves y datos personales antes de registrar. |

---

## 2. Inventario de Controles de Seguridad (AC-02, AC-03, AC-04)

### Control 1: Almacenamiento Seguro de Credenciales (AC-02)
- **Descripción:** Las credenciales y tokens de sesión no deben almacenarse en texto plano en la memoria del dispositivo ni en almacenamiento ordinario (`PreferencesStorage`).
- **Implementación:** Adaptador `ExpoSecureTokenStorage` implementando el puerto `SecureTokenStorage` con el SDK `expo-secure-store`.
- **Mitigación:** Protege contra extracción de tokens por otras apps, lecturas no autorizadas mediante respaldos del sistema o física en dispositivos con root/jailbreak.

### Control 2: Manejo Seguro de Errores de Almacenamiento (AC-03)
- **Descripción:** Si la lectura o escritura en el almacén seguro falla (por ejemplo, fallo del Keystore o corrupción), la aplicación debe capturar la excepción nativa y transicionar a un estado de falla seguro (`storage-error`).
- **Implementación:** Manejo explícito de excepciones en `ExpoSecureTokenStorage`.
- **Mitigación:** Previene caídas inesperadas (*crashes*) y evita volcar fragmentos del token o mensajes de error crudos del sistema nativo a logs o preferencias.

### Control 3: Sanitización de Telemetría y Logs (AC-04)
- **Descripción:** La telemetría no debe registrar información sensible (tokens, contraseñas, datos personales) en los eventos o logs de errores.
- **Implementación:** Sanitizador recursivo en `TelemetryLogger` que reemplaza o enmascara patrones sensitivos antes de enviar o escribir logs.
- **Mitigación:** Previene la fuga de credenciales a través de servicios centralizados de monitoreo o registros locales.

---

## 3. Análisis de Riesgo Residual

1. **Memoria RAM durante ejecución:** Mientras el token de sesión está cargado en memoria viva de React Native para autenticar peticiones HTTP, un atacante con acceso root y volcado directo de memoria podría leer el token. Se mitiga manteniendo el ciclo de vida del token estrictamente acotado y sin variables globales no sanitizadas.
2. **Logs del sistema en desarrollo:** Entornos de depuración podrían registrar variables. Se mitiga mediante la desactivación de logs verbosos en compilaciones de producción (*release bundles*).