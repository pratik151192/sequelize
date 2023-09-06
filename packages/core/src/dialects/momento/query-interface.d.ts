import type { Sequelize } from '../../sequelize.js';
import type { MomentoQueryGenerator } from './query-generator';
import { MomentoQueryInterfaceTypescript } from './query-interface-typescript.js';

export class MomentoQueryInterface extends MomentoQueryInterfaceTypescript {
  queryGenerator: MomentoQueryGenerator;

  constructor(sequelize: Sequelize, queryGenerator: MomentoQueryGenerator);
}
