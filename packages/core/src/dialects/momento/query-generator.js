import { EMPTY_OBJECT } from '../../utils/object';
import { MomentoQueryGeneratorTypeScript } from './query-generator-typescript';

export class MomentoQueryGenerator extends MomentoQueryGeneratorTypeScript {

  deleteQuery(tableName, where, options = EMPTY_OBJECT, model) {
    // eslint-disable-next-line no-console
    console.log("yet to be implemented!")
  }

  // attributesToSQL(attributes, options) {
  //   const result = {};
  //
  //   for (const key in attributes) {
  //     const attribute = attributes[key];
  //     result[attribute.field || key] = this.attributeToSQL(attribute, options);
  //   }
  //
  //   return result;
  // }
}
