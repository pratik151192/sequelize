import { EMPTY_OBJECT } from '../../utils/object';
import { MomentoQueryGeneratorTypeScript } from './query-generator-typescript';

export class MomentoQueryGenerator extends MomentoQueryGeneratorTypeScript {

  deleteQuery(tableName, where, options = EMPTY_OBJECT, model) {
    // eslint-disable-next-line no-console
    console.log("yet to be implemented!")
  }

  attributesToSQL(attributes, options) {
    const result = {};

    for (const name in attributes) {
      result[name] = attributes[name];
    }

    return result;
  }
}
