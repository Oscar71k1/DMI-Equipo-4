PYTHON ?= python3
NPM ?= npm

.PHONY: setup prepare-git-history verify feedback run run-backend package

# Keep history preparation here so tools/ contains only the original evaluator.
# Make joins these lines before passing the Python command to either shell.
CAMPUSOPS_PREPARE_HISTORY := \
from pathlib import Path; import subprocess as sp; import sys; \
present = Path('.git').exists(); \
print('Historial Git: paquete sin repositorio; no requiere descarga.') if not present else None; \
sys.exit(0) if not present else None; \
shallow = sp.check_output(['git', 'rev-parse', '--is-shallow-repository'], text=True).strip(); \
print('Historial Git: completo; no requiere descarga.') if shallow == 'false' else None; \
sys.exit(0) if shallow == 'false' else None; \
before = sp.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(); \
print('Historial Git: copia superficial; descargando historial real.', flush=True); \
result = sp.run(['git', 'fetch', '--unshallow', '--no-tags', '--no-recurse-submodules', 'origin']); \
sys.exit(result.returncode) if result.returncode else None; \
after = sp.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(); \
complete = sp.check_output(['git', 'rev-parse', '--is-shallow-repository'], text=True).strip() == 'false'; \
valid = complete and before == after; \
print('Historial Git: completo; SHA conservado: ' + after if valid else 'Error: historial incompleto o SHA modificado.'); \
sys.exit(0 if valid else 1)

setup: prepare-git-history
	$(NPM) ci

prepare-git-history:
	$(PYTHON) -c "$(CAMPUSOPS_PREPARE_HISTORY)"

verify:
	$(NPM) run typecheck
	$(NPM) run lint
	$(NPM) run test:smoke

feedback: verify
	$(NPM) run audit:ci
	$(NPM) run bundle:release

run:
	$(NPM) run start

run-backend:
	$(NPM) run backend

package:
	$(NPM) run package:android

verify-week-%:
	$(PYTHON) tools/course_public_evaluator.py --week $* --mode verify --execute-toolchain

public-test-week-%:
	$(PYTHON) tools/course_public_evaluator.py --week $* --mode public --execute-toolchain

evidence-week-%:
	$(PYTHON) tools/course_public_evaluator.py --week $* --mode evidence
