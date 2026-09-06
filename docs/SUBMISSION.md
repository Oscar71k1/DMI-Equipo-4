# Entrega semanal reproducible

Para semana 1, la secuencia obligatoria detallada está en [LEEME_PRIMERO.md](../LEEME_PRIMERO.md), pasos 9 a 17. La etiqueta se crea antes de ejecutar `make evidence-week-01`.

1. Trabaja en la rama principal registrada para el equipo.
2. Para semana 1, completa los JSON con el SHA del trabajo técnico y ejecuta `make feedback`, `make verify-week-01` y `make public-test-week-01`. Después de que pasen, crea el commit exclusivo de evidencias.
3. Confirma que los reportes referencien `HEAD` o su padre inmediato cuando el último commit contiene únicamente evidencia.
4. Integra los cambios antes de congelar la entrega; no entregues una rama local sin publicar.
5. Crea el tag anotado, comprueba su evidencia y publícalo:

```bash
git status --short
git tag -a week-01-final -m "DMI week 01 final"
make evidence-week-01
git push origin HEAD
git push origin week-01-final
git rev-list -n 1 week-01-final
```

6. Entrega en el LMS la URL pública del repositorio, el nombre del tag y el SHA completo que muestra el último comando.

Comprueba que `reports/week-01/failure.json` indique `status: pass`. Se genera después de etiquetar y no se añade mediante otro commit. Si la etiqueta ya existe, no repitas su creación ni cambies su destino automáticamente: una revisión de la entrega debe fijar y comunicar el SHA que realmente se entregará.

El evaluador fija ese ref a un SHA y trabaja sobre una copia temporal. Cambios posteriores no alteran la entrega congelada. GitHub Actions es retroalimentación visible, no la autoridad exclusiva de calificación.

No incluyas credenciales, tokens, keystores, datos personales reales, respuestas de quizzes ni material del evaluador docente.
