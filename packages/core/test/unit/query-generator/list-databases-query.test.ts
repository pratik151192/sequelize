import { expectsql, getTestDialect, sequelize } from '../../support';

const dialectName = getTestDialect();

const notSupportedError = new Error(`Databases are not supported in ${dialectName}.`);

describe('QueryGenerator#listDatabasesQuery', () => {
  if (dialectName === 'momento') {
    return;
  }
  const queryGenerator = sequelize.getQueryInterface().queryGenerator;

  it('produces a query used to list schemas in supported dialects', () => {
    expectsql(() => queryGenerator.listDatabasesQuery(), {
      default: notSupportedError,
      postgres: 'SELECT datname AS name FROM pg_database;',
      mssql: 'SELECT name FROM sys.databases;',
      snowflake: 'SHOW DATABASES;',
    });
  });
});
