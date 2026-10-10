import Dexie, { type Table } from 'dexie';
import type { Source } from '@/types';

class SautikaDB extends Dexie {
  sources!: Table<Source, string>;
  constructor() {
    super('sautika');
    this.version(1).stores({ sources: 'id,name' });
  }
}
export const db = new SautikaDB();
