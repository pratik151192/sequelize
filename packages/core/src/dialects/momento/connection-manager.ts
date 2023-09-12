import { CacheClient, Configurations, CredentialProvider } from '@gomomento/sdk';
import type { ConnectionOptions, Sequelize } from '../../sequelize';
import type { Connection, GetConnectionOptions } from '../abstract/connection-manager';
import { AbstractConnectionManager } from '../abstract/connection-manager';
import type { MomentoDialect } from './index';

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type Lib = typeof import('@gomomento/sdk');

export interface MomentoConnection extends Connection {
  cacheClient: CacheClient;
}

const CACHE_AUTH_TOKEN_ENV_VARIABLE_NAME = 'MOMENTO_AUTH_TOKEN';
const CACHE_DEFAULT_TTL_SECONDS = 60;

export class MomentoConnectionManager extends AbstractConnectionManager<MomentoConnection> {
  private readonly lib: Lib;
  private cachedConnection?: MomentoConnection; // Class property to hold the cached connection

  constructor(dialect: MomentoDialect, sequelize: Sequelize) {
    super(dialect, sequelize);
    this.lib = this._loadDialectModule('@gomomento/sdk') as Lib;
  }

  async connect(_config: ConnectionOptions): Promise<MomentoConnection> {
    if (!this.cachedConnection) {
      this.cachedConnection = {
        cacheClient: await CacheClient.create({
          configuration: Configurations.Laptop.latest(),
          credentialProvider: CredentialProvider.fromEnvironmentVariable({
            environmentVariableName: CACHE_AUTH_TOKEN_ENV_VARIABLE_NAME,
          }),
          defaultTtlSeconds: CACHE_DEFAULT_TTL_SECONDS,
        }),
      };
    }

    return this.cachedConnection;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getConnection(options?: GetConnectionOptions): Promise<MomentoConnection> {
    if (!this.cachedConnection) {
      this.cachedConnection = await this.connect({});
    }

    return this.cachedConnection;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  releaseConnection(connection: MomentoConnection) {
    // do nothing
  }
}
