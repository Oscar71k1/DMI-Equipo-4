import type { SQLiteDatabase } from 'expo-sqlite';
import type { SqlDatabase, SqlValue } from './SqlDatabase';

export function createExpoSqliteAdapter(expoDb: SQLiteDatabase): SqlDatabase {
  return {
    async exec(sql: string): Promise<void> {
      await expoDb.execAsync(sql);
    },
    async run(sql: string, params: readonly SqlValue[] = []): Promise<void> {
      await expoDb.runAsync(sql, params as (string | number | null)[]);
    },
    async all<Row>(sql: string, params: readonly SqlValue[] = []): Promise<Row[]> {
      return await expoDb.getAllAsync<Row>(sql, params as (string | number | null)[]);
    },
    async transaction<Result>(work: () => Promise<Result>): Promise<Result> {
      await expoDb.execAsync('BEGIN TRANSACTION');
      try {
        const result = await work();
        await expoDb.execAsync('COMMIT');
        return result;
      } catch (error) {
        await expoDb.execAsync('ROLLBACK');
        throw error;
      }
    },
  };
}