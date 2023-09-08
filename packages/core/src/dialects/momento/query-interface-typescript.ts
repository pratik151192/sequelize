import type { Sequelize } from '../../sequelize.js';
import { AbstractQueryInterfaceInternal } from '../abstract/query-interface-internal.js';
import {AbstractQueryInterface, QiInsertOptions, QiSelectOptions, TableName} from '../abstract/query-interface.js';
import type { MomentoQueryGenerator } from './query-generator.js';
import {isModelStatic} from "../../utils/model-utils";
import {isString} from "../../utils/check";
import {MomentoConnection} from "./connection-manager";
import {CacheDictionaryFetch, CacheDictionarySetFields, CollectionTtl} from "@gomomento/sdk";
import {Model, ModelStatic} from "../../model";

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
        dictionaryName, dictionaryFields, {ttl: CollectionTtl.of(3000)}).then(response => {
        if (response instanceof CacheDictionarySetFields.Error) {
          throw response.innerException();
        }
      });
    }).catch(error => {
      throw error;
    });

    return {};
  }

  async select(model: ModelStatic | null, tableName: TableName, options?: QiSelectOptions): Promise<object[]> {
    if (model == null) {
      throw new Error('Instance Model object cannot be null');
    }

    if (options === undefined) {
      throw new Error('Options have to be present');
    }

    if (options.where === undefined) {
      throw new Error('Where clause has to be present with PK as the clause');
    }

    const primaryKey = model.primaryKeyAttribute;
    if (primaryKey == null) {
      throw new Error('primary key must not be null and not composed');
    }

    // Extract the keys used in the where clause
    const whereKeys = Object.keys(options?.where as any || {});
    if (whereKeys.length > 1 || !whereKeys.includes(primaryKey)) {
      throw new Error('Momento only supports 1 where attribute which has to be the primary key.');
    }

    const dictionaryName = (options.where as any)[primaryKey];

    console.log('dictName', dictionaryName);
    const tableNameObject = isModelStatic(tableName) ? tableName.getTableName()
      : isString(tableName) ? { tableName }
        : tableName;

    const conn = this.sequelize.connectionManager.getConnection() as Promise<MomentoConnection>;

    let values: Map<string, string> | null = null;
    let valuesArray;

    conn.then(mConn => {
      console.log("here calling");
      mConn.cacheClient.dictionaryFetch(tableNameObject.tableName,
        dictionaryName).then(response => {
          console.log('response', response);
        if (response instanceof CacheDictionaryFetch.Error) {
          console.log("error", response.message());
          throw response.innerException();
        } else if (response instanceof CacheDictionaryFetch.Hit) {
          values = response.valueMap();
          console.log('valueMap', values);
          valuesArray = [...values.entries()].map(([key, value]) => {
            return { [key]: value };
          });
          console.log('valuesArray', valuesArray);

        } else if (response instanceof CacheDictionaryFetch.Miss) {
          console.log("miss!!!");
        } else {
          console.log('wyutt?');
        }
      });
    }).catch(error => {
      console.log("error", error);
      throw error;
    });

    console.log('after loop', valuesArray);

    return [];
  }
}
