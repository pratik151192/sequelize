import type { Expression } from '../../sequelize.js';
import { AbstractQueryGenerator } from '../abstract/query-generator';
import type {
  EscapeOptions,
  RemoveIndexQueryOptions,
  TableNameOrModel,
} from '../abstract/query-generator-typescript';
import type { ShowConstraintsQueryOptions } from '../abstract/query-generator.types.js';

/**
 * Temporary class to ease the TypeScript migration
 */
export class MomentoQueryGeneratorTypeScript extends AbstractQueryGenerator {

  describeTableQuery(tableName: TableNameOrModel): string {
    throw new Error(`The describeTableQuery operation is not supported. tableName ${tableName}`);
  }

  showConstraintsQuery(tableName: TableNameOrModel, options?: ShowConstraintsQueryOptions): string {
    throw new Error(`The showConstraintsQuery operation is not supported. tableName ${tableName},
    options ${options}`);
  }

  showIndexesQuery(tableName: TableNameOrModel): string {
    throw new Error(`The showConstraintsQuery operation is not supported. tableName ${tableName}`);
  }

  getToggleForeignKeyChecksQuery(enable: boolean): string {
    throw new Error(`The getToggleForeignKeyChecksQuery operation is not supported. enable ${enable}`);
  }

  removeIndexQuery(
    tableName: TableNameOrModel,
    indexNameOrAttributes: string | string[],
    options?: RemoveIndexQueryOptions,
  ): string {
    throw new Error(`The removeIndexQuery operation is not supported. table ${tableName}, options ${options}`);
  }

  jsonPathExtractionQuery(sqlExpression: string, path: ReadonlyArray<number | string>, unquote: boolean): string {
    throw new Error(`The removeIndexQuery operation is not supported. sqlExpression ${sqlExpression},
              path ${path}, unquote ${unquote}`);
  }

  formatUnquoteJson(arg: Expression, options?: EscapeOptions) {
    return `json_unquote(${this.escape(arg, options)})`;
  }

  versionQuery(): string {
    return '1.0';
  }

  // createTableQuery(
  //   tableName: TableNameOrModel,
  //   // eslint-disable-next-line @typescript-eslint/no-unused-vars
  //   columns: { [columnName: string]: string },
  //   // eslint-disable-next-line @typescript-eslint/no-unused-vars
  //   options?: CreateTableQueryOptions,
  // ): string {
  //   const conn = this.sequelize.connectionManager.getConnection() as Promise<MomentoConnection>;
  //
  //   conn.then((mConn: MomentoConnection) => {
  //     mConn.cacheClient.createCache(tableName.toString());
  //   })
  //     .catch(error => {
  //       throw error;
  //     });
  //
  //   return 'Successfully created cache';
  // }
}
