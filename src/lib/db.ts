import Dexie, { type Table } from 'dexie';
import type { Source } from '@/types';

class SautikaDB extends Dexie {
  sources!: Table<Source, string>;
  constructor() {
    super('sautika');
    this.version(1).stores({ sources: 'id,name' });
    this.version(2).stores({ sources: 'id,name,userId,[userId+id]' }).upgrade((transaction) =>
      transaction.table('sources').toCollection().modify((source: { userId?: string }) => {
        source.userId = '';
      }),
    );
  }
}
export const db = new SautikaDB();
