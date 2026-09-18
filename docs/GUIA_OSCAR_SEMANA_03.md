# Oscar — Semana 03: integración, CI y evidencia técnica

Tu aporte principal es hacer que las comprobaciones del equipo se ejecuten sobre la versión integrada y que sus resultados se puedan verificar. Este documento es un plan: no acredita implementaciones ni pruebas realizadas.

Lee primero la [guía del equipo](GUIA_EQUIPO_SEMANA_03.md), la [actividad](assignments/week-03.md) y [la preparación de entrega](assignments/week-03-repository.md).

## 1. Estado inicial del trabajo

En la copia revisada después del cierre de Semana 02:

- Existe el workflow de Semana 03, con permisos `contents: read`, subida de reportes mediante `if: always()` y checkout con `ref` explícito y profundidad 2.
- El workflow usa Node `22`, no la versión exacta `22.22.0` indicada por el curso.
- Existen la app lista/detalle y las pruebas de arquitectura/incidencias de Semana 02. Hay que conservarlas y ejecutarlas también en CI.
- Todavía faltan `docs/threat-model.md`, `reports/week-03/security.json` y los dos JSON de evidencia de Semana 03.
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

## 3. Tu evidencia individual y el cierre

Completa sólo tu registro en `evidence/week-03/individual.json`, con tu SHA técnico propio, archivos modificados, predicción, comando, resultado y explicación. Registra las ejecuciones hechas con asistencia de Codex como tales. Los resultados antiguos de Semana 02 no acreditan automáticamente trabajo nuevo de Semana 03.

Antes del cierre, integra las aportaciones y ejecuta las pruebas propias explícitamente, además de:

```powershell
make feedback
make verify-week-03
make public-test-week-03
```


Sigue el cierre de la guía común: commit técnico, evidencias del SHA probado, commit exclusivo de `reports/` y `evidence/`, etiqueta `week-03-final`, `make evidence-week-03` y comprobación remota de SHA/artefactos. No crees la etiqueta por terminar estas guías. No muevas la etiqueta publicada de Semana 02.

## 4. Cuándo está terminado tu aporte

- [ ] El YAML ejecuta los controles y pruebas reales, con permisos mínimos y artefactos útiles.
- [ ] Revisaste el fallo controlado y su corrección en Actions, identificados por SHA.
- [ ] Tu revisión explica al menos un control real, su prueba y su límite.
- [ ] Tu registro individual tiene un aporte nuevo, verificable y sin resultados inventados.
- [ ] El cierre se hace sólo después de integrar y validar el trabajo de las tres personas.
