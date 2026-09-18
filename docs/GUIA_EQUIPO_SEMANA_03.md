# Semana 03 — Guía sencilla del equipo

**Objetivo:** que GitHub revise CampusOps automáticamente y que cada riesgo de seguridad tenga un control y una prueba que lo compruebe.

Esta guía organiza trabajo pendiente; no certifica que las pruebas o la actividad estén terminadas. Continúen en el mismo repositorio, con React Native, Expo y TypeScript, conservando el trabajo anterior.

**Entrega del paquete:** 21 de septiembre de 2026, 23:59, Ciudad de México. Actividad: 8 puntos. El quiz es independiente y queda fuera de esta guía de trabajo.

## 1. Los archivos del paquete: para qué sirven

| Archivo o carpeta | Qué hacer |
|---|---|
| `INSTALL.md` | Explica cómo combinar el paquete con el proyecto sin borrar lo anterior. |
| `docs/assignments/week-03.md` | Actividad; corresponde a `ACTIVITY_STUDENT_FACING.md` del ZIP. |
| `docs/assignments/week-03-repository.md` | Comandos y entrega; corresponde a `STARTER_AND_REPOSITORY.md`. |
| `docs/assignments/week-03-rubric.md` | Rúbrica; corresponde a `RUBRIC_PUBLIC.md`. |
| `course-tests/public/week-03.test.ts` | Pruebas públicas. Lean qué verifican; conserven sus aserciones. Ya estaba versionado en esta copia. |
| `.github/workflows/week-03-ci-amenazas-feedback.yml` | Flujo automático del paquete. Incluyan `.github` aunque esté oculta. |

Lean también [CampusOps](CAMPUSOPS.md), [su contrato API](CAMPUSOPS_API.md) y [el formato de evidencias](EVIDENCE_CONTRACT.md). La existencia de archivos no demuestra que estén completos ni publicados.

Al preparar estas guías faltaban `docs/threat-model.md`, `reports/week-03/security.json` y las evidencias de Semana 03. Se incorporó el avance remoto de Semana 02: ya existen las capas de dominio, aplicación, infraestructura, composición y UI, además de `tests/architecture.test.ts` y `tests/incidents.test.tsx`. Partan de ese trabajo y conserven sus comprobaciones; su presencia no acredita todavía los controles de Semana 03.

## 2. Reparto propuesto

| Persona | Trabajo principal | Qué entrega al equipo |
|---|---|---|
| Jarumi | Modelo de amenazas y justificación de prioridades. | `docs/threat-model.md`, `engineering.json` y revisión técnica. |
| Fernanda | Pruebas de seguridad y demostración de fallo/corrección. | Controles y pruebas, logs y `reports/week-03/security.json`. |
| Óscar | Responsable de editar/integrar el workflow, revisar artefactos y preservar regresiones. | Revisión técnica propia, ejecución final y registro individual. |

Cada persona completa su propio registro en **un único** `evidence/week-03/individual.json`. Acuerden turnos para editarlo y no sobrescribir aportaciones.

- [Guía de Jarumi](GUIA_JARUMI_SEMANA_03.md)
- [Guía de Fernanda](GUIA_FERNANDA_SEMANA_03.md)
- [Guía de Oscar](GUIA_OSCAR_SEMANA_03.md)

Fernanda indica los comandos de sus pruebas y revisa CI con Oscar; Oscar edita el YAML para evitar cambios simultáneos. Jarumi acuerda con ambas personas los riesgos, controles y criterios que se documentarán.

## 3. Preparar la copia

En la raíz, donde están `package.json` y `Makefile`, revisen:

```powershell
git status --short
git branch --show-current
git remote -v
node --version
npm --version
python --version
make --version
```

Conserven los cambios pendientes antes de cambiar de rama. Con la copia limpia, actualicen `main` con `git pull --ff-only origin main` y creen su rama: `codex/semana-03-jarumi`, `codex/semana-03-fernanda` o `codex/semana-03-oscar`. Si ya existe, cambien a ella sin volver a crearla. Usen su identidad Git real; revisen `git config user.name` y `git config user.email`.

La guía oficial pide Node **22.22.0**. Ejecuten `make setup` para instalar desde el lockfile y después `make feedback`. Ejecuten cada comando por separado y revisen su código de salida antes de seguir. Si Windows no reconoce `python3`, usen `make PYTHON=python verify-week-03` y el mismo parámetro en los demás objetivos semanales. Para problemas del lanzador npm, consulten [entorno-windows.md](entorno-windows.md).

