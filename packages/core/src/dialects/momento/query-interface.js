import { CacheDictionarySetFields } from '@gomomento/sdk';
import { Model } from '../../model';
import { QueryTypes } from '../../query-types';
import { isString } from '../../utils/check';
import { isModelStatic } from '../../utils/model-utils';
import { AbstractQueryInterface } from '../abstract/query-interface';
import { MomentoConnection } from './connection-manager';
import { MomentoQueryInterfaceTypescript } from './query-interface-typescript';

export class MomentoQueryInterface extends MomentoQueryInterfaceTypescript {

  async showAllTables(options) {
    await Promise.resolve();
  }

  async dropAllTables(options) {
    await Promise.resolve();
  }
}
