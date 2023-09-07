import { QueryTypes } from '../../query-types';
import { AbstractQueryInterface } from '../abstract/query-interface';

export class MomentoQueryInterface extends AbstractQueryInterface {

  async showAllTables(options) {
    await Promise.resolve();
  }

  async dropAllTables(options) {
    await Promise.resolve();
  }
}
