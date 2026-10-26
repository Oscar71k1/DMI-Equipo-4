# Estado de la revisión de semana 8

Código comprobado: `877c6a17dada896761b54da98f3af2e73ae305b2`.
Rama: `codex/revision-semana-08`. `main` no se ha modificado.

## Pendientes corregidos

- Contrato único entre SQLite y sincronización; recuperación de petición inmutable y confirmaciones transaccionales.
- Resolución explícita: aceptar el servidor conserva las intenciones y sus dependientes como historial local, sin falsear confirmaciones ni reenviar el inicio antiguo. Está conectada a la pantalla y probada frente al backend real.
- Un error al guardar la resolución revierte toda la cadena. Un envío con efecto incierto no puede darse por cerrado.
- Reporte `migration-tests.json`, decisión `engineering.json` y tres registros con fuentes en `individual.json`.
- Documentos y workflow oficiales de semana 8 incorporados. Checkout de CI recupera tags e historial y evalúa el SHA de la rama propuesta en un PR, en lugar del merge sintético. No se desactivó ningún control.

## Resultado observado

`python -B tools/generate_week08_reports.py`: 27 suites, 156 pruebas aprobadas; TypeScript, lint sin advertencias, backend, migraciones, auditoría con umbral crítico y bundle Android correctos. Los logs bajo `reports/week-08/logs/current-*` incluyen comandos, SHA y códigos de salida.

La auditoría todavía informa cinco vulnerabilidades altas en dependencias de Expo. Pasar su umbral crítico no significa ausencia de vulnerabilidades.

Los resultados oficiales de verificación técnica y pruebas públicas se conservan en `verify.json` y `public-tests.json`. Validar la estructura de un JSON no equivale a haber ejecutado una prueba nativa ni a una corroboración personal.

Ambos verificadores oficiales terminaron con código 0 sobre el SHA indicado. El verificador `--mode evidence` acepta los tres JSON y falla únicamente en `frozen_sha` por ausencia de `week-08-final`; su salida real está en `failure.json`. El workflow conserva ese control y puede fallar en esa etapa mientras el PR siga siendo una revisión sin etiqueta final.

## Pendientes aceptados o que requieren al equipo

1. Prueba de force-stop/reapertura en Android. No hay dispositivo conectado ni AVD configurado. Oscar indicó continuar y dejarla pendiente; `migration-tests.json` la conserva con status `fail`, y `docs/sync-policy.md` contiene los pasos. No se la marca como no aplicable.
2. Cada integrante debe corroborar su registro en `individual.json`. Sus IDs, commits y logs son verificables; se distingue la expectativa escrita en pruebas de una declaración personal. Los resultados nuevos de Codex no se atribuyen a Jarumi o Fernanda.
3. No se ha fijado `week-08-final`: la etiqueta corresponde al cierre de entrega, después de completar los pendientes reales. No debe usarse un tag para hacer pasar el verificador como sustituto de esa evidencia.

Para cerrar después: completar la prueba nativa y la corroboración, volver a ejecutar las comprobaciones, registrar reportes/evidencias en un commit exclusivo y crear el tag sobre esa versión. Si cambia código o documentación, actualizar primero el SHA comprobado y los reportes. No publicar una etiqueta final sobre esta revisión parcial.

## Propuesta de PR para revisión

Título: `Semana 8: integrar persistencia y resolver conflictos sin perder trabajo`.

El PR debe permanecer en borrador mientras falte la prueba nativa y la corroboración individual. Reúne las ramas de Jarumi y Fernanda, corrige su integración y añade la resolución explícita. Las comprobaciones automáticas pasan; la entrega académica completa sigue pendiente. Abrir un PR no autoriza fusionarlo a main.

Oscar autorizó explícitamente subir la rama y abrir este PR en borrador con esos pendientes visibles, sin fusionarlo.

La revisión de duplicados de CI conserva las pruebas y las evaluaciones históricas. Ver `ci-duplicados.md`; los fallos antiguos permanecen en el historial de Actions, sin atribuirlos al código actual.
