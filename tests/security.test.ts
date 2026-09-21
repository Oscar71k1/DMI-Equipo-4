import { createAssignIncidentUseCase } from '../src/application/createAssignIncidentUseCase';
import { createAuthorizedIncidentQueries } from '../src/application/createAuthorizedIncidentQueries';
import type { Actor } from '../src/domain/Actor';
import type { Incident } from '../src/domain/Incident';
import { createInMemoryIncidentAssignmentPort } from '../src/infrastructure/InMemoryIncidentAssignmentPort';
import { createInMemoryIncidentRepository } from '../src/infrastructure/InMemoryIncidentRepository';
import { createInMemorySecurityLogger } from '../src/infrastructure/InMemorySecurityLogger';

const ownedIncident: Incident = {
  id: 'sec-1',
  reporterId: 'reporter-1',
  category: 'electrical',
  description: 'Incidencia asignada a tech-01',
  location: { source: 'manual', label: 'Lab A' },
  status: 'assigned',
  work: { assignedTechnicianId: 'tech-01', status: 'assigned' },
};

const foreignIncident: Incident = {
  id: 'sec-2',
  reporterId: 'reporter-2',
  category: 'water',
  description: 'Incidencia asignada a tech-02',
  location: { source: 'manual', label: 'Lab B' },
  status: 'assigned',
  work: { assignedTechnicianId: 'tech-02', status: 'assigned' },
};

const technicianOne: Actor = { id: 'tech-01', role: 'technician' };
const coordinator: Actor = { id: 'coord-01', role: 'coordinator' };

