import type { Sequelize } from '../../sequelize';
import { createNamedParamBindCollector } from '../../utils/sql';
import { AbstractDialect } from '../abstract';
import type { AbstractConnectionManager } from '../abstract/connection-manager';
import type { AbstractQueryGenerator } from '../abstract/query-generator';
import type { AbstractQueryInterface } from '../abstract/query-interface';
import { MomentoConnectionManager } from './connection-manager';
import * as DataTypes from './data-types.js';
import { MomentoQuery } from './query';
import { MomentoQueryGenerator } from './query-generator';
import { MomentoQueryInterface } from './query-interface';

export class MomentoDialect extends AbstractDialect {
  static supports = AbstractDialect.extendSupport({
    DEFAULT: false,
    'DEFAULT VALUES': false,
    'UNION ALL': false,
    'RIGHT JOIN': false,
    inserts: {
      ignoreDuplicates: ' OR IGNORE',
      updateOnDuplicate: ' ON CONFLICT DO UPDATE SET',
      conflictFields: false,
      onConflictWhere: false,
    },
    autoIncrement: {
      identityInsert: false,
      defaultValue: false,
      update: false,
    },
    index: {
      using: false,
      where: true,
      functionBased: false,
    },
    transactionOptions: {
      type: false,
    },
    constraints: {
      foreignKeyChecksDisableable: true,
      add: false,
      remove: false,
      primaryKey: true,
    },
    groupedLimit: false,
    jsonOperations: false,
    jsonExtraction: {
      unquoted: false,
      quoted: false,
    },
    transactions: false,
  });

  readonly Query = MomentoQuery;
  readonly connectionManager: AbstractConnectionManager<any>;
  readonly dataTypesDocumentationUrl = 'https://docs.momentohq.com/develop/datatypes';
  readonly queryGenerator: AbstractQueryGenerator;
  readonly queryInterface: AbstractQueryInterface;

  readonly TICK_CHAR_LEFT = '"';
  readonly TICK_CHAR_RIGHT = '"';
  readonly defaultVersion = '';
  constructor(sequelize: Sequelize) {
    super(sequelize, DataTypes, 'momento');
    this.connectionManager = new MomentoConnectionManager(this, sequelize);
    this.queryGenerator = new MomentoQueryGenerator({
      dialect: this,
      sequelize,
    });
    this.queryInterface = new MomentoQueryInterface(
      sequelize,
      this.queryGenerator,
    );
  }

  createBindCollector() {
    return createNamedParamBindCollector('$');
  }

  getDefaultSchema(): string {
    // Our SQLite implementation doesn't support schemas
    return '';
  }

  static getDefaultPort() {
    return 6567;
  }
}
