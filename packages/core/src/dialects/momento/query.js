import { AbstractQuery } from '../abstract/query';

export class MomentoQuery extends AbstractQuery {

  async run(sql, parameters) {
    await Promise.resolve();
  }
}
