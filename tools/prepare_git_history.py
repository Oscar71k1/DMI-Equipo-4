"""Prepare real Git history for the unchanged course evaluator during setup."""

from pathlib import Path
import subprocess
import sys


REPO = Path(__file__).resolve().parent.parent


def git_output(*args: str) -> str:
    result = subprocess.run(
        ["git", *args], cwd=REPO, check=True, capture_output=True, text=True
    )
    return result.stdout.strip()


def main() -> int:
    # The course installs the extracted starter before asking students to git init.
    if not (REPO / ".git").exists():
        print("Historial Git: paquete sin repositorio; no se necesita descargar historial.")
        return 0

    if git_output("rev-parse", "--is-shallow-repository") == "false":
        print("Historial Git: completo; no se necesita descargar historial.")
        return 0

    original_head = git_output("rev-parse", "HEAD")
    print("Historial Git: copia superficial; descargando historial real desde origin.", flush=True)
    # checkout may create the selected tag at its commit; keep that ref unchanged.
    subprocess.run(
        ["git", "fetch", "--unshallow", "--no-tags", "--no-recurse-submodules", "origin"],
        cwd=REPO,
        check=True,
    )
    if git_output("rev-parse", "--is-shallow-repository") != "false":
        raise RuntimeError("La descarga no completo el historial Git.")
    if git_output("rev-parse", "HEAD") != original_head:
        raise RuntimeError("El SHA de trabajo cambio durante la preparacion.")
    print(f"Historial Git: completo; SHA de trabajo conservado: {original_head}")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except subprocess.CalledProcessError as exc:
        print(exc.stderr or str(exc), file=sys.stderr)
        sys.exit(exc.returncode)
    except (OSError, RuntimeError) as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)
