import { createAssignIncidentUseCase } from '../src/application/createAssignIncidentUseCase';
import { createAuthorizedIncidentQueries } from '../src/application/createAuthorizedIncidentQueries';
import type { Actor } from '../src/domain/Actor';
import type { Incident } from '../src/domain/Incident';
import { createInMemoryIncidentAssignmentPort } from '../src/infrastructure/InMemoryIncidentAssignmentPort';
import { createInMemoryIncidentRepository } from '../src/infrastructure/InMemoryIncidentRepository';
import { createInMemorySecurityLogger } from '../src/infrastructure/InMemorySecurityLogger';

const ownedIncident: Incident = {
  id: 'sec-1',
  category: 'electrical',
  description: 'Incidencia asignada a tech-01',
  location: { source: 'manual', label: 'Lab A' },
  status: 'assigned',
  work: { assignedTechnicianId: 'tech-01', status: 'assigned' },
};

const foreignIncident: Incident = {
  id: 'sec-2',
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

    const authorizedResult = await useCase.assign(coordinator, ownedIncident, 'tech-02');
    expect(authorizedResult.kind).toBe('assigned');
    if (authorizedResult.kind === 'assigned') {
      expect(authorizedResult.incident.work.assignedTechnicianId).toBe('tech-02');
    }

    const deniedResult = await useCase.assign(technicianOne, foreignIncident, 'tech-01');
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
});