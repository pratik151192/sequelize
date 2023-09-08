import type { Sequelize } from '../../sequelize.js';
import { AbstractQueryInterfaceInternal } from '../abstract/query-interface-internal.js';
import {AbstractQueryInterface, QiInsertOptions, TableName} from '../abstract/query-interface.js';
import type { MomentoQueryGenerator } from './query-generator.js';
import {isModelStatic} from "../../utils/model-utils";
import {isString} from "../../utils/check";
import {MomentoConnection} from "./connection-manager";
import {CacheDictionarySetFields} from "@gomomento/sdk";
import {Model} from "../../model";

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

  async insert(instance: Model | null, tableName: TableName, values: Record<string, any>, options?: QiInsertOptions):
    Promise<object> {

    if (instance == null) {
      throw new Error('Instance Model object cannot be null');
    }

    const tableNameObject = isModelStatic(tableName) ? tableName.getTableName()
      : isString(tableName) ? { tableName }
        : tableName;
    const conn = this.sequelize.connectionManager.getConnection() as Promise<MomentoConnection>;
    const primaryKey = (instance.constructor as typeof Model).primaryKeyAttribute;
    if (primaryKey == null) {
      throw new Error('primary key must not be null and not composed');
    }

    const dictionaryName = values[primaryKey].toString();
    const dictionaryFields: Map<string | Uint8Array, string | Uint8Array> = new Map();

    for (const key of Object.keys(values)) {
      dictionaryFields.set(key, values[key].toString());
    }

    conn.then(mConn => {
      mConn.cacheClient.dictionarySetFields(tableNameObject.tableName,
        dictionaryName, dictionaryFields).then(response => {
        if (response instanceof CacheDictionarySetFields.Error) {
          throw response.innerException();
        }
      });
    }).catch(error => {
      throw error;
    });

    return {};
  }
}
