# Revisión y correcciones de la aportación de Fernanda — Semana 02

Revisión realizada en la sesión de Oscar con asistencia de Codex, sobre `codex/semana-02-fernanda`, a partir de `8913a40b3604fdeb85552c2eaa80ed2059d67501`. Las comprobaciones nuevas de este documento pertenecen a esta revisión; no se atribuyen a una ejecución personal nueva de Fernanda. Sus commits y su registro previo se conservan.

## Problemas observados y correcciones

| Problema | Evidencia o efecto | Corrección |
|---|---|---|
| TypeScript no compilaba | `npm run typecheck` produjo tres errores en el detector: dos argumentos posiblemente indefinidos y acceso a `violations[0]`. | Comprobar la existencia del argumento antes de inspeccionarlo y usar acceso opcional en la aserción, sin desactivar `noUncheckedIndexedAccess`. |
| Pruebas de UI sin esperar operaciones asíncronas | La ejecución inicial tuvo 1 prueba fallida y 9 aprobadas. El error fue `render function has not been called`, acompañado por avisos de `act`. | Esperar todos los `render` y `fireEvent.press` usando la API instalada de React Native Testing Library 14.0.1. No se cambiaron las pruebas públicas. |
| Sustitución insuficientemente demostrada | La prueba original creaba dos instancias de la misma implementación con datos distintos. | Inyectar un objeto independiente que cumple `IncidentRepository` y verificar lista, selección y llamada a `getById` con el identificador correcto. |
| Datos obsoletos al cambiar la consulta | Dos pruebas nuevas mostraron que se mantenía la incidencia anterior mientras llegaba otra lista o detalle. | Asociar cada respuesta con su consulta e identificador; mostrar carga cuando ya no corresponden a la petición actual. Conservar la protección contra respuestas de efectos cancelados. |
| El fake compartía referencias mutables | Una prueba nueva vació la colección externa y el repositorio perdió sus registros. También se comprobaron mutaciones de respuestas. | Copiar la colección, los registros y sus objetos `location`/`work` al entrar y al devolver datos. |
| Atajo mediante composición | El detector prohibía application → infrastructure, pero permitía application → composition, desde donde podía exponerse un proveedor. | Rechazar application → composition/UI y comprobar una reexportación prohibida en un fixture. |
| ADR/diagrama distintos del código | El diagrama situaba el indicador en `App.tsx`, el modelo en el archivo de vocabulario y atribuía el puerto al cliente sin representar el adaptador. El ADR declaraba una lista mutable. | Corregir rutas y aristas, representar `BackendHealthPort`/`CourseBackendHealthAdapter`, distinguir el estado anterior y usar el retorno `readonly` real. |
| Etiquetas de incidencias en inglés | Categorías y estados se mostraban como identificadores internos. | Traducir sólo la presentación en `src/ui/incidentLabels.ts`, conservando el contrato de dominio. |
| Identificador del equipo pendiente | `teamId` seguía siendo un marcador. | Usar `4`, ya registrado en `evidence/week-01/individual.json`; conservar los registros personales sin atribuciones nuevas. |

## Comprobaciones de esta revisión

Se añadieron casos antes de corregir el comportamiento de las pantallas y el fake. La predicción comprobada fue que las pantallas debían dejar de mostrar datos de la consulta anterior y que modificar la entrada externa no debía cambiar los datos propios del repositorio.

1. `npm test -- --ci --runInBand --runTestsByPath tests/incidents.test.tsx`, después de corregir las esperas de los tests y añadir regresiones, pero antes de corregir la UI/fake: **3 fallidas, 8 aprobadas, código 1**. Log: `reports/week-02/logs/oscar-fer-regresiones-antes.txt`. Este estado incluye pruebas nuevas sobre el código de producción anterior; no es la ejecución sin modificaciones del commit de origen.
2. `npm test -- --ci --runInBand --runTestsByPath tests/incidents.test.tsx tests/architecture.test.ts course-tests/smoke.test.tsx course-tests/public/week-02.test.ts`, después de las correcciones: **16 aprobadas, 4 suites aprobadas, código 0**. Log: `reports/week-02/logs/oscar-fer-pruebas-despues.txt`.
3. Revisión adicional con Node y el parser de TypeScript, comparando los imports internos con las aristas del Mermaid: **16 archivos y 26 imports internos coincidentes, código 0**. Log: `reports/week-02/logs/oscar-fer-diagrama.txt`. Es una comprobación de correspondencia de rutas/aristas, no una captura de renderizado del diagrama.
4. `make feedback`: **código 0**, con tipos, lint, smoke y exportación Android de Expo aprobados. Log: `reports/week-02/logs/oscar-fer-feedback.txt`. La auditoría informó **2 vulnerabilidades altas** en dependencias heredadas; el umbral obligatorio configurado es `critical` y el comando terminó correctamente. No se cambiaron versiones ni umbrales para obtener ese resultado. La exportación no equivale a instalar o probar un APK.

El log `reports/week-02/logs/oscar-fer-typecheck-antes.txt` conserva los tres errores iniciales de TypeScript. `reports/week-02/logs/oscar-fer-feedback-intermedio.txt` conserva una iteración rechazada por la regla `react-hooks/set-state-in-effect`; se corrigió asociando cada resultado con su consulta y derivando el estado visible, sin desactivar la regla.

Se comprobó además que no hubiera cambios en `course-tests/`, `tools/course_public_evaluator.py`, las dependencias, el Makefile, workflows registrados ni el adaptador de evaluación del curso. Los comandos `make verify-week-02`, `make public-test-week-02` y `make evidence-week-02` del cierre completo quedan para la integración y las evidencias del equipo; no se presentan como aprobados por esta revisión de rama.

Las pruebas comprueban también que un error de detalle permite regresar a la lista y que el fake de incidencias funciona aunque falle el puerto de salud. No se implementó backend de incidencias, sesión, persistencia, ubicación ni sincronización.

## Límites y cierre del equipo

Esta corrección no constituye la entrega final del equipo. La rama de Fer no incluye todavía los reportes de dependencias y justificación subidos en la rama de Jarumi, ni los tres registros personales completos. Hay que integrar las aportaciones y validar los JSON y sus SHA sobre esa versión; conservar el fallo histórico de AC-03 y actualizar las comprobaciones finales sin reemplazar observaciones anteriores por resultados inventados.

En la lectura de la rama remota de Jarumi se observó además que `checks[].evidence` de `dependencies.json` contiene objetos, mientras que el evaluador exige cadenas no vacías. Ese reporte requiere una corrección al integrarlo, conservando sus detalles en texto o en campos adicionales. No se importó ni modificó ese reporte desde la rama de Fer en esta revisión.

La corrección del código y las pruebas se guarda como una aportación posterior, conservando la autoría e historial de Fernanda. No se creó ni movió la etiqueta `week-02-final`, y no se afirma una ejecución manual en Android.
