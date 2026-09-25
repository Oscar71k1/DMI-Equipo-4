# Auditoría de seguridad — Semana 4

## Hallazgos

| # | Hallazgo | Riesgo | Solución aplicada | Evidencia |
|---|---|---|---|---|
| 1 | `console.log` con detalle interno en CI público | Cualquier persona con acceso al repo público puede ver dependencias y rutas de archivos internos en los logs de GitHub Actions | Se eliminaron/limitaron los `console.log` en `tests/architecture.test.ts` | Captura 1 |
| 2 | Rutas de usuario de Windows expuestas en logs comiteados | Los logs revelan el nombre de usuario del sistema operativo y rutas locales (AppData) de un integrante del equipo | Se eliminaron los archivos de log del repositorio y se agregó la carpeta a `.gitignore` | Captura 2 |
| 3 | Token de autorización hardcodeado en archivo de test | Un valor de token fijo en el código facilita que se reutilice por error en otro contexto o que alguien asuma que ese formato es válido para producción | Identificado, no corregido (archivo de infraestructura de curso) | — |

---

## Hallazgo 1 — `console.log` con detalle interno en CI público

### Problema encontrado

En `tests/architecture.test.ts` (líneas 302-303), dos `console.log` imprimen la cantidad de dependencias inspeccionadas y el detalle de violaciones de arquitectura, incluyendo rutas de archivos internos.

### Riesgo

El repositorio es público, por lo que esta información queda expuesta en cada corrida de GitHub Actions sin ninguna necesidad real para el objetivo de la prueba (solo debería fallar/pasar, no imprimir detalle interno).

### Solución

Se eliminaron los `console.log` (o se limitaron a un mensaje genérico como `"Arquitectura validada correctamente"`), dejando que el test falle con su propio mensaje de aserción si hay violaciones.

### Antes
```ts
console.log(`Dependencias inspeccionadas: ${count}`);
console.log(violations);
```

### Después
```ts
// Sin logging de detalle interno; el test falla con su propio mensaje de aserción
```

### Evidencia
`docs/evidence/consolelog-eliminado.png` — captura del archivo corregido + corrida de CI sin el detalle expuesto.

---

## Hallazgo 2 — Ruta de usuario expuesta en logs comiteados

### Problema encontrado

Los archivos `reports/week-01/logs/feedback-inicial.txt`, `oscar-checkout-depth2.txt` y `oscar-checkout-etiqueta.txt` contienen rutas absolutas de Windows con el nombre de usuario del sistema operativo de un integrante (`C:\Users\oscar\...`), incluyendo rutas de `AppData\Local\Temp`.

### Riesgo

El repositorio es público: esta información expone el entorno personal de un integrante del equipo (nombre de usuario del SO, estructura de carpetas locales) sin necesidad alguna para el propósito de los reportes.

### Solución

Se eliminaron los archivos de log del repositorio (`git rm`) y se agregó la carpeta `reports/**/logs/` al `.gitignore` para evitar que vuelvan a subirse logs generados localmente.

### Antes
```
C:\Users\oscar\AppData\Local\Temp\...
```

### Después
Archivos eliminados del repositorio; `.gitignore` actualizado:
```
reports/**/logs/
```

### Evidencia
`docs/evidence/logs-sanitizados.png` — captura de `git status` mostrando los archivos eliminados y del `.gitignore` actualizado.

---

## Hallazgo 3 — Token de autorización hardcodeado en archivo de test

### Problema encontrado

En `course-tests\public\week-04.test.ts` (línea 5) se encontró un header de autorización con un valor fijo escrito directamente en el código:

```ts
request: { headers: { authorization: 'Bearer course-token', accept: 'application/json' } }
```

### Riesgo

Aunque en este caso el valor es un token ficticio de prueba, escribir credenciales o tokens directamente en el código es una mala práctica: si el patrón se replica en código real, o si el valor cambia a uno real por error, quedaría expuesto en el historial del repositorio.

### Solución

No se corrigió este archivo porque pertenece a la infraestructura de pruebas/calificación provista por el curso (`course-tests`), y modificarlo podría afectar el proceso de evaluación automática. Se documenta como hallazgo identificado para dejar constancia del riesgo, siguiendo la recomendación de usar variables de entorno para cualquier token en el futuro (como ya se hace en `src/api/courseBackend.ts` con `EXPO_PUBLIC_COURSE_BACKEND_URL`).

### Evidencia
`docs/evidence/token-hardcodeado.png` — captura del `Select-String` mostrando la línea encontrada.