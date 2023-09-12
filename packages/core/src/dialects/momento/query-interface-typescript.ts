import {
  CacheDictionaryFetch,
  CacheDictionarySetFields,
  CreateCache,
  DeleteCache,
  ListCaches,
  MomentoErrorCode,
} from '@gomomento/sdk';
import type { CreationAttributes, Model, ModelStatic, NormalizedAttributeOptions } from '../../model';
import type { QueryRawOptions, Sequelize } from '../../sequelize.js';
import { isString } from '../../utils/check';
import { isModelStatic } from '../../utils/model-utils';
import { AbstractQueryInterfaceInternal } from '../abstract/query-interface-internal.js';
import type {
  CreateTableAttributes,
  QiInsertOptions,
  QiOptionsWithReplacements,
  QiSelectOptions,
  QueryInterfaceCreateTableOptions,
  QueryInterfaceDropAllTablesOptions,
  QueryInterfaceDropTableOptions,
  TableName,
} from '../abstract/query-interface.js';
import { AbstractQueryInterface } from '../abstract/query-interface.js';
import type { MomentoConnection } from './connection-manager';
import type { MomentoQueryGenerator } from './query-generator.js';
import { TableNameOrModel } from '../abstract/query-generator-typescript';
import { WhereOptions } from '../abstract/where-sql-builder-types';

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

    const tableNameObject = this.getTableNameObject(tableName);

    const conn = await this.sequelize.connectionManager.getConnection() as MomentoConnection;
    const primaryKey = (instance.constructor as typeof Model).primaryKeyAttribute;
    if (primaryKey == null) {
      throw new Error('The Model for a Momento cache must have a primary key defined');
    }

    if (values[primaryKey] === null || values[primaryKey] === undefined) {
      throw new Error('Primary key value must be set for a Momento cache Model.');
    }

    const dictionaryName = values[primaryKey].toString();
    const dictionaryFields: Map<string | Uint8Array, string | Uint8Array> = new Map();

    const attributes = (instance.constructor as typeof Model).modelDefinition.attributes;
    for (const key of Object.keys(values)) {
      const attr = attributes.get(key);
      if (attr !== undefined) {
        const serializedVal = this.serializeAttribute(key, attr, values[key]);
        if (serializedVal !== undefined) {
          dictionaryFields.set(key, serializedVal);
        }
      }
    }

    const response = await conn.cacheClient.dictionarySetFields(tableNameObject.tableName,
      dictionaryName, dictionaryFields);
    if (response instanceof CacheDictionarySetFields.Error) {
      throw response.innerException();
    }

    return {};
  }


  async tableExists(tableNameOrModel: TableNameOrModel,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options?: QueryRawOptions): Promise<boolean> {

    const tableNameObject = this.getTableNameObject(tableNameOrModel);
    const mConn = await this.sequelize.connectionManager.getConnection() as MomentoConnection;
    const response = await mConn.cacheClient.createCache(tableNameObject.tableName);

    return response instanceof CreateCache.AlreadyExists;
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
      throw new Error('Primary key must not be null and not composed');
    }

    // Extract the keys used in the where clause
    const whereKeys = Object.keys(options?.where as any || {});
    if (whereKeys.length !== 1 || !whereKeys.includes(primaryKey)) {
      throw new Error(`Momento only supports 1 attribute in the where clause which has to be the primary key.
      keys ${whereKeys}, primaryKey ${primaryKey}`);
    }

    const dictionaryName = (options.where as any)[primaryKey];

    const tableNameObject = this.getTableNameObject(tableName);

    const attributes = model.modelDefinition.attributes;

    const conn = await this.sequelize.connectionManager.getConnection() as MomentoConnection;

    let momentoDictionaryValues: Map<string, string> | null = null;
    // SQL `select` can technically return multiple rows but we just intercept the call here and make sure
    // we are returning one row as we don't support a scan API yet.
    const result: Record<string, any> = {};

    // Initialize all attributes in the schema to null as SQL supports NULL values. Since we are schemaless,
    // it doesn't make a lot of sense to throw errors here. There's a sequelize option that can tell it to throw
    // on any NULL columns which we can potentially need and extend here if needed.
    for (const key of attributes.keys()) {
      result[key] = null;
    }

    const response = await conn.cacheClient.dictionaryFetch(tableNameObject.tableName,
      dictionaryName);

    if (response instanceof CacheDictionaryFetch.Error) {
      throw response.innerException();
    } else if (response instanceof CacheDictionaryFetch.Hit) {
      momentoDictionaryValues = response.valueMap();
      // Deserialize each value based on its attribute type
      for (const [key, value] of momentoDictionaryValues.entries()) {
        // Make sure the key is a valid attribute of the model
        if (attributes.get(key)) {
          const attribute = attributes.get(key)!;
          result[key] = this.deserializeAttribute(key, attribute, value);
        } else {
          // We are throwing here because it doesn't make any sense for a key to arrive from the dictionary
          // fields that doesn't conform to the Sequelize schema. This can only happen if someone inserts an
          // item into the Cache outside of sequelize, and then try to retrieve it using Sequelize.
          throw new Error(`Unknown attribute ${key}. This should never happen as the model is defined through Sequelize
           and it's not expected for Momento to return an attribute that is not a part of the model.`);
        }
      }
    }

    // @ts-expect-error -- We are forcefully returning a single object instead of object[] as this method expects
    // as we do not have a scan or query API, and we want the user to not unnecessarily iterate
    // over the users.
    return result;
  }

  async bulkDelete(
    tableName: TableName,
    identifier: WhereOptions<any>,
    options?: QiOptionsWithReplacements,
    model?: ModelStatic,
  ): Promise<object> {
    if (model == null) {
      throw new Error('Instance Model object cannot be null');
    }

    if (identifier === undefined) {
      throw new Error('Options have to be present');
    }

    const primaryKey = model.primaryKeyAttribute;
    if (primaryKey == null) {
      throw new Error('Primary key must not be null and not composed');
    }

    // Make sure identifier is an object and has exactly one key
    if (Object.keys(identifier).length !== 1) {
      throw new Error('Momento supports a where clause with exactly one key');
    }

    // Make sure the key in identifier matches the primary key of the model
    if (!identifier.hasOwnProperty(primaryKey)) {
      throw new Error(`The identifier key must match the primary key of the model ${primaryKey} in Momento`);
    }

    const dictionaryName = (identifier as any)[primaryKey];

    const tableNameObject = this.getTableNameObject(tableName);

    const conn = await this.sequelize.connectionManager.getConnection() as MomentoConnection;

    const response = await conn.cacheClient.delete(tableNameObject.tableName,
      dictionaryName);

    if (response instanceof CacheDictionarySetFields.Error) {
      throw response.innerException();
    }

    return {};

  }

  async createTable<M extends Model>(
    tableNameOrModel: TableName,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    attributes: CreateTableAttributes<M, CreationAttributes<M>>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options?: QueryInterfaceCreateTableOptions,
  ) {
    const tableNameObject = this.getTableNameObject(tableNameOrModel);

    const conn = await this.sequelize.connectionManager.getConnection() as MomentoConnection;

    const response = await conn.cacheClient.createCache(tableNameObject.tableName);

    if (response instanceof CreateCache.Error) {
      throw new Error('An exception occured while creating cache', response.innerException());
    }
  }

  getTableNameObject(tableNameOrModel: TableNameOrModel) {
    if (tableNameOrModel === undefined) {
      throw new Error('TableNameOrModel object must not be undefined');
    }

    return isModelStatic(tableNameOrModel) ? tableNameOrModel.getTableName()
      : isString(tableNameOrModel) ? { tableName: tableNameOrModel }
        : tableNameOrModel;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async showAllTables(options?: QueryRawOptions) {
    const caches: string[] = [];
    const conn = await this.sequelize.connectionManager.getConnection() as MomentoConnection;

    const listCaches = await conn.cacheClient.listCaches();
    if (listCaches instanceof ListCaches.Success) {
      for (const cache of listCaches.getCaches()) {
        caches.push(cache.getName());
      }
    }

    return caches;
  }

  async dropAllTables(options?: QueryInterfaceDropAllTablesOptions) {
    const cacheNames = await this.showAllTables(options);
    const conn = await this.sequelize.connectionManager.getConnection() as MomentoConnection;

    for (const cacheName of cacheNames) {
      const response = await conn.cacheClient.deleteCache(cacheName);
      if (response instanceof DeleteCache.Error && response.errorCode() !== MomentoErrorCode.NOT_FOUND_ERROR) {
        throw new Error(`An exception occured while deleting cache: ${response.message()}`);
      }
    }
  }

  async dropTable(tableNameOrModel: TableName,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options?: QueryInterfaceDropTableOptions) {
    const tableNameObject = isModelStatic(tableNameOrModel) ? tableNameOrModel.getTableName()
      : isString(tableNameOrModel) ? { tableName: tableNameOrModel }
        : tableNameOrModel;
    const conn = await this.sequelize.connectionManager.getConnection() as MomentoConnection;

    const response = await conn.cacheClient.deleteCache(tableNameObject.tableName);

    if (response instanceof DeleteCache.Error  && response.errorCode() !== MomentoErrorCode.NOT_FOUND_ERROR) {
      throw new Error(`An exception occured while deleting cache: ${response.message()}`);
    }
  }

  // Ideally the data-types.ts file should have this logic for individual data types
  // and Sequelize should be calling it before insert or select to handle serialization or deserialization.
  // It seems they are not, and is hidden in the abstraction somewhere. This is probably acceptable for v0
  // and we should explore piggybacking on Sequelize for the same.
  serializeAttribute(key: string, attribute: NormalizedAttributeOptions, value: any) {
    const type = attribute?.type;
    let serializedValue;
    if (type !== undefined) {
      const typeString = type.toString();
      switch (typeString) {
        case 'VARCHAR(255)':
          serializedValue = String(value);
          break;
        case 'DATETIME':
        case 'DATETIME(6)':
          if (value instanceof Date) {
            serializedValue = value.toISOString();
            break;
          }

          throw new Error('Datetime must be an instance of a date');
        case 'INTEGER':
          serializedValue = String(value);
          break;
        case 'FLOAT':
          serializedValue = String(value);
          break;
        case 'BOOLEAN':
          serializedValue = String(value);
          break;
        default:
          throw new Error('Supported types are DATETIME, INTEGER, VARCHAR, BOOLEAN, AND FLOAT');
      }
    }

    return serializedValue;
  }

  deserializeAttribute(key: string, attribute: NormalizedAttributeOptions, value: string) {
    const type = attribute?.type;
    let deserializedValue;

    if (type !== undefined) {
      const typeString = type.toString();
      switch (typeString) {
        case 'VARCHAR(255)':
          // Already a string, no need to deserialize
          deserializedValue = value;
          break;
        case 'DATETIME':
        case 'DATETIME(6)':
          // Convert ISO 8601 string to Date object
          deserializedValue = new Date(value);
          if (Number.isNaN(deserializedValue.getTime())) {
            throw new Error(`Invalid date string: ${value}`);
          }

          break;
        case 'INTEGER':
          // Convert string to integer
          deserializedValue = Number.parseInt(value, 10);
          if (Number.isNaN(deserializedValue)) {
            throw new Error(`Invalid integer string: ${value}`);
          }

          break;
        case 'FLOAT':
          // Convert string to float
          deserializedValue = Number.parseFloat(value);
          if (Number.isNaN(deserializedValue)) {
            throw new Error(`Invalid float string: ${value}`);
          }

          break;
        case 'BOOLEAN':
          // Convert string to boolean
          deserializedValue = value.toLowerCase() === 'true';
          break;
        default:
          throw new Error('Supported Momento types are DATETIME, INTEGER, VARCHAR, BOOLEAN, AND FLOAT');
      }

    }

    return deserializedValue;
  }

}
