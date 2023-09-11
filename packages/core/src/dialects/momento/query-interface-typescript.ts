import {CacheDictionaryFetch, CacheDictionarySetFields, CollectionTtl, CreateCache} from '@gomomento/sdk';
import type { Model, ModelStatic, NormalizedAttributeOptions } from '../../model';
import type { Sequelize } from '../../sequelize.js';
import { isString } from '../../utils/check';
import { isModelStatic } from '../../utils/model-utils';
import { AbstractQueryInterfaceInternal } from '../abstract/query-interface-internal.js';
import type { QiInsertOptions, QiSelectOptions, TableName } from '../abstract/query-interface.js';
import {AbstractQueryInterface, QiDeleteOptions, QiOptionsWithReplacements} from '../abstract/query-interface.js';
import type { MomentoConnection } from './connection-manager';
import type { MomentoQueryGenerator } from './query-generator.js';
import {TableNameOrModel} from "../abstract/query-generator-typescript";
import {QueryRawOptions} from "../../sequelize.js";
import {QueryTypes} from "../../query-types";
import {WhereOptions} from "../abstract/where-sql-builder-types";
import {EMPTY_OBJECT} from "../../utils/object";

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
    const conn = await this.sequelize.connectionManager.getConnection() as MomentoConnection;
    const primaryKey = (instance.constructor as typeof Model).primaryKeyAttribute;
    if (primaryKey == null) {
      throw new Error('primary key must not be null and not composed');
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
      dictionaryName, dictionaryFields, { ttl: CollectionTtl.of(3000) });
    if (response instanceof CacheDictionarySetFields.Error) {
      throw response.innerException();
    }

    return {};
  }

  // we override this to make Sequelize instantiation happy.
  async tableExists(tableNameOrModel: TableNameOrModel,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options?: QueryRawOptions): Promise<boolean> {

    const tableNameObject = isModelStatic(tableNameOrModel) ? tableNameOrModel.getTableName()
      : isString(tableNameOrModel) ? { tableName: tableNameOrModel }
        : tableNameOrModel;
    const conn = this.sequelize.connectionManager.getConnection() as Promise<MomentoConnection>;

    conn.then((mConn: MomentoConnection) => {
      mConn.cacheClient.createCache(tableNameObject.tableName)
        .then(response => {
          if (response instanceof CreateCache.AlreadyExists) {
            return true;
          }
        })
        .catch(error => {
          throw new Error('An exception occurred while creating cache:', error);
        });
    }).catch(error => {
      throw error;
    });

    return false;
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
      throw new Error('Momento only supports 1 attribute in the where clause which has to be the primary key.');
    }

    const dictionaryName = (options.where as any)[primaryKey];

    const tableNameObject = isModelStatic(tableName) ? tableName.getTableName()
      : isString(tableName) ? { tableName }
        : tableName;
    const attributes = model.modelDefinition.attributes;

    const conn = await this.sequelize.connectionManager.getConnection() as MomentoConnection;

    let values: Map<string, string> | null = null;
    const valuesObject: Record<string, any> = {}; // Initialize valuesObject here

    // Initialize all attributes in the schema to null as SQL supports NULL values. Since we are schemaless,
    // it doesn't make a lot of sense to throw errors here. There's a sequelize option that can tell it to throw
    // on any NULL columns which we can potentially need and extend here if needed.
    for (const key of attributes.keys()) {
      valuesObject[key] = null;
    }

    const response = await conn.cacheClient.dictionaryFetch(tableNameObject.tableName,
      dictionaryName);

    if (response instanceof CacheDictionaryFetch.Error) {
      throw response.innerException();
    } else if (response instanceof CacheDictionaryFetch.Hit) {
      values = response.valueMap();
      // Deserialize each value based on its attribute type
      for (const [key, value] of values.entries()) {
        // Make sure the key is a valid attribute of the model
        if (attributes.get(key)) {
          const attribute = attributes.get(key)!;
          valuesObject[key] = this.deserializeAttribute(key, attribute, value);
        } else {
          // We are throwing here because it doesn't make any sense for a key to arrive from the dictionary
          // fields that doesn't conform to the Sequelize schema. This can only happen if someone inserts an
          // item into the Cache outside of sequelize, and then try to retrieve it using Sequelize.
          throw new Error(`Unknown attribute ${key}. This should never happen as the model is defined through Sequelize
           and it's not expected for Momento to return an attribute that is not a part of the model.`);
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    return valuesObject;
  }

  /**
   * Deletes a row
   */
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
      throw new Error('primary key must not be null and not composed');
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

    const tableNameObject = isModelStatic(tableName) ? tableName.getTableName()
      : isString(tableName) ? { tableName }
        : tableName;

    const conn = await this.sequelize.connectionManager.getConnection() as MomentoConnection;
    const attributes = model.modelDefinition.attributes;
    const fields: string[] = [];
    for (const key of attributes.keys()) {
      fields.push(key);
    }

    const response = await conn.cacheClient.dictionaryRemoveFields(tableNameObject.tableName,
      dictionaryName, fields);

    if (response instanceof CacheDictionarySetFields.Error) {
      throw response.innerException();
    }

    return Promise.resolve({});

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
