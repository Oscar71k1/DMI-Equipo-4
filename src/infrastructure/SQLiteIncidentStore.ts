import type { SqlDatabase } from './SqlDatabase';
import type { PendingIncidentOperation } from '../campusops/contracts';

export type QueueRecord = {
  operation: PendingIncidentOperation;
  sequence: number;
  status: 'pendiente' | 'sincronizando' | 'confirmado' | 'conflicto';
};

export class SQLiteIncidentStore {
  constructor(private readonly db: SqlDatabase) {}

  async enqueueOperation(actorId: string, operation: PendingIncidentOperation): Promise<number> {
    return await this.db.transaction(async () => {
      const rows = await this.db.all<{ maxSeq: number | null }>(
        'SELECT MAX(sequence) as maxSeq FROM queue_operations WHERE actor_id = ?',
        [actorId],
      );
      const nextSeq = (rows[0]?.maxSeq ?? 0) + 1;

      const record: QueueRecord = {
        operation,
        sequence: nextSeq,
        status: 'pendiente',
      };

      await this.db.run(
        'INSERT INTO queue_operations (operation_id, actor_id, incident_id, sequence, status, record_json) VALUES (?, ?, ?, ?, ?, ?)',
        [operation.operationId, actorId, operation.incidentId, nextSeq, 'pendiente', JSON.stringify(record)],
      );

      return nextSeq;
    });
  }

  async getPendingOperations(actorId: string): Promise<QueueRecord[]> {
    const rows = await this.db.all<{ record_json: string }>(
      'SELECT record_json FROM queue_operations WHERE actor_id = ? AND status != ? ORDER BY sequence ASC',
      [actorId, 'confirmado'],
    );
    return rows.map((r: { record_json: string }) => JSON.parse(r.record_json) as QueueRecord);
  }

  async updateOperationStatus(
    operationId: string,
    status: QueueRecord['status'],
  ): Promise<void> {
    await this.db.transaction(async () => {
      const rows = await this.db.all<{ record_json: string }>(
        'SELECT record_json FROM queue_operations WHERE operation_id = ?',
        [operationId],
      );
      const firstRow = rows[0];
      if (!firstRow) return;

      const record = JSON.parse(firstRow.record_json) as QueueRecord;
      record.status = status;

      await this.db.run(
        'UPDATE queue_operations SET status = ?, record_json = ? WHERE operation_id = ?',
        [status, JSON.stringify(record), operationId],
      );
    });
  }

  async removeOperation(operationId: string): Promise<void> {
    await this.db.run('DELETE FROM queue_operations WHERE operation_id = ?', [operationId]);
  }
}