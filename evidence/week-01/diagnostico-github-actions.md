# Diagnóstico del fallo de GitHub Actions — semana 1

## Ejecución afectada y síntoma

- Versión publicada: `86e44dd125677ac07d3a275f5eb356acac4792cd`.
- Comando que terminó con error: `make public-test-week-01`.
- [Ejecución original de Week 01 Public Feedback](https://github.com/Oscar71k1/DMI-Equipo-4/actions/runs/34001688845).
- Resultado observado: `status: fail` y salida de Make con código 2.
- Los checks de esquema de `baseline.json` y `engineering.json` indicaban `commitSha must be a full lowercase Git SHA`. El check de `individual.json` indicaba que los SHA de los integrantes todavía no eran válidos.
- TypeScript, lint, auditoría con el umbral configurado y la prueba pública de semana 1 sí terminaron con `pass`. En la misma ejecución también pasaron instalación, `make feedback` y `make verify-week-01`.

La advertencia de auditoría moderada no causó este fallo: su check pasó con el umbral original. No se cambian dependencias ni umbrales para resolver un error de evidencia.

## Causa comprobada

Los archivos `baseline.json` y `engineering.json` ya estaban completados en la copia local, pero no se habían incluido en los commits publicados. GitHub Actions ejecutó el checkout del SHA indicado y leyó las plantillas que seguían versionadas. El asistente había publicado los documentos y dejado estos dos JSON fuera del avance; esta corrección subsana esa omisión.

La diferencia se comprobó leyendo los archivos realmente guardados en Git:

```bash
git show 86e44dd125677ac07d3a275f5eb356acac4792cd:reports/week-01/baseline.json
git show 86e44dd125677ac07d3a275f5eb356acac4792cd:evidence/week-01/engineering.json
```

En ambos, `commitSha` seguía siendo un texto de plantilla. El contenido local con un SHA válido no estaba disponible para el runner de GitHub.

La causa del tercer check es distinta: los otros dos integrantes todavía no han realizado sus aportaciones. El usuario lo confirmó durante esta corrección. No existen todavía los datos y commits personales necesarios para cerrar `individual.json`.

## Corrección aplicada

1. Publicar las versiones completadas de `reports/week-01/baseline.json` y `evidence/week-01/engineering.json`.
2. Conservar en ambos el SHA completo `86e44dd125677ac07d3a275f5eb356acac4792cd`, que identifica el trabajo técnico publicado.
3. Registrar esta corrección exclusivamente bajo `reports/` y `evidence/`. Así el commit de corrección puede referenciar a su padre inmediato, como permite `docs/EVIDENCE_CONTRACT.md`.
4. Conservar los campos, nombres y rutas de las plantillas originales. `baseline.json` mantiene una observación fallida y otra aprobada de la falla controlada de la app, respaldadas por sus salidas reales.
5. Mantener pendiente `individual.json` hasta reunir tres aportaciones reales. Este commit es un avance de corrección; todavía no es el cierre del paso 14 ni la entrega final.

Las pruebas, workflows, evaluador, scripts npm y Makefile se conservan como en el commit inicial. Se comprobó con:

```bash
git diff --exit-code 635d471c3bce751720adbe0e2c50bcd245520d51 HEAD -- course-tests .github tools/course_public_evaluator.py package.json Makefile
```

Resultado observado antes de publicar: código 0 y ninguna diferencia.

## Decisión, alternativas y beneficio/costo

Para resolver la omisión se eligió publicar ahora los dos reportes respaldados por evidencia, mediante un commit exclusivo de evidencias. La alternativa considerada fue esperar a que los tres integrantes terminaran y publicar todos los JSON juntos.

Publicarlos ahora permite comprobar de inmediato los dos errores de SHA y deja visible el diagnóstico real. El costo es que el workflow semanal seguirá fallando por la aportación individual pendiente. Al incorporar nuevos cambios del equipo habrá que obtener un SHA vigente y regenerar las evidencias siguiendo los pasos 9 a 14; no debe mantenerse un SHA que deje de cumplir la relación de padre inmediato.

La decisión de ingeniería sobre la falla controlada y sus alternativas está en `engineering.json`. Debe revisarse con el equipo antes del cierre.

## Comprobación local de los esquemas originales

Se invocaron directamente las funciones del evaluador original, sin modificarlo:

```powershell
python -B -c "import json, runpy; from pathlib import Path; e=runpy.run_path('tools/course_public_evaluator.py'); r=Path.cwd(); s=e['git_sha'](r); checks={'baseline':e['validate_report'](r,r/'reports/week-01/baseline.json',1,s),'engineering':e['validate_engineering'](r,r/'evidence/week-01/engineering.json',1,s),'individual':e['validate_individual'](r/'evidence/week-01/individual.json',1)}; print(json.dumps(checks,ensure_ascii=True,indent=2)); assert checks['baseline'][0] and checks['engineering'][0]"
```

Resultado observado antes del commit de corrección:

| Comprobación | Resultado | Alcance |
|---|---|---|
| `validate_report` para `baseline.json` | `true`: dos observaciones, una de falla; SHA de HEAD válido | Estructura, escenarios y referencia Git del reporte. |
| `validate_engineering` para `engineering.json` | `true`: decisión, alternativas y comprobaciones válidas para el esquema | Estructura y referencia Git; no sustituye la revisión del equipo. |
| `validate_individual` | `false`: faltan SHA personales reales | Confirma el pendiente, no una corrección terminada. |

Esta comprobación local no sustituye `make public-test-week-01`. Después de subir el commit debe consultarse la ejecución correspondiente de [Week 01 Public Feedback](https://github.com/Oscar71k1/DMI-Equipo-4/actions/workflows/week-01-feedback.yml). Se espera que desaparezcan los dos errores de SHA de los reportes y permanezca el error de evidencia individual hasta completar las aportaciones.

El fallo de Windows al lanzar npm desde Python es un problema de entorno local separado. La ejecución de GitHub sobre Ubuntu ya demostró que los comandos originales del toolchain pueden pasar sin alterar el evaluador.

## Relación con la rúbrica

| Criterio | Evidencia disponible | Pendiente para cerrar |
|---|---|---|
| Reproducción | SHA técnico completo, historial Git y ejecución original de Actions con instalación, feedback y verificación aprobados. | Workflow semanal totalmente aprobado desde la versión definitiva y etiqueta final comprobada. |
| Definición del caso | `docs/problem-definition.md` y `docs/risk-register.md`: alcance, actores, flujo, criterios observables y exactamente tres riesgos priorizados. | Revisión y aportaciones del equipo. |
| Diagnóstico de falla | `baseline.json`, `evidence/week-01/procedimiento-falla.md` y los logs `smoke-falla.txt` y `smoke-corregido.txt`. | Repetición personal por los integrantes que la registren como propia. |
| Decisión técnica | `engineering.json`: decisión sobre la prueba determinista, alternativas, beneficio/costo y resultados fail/pass reales. Este documento explica además la decisión de publicación. | Adopción o ajuste por el equipo antes de la entrega. |
| Evidencia individual | Plantilla original y guía de colaboración, apartados 4 a 7. | Identificador oficial de equipo, identificadores escolares, commits propios, archivos, predicción, prueba o revisión, resultado y explicación de exactamente tres personas. |

La falla controlada evaluable sigue siendo la transición incorrecta de `App.tsx` y su corrección. La omisión al publicar JSON se documenta como una incidencia adicional; no sustituye el experimento ni se presenta como una ejecución personal de los compañeros.

## Secuencia de cierre

Cuando estén las tres aportaciones, seguir `LEEME_PRIMERO.md` desde el paso 9: fijar el SHA definitivo del trabajo técnico, completar los tres JSON con datos reales, ejecutar todas las comprobaciones y crear el commit exclusivo de evidencias sólo cuando todo pase. Después crear `week-01-final`, ejecutar `make evidence-week-01`, comprobar `failure.json`, subir rama y etiqueta y entregar en Classroom únicamente URL, etiqueta y SHA completo.

No se crea una etiqueta final mientras falten aportaciones o verificaciones.

