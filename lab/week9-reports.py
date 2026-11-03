"""Index real Jest logs and external adapter observations. Never manufactures passing tests."""
import datetime as dt
import json
import re
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[1]
def read(path):
    return json.loads((root / path).read_text(encoding='utf-8-sig'))
def save(path, data):
    target = root / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
def git(*args):
    return subprocess.check_output(['git', *args], cwd=root, text=True).strip()
sha = git('rev-parse', 'HEAD')
results = read('reports/week-09/logs/jest-results.json')
if results['numFailedTests'] or results['numFailedTestSuites'] or not results['success']:
    raise SystemExit('Cannot record pass: Jest failed')
text = (root / 'reports/week-09/logs/current-tests.txt').read_text(encoding='utf-8-sig')
observations = [json.loads(m.group(1)) for m in re.finditer(r'WEEK09_OBSERVATION (\{[^\n]+\})', text)]
by_id = {o['id']: o for o in observations}
required = ['cache', 'incomplete', 'invalid', 'disconnect', 'malformed', 'timeout', '429', 'bounded-retries', 'lost-response-durable', 'real-http-429', 'course-geocoding-http']
if not all(key in by_id for key in required):
    raise SystemExit('Missing observed scenarios')
external = read('reports/week-09/logs/external.json')
if external['source'] != 'provider' or not external['cacheHit'] or external['httpCalls'] != 1:
    raise SystemExit('External execution did not pass')
command = "npm test -- --ci --runInBand tests/week9 course-tests/public/week-09.test.ts"
envelope = dict(schemaVersion=1, week=9, commitSha=sha, generatedAt=dt.datetime.now(dt.timezone.utc).isoformat())
checks = [dict(id=o['id'], status='pass', scenarioType='boundary' if o['id'] == 'cache' else 'failure',
    command=command, evidence='Observed in reports/week-09/logs/current-tests.txt; Jest assertions passed.', observation=o) for o in observations]
checks.append(dict(id='external-provider', status='pass', scenarioType='nominal', command=external['command'],
    evidence='Provider result, one HTTP request and second lookup from cache. See logs/external.json.', observation=external))
checks.append(dict(id='manual-interface', status='pass', scenarioType='failure',
    command='npm test -- --runInBand tests/week9-location-ui.test.tsx',
    evidence='Jest assertions verify manual input, late result ignored, no empty submission and same key/body on uncertain replay.'))
save('reports/week-09/fault-injection.json', {**envelope, 'checks': checks,
    'limits': ['No notification dispatcher implemented; no sends claimed.', 'Jest UI is not a native installation demonstration.']})
save('reports/week-09/retry-metrics.json', {**envelope,
    'checks': [c for c in checks if c['id'] in ['bounded-retries','real-http-429','lost-response-durable','cache','429','timeout']],
    'timingScope': 'Real HTTP and deadlines where labeled; injected sleeps in unit tests are not actual backoff evidence.',
    'policy': {'maxAttempts': 4, 'baseDelayMs': 250, 'maxDelayMs': 10000, 'maxElapsedMs': 30000},
    'notifications': {'implemented': False, 'verification': 'No notification side effect exists to duplicate.'}})
all_paths = sorted(str(p.relative_to(root)).replace('\\', '/') for p in (root / 'tests').rglob('*') if p.name.endswith(('.test.ts', '.test.tsx')))
all_paths += ['course-tests/smoke.test.tsx'] + [f'course-tests/public/week-{w}.test.ts' for w in ['01','02','03','04','05','06','08','09']]
all_command = 'npm test -- --ci --runInBand --runTestsByPath ' + ' '.join(all_paths)
summary = f"{results['numPassedTests']} tests passed in {results['numPassedTestSuites']} suites; zero failures."
save('evidence/week-09/engineering.json', {**envelope,
    'decision': 'Usar geocodificación aproximada con caché acotada y captura manual siempre disponible. Reintentar timeout/429/5xx sólo dentro del presupuesto y con clave estable en POST; conservar resolución/cierre en SQLite hasta acuse válido.',
    'alternatives': ['Bloquear el reporte si falla el proveedor: impide continuar aunque el usuario conozca edificio/zona.', 'Reenviar escrituras con nueva clave: puede duplicar efectos si el servidor ya guardó.', 'Reintentar sin límite: aumenta carga y no resuelve errores de contrato o autorización.'],
    'tradeoff': 'La alternativa manual mantiene utilidad y el replay evita duplicados; se acepta geocodificación de localidad, caché efímera y revisión explícita de conflictos. La creación no tiene recuperación durable; resolve/close sí.',
    'requirementIds': ['AC-01','AC-02','AC-03','AC-04','AC-05'],
    'verification': [dict(command=all_command, result=summary, evidence='logs/current-tests.txt y logs/jest-results.json; caso lost-response-durable conserva solicitud tras reabrir SQLite.'),
        dict(command=external['command'], result='Provider + cache hit, one HTTP call', evidence='reports/week-09/logs/external.json')],
    'assistance': 'Implementación y reproducciones nuevas realizadas por Codex a solicitud de Oscar; no se atribuyen a ejecuciones personales de Jarumi o Fernanda.'})
original_fer = json.loads(git('show','4f6003a:evidence/week-09/individual.json'))
save('evidence/week-09/fernanda-original.json', original_fer)
fer = {**original_fer, 'commitShas': [git('rev-parse','c7e9f37'), git('rev-parse','651c046')],
    'observedResult': 'Registro original de Fernanda conservado en fernanda-original.json. Reproducción nueva por Codex: ' + summary,
    'explanation': original_fer['explanation'] + ' La integración posterior corrigió configuración, clasificación de errores, deadline y conexión real; esas correcciones son de la integración asistida, no de sus commits originales.',
    'sourceCommits': original_fer['commitShas']}
oscar = dict(studentId='3523110017', commitShas=[git('rev-parse','d30886c')],
    files=['src/composition/createCampusOps.ts','src/api/incidentClient.ts','src/infrastructure/GeocodingAdapter.ts','tests/week9-integration.test.ts'],
    tests=['tests/week9-integration.test.ts','tests/week9-geocoding-http.test.ts','tests/week9-location-ui.test.tsx'],
    reviews=['Integración selectiva de los commits de Fernanda sobre main; preservación de SQLite y resolución/cierre durable.'],
    prediction='Predicción de las aserciones: un timeout posterior al commit mantiene intención, permite replay con identidad original y no duplica historia ni evidencia.',
    command=all_command, observedResult=summary,
    explanation='Trabajo ejecutado por Codex a solicitud de Oscar, incluida la implementación asignada inicialmente a Jarumi. No se afirma que Oscar ejecutó los comandos manualmente.')
jarumi = read('docs/jarumi-semana-09.json')
save('evidence/week-09/individual.json', dict(schemaVersion=1, week=9, teamId='4', members=[oscar,jarumi,fer],
    notes='Se separan autoría Git, revisión comunicada y ejecuciones asistidas. El cumplimiento estructural no certifica comprensión individual ni garantiza AC-05.'))
print(summary)
print('Reports index observations for ' + sha)
