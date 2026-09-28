"""Run real checks and index week-04 evidence; never modifies the course evaluator."""
import datetime as dt
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'reports/week-04'
COMMAND = 'python -B tools/generate_week04_reports.py'
TESTS = ['tests/secure-storage.test.ts', 'tests/telemetry.test.ts',
         'tests/session-integration.test.tsx', 'course-tests/public/week-04.test.ts']


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def check(identity, passed, scenario, evidence, threat):
    return dict(id=identity, status='pass' if passed else 'fail', scenarioType=scenario,
                command=COMMAND, evidence=evidence, threatIds=[threat])


def main():
    sha = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    envelope = dict(schemaVersion=1, week=4, commitSha=sha,
                    generatedAt=dt.datetime.now(dt.timezone.utc).isoformat())
    spec = importlib.util.spec_from_file_location('course_eval', ROOT / 'tools/course_public_evaluator.py')
    evaluator = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(evaluator)
    print('Ejecutando pruebas negativas y controles del detector...', flush=True)
    with tempfile.TemporaryDirectory(prefix='campusops-week04-') as folder:
        result_file = Path(folder) / 'jest.json'
        args = ['node', 'node_modules/jest/bin/jest.js', '--ci', '--runInBand', '--no-watchman',
                '--cacheDirectory', '.jest-cache', '--json', '--outputFile', str(result_file),
                '--runTestsByPath', *TESTS]
        run = subprocess.run(args, cwd=ROOT, capture_output=True, timeout=300)
        result = json.loads(result_file.read_text(encoding='utf-8')) if result_file.exists() else {}
    scanner_tests = subprocess.run([sys.executable, '-B', 'tests/secret_scanner_test.py'],
                                   cwd=ROOT, capture_output=True, timeout=120)
    observations = []
    summary = []
    for suite in result.get('testResults', []):
        filename = Path(suite['name']).relative_to(ROOT).as_posix()
        for case in suite.get('assertionResults', []):
            title = case['fullName']
            scenario = 'failure' if any(s in title.lower() for s in ['falla', 'failure', 'error']) else (
                'boundary' if any(s in title.lower() for s in ['límite', 'cycles', 'pending save']) else 'nominal')
            threat = 'R-05' if ('storage' in filename or title.startswith('R-05')) else 'R-03'
            summary.append(dict(file=filename, test=title, status=case['status']))
            observations.append(check('CASE-' + str(len(observations) + 1), case['status'] == 'passed',
                                      scenario, filename + ': ' + title, threat))
    observations.insert(0, check('JEST-RUN', run.returncode == 0 and result.get('success') is True,
                                'nominal', 'logs/week04-checks.json: exitCode, counts y casos individuales.', 'R-03'))
    write(OUT / 'logs/week04-checks.json', dict(
        **envelope, jestCommand='node node_modules/jest/bin/jest.js --ci --runInBand --no-watchman '
        '--cacheDirectory .jest-cache --json --outputFile <archivo-temporal> --runTestsByPath ' + ' '.join(TESTS),
        exitCode=run.returncode, passed=result.get('numPassedTests', 0), failed=result.get('numFailedTests', 0),
        scannerTestCommand='python -B tests/secret_scanner_test.py', scannerTestExitCode=scanner_tests.returncode,
        scannerTestOutput=(scanner_tests.stdout + scanner_tests.stderr).decode('utf-8', errors='replace'),
        cases=summary))
    negative = dict(**envelope, checks=observations, limitations=[
        'SecureStore se sustituye con dobles: no demuestra cifrado nativo. Comprobación nativa opcional no realizada; no es un requisito explícito de semana 04.',
        'TEL-04 sólo comprueba el tipo de errorMessage; CASE de R-03 en session-integration añade aserciones de redacción.',
        'Los resultados de error/logs se capturan sin publicar mensajes de fallo crudos de Jest.',
        'Pruebas originales de Fernanda; esta ejecución y consolidación son de Oscar con asistencia de Codex.'
    ])
    write(OUT / 'negative-tests.json', negative)
    # Audit evidence artifacts for the synthetic values used by the actual tests/UI.
    # Never print or write these values in a report, including on failure.
    markers = ['token-ficticio-unico-sto01', 'synthetic-private-value', 'private-fixture',
               'campusops-synthetic-session-week04', 'secreto-ficticio-en-mensaje']
    leak_count = 0
    inspected = 0
    for directory in [OUT, ROOT / 'evidence/week-04']:
        for path in directory.rglob('*'):
            if not path.is_file():
                continue
            raw = path.read_bytes()
            inspected += 1
            if any(marker.encode(encoding) in raw for marker in markers for encoding in ['utf-8', 'utf-16-le']):
                leak_count += 1
    negative['checks'].append(check('ARTIFACT-EXPOSURE', leak_count == 0, 'failure',
        f'Inspeccionados {inspected} archivos bajo reports/week-04 y evidence/week-04; '
        f'{leak_count} archivos con marcadores sintéticos. Búsqueda UTF-8/UTF-16LE sin publicar valores.', 'R-03'))
    write(OUT / 'negative-tests.json', negative)
    print('Ejecutando detector original sobre el checkout...', flush=True)
    hits = evaluator.scan_secrets(ROOT)
    scan = dict(**envelope, findingsCount=len(hits), checks=[
        check('SCAN-CHECKOUT', not hits, 'nominal',
              f'Detector original scan_secrets: {len(hits)} hallazgos. No se publican valores ni contenido privado.', 'R-04'),
        check('SCAN-DETECTOR-REGRESSIONS', scanner_tests.returncode == 0, 'failure',
              'logs/week04-checks.json: prueba de marcador temporal, retiro del marcador, configuración pública y exclusión de dependencias.', 'R-04')
    ], patterns=list(evaluator.SECRET_PATTERNS), exclusions=dict(
        directories=sorted(evaluator.EXCLUDED_DIRS), files=['.env.example'],
        extensions=['.png', '.jpg', '.jpeg', '.gif', '.zip', '.apk', '.aab'], unreadable='Omitidos por el detector'),
        limitations=['Escaneo del checkout, incluidos archivos locales no versionados; no escanea historial Git.',
                    'Coincidencia de patrones, no prueba ausencia universal de secretos ni revisa el almacenamiento nativo.'])
    write(OUT / 'secret-scan.json', scan)
    for name in ['negative-tests.json', 'secret-scan.json']:
        valid, detail = evaluator.validate_report(ROOT, OUT / name, 4, sha)
        print(name, valid, detail, flush=True)
        if not valid:
            return 1
    print(f"Jest: {result.get('numPassedTests', 0)} aprobadas; exit={run.returncode}. "
          f'Detector tests exit={scanner_tests.returncode}; hallazgos={len(hits)}; artefactos con marcadores={leak_count}.')
    return 0 if run.returncode == 0 and result.get('success') and scanner_tests.returncode == 0 and not hits and leak_count == 0 else 1


if __name__ == '__main__':
    raise SystemExit(main())
