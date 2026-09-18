# Oscar — Semana 03: integración, CI y comprobación del alcance web

Tu aporte principal es hacer que las comprobaciones del equipo se ejecuten sobre la versión integrada y que sus resultados se puedan verificar. Si las capturas de Service Worker corresponden a esta misma entrega, tu aporte incluye implementar y registrar el worker en una salida web de CampusOps. Este documento es un plan: no acredita implementaciones ni pruebas realizadas.

Lee primero la [guía del equipo](GUIA_EQUIPO_SEMANA_03.md), la [actividad](assignments/week-03.md) y [la preparación de entrega](assignments/week-03-repository.md).

## 1. Lo que existe y la diferencia entre las fuentes

En la copia revisada después del cierre de Semana 02:

- Existe el workflow de Semana 03, con permisos `contents: read`, subida de reportes mediante `if: always()` y checkout con `ref` explícito y profundidad 2.
- El workflow usa Node `22`, no la versión exacta `22.22.0` indicada por el curso.
- Existen la app lista/detalle y las pruebas de arquitectura/incidencias de Semana 02. Hay que conservarlas y ejecutarlas también en CI.
- Todavía faltan `docs/threat-model.md`, `reports/week-03/security.json` y los dos JSON de evidencia de Semana 03.
- No existe una implementación PWA ni los cinco archivos nuevos de las capturas; README sí existe, pero falta documentar esa ejecución web.
- `bundle:release` exporta Android. No hay dependencias directas `react-dom`/`react-native-web`, un comando de exportación web ni un runner de pruebas de navegador configurados en `package.json`.

