import { CacheClient, Configurations, CredentialProvider } from '@gomomento/sdk';
import type { ConnectionOptions, Sequelize } from '../../sequelize';
import type { Connection } from '../abstract/connection-manager';
import { AbstractConnectionManager } from '../abstract/connection-manager';
import type { MomentoDialect } from './index';

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type Lib = typeof import('@gomomento/sdk');

export interface MomentoConnection extends Connection {
  cacheClient: CacheClient;
}

export class MomentoConnectionManager extends AbstractConnectionManager<MomentoConnection> {
  private readonly lib: Lib;

  constructor(dialect: MomentoDialect, sequelize: Sequelize) {
    super(dialect, sequelize);
    this.lib = this._loadDialectModule('@gomomento/sdk') as Lib;
  }

  async connect(_config: ConnectionOptions): Promise<MomentoConnection> {
    return {
      cacheClient: await CacheClient.create({
        configuration: Configurations.Laptop.latest(),
        credentialProvider: CredentialProvider.fromEnvironmentVariable({
          environmentVariableName: 'MOMENTO_AUTH_TOKEN',
        }),
        defaultTtlSeconds: 60,
      }),
    };
  }
}
