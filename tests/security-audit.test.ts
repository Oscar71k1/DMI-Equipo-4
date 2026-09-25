import { spawnSync } from 'node:child_process';
import * as path from 'node:path';

import { createAuthorizedIncidentQueries } from '../src/application/createAuthorizedIncidentQueries';
import { createCampusOps } from '../src/composition/createCampusOps';
import type { Actor } from '../src/domain/Actor';
import type { Incident } from '../src/domain/Incident';
import { createInMemoryIncidentAssignmentPort } from '../src/infrastructure/InMemoryIncidentAssignmentPort';
import { createInMemoryIncidentRepository } from '../src/infrastructure/InMemoryIncidentRepository';
import { createInMemorySecurityLogger } from '../src/infrastructure/InMemorySecurityLogger';

const root = path.resolve(__dirname, '..');
const incident: Incident = {
  id: 'audit-1',
  reporterId: 'reporter-1',
  category: 'water',
  description: 'Incidencia ficticia de auditoría',
  location: { source: 'provider', label: 'Campus ficticio', latitude: 0, longitude: 0 },
  status: 'assigned',
  work: { assignedTechnicianId: 'tech-01', status: 'assigned' },
};

describe('Hallazgo 1 — archivos de entorno', () => {
  test.each(['.env', '.env.local', '.env.development', '.env.production', 'src/.env.local'])(
    '%s queda ignorado aunque todavía no exista', (file) => {
      const result = spawnSync('git', ['check-ignore', '--no-index', '-q', file], { cwd: root });
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(0);
    },
  );

  test('la plantilla pública se puede versionar y no hay archivos privados rastreados', () => {
    const template = spawnSync('git', ['check-ignore', '--no-index', '-q', '.env.example'], { cwd: root });
    expect(template.error).toBeUndefined();
    expect(template.status).toBe(1);
    const tracked = spawnSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' });
    expect(tracked.status).toBe(0);
    const privateFiles = tracked.stdout.split('\0').filter((file) => {
      const name = path.posix.basename(file);
      return (name === '.env' || name.startsWith('.env.')) && name !== '.env.example';
    });
    expect(privateFiles).toEqual([]);
  });
});

describe('Hallazgo 2 — minimización de datos en memoria', () => {
  test.each([
    ['lectura', createInMemoryIncidentRepository],
    ['asignación', createInMemoryIncidentAssignmentPort],
  ] as const)('%s descarta datos privados adicionales de todos los niveles', async (_, create) => {
    // Todos los datos de esta prueba son ficticios; la app no requiere estos campos.
    const enriched = {
      ...incident,
      email: 'persona@example.invalid',
      password: 'clave-ficticia-de-auditoria',
      token: 'token-ficticio-de-auditoria',
      location: { ...incident.location, contactPhone: 'telefono-ficticio' },
      work: { ...incident.work, technicianEmail: 'tecnico@example.invalid' },
    };
    const repository = create([enriched]);
    expect(await repository.list()).toEqual([incident]);
    expect(await repository.getById(incident.id)).toEqual(incident);
  });

  test('reasignar no vuelve a exponer campos privados del registro inicial', async () => {
    const port = createInMemoryIncidentAssignmentPort([{ ...incident, token: 'dato-ficticio' } as Incident]);
    expect(await port.assign(incident.id, 'tech-02')).toEqual({
      ...incident, work: { assignedTechnicianId: 'tech-02', status: 'assigned' },
    });
  });

  test('una ubicación manual sin coordenadas conserva su contrato', async () => {
    const manual: Incident = { ...incident, location: { source: 'manual', label: 'Zona ficticia' } };
    expect(await createInMemoryIncidentRepository([manual]).getById(manual.id)).toEqual(manual);
  });
});

describe('Hallazgo 3 — autorización conectada a la app', () => {
  test('la composición muestra solamente los reportes del actor ficticio activo', async () => {
    const actions = createCampusOps();
    const visible = await actions.listIncidents();
    expect(visible.map((item) => item.id)).toEqual(['inc-001']);
    expect(visible.every((item) => item.reporterId === 'reporter-1')).toBe(true);
  });

  test('la composición no permite abrir un reporte ajeno conociendo su ID', async () => {
    const actions = createCampusOps();
    expect((await actions.getIncidentDetail('inc-001'))?.reporterId).toBe('reporter-1');
    expect(await actions.getIncidentDetail('inc-002')).toBeNull();
    expect(await actions.getIncidentDetail('no-existe')).toBeNull();
  });

  test.each<[Actor, string[]]>([
    [{ id: 'reporter-1', role: 'reporter' }, ['audit-1']],
    [{ id: 'reporter-2', role: 'reporter' }, ['audit-2']],
    [{ id: 'reporter-ausente', role: 'reporter' }, []],
    [{ id: 'tech-01', role: 'technician' }, ['audit-1']],
    [{ id: 'tech-02', role: 'technician' }, ['audit-2']],
    [{ id: 'coordinator-1', role: 'coordinator' }, ['audit-1', 'audit-2']],
  ])('la lista respeta el rol y propiedad de $id', async (actor, expected) => {
    const foreign: Incident = {
      ...incident, id: 'audit-2', reporterId: 'reporter-2',
      work: { assignedTechnicianId: 'tech-02', status: 'assigned' },
    };
    const logger = createInMemorySecurityLogger();
    const queries = createAuthorizedIncidentQueries(
      createInMemoryIncidentRepository([incident, foreign]), logger,
    );
    expect((await queries.listIncidents(actor)).map((item) => item.id)).toEqual(expected);
    expect(logger.entries()).toHaveLength(2);
    expect(logger.entries().every((entry) => entry.event === 'incident.list')).toBe(true);
    expect(logger.entries().filter((entry) => entry.granted).map((entry) => entry.incidentId))
      .toEqual(expected);
  });
});
