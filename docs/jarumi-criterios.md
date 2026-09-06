# Revisión de criterios — Jarumi (Riesgo 1)

## 1. Objetivo de la revisión

Esta revisión analiza el riesgo 1 del registro de riesgos de CampusOps: la posibilidad de que un cambio de atención hecho sin conexión sobrescriba una reasignación posterior de coordinación. Se compara este riesgo con `docs/problem-definition.md` y `docs/CAMPUSOPS.md`, para verificar que el problema, sus criterios de aceptación y su mitigación descrita sean coherentes y verificables. En particular, se revisa si el criterio de aceptación relacionado con reasignación durante trabajo sin conexión refleja correctamente el riesgo, y si la consecuencia de no mitigarlo está bien justificada: que la incidencia real quede sin resolver porque ninguno de los dos técnicos involucrados sabe con certeza quién es responsable, y que la decisión de coordinación se pierda sin que el sistema lo notifique.

## 2. Predicción antes de la comprobación

Antes de ejecutar la prueba pública `course-tests/public/week-01.test.ts`, mi predicción es que va a pasar (PASS). Esto porque, según el criterio de aceptación #9 de `problem-definition.md`, la línea base de semana 1 solo verifica aspectos básicos del reporte y los documentos del proyecto — no comprueba sincronización, reasignación ni el escenario de conflicto descrito en mi riesgo 1. Como el equipo ya confirmó que el proyecto original funciona (`make feedback` pasó sin errores) y no se ha modificado ningún archivo protegido (`App.tsx`, pruebas, workflows), no debería haber ninguna razón para que esta prueba falle.

## 3. Análisis del riesgo 1 y sus criterios

**Evento y consecuencia:** el riesgo describe que un técnico A trabaja sin conexión sobre una incidencia mientras Coordinación reasigna esa misma incidencia a un técnico B. Si el sistema no distingue esta situación, al sincronizar el cambio de A podría sobrescribir la reasignación de B: el sistema mostraría a A como responsable otra vez, aunque Coordinación ya decidió lo contrario. Ninguno de los dos técnicos sabría con certeza quién debe atender realmente el caso, y la incidencia original (la falla eléctrica, la fuga de agua, etc.) podría quedar sin resolver mientras el conflicto pasa desapercibido.

**Probabilidad y motivo:** coincido con la justificación de "alta" en la fila del riesgo, porque el caso de CampusOps contempla explícitamente zonas sin cobertura y reasignaciones como parte normal del flujo, no como una excepción rara. Ambas situaciones ocurriendo al mismo tiempo (offline + reasignación) es un escenario esperable, no marginal.

**Impacto y motivo:** coincido con "alto", porque afecta directamente la autorización sobre quién puede actuar en una incidencia, y puede hacer que una decisión legítima de Coordinación se pierda sin que nadie se entere.

**Mitigación:** la mitigación describe conservar tres elementos: la "versión base" (una especie de captura del estado de la incidencia cuando A empezó a trabajar offline), el "autor" de cada cambio (para distinguir qué hizo A de qué hizo Coordinación), y la "intención pendiente" (el cambio de A que aún no se confirma con el servidor). Al sincronizar, el sistema compara la versión base que tenía A contra la versión real actual; si no coinciden, detecta que hubo un cambio externo y muestra un conflicto en vez de sobrescribir silenciosamente.

**Comprobación prevista:** el escenario reproducible descrito (A offline, reasignación a B, sincronización de A) es claro y verificable con datos ficticios: B debe seguir como responsable, el cambio de A no debe perderse (debe quedar recuperable) y el sistema debe informar que hubo un conflicto. Esta comprobación es una propuesta para el hito de sincronización; no se ejecuta todavía porque esa función no está implementada.

**Prioridad:** coincido en que este riesgo debe atenderse primero entre los tres, porque combina alta probabilidad con la pérdida de una decisión de autoridad (Coordinación), a diferencia del riesgo 2 (duplicación) que depende de una ventana de tiempo más específica, o el riesgo 3 (interfaz) cuyo impacto es menor.

## 4. Hallazgos

No se encontraron ambigüedades ni contradicciones entre la fila del riesgo 1 y el criterio de aceptación #6 de `problem-definition.md`. Ambos documentos describen el mismo escenario (técnico A trabajando sin conexión, reasignación de Coordinación a técnico B, sincronización posterior de A) con las mismas condiciones esperadas: se informa el conflicto, se conserva la intención pendiente de A y no se sobrescribe la nueva asignación de B. La mitigación descrita en el riesgo 1 (conservar versión base, autor e intención pendiente) es clara y explica un mecanismo concreto para detectar el conflicto, no solo una intención vaga. Por esta coherencia entre ambos documentos, no se propone ningún cambio a la fila del riesgo 1 ni al criterio de aceptación relacionado.

## 5. Cambios realizados

No se realizó ningún cambio a `docs/risk-register.md` ni a `docs/problem-definition.md`, porque la revisión de la sección 4 concluyó que la fila del riesgo 1 y el criterio de aceptación relacionado ya son coherentes, claros y verificables. No se identificó ninguna mejora sustantiva que justificara modificar el texto existente.

## 6. Comando y resultado real

Comando ejecutado: `npm test -- --ci --runInBand course-tests/public/week-01.test.ts`.

Resultado real: la prueba pasó correctamente (PASS). Se ejecutó 1 suite de pruebas con 1 prueba total, ambas exitosas (`Test Suites: 1 passed, 1 total`; `Tests: 1 passed, 1 total`), con código de salida `EXIT_CODE=0`. El resultado coincide con mi predicción de la sección 2.

## 7. Explicación y límites

La prueba pública `week-01.test.ts` confirma que existe evidencia guardada de una falla reproducida y su corrección verificada, según el nombre de la prueba (`baseline preserves the reproduced failure and its verified correction`). Sin embargo, esta prueba no comprueba mi riesgo 1 (reasignación durante trabajo sin conexión): no ejecuta ningún escenario de sincronización, conflicto ni reasignación entre técnicos, porque esas funciones todavía no están implementadas en el proyecto — corresponden a hitos posteriores del curso. Esta prueba solo valida que la estructura básica de evidencia de línea base esté presente, no la lógica de negocio de CampusOps relacionada con mi riesgo.

## Aclaración añadida durante la integración

La revisión de integración de Oscar, asistida por Codex, identificó una referencia imprecisa en la predicción de la sección 2: el criterio de aceptación 9 de `docs/problem-definition.md` describe la prueba smoke de `App` y su estado `Backend: available`. La prueba pública ejecutada aquí es distinta: comprueba que `baseline.json` contenga observaciones `fail` y `pass` y busca referencias básicas a actores y riesgos en los documentos. Por tanto, el criterio 9 no es la fuente de esas comprobaciones documentales. Se conserva la predicción original para no reconstruirla después del resultado; esta nota aclara su fundamento. El log y el resultado de la ejecución de Jarumi permanecen sin cambios de contenido.
