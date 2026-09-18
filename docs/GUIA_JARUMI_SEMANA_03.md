# Jarumi — Semana 03: explicar los riesgos y cómo comprobarlos

Tu objetivo es responder: **¿qué protegemos, qué podría salir mal y qué prueba demostraría que el control funciona?** Lee primero la [guía común](GUIA_EQUIPO_SEMANA_03.md), que contiene preparación, formato JSON, fecha y entrega.

## 1. Acordar el trabajo con Fernanda

Tú preparas `docs/threat-model.md` y `evidence/week-03/engineering.json`. Fernanda trabaja en controles/pruebas y `security.json`; Oscar integra y edita CI. Acuerden los nombres de los riesgos y las pruebas para usar los mismos identificadores. Por ejemplo, R-01 debe significar lo mismo en el modelo, la prueba y el reporte.

Revisa primero el código realmente integrado. Una guía anterior o una carpeta planeada no demuestran que una función exista. Distingue en el documento **implementado y probado**, **pendiente** y **previsto para otro hito**. No hace falta construir ahora todo el login o las integraciones futuras, pero una amenaza priorizada necesita una comprobación concreta y sus límites explícitos.

## 2. Escribir el modelo de amenazas

Un **activo** es algo que cuidamos. Una **frontera de confianza** es un lugar donde cambian los permisos o quién controla los datos. Un **riesgo residual** es lo que todavía puede fallar después del control.

Crea `docs/threat-model.md` con estas secciones:

1. **Alcance actual:** qué existe en esta versión y qué está previsto.
2. **Activos:** sesión/tokens, fotografías, ubicaciones, incidencias, asignaciones, credenciales y logs/reportes de CI. Explica qué daño causaría exponer o alterar cada uno.
3. **Fronteras:** persona → app; app → servicio; servicio → almacenamiento; app → proveedor externo; repositorio → GitHub Actions → artefactos. Marca las futuras y describe los datos que cruzan cada frontera.
4. **Amenazas:** usa una tabla como la siguiente y complétala con rutas reales y resultados.
5. **Límites:** qué cubren las pruebas y qué riesgo permanece.

Estas filas son ejemplos para discutir, no resultados ya comprobados:

| Riesgo | Prioridad inicial y motivo | Control propuesto | Verificación propuesta | Riesgo residual |
|---|---|---|---|---|
| R-01 Consultar incidencias ajenas | Alta: revela descripción, fotos y ubicación. | Validar identidad y permiso sobre cada incidencia en el servicio; no sólo ocultar botones. | Reportante ficticio A intenta consultar el ID de B; se rechaza sin devolver datos. A sí consulta lo propio. | Una prueba local de política no prueba la seguridad de un servidor futuro. |
| R-02 Alterar asignaciones | Alta: cambia quién puede atender o ver el caso. | Validar rol y asignación vigente antes de modificar. | Reportante no reasigna; coordinador autorizado sí; técnico anterior no modifica tras reasignación. | Faltan pruebas de concurrencia/sincronización si esos componentes no existen. |
| R-03 Filtrar datos en logs | Alta: los artefactos pueden conservar información sensible. | Permitir sólo campos técnicos necesarios y sanitizar errores. | Capturar salida con datos sintéticos y comprobar ausencia de token, ubicación, fotos e información personal. | Un nuevo punto de registro puede saltarse el sanitizador. |
| R-04 Exponer credenciales | Alta: permite accesos fuera de la app. | Evitar secretos en código/configuración pública y ejecutar escaneo obligatorio en CI. | Detector rechaza un marcador sintético temporal y deja de fallar al retirarlo. | El escaneo por patrones no detecta todos los formatos ni todo el historial. |

Decide cuál atienden primero según **impacto y probabilidad en el estado actual**. No pongas todas como altas sin establecer un orden y justificarlo. Ajusta las propuestas al contrato CampusOps y al alcance acordado.

## 3. Hacer una revisión técnica propia

El test público sólo busca ciertos conceptos en el texto y revisa parte del workflow; no demuestra que todos los controles funcionen. Tu aporte debe ir más allá de escribir la tabla:

1. Elige con Fernanda un riesgo, por ejemplo R-01.
2. Revisa la implementación real y su prueba. Anota archivo, función y la aserción que detectaría la vulneración.
3. Escribe tu predicción antes de ejecutar: qué operación debe rechazarse y qué datos no deben salir.
4. Ejecuta la prueba existente acordada; conserva comando, salida y código. Si aún no existe, registra el pendiente y coordina su creación, sin declarar éxito.
5. Comprueba un caso autorizado y uno no autorizado. Explica por qué devolver siempre un error tampoco sería correcto.
6. Si se usa una política aislada o un doble, declara qué parte real se ejercita y qué frontera todavía no está probada.

Entrega a Fernanda la revisión y los resultados para enlazarlos en `security.json`. Ella te entrega las rutas y logs finales para que el modelo coincida con el código.

## 4. Justificar la decisión del equipo

En `engineering.json`, explica con palabras propias:

- `decision`: qué amenaza atienden primero, con qué control y por qué.
- `alternatives`: al menos dos soluciones distintas. Por ejemplo, restricción sólo visual frente a comprobación en la operación; explica por qué la primera es insuficiente como seguridad.
- `tradeoff`: beneficio y costo de la elegida, como protección uniforme a cambio de más comprobaciones y pruebas.
- `requirementIds`: criterios realmente relacionados, por ejemplo `AC-02`, `AC-03` y `AC-04`.
- `verification`: comando real, resultado observado y ruta de evidencia de la decisión.

Usa también los campos comunes explicados en la guía del equipo. No escribas «es más seguro» sin relacionarlo con una prueba y el riesgo que permanece.

## 5. Guardar tu aportación

En tu rama `codex/semana-03-jarumi`, revisa los archivos nuevos y los diffs. Guarda primero tu documento y cualquier prueba técnica propia revisada; añade sólo las rutas que realmente modificaste. Obtén tu SHA completo con `git rev-parse HEAD` y comprueba el autor con `git show --stat --format=fuller HEAD`.

Completa **tu registro** en `individual.json`, usando tu identificador registrado, tus commits y tu ejecución/revisión real. Coordina el commit de evidencias con el equipo; no inventes resultados de Fernanda ni de Óscar. Publica tu rama con:

```powershell
git push -u origin codex/semana-03-jarumi
```

Solicita revisión e integración a `main`. El cierre, los SHAs generales de los reportes y el tag se hacen juntos según la guía común.

## Terminaste tu parte cuando…

- [ ] Cada riesgo tiene activo, frontera, prioridad explicada, control, prueba y riesgo residual.
- [ ] Las rutas y resultados corresponden al código integrado.
- [ ] Revisaste y comprobaste técnicamente al menos un control.
- [ ] La decisión compara alternativas y tiene evidencia real.
- [ ] Tu registro individual y commit propio se pueden verificar.

Para explicarlo al equipo, practica: «¿por qué ocultar un botón no autoriza una operación?», «¿qué prueba detectaría que el control dejó de funcionar?» y «¿qué riesgo sigue abierto?».
