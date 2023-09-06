import type { Sequelize } from '../../sequelize.js';
import { AbstractQueryInterfaceInternal } from '../abstract/query-interface-internal.js';
import { AbstractQueryInterface } from '../abstract/query-interface.js';
import type { MomentoQueryGenerator } from './query-generator.js';

export class MomentoQueryInterfaceTypescript extends AbstractQueryInterface {
  #internalQueryInterface: AbstractQueryInterfaceInternal;

  constructor(
    sequelize: Sequelize,
    queryGenerator: MomentoQueryGenerator,
    internalQueryInterface?: AbstractQueryInterfaceInternal,
  ) {
    internalQueryInterface ??= new AbstractQueryInterfaceInternal(sequelize, queryGenerator);

    super(sequelize, queryGenerator, internalQueryInterface);
    this.#internalQueryInterface = internalQueryInterface;
  }
}
