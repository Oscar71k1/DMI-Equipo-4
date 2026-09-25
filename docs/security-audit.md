# Auditoría de seguridad — Semana 4

**Autora:** Jarumi Guadalupe Flores Osorio
**Proyecto:** CampusOps
**Rama:** week4/security-audit-jarumi-flores

## Hallazgos

| # | Hallazgo | Riesgo | Solución aplicada | Evidencia |
|---|---|---|---|---|
| 1 | El servidor de pruebas permite CORS desde cualquier origen (`access-control-allow-origin: '*'`) | Cualquier sitio web podría hacer peticiones al backend y recibir respuesta, sin restricción de origen | Se documentó una corrección propuesta (restringir a orígenes conocidos), demostrada en un archivo de ejemplo separado, sin modificar el servidor compartido del equipo | `docs/evidence-code-examples/cors-antes-despues.mjs` |
| 2 | Existe un token fijo y predecible (`course-valid-token`) usado como credencial válida, escrito en texto plano en 8 archivos del proyecto | Cualquier persona con acceso al repositorio público conoce el token exacto que el servidor de pruebas acepta como válido | No se corrigió (el valor es compartido por pruebas oficiales del curso y del equipo); se documenta como hallazgo con evidencia de su alcance real | Ver sección "Hallazgo 2" |
| 3 | El detector de secretos oficial del curso (`tools/course_public_evaluator.py`) no reconoce tokens de texto plano tipo `Bearer <valor-fijo>`; solo detecta claves privadas, tokens de GitHub, claves de AWS y nombres de variables `EXPO_PUBLIC_*SECRET` | El detector automático puede dar una falsa sensación de seguridad: pasa como "limpio" (`pass`, `hits=[]`) aunque exista una credencial fija real expuesta en el código | Se creó un detector complementario propio (`tools/security-audit-scanner.py`, archivo nuevo, sin modificar el oficial) que sí detecta este patrón | `docs/evidence/hallazgo-3-detector-oficial-sin-detectar.txt`, `docs/evidence/hallazgo-3-detector-propio-si-detecta.txt` |

## Riesgo que se corrigió primero

Se corrigió primero el hallazgo #3 (detector de secretos limitado) porque es el que se pudo solucionar sin riesgo de romper código compartido con el equipo (se creó un archivo nuevo e independiente, en vez de modificar el evaluador oficial). El hallazgo #1 (CORS) se documentó con una propuesta de corrección de ejemplo, también sin tocar el archivo compartido `course-backend/server.mjs`, por la misma razón: es un archivo usado por todo el equipo en el proyecto en conjunto, y esta actividad es individual y aislada en mi propia rama.

## Hallazgo 1 — CORS completamente abierto

### Problema encontrado

En `course-backend/server.mjs`, la función `send()` que construye cada respuesta del servidor incluye:

```javascript
response.writeHead(status, {
  'access-control-allow-origin': '*',
  ...
});
```

El valor `'*'` permite que **cualquier origen** (cualquier página web) reciba respuesta de este servidor.

### Riesgo

En un entorno de desarrollo local esto es común y de bajo riesgo real, pero es una mala práctica que, si se llevara a producción sin cambios, permitiría que cualquier sitio web hiciera peticiones al backend desde el navegador de un usuario, sin restricción.

### Solución propuesta (no aplicada al archivo original)

Se documentó, en un archivo de ejemplo separado, cómo se vería la corrección: restringir `access-control-allow-origin` a una lista de orígenes conocidos (como el servidor de desarrollo de Expo), en vez de aceptar cualquier origen con `'*'`.

No se modificó `course-backend/server.mjs` directamente porque es un archivo compartido con el resto del equipo en el proyecto conjunto, y esta actividad es individual y debe permanecer aislada en mi rama, según indicó el profesor.

### Antes

```javascript
'access-control-allow-origin': '*',
```

### Después (propuesta, en archivo de ejemplo)

```javascript
const ALLOWED_ORIGINS = ['http://127.0.0.1:8081', 'http://localhost:8081'];
const allowedOrigin = ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : ALLOWED_ORIGINS[0];
'access-control-allow-origin': allowedOrigin,
```

### Evidencia

Ver `docs/evidence-code-examples/cors-antes-despues.mjs`.

## Hallazgo 2 — Token fijo y predecible como credencial válida

### Problema encontrado

El servidor de pruebas (`course-backend/server.mjs`) acepta como válido un único token fijo, escrito en texto plano:

```javascript
if (request.headers.authorization !== 'Bearer course-valid-token') {
  return send(response, 401, { code: 'unauthorized' });
}
```

