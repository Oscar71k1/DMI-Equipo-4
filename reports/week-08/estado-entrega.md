# Estado de la revisión de semana 8

Código y evidencias auditados: `3117c057b7b18310fd687ef00d3b030e22b3a911`.
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

Los verificadores oficiales verify/public y el chequeo evidence posterior a la publicación de week-08-final pasaron. La salida versionada de failure.json describe el diagnóstico anterior al etiquetado; los artefactos actuales de GitHub muestran los controles aprobados. Las comprobaciones de la corrección documental se registran con su SHA fuente correspondiente.

## Pendientes aceptados o que requieren al equipo

1. Prueba de force-stop/reapertura en Android. No hay dispositivo conectado ni AVD configurado. Oscar indicó continuar y dejarla pendiente; `migration-tests.json` la conserva con status `fail`, y `docs/sync-policy.md` contiene los pasos. No se la marca como no aplicable.
2. Corroboración documental completada: `individual-audit.json` verifica tres integrantes, doce commits, archivos y cinco logs históricos. El contrato no exige una firma adicional ni el campo personalizado requiresMemberReview. La capacidad de explicar su trabajo se corrobora con cada integrante cuando lo solicite el docente; no se presenta como evaluada por Codex.
3. `week-08-final` fue publicada sobre 3117c057b7b18310fd687ef00d3b030e22b3a911 por autorización explícita de Oscar con pendientes documentados. La corrección documental posterior requiere decidir la actualización de esa etiqueta para que incluya la nueva evidencia; no se mueve silenciosamente.

Para cerrar después: completar la prueba nativa y la corroboración, volver a ejecutar las comprobaciones, registrar reportes/evidencias en un commit exclusivo y crear el tag sobre esa versión. Si cambia código o documentación, actualizar primero el SHA comprobado y los reportes. No publicar una etiqueta final sobre esta revisión parcial.

## Propuesta de PR para revisión

Título: `Semana 8: integrar persistencia y resolver conflictos sin perder trabajo`.

El PR conserva su condición de borrador; la prueba nativa sigue pendiente y la corroboración documental individual ya está completada. Reúne las ramas de Jarumi y Fernanda, corrige su integración y añade la resolución explícita. Las comprobaciones automáticas pasan; la entrega académica completa sigue pendiente. Abrir un PR no autoriza fusionarlo a main.

Oscar autorizó explícitamente subir la rama y abrir este PR en borrador con esos pendientes visibles, sin fusionarlo.

La revisión de duplicados de CI conserva las pruebas y las evaluaciones históricas. Ver `ci-duplicados.md`; los fallos antiguos permanecen en el historial de Actions, sin atribuirlos al código actual.
