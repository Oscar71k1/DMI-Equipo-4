"""Execute current week-8 checks and index observed results, including the native gap."""
import datetime as dt
import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'reports/week-08'


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def main():
    node = shutil.which('node')
    npm = shutil.which('npm')
    if not node or not npm:
        raise SystemExit('Node and npm must be available on PATH')
    version = subprocess.check_output([node, '--version'], text=True).strip()
    if version != 'v22.22.0':
        raise SystemExit(f'Use Node 22.22.0 as specified by the course; found {version}')
    sha = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    envelope = dict(schemaVersion=1, week=8, commitSha=sha,
                    generatedAt=dt.datetime.now(dt.timezone.utc).isoformat())
    checks = []

    def execute(identity, args, scenario='nominal'):
        command = subprocess.list2cmdline(args)
        print(f'Running {identity}: {command}', flush=True)
        try:
            result = subprocess.run(args, cwd=ROOT, text=True, encoding='utf-8', errors='replace',
                                    capture_output=True, timeout=600)
            output = result.stdout + '\n' + result.stderr
            code = result.returncode
        except (OSError, subprocess.TimeoutExpired) as error:
            output, code = str(error), -1
        log = OUT / 'logs' / f'current-{identity}.txt'
        log.parent.mkdir(parents=True, exist_ok=True)
        log.write_text(f'COMMIT={sha}\nCOMMAND={command}\n{output}\nEXIT_CODE={code}\n', encoding='utf-8')
        checks.append(dict(id=identity, status='pass' if code == 0 else 'fail', scenarioType=scenario,
                           command=command, evidence=f'{log.relative_to(ROOT).as_posix()}; exit={code}'))
        print(f'{identity}: exit={code}', flush=True)
        return code == 0

    execute('typecheck', [npm, 'run', 'typecheck'])
    execute('lint', [npm, 'run', 'lint'])
    result_path = OUT / 'generated-jest.json'
    if result_path.exists():
        result_path.unlink()
    execute('tests', [node, 'node_modules/jest/bin/jest.js', '--ci', '--runInBand', '--no-watchman',
                     '--cacheDirectory', '.jest-cache', '--json', '--outputFile', str(result_path),
                     '--testPathIgnorePatterns', 'course-tests/public/week-(09|10|11|12|13)'], 'failure')
    execute('migration-states', [node, '--experimental-strip-types', 'lab/week8-real-db.mjs'], 'failure')
    execute('backend', [npm, 'run', 'backend:self-test'], 'failure')
    execute('audit', [npm, 'run', 'audit:ci'], 'boundary')
    execute('bundle', [npm, 'run', 'bundle:release'])
    test_summary = {}
    if result_path.exists():
        result = json.loads(result_path.read_text(encoding='utf-8'))
        test_summary = {key: result.get(key) for key in
                        ['numTotalTests', 'numPassedTests', 'numFailedTests', 'numTotalTestSuites', 'success']}
        for suite in result.get('testResults', []):
            filename = Path(suite['name']).relative_to(ROOT).as_posix()
            if 'week8-' not in filename and filename != 'course-tests/public/week-08.test.ts':
                continue
            for assertion in suite.get('assertionResults', []):
                checks.append(dict(id=f"{filename}: {assertion['fullName']}",
                    status='pass' if assertion['status'] == 'passed' else 'fail',
                    scenarioType='failure' if any(term in assertion['fullName'].lower()
                        for term in ['fail', 'reject', 'rollback', 'conflict', '403', '409', '500', 'lost', 'wrong', 'logout']) else 'boundary',
                    command=f'npm test -- --runInBand --runTestsByPath {filename}',
                    evidence=f"Jest {assertion['status']}: {assertion['fullName']}; reports/week-08/logs/current-tests.txt"))
    automatic_pass = all(item['status'] == 'pass' for item in checks)
    checks.append(dict(id='android-app-force-stop-reopen', status='fail', scenarioType='boundary',
        command='adb devices; ejecutar el procedimiento de docs/sync-policy.md en Android',
        evidence='Pendiente: adb no mostró dispositivos; no hay AVD configurado. El usuario pidió continuar dejando esta prueba pendiente. SQLite en Node y un bundle no prueban el reinicio de la app nativa.'))
    write_json(OUT / 'migration-tests.json', {**envelope, 'automaticChecksPassed': automatic_pass,
        'nativeValidationPending': True, 'testSummary': test_summary, 'checks': checks})
    print(json.dumps({'automaticChecksPassed': automatic_pass, 'nativeValidationPending': True, **test_summary}))
    return 0 if automatic_pass else 1


if __name__ == '__main__':
    sys.exit(main())