Este mismo valor (`course-valid-token`) aparece en 8 archivos distintos del proyecto (servidor, pruebas, documentación), confirmado con el detector del hallazgo 3.

### Riesgo

Cualquier persona con acceso al repositorio (que es público) conoce el token exacto que el servidor acepta como válido. No hay forma de rotar o invalidar ese token sin cambiar el código.

### Por qué no se corrigió

El valor `course-valid-token` es usado por múltiples pruebas oficiales del curso y del equipo (`course-tests/public/week-04.test.ts`, `course-backend/self-test.mjs`, entre otros). Cambiarlo dentro de mi rama individual, sin coordinación con el equipo y el curso, podría romper pruebas que dependen de ese valor exacto, sin beneficio real ya que es un servidor de pruebas con datos sintéticos, no un sistema en producción.

### Evidencia del alcance del problema

Ver la salida completa del detector en la sección del Hallazgo 3 — los mismos archivos (`docs/evidence/hallazgo-3-detector-oficial-sin-detectar.txt` y `hallazgo-3-detector-propio-si-detecta.txt`) muestran los 8 archivos donde aparece el patrón.

## Hallazgo 3 — El detector de secretos oficial no cubre tokens de texto plano

### Problema encontrado

El detector de secretos del curso (`tools/course_public_evaluator.py`, función `scan_secrets`) solo reconoce estos 4 patrones:

```python
SECRET_PATTERNS = {
    "private_key": re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    "github_token": re.compile(r"\bgh[pousr]_[A-Za-z0-9]{20,}\b"),
    "aws_access_key": re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
    "public_secret_name": re.compile(r"EXPO_PUBLIC_[A-Z0-9_]*(?:SECRET|PRIVATE_KEY|ACCESS_TOKEN)\s*="),
}
```

Ninguno de estos patrones reconoce un token fijo de texto plano como `Bearer course-valid-token`. Se confirmó ejecutando el evaluador oficial en la semana 3 (`reports/week-03/security.json`), donde el escaneo de secretos dio `status: pass` con `hits=[]`, a pesar de que el token fijo ya existía en el código en ese momento.

### Riesgo

Un detector automático con cobertura limitada puede dar una falsa sensación de seguridad: el equipo puede confiar en que "no hay secretos expuestos" solo porque el detector no encontró nada, sin saber que su cobertura es parcial.

### Solución aplicada

Se creó un archivo **nuevo e independiente** (`tools/security-audit-scanner.py`), sin modificar el evaluador oficial del curso, que añade un patrón adicional para detectar tokens de tipo `Bearer <valor>` y contraseñas literales en el código:

```python
EXTENDED_PATTERNS = {
    "hardcoded_bearer_token": re.compile(r"Bearer\s+[A-Za-z0-9_-]{6,}"),
    "hardcoded_password_literal": re.compile(r"password\s*[:=]\s*['\"][^'\"]{4,}['\"]", re.IGNORECASE),
}
```

### Antes (evaluador oficial, semana 3)

`status: pass`, `hits=[]` — no detectó el token existente (ver `reports/week-03/security.json`, check `R-04-secret-scan-despues`).

### Después (detector propio, ejecutado hoy)


Detectó el patrón en 8 archivos, incluyendo `course-backend/server.mjs` (ver evidencia).

### Evidencia

- `docs/evidence/hallazgo-3-detector-oficial-sin-detectar.txt`
- `docs/evidence/hallazgo-3-detector-propio-si-detecta.txt`

## Comprobación final

- `.env` no existe en este proyecto (`Test-Path .env` → `False`).
- `.gitignore` sí incluye `.env`.
- `git status --short` no muestra archivos sensibles pendientes de subir.
- No se usaron credenciales reales, contraseñas reales ni datos personales reales en ninguna parte de esta auditoría; el token analizado (`course-valid-token`) es un valor sintético del entorno de pruebas del curso, ya público en el repositorio antes de esta actividad.

## Declaración de asistencia de IA

Se usó IA (Claude) como apoyo para: identificar dónde buscar posibles hallazgos (con comandos de búsqueda que yo ejecuté y revisé), explicar el código encontrado, y ayudar a redactar este documento. Cada hallazgo fue verificado por mí ejecutando los comandos reales y revisando las salidas antes de documentarlas. La decisión de no modificar archivos compartidos del equipo (`course-backend/server.mjs`, `tools/course_public_evaluator.py`) fue mía, tras confirmar con mi profesor que mi rama de esta actividad debe permanecer aislada del proyecto conjunto.
