# Integración y reproducción de semana 09

Base: `9a351f2` de origin/main, que conserva week-08-final. Los commits de Fernanda `295d803`, `235b05d` y `dc0f728` se incorporaron por cherry-pick (c7e9f37, 651c046, 4f6003a). No se reemplazó el árbol por el de su rama antigua. Los documentos oficiales y el workflow de semana 09 estaban sin publicar en el checkout original; se incorporan aquí. Las pruebas docentes y su evaluador permanecen intactos.

La implementación nueva de ubicación/caché/manual, endurecimiento de reintentos, conexión HTTP y extensión durable de resolve/close se realizó con Codex a solicitud de Oscar. Se conserva autoría Git real; el registro de Jarumi identifica su revisión comunicada por Oscar y sus aportes previos de SQLite. No se inventan commits o ejecuciones personales.

## Reproducción

Usar Node 22.22.0, npm, Python 3 y GNU Make. `make setup` instala las dependencias bloqueadas. En Windows se puede usar el adaptador de npm documentado en `entorno-windows.md` sin modificar el evaluador. Los logs registran la versión real de npm disponible; no se cambió el lockfile.

Ejecutar pruebas propias con selección anclada para no incluir semanas futuras:

```powershell
npm test -- --ci --runInBand '^tests/.*\.test\.tsx?$' course-tests/smoke.test.tsx course-tests/public/week-09.test.ts
node lab/week9-external.cjs
make feedback
make verify-week-09
make public-test-week-09
```

Para ejecutar exactamente la regresión acumulada en PowerShell, el comando de selección por rutas y los resultados quedan en `reports/week-09/logs/current-tests.txt`. `lab/week9-reports.py` indexa observaciones y resultados ya ejecutados; no simula ni ejecuta pruebas. Se usa después del commit técnico y antes del commit exclusivo de evidencias. El ejemplo del enunciado sobre SHA permite ese padre inmediato.

`make evidence-week-09` se ejecuta después de crear la etiqueta local week-09-final. La etiqueta final y los reportes deben corresponder al mismo código; el último commit sólo puede modificar reports/ y evidence/. No añadir otro commit sólo por el reporte final de ese target.

## CI y regresiones anteriores

El workflow de semana 09 conserva todos los checks docentes, usa Node 22.22.0 y checkout del SHA exacto con historial y etiquetas. Añade pruebas propias/semana 8. No altera expectativas ni oculta errores. La evaluación final se ejecuta al publicar week-09-final; el PR usa el mismo commit para verificarla.

El workflow de semana 08 conserva verify y ejecuta sus pruebas en cada PR/main. Sus validaciones de evidencia congelada se ejecutan únicamente en la etiqueta week-08-final: sus reportes históricos no describen cada nuevo HEAD. Esto evita exigir que el tag anterior apunte al código de semana 09. No se han modificado sus pruebas ni la entrega congelada.

## Alcance comprobado

Pruebas de contrato, transporte HTTP del doble, SQLite real en disco con reapertura, interfaz React Native en Jest y exportación Android de Expo. Una ejecución de consulta externa se registra aparte. No se afirma instalación nativa nueva ni envío de notificaciones: este backend/app no incluye un despachador de notificaciones. La cola durable cubre resolución/cierre; la creación incierta sólo conserva su intención mientras permanece abierto el formulario.