## 4. Evidencia: qué escribir y qué no inventar

Todos los JSON de esta semana usan `schemaVersion: 1` y `week: 3`, guardados como UTF-8 sin BOM.

| Archivo | Campos y contenido |
|---|---|
| `reports/week-03/security.json` | `commitSha`, `generatedAt` ISO 8601 y `checks`. Cada check: `id`, `status`, `scenarioType`, `command`, `evidence`. |
| `evidence/week-03/engineering.json` | `commitSha`, `decision`, dos `alternatives` diferentes, `tradeoff`, `requirementIds` y `verification` con `command`, `result`, `evidence`. |
| `evidence/week-03/individual.json` | `teamId` registrado y exactamente tres `members`, cada uno con los campos de abajo. |

Un check admite `status` = `pass`, `fail` o `not_applicable`; `scenarioType` = `nominal`, `boundary` o `failure`. Incluyan al menos un límite o fallo. Conserven el fallo histórico y el resultado corregido como observaciones distintas, explicando si el estado describe un comando fallido o una prueba negativa que rechazó correctamente una operación. Un pendiente no equivale a un éxito ni justifica omitir un requisito obligatorio.

`checks[].evidence` debe ser **texto no vacío**, no un objeto. Si necesitan datos estructurados adicionales, consérvenlos en otro campo y enlacen el log desde el texto. El evaluador actual genera `verify.json`, `public-tests.json` y `failure.json` dentro de `reports/week-03/`; este último nombre no significa que el resultado sea necesariamente fallido: lean `status` y sus checks.

Cada integrante registra `studentId`, `commitShas` completos propios, `files`, `tests`, `reviews`, `prediction`, `command`, `observedResult` y `explanation`. Debe tener al menos un archivo técnico y una prueba o revisión real. Escriban la predicción antes de ejecutar y el resultado después. No inventen identidades, autorías, ejecuciones ni SHAs. Declaren la ayuda de IA y cómo la verificaron.

## 5. Cierre conjunto, sólo cuando el trabajo esté completo

1. Integren y guarden en un commit todo el código, configuración, pruebas y documentos. Revisen `git diff --check` y `git status --short`.
2. Obtengan `git rev-parse HEAD`. Éste es el SHA de código comprobado que usarán en `commitSha`.
3. Ejecuten las pruebas propias explícitamente, completen los JSON con resultados reales y ejecuten, uno por uno:

```powershell
make feedback
make verify-week-03
make public-test-week-03
```

4. Corrijan cualquier fallo y repitan lo afectado. Si cambia código/configuración/documentación, guárdenlo y actualicen el SHA y las comprobaciones. Después creen **un commit final que sólo cambie `reports/` y `evidence/`**. Los JSON pueden referir a su padre directo; no a un commit anterior cualquiera.
5. Con el árbol limpio y sin una etiqueta final previa, ejecuten:

```powershell
git tag -a week-03-final -m "DMI week 03 final"
make evidence-week-03
```

Si falla, detengan el envío y diagnostiquen. No sobrescriban una etiqueta ya entregada. El reporte generado después de etiquetar queda local; no añadan otro commit por ese reporte.

6. Cuando todo pase, publiquen y comprueben:

```powershell
git push origin HEAD
git push origin week-03-final
git rev-list -n 1 week-03-final
```

Verifiquen en GitHub la ejecución del **SHA final**, sus logs y los artefactos descargables. Entreguen en Classroom [el repositorio](https://github.com/Oscar71k1/DMI-Equipo-4), `week-03-final` y el SHA completo del último comando. Crear estas guías no es motivo para etiquetar ya la entrega final.

## 6. Lista rápida antes de entregar

- [ ] Workflow con instalación fijada, paquete Expo, tipos, estilo, pruebas y búsqueda de secretos; permisos mínimos y artefactos incluso ante error.
- [ ] Modelo con activos, fronteras, cuatro amenazas, prioridades, controles, pruebas y riesgo residual.
- [ ] Fallo obligatorio reproducido, código distinto de cero, diagnóstico y corrección comprobada.
- [ ] Los cinco archivos obligatorios están completos y describen la versión entregada.
- [ ] Tres aportaciones reales y explicables, tag publicado y SHA completo.

La rúbrica suma reproducción **2.5**, funcionamiento **2**, falla **1.5**, decisión **1.5** y aporte individual **0.5**. Un flag pide corroboración; no descuenta por sí solo. El parcial no tiene porcentaje fijo. Revisen los límites G1–G4 en la rúbrica, además de los puntos por criterio.
