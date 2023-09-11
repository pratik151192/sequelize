import { EMPTY_OBJECT } from '../../utils/object';
import { MomentoQueryGeneratorTypeScript } from './query-generator-typescript';

export class MomentoQueryGenerator extends MomentoQueryGeneratorTypeScript {

  deleteQuery(tableName, where, options = EMPTY_OBJECT, model) {
    console.log(this.whereQuery());

    return this.whereQuery();
  }

  attributesToSQL(attributes, options) {
    const result = {};

    for (const name in attributes) {
      result[name] = attributes[name];
    }

    return result;
  }
}