describe('controles de seguridad — autorización y logs', () => {
  test('consulta propia permitida y consulta ajena denegada, sin filtrar datos', async () => {
    // Predicción: tech-01 debe poder ver su propia incidencia (sec-1), pero al consultar
    // sec-2 (ajena) debe recibir null — el mismo resultado que un ID inexistente,
    // para no revelar que la incidencia existe.
    const repository = createInMemoryIncidentRepository([ownedIncident, foreignIncident]);
    const logger = createInMemorySecurityLogger();
    const queries = createAuthorizedIncidentQueries(repository, logger);

    const own = await queries.getIncidentDetail(technicianOne, 'sec-1');
    const foreign = await queries.getIncidentDetail(technicianOne, 'sec-2');
    const nonExistent = await queries.getIncidentDetail(technicianOne, 'no-existe');

    expect(own?.id).toBe('sec-1');
    expect(foreign).toBeNull();
    expect(nonExistent).toBeNull();
  });

  test('asignación autorizada permitida y modificación por actor no autorizado rechazada', async () => {
    // Predicción: el coordinador puede reasignar sec-1 a tech-02; un técnico distinto
    // al asignado (tech-01 intentando modificar sec-2, que pertenece a tech-02) debe
    // ser rechazado con 'denied', sin alterar el registro.
    const port = createInMemoryIncidentAssignmentPort([ownedIncident, foreignIncident]);
    const logger = createInMemorySecurityLogger();
    const useCase = createAssignIncidentUseCase(port, logger);

    const authorizedResult = await useCase.assign(coordinator, ownedIncident.id, 'tech-02');
    expect(authorizedResult.kind).toBe('assigned');
    if (authorizedResult.kind === 'assigned') {
      expect(authorizedResult.incident.work.assignedTechnicianId).toBe('tech-02');
    }

    const deniedResult = await useCase.assign(technicianOne, foreignIncident.id, 'tech-01');
    expect(deniedResult.kind).toBe('denied');
  });

  test('los logs conservan el rol y el resultado, sin identificador personal del actor', async () => {
    // Predicción: cada intento (autorizado o no) queda registrado con el rol del actor
    // y si se concedió o no, pero sin el actor.id (dato personal) en el registro.
    const repository = createInMemoryIncidentRepository([ownedIncident, foreignIncident]);
    const logger = createInMemorySecurityLogger();
    const queries = createAuthorizedIncidentQueries(repository, logger);

    await queries.getIncidentDetail(technicianOne, 'sec-1');
    await queries.getIncidentDetail(technicianOne, 'sec-2');

    const entries = logger.entries();
    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({
      event: 'incident.view',
      incidentId: 'sec-1',
      actorRole: 'technician',
      granted: true,
    });
    expect(entries[1]).toEqual({
      event: 'incident.view',
      incidentId: 'sec-2',
      actorRole: 'technician',
      granted: false,
    });
    for (const entry of entries) {
      expect(Object.keys(entry)).not.toContain('actorId');
      expect(JSON.stringify(entry)).not.toContain('tech-01');
    }
  });

  test('un reportante consulta lo propio pero no lo ajeno ni un ID inexistente', async () => {
    const queries = createAuthorizedIncidentQueries(
      createInMemoryIncidentRepository([ownedIncident, foreignIncident]),
      createInMemorySecurityLogger(),
    );
    const reporter: Actor = { id: 'reporter-1', role: 'reporter' };
    expect((await queries.getIncidentDetail(reporter, ownedIncident.id))?.id).toBe(ownedIncident.id);
    expect(await queries.getIncidentDetail(reporter, foreignIncident.id)).toBeNull();
    expect(await queries.getIncidentDetail(reporter, 'ausente')).toBeNull();
  });

  test.each<Actor>([
    { id: 'reporter-1', role: 'reporter' },
    technicianOne,
    { id: 'tech-02', role: 'technician' },
  ])('el actor $id no puede reasignar ni invocar el puerto de escritura', async (actor) => {
    const port = createInMemoryIncidentAssignmentPort([ownedIncident]);
    const write = jest.spyOn(port, 'assign');
    const useCase = createAssignIncidentUseCase(port, createInMemorySecurityLogger());
    expect(await useCase.assign(actor, ownedIncident.id, actor.id)).toEqual({ kind: 'denied' });
    expect(write).not.toHaveBeenCalled();
    expect((await port.getById(ownedIncident.id))?.work.assignedTechnicianId).toBe('tech-01');
  });

  test('una reasignación revoca la consulta anterior y una copia vieja no recupera el permiso', async () => {
    const port = createInMemoryIncidentAssignmentPort([ownedIncident]);
    const logger = createInMemorySecurityLogger();
    const queries = createAuthorizedIncidentQueries(port, logger);
    const useCase = createAssignIncidentUseCase(port, logger);
    const old = await queries.getIncidentDetail(technicianOne, ownedIncident.id);
    expect(old).not.toBeNull();
    expect((await useCase.assign(coordinator, ownedIncident.id, 'tech-02')).kind).toBe('assigned');
    expect(await queries.getIncidentDetail(technicianOne, ownedIncident.id)).toBeNull();
    expect((await queries.getIncidentDetail({ id: 'tech-02', role: 'technician' }, ownedIncident.id))?.id)
      .toBe(ownedIncident.id);
    expect(await useCase.assign(technicianOne, old!.id, 'tech-01')).toEqual({ kind: 'denied' });
    // Alterar una respuesta vieja tampoco cambia los permisos del almacén.
    Object.assign(old!.work, { assignedTechnicianId: 'tech-01' });
    expect((await port.getById(ownedIncident.id))?.work.assignedTechnicianId).toBe('tech-02');
  });

  test('una asignación de coordinador sobre un ID inexistente no inventa datos', async () => {
    const useCase = createAssignIncidentUseCase(
      createInMemoryIncidentAssignmentPort([]), createInMemorySecurityLogger(),
    );
    expect(await useCase.assign(coordinator, 'ausente', 'tech-02')).toEqual({ kind: 'not-found' });
  });

  test('el almacén no comparte referencias de entrada ni de sus respuestas', async () => {
    const seed = { ...ownedIncident, work: { ...ownedIncident.work } };
    const port = createInMemoryIncidentAssignmentPort([seed]);
    seed.work.assignedTechnicianId = 'intruso';
    const changed = await port.assign(ownedIncident.id, 'tech-02');
    Object.assign(changed!.work, { assignedTechnicianId: 'intruso' });
    const list = await port.list();
    Object.assign(list[0]!.location, { label: 'Cambio externo' });
    expect((await port.getById(ownedIncident.id))?.work.assignedTechnicianId).toBe('tech-02');
    expect((await port.getById(ownedIncident.id))?.location.label).toBe(ownedIncident.location.label);
  });

  test('el logger descarta campos sensibles adicionales y protege su historial', () => {
    const logger = createInMemorySecurityLogger();
    const entry = {
      event: 'incident.view', incidentId: 'sec-1', actorRole: 'reporter', granted: false,
      token: 'valor-ficticio-privado', location: 'ubicacion ficticia', photos: ['foto ficticia'],
    };
    logger.log(entry);
    entry.granted = true;
    Object.assign(logger.entries()[0]!, { granted: true });
    expect(logger.entries()).toEqual([
      { event: 'incident.view', incidentId: 'sec-1', actorRole: 'reporter', granted: false },
    ]);
  });
});
