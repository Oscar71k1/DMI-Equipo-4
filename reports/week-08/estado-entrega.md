# Estado de la entrega de semana 8

Fuente verificada: `11ff96ab729ae1047e263e81822e88e6e6aaf977`.
Rama: `codex/revision-semana-08`. No se modificó ni se fusionó `main`.

## Resultados

- 27 suites y 156 pruebas aprobadas. TypeScript, lint, backend, migraciones, auditoría con umbral crítico y bundle Android correctos. Logs actuales con SHA y salida real.
- APK release compilado con Node 22.22.0/JDK 17 e instalado en Samsung SM-G981V, Android 13. JavaScript incluido; el reinicio no dependió de Metro.
- Inicio y nota creados sin acceso al backend. Tras force-stop y reapertura offline se recuperaron los mismos IDs y el texto. La reasignación remota quedó intacta; el técnico original quedó bloqueado sin perder trabajo.
- Aceptar explícitamente el servidor conservó ambas intenciones como historial. La siguiente sincronización no envió el inicio ni la nota: el servidor mantuvo versión 2, technician-2, cero notas y un evento de reasignación.
- El APK final mejoró contraste, desplazamiento y acceso a la nota. Al actualizarlo recuperó la misma cola. El informe distingue los dos APKs y sus hashes; no inventa una ejecución desde cero en un único paquete.
- Tres aportaciones individuales corroboradas documentalmente. No se atribuye a integrantes una defensa personal ni los comandos ejecutados por Codex.

## Límites expresos

El segundo force-stop/reapertura después de aceptar el servidor no se ejecutó: la revisión automática de permisos lo bloqueó. La recuperación de la resolución está probada en SQLite real de Node, pero esa segunda repetición no se presenta como observada en el teléfono.

La sesión didáctica dura 60 segundos. Se observó una reautenticación y la cola permaneció intacta. No se cambió el TTL ni el reloj. La auditoría conserva cinco vulnerabilidades altas de dependencias; pasar su umbral crítico no implica cero vulnerabilidades.

La evidencia nativa es `native-validation.json`; sus artefactos están en `native/`. El generador automático deja el caso Android pendiente por defecto: su resultado se incorporó después de contrastar capturas, IDs, eventos y respuestas reales del backend. No se cambió el evaluador, las pruebas públicas ni se forzó su resultado.

El PR #17 permanece en borrador y sin fusionar. La calificación corresponde al docente; las comprobaciones aprobadas no son una garantía de 8/8.
