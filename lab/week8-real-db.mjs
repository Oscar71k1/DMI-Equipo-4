import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrateIncidentStore } from '../src/infrastructure/incidentMigrations.ts';

function openDb(file) {
  const raw = new DatabaseSync(file);
  return {
    raw,
    async exec(sql) { raw.exec(sql); },
    async run(sql, params = []) { raw.prepare(sql).run(...params); },
    async all(sql, params = []) { return raw.prepare(sql).all(...params).map((row) => ({ ...row })); },
    async transaction(work) {
      raw.exec('BEGIN');
      try {
        const result = await work();
        raw.exec('COMMIT');
        return result;
      } catch (error) {
        raw.exec('ROLLBACK');
        throw error;
      }
    },
    close() { raw.close(); },
  };
}

function seedLegacyV1(db) {
  db.raw.exec(`
    CREATE TABLE schema_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    INSERT INTO schema_meta VALUES ('schema_version', '1');
    CREATE TABLE operations (operation_id TEXT PRIMARY KEY, incident_id TEXT NOT NULL, actor_id TEXT NOT NULL, action TEXT NOT NULL, payload TEXT NOT NULL, base_version INTEGER NOT NULL);
    INSERT INTO operations VALUES ('op-start-0001', 'campus-inc-001', 'technician-1', 'start', '{}', 1);
    INSERT INTO operations VALUES ('op-note-0002', 'campus-inc-001', 'technician-1', 'comment', '{"text":"Nota ficticia"}', 1);
  `);
}

function observe(db) {
  const tables = db.raw.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all().map((r) => r.name);
  const meta = tables.includes('schema_meta')
    ? db.raw.prepare("SELECT value FROM schema_meta WHERE key = 'schema_version'").get()
    : undefined;
  const legacy = tables.includes('operations')
    ? db.raw.prepare('SELECT operation_id, payload FROM operations ORDER BY rowid').all().map((r) => ({ ...r }))
    : null;
  const queue = tables.includes('queue_operations')
    ? db.raw.prepare('SELECT operation_id, sequence, status FROM queue_operations ORDER BY sequence').all().map((r) => ({ ...r }))
    : null;
  return { schemaVersion: meta ? meta.value : null, tables, legacy, queue };
}

function show(title, state) {
  console.log(`\n--- ${title} ---`);
  console.log(JSON.stringify(state, null, 2));
}

const checks = [];
function check(name, ok) {
  checks.push({ name, ok });
  console.log(`CHECK ${ok ? 'OK   ' : 'FALLA'} ${name}`);
}

const dir = mkdtempSync(join(tmpdir(), 'week8-real-db-'));

try {
  const fileA = join(dir, 'm01.sqlite');
  let db = openDb(fileA);
  seedLegacyV1(db);
  show('M01 antes (esquema 1)', observe(db));
  db.close();

  db = openDb(fileA);
  const r1 = await migrateIncidentStore(db);
  console.log('\nM01 migracion:', JSON.stringify(r1));
  db.close();

  db = openDb(fileA);
  const m01Despues = observe(db);
  show('M01 despues de cerrar y reabrir', m01Despues);
  const r2 = await migrateIncidentStore(db);
  const m01Segunda = observe(db);
  console.log('\nM01 segunda migracion:', JSON.stringify(r2));
  db.close();

  check('M01 version nueva y tabla antigua retirada', m01Despues.schemaVersion === '2' && m01Despues.legacy === null);
  check('M01 conserva IDs y orden de las operaciones',
    JSON.stringify((m01Despues.queue ?? []).map((q) => q.operation_id)) === JSON.stringify(['op-start-0001', 'op-note-0002']));
  check('M01 segunda migracion no repite ni duplica', r2.from === 2 && (m01Segunda.queue ?? []).length === 2);

  const fileB = join(dir, 'm02.sqlite');
  db = openDb(fileB);
  seedLegacyV1(db);
  const antes = observe(db);
  show('M02 antes (esquema 1)', antes);

  let error = null;
  try {
    await migrateIncidentStore(db, {
      afterStep: (step) => {
        if (step === 'rows-copied') throw new Error('falla inyectada despues de copiar filas');
      },
    });
  } catch (e) {
    error = e;
  }

  console.log('\nM02 error capturado:', error ? error.message : 'NINGUNO');
  const trasFalla = observe(db);
  show('M02 tras la falla (misma conexion)', trasFalla);
  db.close();

  db = openDb(fileB);
  const reabierto = observe(db);
  show('M02 cerrado y reabierto', reabierto);

  const r3 = await migrateIncidentStore(db);
  const recuperado = observe(db);
  console.log('\nM02 migracion sin falla:', JSON.stringify(r3));
  show('M02 recuperado', recuperado);
  db.close();

  check('M02 la falla ocurrio despues de copiar filas', error !== null && error.message.includes('despues de copiar filas'));
  check('M02 tras la falla la version sigue en 1', trasFalla.schemaVersion === '1');
  check('M02 tras la falla no quedo esquema nuevo (DDL revertido)', !trasFalla.tables.includes('queue_operations'));
  check('M02 tras la falla los datos viejos estan intactos', JSON.stringify(trasFalla.legacy) === JSON.stringify(antes.legacy));
  check('M02 reabierto sigue igual que antes', reabierto.schemaVersion === '1' && JSON.stringify(reabierto.legacy) === JSON.stringify(antes.legacy));
  check('M02 sin la falla la migracion termina con las mismas operaciones', recuperado.schemaVersion === '2' && (recuperado.queue ?? []).length === 2);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

const todoOk = checks.every((c) => c.ok);
console.log('\nRESULTADO:', todoOk ? 'todas las comprobaciones OK' : 'HAY COMPROBACIONES QUE FALLAN');
process.exitCode = todoOk ? 0 : 1;