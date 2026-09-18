"""Controles del detector original del curso con archivos temporales ficticios."""

import importlib.util
from pathlib import Path
import sys
import tempfile
import unittest

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "course_public_evaluator", ROOT / "tools" / "course_public_evaluator.py"
)
evaluator = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(evaluator)


class SecretScannerTest(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory(prefix="campusops-scanner-")
        self.addCleanup(self.folder.cleanup)
        self.root = Path(self.folder.name)

    def test_accepts_public_configuration(self):
        (self.root / "config.txt").write_text(
            "API_URL=https://example.invalid\nTEAM_ID=4\n", encoding="utf-8"
        )
        self.assertEqual(evaluator.scan_secrets(self.root), [])

    def test_detects_synthetic_marker_and_accepts_its_removal(self):
        target = self.root / "fixture.txt"
        # Forma sintetica reconocible, nunca una credencial real ni salida de log.
        marker = "gh" + "p_" + "FICTIONAL" * 4
        target.write_text(marker, encoding="utf-8")
        findings = evaluator.scan_secrets(self.root)
        self.assertEqual(findings, ["fixture.txt:github_token"])
        self.assertNotIn(marker, "\n".join(findings))
        target.unlink()
        self.assertEqual(evaluator.scan_secrets(self.root), [])

    def test_documents_dependency_directory_exclusion(self):
        folder = self.root / "node_modules"
        folder.mkdir()
        (folder / "fixture.txt").write_text(
            "gh" + "p_" + "FICTIONAL" * 4, encoding="utf-8"
        )
        # Explicita el limite real del detector; no demuestra ausencia universal.
        self.assertEqual(evaluator.scan_secrets(self.root), [])


if __name__ == "__main__":
    unittest.main(verbosity=2)
