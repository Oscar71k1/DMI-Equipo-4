# Corrección de referencias después del PR #17

El merge `72c7a12a71f9b6f3433acb1965474353e7aadd69` integró el mismo árbol que la rama probada. Sin embargo, `migration-tests.json` y `engineering.json` conservaron `11ff96a…`: ya no era HEAD ni su primer padre inmediato. El evaluador oficial rechazó correctamente esa referencia. Mover solamente la etiqueta al merge no era suficiente.

La corrección se basa en ese main y registra `72c7a12a71f9b6f3433acb1965474353e7aadd69` como fuente de las nuevas comprobaciones automáticas. Se ejecutan nuevamente los controles reales; no se modifica el evaluador, la app, los workflows ni las pruebas. La evidencia Android ya observada conserva sus fechas, hashes y SHA originales: se verifica equivalencia del código y no se simula otra ejecución en el teléfono.

## Integración que conserva la validez

Este PR contiene un solo commit que modifica únicamente `reports/` y `evidence/`. Su padre es `72c7a12…`. Mientras main siga en ese commit, un merge normal tendrá el mismo primer padre y un diff compuesto exclusivamente por evidencias. Así se cumple la regla oficial también después del merge. Si main avanza antes de integrarlo, hay que revalidar sobre la nueva base y actualizar el PR; no mezclar aquí cambios de código o configuración.

La etiqueta final deberá apuntar al commit efectivamente entregado. El workflow de semana 8 ejecuta el control `frozen_sha` también en PR, por lo que una etiqueta conservada en main no puede coincidir a la vez con el SHA candidato de la rama. Esta condición se mantiene visible; no se desactiva el control ni se cambian las reglas para volverlo verde.
