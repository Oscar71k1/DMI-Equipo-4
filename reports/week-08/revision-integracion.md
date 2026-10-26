# Revisión de las ramas de Jarumi y Fernanda

Fecha: 2026-10-26. Rama local de correcciones: `codex/revision-semana-08`.

## Base revisada

- `origin/main`: `a5f13c9`.
- Jarumi: `origin/codex/semana-08-jarumi`, `366cd15`.
- Fernanda: `origin/codex/semana-08-fernanda`, `1232150`.
- Unión local de ambas contribuciones: `07f4d22`.

Se conservó el trabajo del checkout original. No se hizo push ni se modificaron las ramas remotas. Las correcciones se reúnen en una rama común porque almacenamiento y sincronización deben probarse juntos. No se crearon nuevas guías individuales ni se sustituyeron evidencias históricas por resultados de esta revisión.

## Hallazgos corregidos

1. El dominio importaba contratos de evaluación. Ahora define su registro estructural local y conserva las nueve firmas del puerto canónico de Fernanda. El diagrama refleja los imports reales; no se relajó la prueba de arquitectura.
2. SQLite no implementaba ese puerto completo. Ahora persiste base, proyección, dependencias, request preparada, problemas y recibos; todas las consultas de negocio se acotan por actor.
3. La migración anterior podía convertir intenciones sin base histórica en operaciones enviables. El esquema 3 conserva esas intenciones para revisión y mantiene snapshots existentes. La migración y sus fallos son transaccionales.
4. La sincronización interpretaba incorrectamente la respuesta del cliente, inventaba una versión/base y no comparaba con el remoto real. Ahora valida snapshots, confirma individualmente y calcula conflictos con base/local/remoto.
5. El reintento después de una respuesta perdida podía reconstruir la petición. Ahora se conserva exactamente la identidad y el cuerpo ya preparados. Las dependencias toman versiones de recibos confirmados, sin anticiparlas sumando uno.
6. La deduplicación volvía a incluir registros repetidos. Ahora conserva una sola primera aparición, ordena la cola y detiene dependientes de una incidencia que falla.
7. Los módulos estaban desconectados de la app. La composición abre SQLite, migra y recupera; el panel permite guardar una copia, iniciar atención, guardar una nota y sincronizar. También muestra copias recuperadas sin depender de abrir el detalle remoto.
8. Se protege la identidad de sesión durante operaciones asíncronas y se remonta la pantalla al cambiar su generación.
9. Dos pruebas antiguas de auditoría suponían un usuario fijo sin sesión. Ahora usan una sesión explícita y un repositorio de prueba, conservan las comprobaciones de propiedad y añaden el rechazo sin sesión.

## Validación

Entorno: Windows, Node 22.22.0. `npm ci` completado con el lockfile integrado desde Jarumi; no se instaló SQLite por duplicado.

- `npm run typecheck`: correcto.
- `npm run lint`: correcto.
- Suite acotada hasta semana 8: **27 suites, 152 pruebas aprobadas** (17,108 segundos en la última ejecución). Incluye las cuatro comprobaciones de arquitectura.
- `npm run backend:self-test`: correcto.
- `node --experimental-strip-types lab/week8-real-db.mjs`: todas las comprobaciones correctas; migración 1→3, cierre/reapertura y rollback con DDL/datos intactos.
- `npm run bundle:release`: exportación Android correcta, 652 módulos, bundle Hermes generado.
- `npm run audit:ci`: pasa el umbral crítico configurado, pero reporta 5 vulnerabilidades altas en el árbol de Expo (node-forge/zod y dependientes). No se aplicó el downgrade incompatible sugerido por `npm audit fix --force`.

Las pruebas nuevas usan SQLite real de Node y un backend real en puerto efímero. Se comprobó un timeout posterior al commit remoto, cierre/reapertura del archivo, repetición de la misma petición y un único efecto remoto. También se cubren 403 por reasignación, 409, 500, dependencias, aislamiento por actor, confirmación atómica, contrato inválido, logout y pantalla con fallo de almacenamiento.

La ejecución general incluye pruebas de semanas 9–13 que aún fallan por funciones/artefactos de esas semanas pendientes. No se modificaron ni se marcaron como omitidas. El comando acotado a lo entregado hasta semana 8 es:

```powershell
npm test -- --runInBand --testPathIgnorePatterns 'course-tests/public/week-(09|10|11|12|13)'
```

Se observaron timeouts intermitentes de 5 segundos en el primer render de suites React Native en Windows. Las mismas pruebas pasan al repetir sin otros procesos de compilación; no se aumentaron sus límites ni se eliminaron sus aserciones.

## Límites pendientes de la entrega

- `adb devices` no muestra dispositivos. Falta ejecutar en Android el cierre forzado/reapertura de la app con Expo SQLite; el bundle y SQLite de Node no sustituyen esa evidencia nativa.
- Los conflictos/bloqueos conservan la intención y se muestran al usuario. No está implementado un flujo completo de resolución asistida por coordinación. No hay reenvío automático que sobrescriba una reasignación.
- `add_evidence` tiene contrato y proyección, pero este panel no implementa carga binaria de fotografías.
- Completar las evidencias personales y los artefactos oficiales con ejecuciones reales del equipo. Esta revisión no inventa predicciones, resultados individuales ni etiquetas finales de entrega.

Para continuar, usar esta rama de revisión como base común. No copiar de vuelta las versiones anteriores de `IncidentQueueRecord.ts`, SQLiteIncidentStore o el servicio, porque volverían a introducir las incompatibilidades detectadas. La decisión de publicar o integrar la rama queda separada de esta revisión local; `main` no recibió cambios.