La consigna y `course-contracts.json` exigen CI y amenazas; las imágenes añaden funcionamiento web/offline. Confirma la aplicación conjunta y el destino web antes de implementar esa ampliación. No reinicies el proyecto ni sustituyas React Native/Expo. Expo permite una salida web, pero su configuración y validación son trabajo adicional; un Service Worker no se ejecuta dentro del bundle nativo Android. Fuente: [PWA en Expo](https://docs.expo.dev/guides/progressive-web-apps/).

## 2. Tu trabajo de CI y revisión, que ya puedes preparar

1. Trabaja en `codex/semana-03-oscar`, creada desde `main` actualizado, conservando los archivos locales existentes. Usa tu identidad real; tu identificador registrado en Semana 02 es `3523110017`.
2. Coordina con Fernanda los nombres y comandos de las pruebas de seguridad. Tú editas `.github/workflows/week-03-ci-amenazas-feedback.yml`; ella revisa su ejecución y proporciona los casos de fallo.
3. Fija Node `22.22.0`. Mantén instalación desde el lockfile, exportación Android, tipos, lint, auditoría, escaneo de secretos, pruebas públicas y artefactos. Conserva el bloque de checkout acordado y los permisos mínimos.
4. Incorpora como pasos obligatorios las pruebas propias de Semana 02 y las nuevas de seguridad cuando existan. No añadas comandos con nombres supuestos ni opciones que aprueben la ausencia de pruebas.
5. Comprueba el cierre por etiqueta: profundidad 2 permite leer el padre inmediato, pero no garantiza la referencia de la etiqueta. Recupera explícitamente la etiqueta final desde el remoto cuando corresponda y comprueba que apunta al SHA evaluado. En un PR se debe evaluar el HEAD del PR; no reemplazarlo por el SHA de una etiqueta ajena.
6. El workflow actual ejecuta `make evidence-week-03` también antes de tener etiqueta. Registra ese fallo si aparece y acuerda cómo distinguir validación de desarrollo y cierre, sin eliminar la validación final ni ocultar códigos de salida. No uses la ausencia del tag como demostración del fallo de seguridad pedido.
7. Revisa con Fernanda una ejecución que falle por la causa controlada y otra corregida. Guarda URL, SHA, nombre del job, paso fallido y artefacto descargable. Un log local o el texto del YAML no prueban que GitHub haya ejecutado el flujo.
8. Contrasta cada riesgo del modelo de Jarumi con el control y la aserción reales. Documenta qué frontera se prueba y qué queda pendiente, especialmente si sólo existe una política local y aún no hay servidor con autorización.

Tu revisión técnica puede quedar en `docs/oscar-integracion-semana-03.md`, con predicción anterior a la ejecución, comandos, resultados, diagnóstico y límites. Ese documento todavía no existe y no debe escribirse como si ya hubieras terminado.

## 3. Reparto adicional de los archivos de las imágenes

Este reparto se activa si se confirma el alcance web; no sustituye los entregables de CI/amenazas.

| Archivo de la captura | Responsable propuesto | Contenido verificable |
|---|---|---|
| `public/sw.js` | Oscar | Worker real: instalación, rutas de caché, fallback, activación y limpieza controlada. |
| `src/lib/pwa/register-service-worker.ts` | Oscar | Registro invocado desde la entrada web real, detección de soporte y manejo de actualización/error. |
| `docs/cache-strategy.md` | Jarumi | Estrategias por recurso, exclusiones, versiones, límites, amenazas y pruebas. |
| `tests/service-worker.spec.ts` | Fernanda | Casos del worker y registro reales, incluidos fallos y actualización. |
| `tests/offline.spec.ts` | Fernanda | Navegación y comportamiento offline observados en navegador. |
| `README.md` y reporte de CI | Oscar, con resultados de Fernanda | Instalación, build/servidor web, pruebas, diagnóstico y enlace a artefactos del SHA revisado. |

El reporte CI debe identificar el comando, SHA, resultado y artefacto; no basta una captura de un check verde. Enlaza las comprobaciones relacionadas con seguridad en `reports/week-03/security.json` y conserva logs o reportes de navegador como artefactos adicionales.

## 4. Qué tendrías que implementar para los seis mínimos de la imagen

| Mínimo | Trabajo de Oscar | Criterio de aceptación a comprobar con Fernanda |
|---|---|---|
| Registro del Service Worker | Conectar el registro a la app web y servir `sw.js` con la ruta/alcance correctos, en contexto seguro. Aislar APIs de navegador de las entradas nativas. | El navegador registra el worker, controla la página tras su ciclo normal y maneja fallos sin romper la app. |
| Precache indispensable | Identificar recursos de la exportación web real y preparar una versión coherente, incluyendo fallback. | Tras la carga inicial correcta, los recursos necesarios están disponibles sin red. Si falta un recurso esencial al instalar una actualización, no se pierde la versión anterior utilizable. |
| Runtime cache donde aplique | Aplicar la política acordada a recursos públicos permitidos, con límites. | Un recurso permitido se reutiliza según su estrategia; respuestas privadas, fallidas y operaciones de escritura no se cachean como contenido público. |
| Fallback offline legible | Entregar una pantalla o respuesta comprensible cuando no hay red ni recurso disponible. | Una navegación sin red muestra el estado previsto; una API no recibe HTML como falsa respuesta válida ni una escritura se presenta como enviada. |
| Actualización segura | Coordinar la nueva versión y el momento de activación/recarga, evitando pérdida de trabajo. | Una actualización entre versiones no mezcla recursos incompatibles ni recarga indiscriminadamente una pantalla con cambios sin guardar. |
| Invalidación controlada | Versionar las cachés propias y limpiar sólo las obsoletas al completar la transición segura. | Se retira la versión antigua cuando corresponde; se conserva la actual y cualquier caché ajena al proyecto. |

La política exacta se decide con Jarumi. No implementar un caché indiscriminado de todas las peticiones. Incluir recursos web con nombres reales de build; una lista inventada de archivos no demuestra precache. Tampoco basta que la lista de incidencias funcione con un fake en memoria para acreditar una recarga offline del sitio.

Antes de programar, acuerden la exportación web, el servidor de prueba, el runner de navegador y las versiones compatibles con el Expo fijado. Si se añaden pruebas de navegador, separen su descubrimiento del de Jest y documenten ambos comandos. Verifiquen también que la exportación Android y las pruebas anteriores siguen funcionando.

## 5. Tu evidencia individual y el cierre

Completa sólo tu registro en `evidence/week-03/individual.json`, con tu SHA técnico propio, archivos modificados, predicción, comando, resultado y explicación. Registra las ejecuciones hechas con asistencia de Codex como tales. Los resultados antiguos de Semana 02 no acreditan automáticamente trabajo nuevo de Semana 03.

Antes del cierre, integra las aportaciones y ejecuta las pruebas propias explícitamente, además de:

```powershell
make feedback
make verify-week-03
make public-test-week-03
```

Si aplica PWA, también deben pasar la exportación web y las pruebas acordadas de Service Worker/offline. No declares esa parte aprobada usando sólo los comandos Android del paquete.

Sigue el cierre de la guía común: commit técnico, evidencias del SHA probado, commit exclusivo de `reports/` y `evidence/`, etiqueta `week-03-final`, `make evidence-week-03` y comprobación remota de SHA/artefactos. No crees la etiqueta por terminar estas guías. No muevas la etiqueta publicada de Semana 02.

## 6. Cuándo está terminado tu aporte

- [ ] El YAML ejecuta los controles y pruebas reales, con permisos mínimos y artefactos útiles.
- [ ] Revisaste el fallo controlado y su corrección en Actions, identificados por SHA.
- [ ] Tu revisión explica al menos un control real, su prueba y su límite.
- [ ] Tu registro individual tiene un aporte nuevo, verificable y sin resultados inventados.
- [ ] Si aplica el alcance de las capturas, el worker está conectado a la app web y se comprobaron los seis mínimos, con los archivos indicados.
- [ ] El cierre se hace sólo después de integrar y validar el trabajo de las tres personas.
