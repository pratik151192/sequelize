const Support = require('../../support');

const dialect = Support.getTestDialect();

describe('[Momento] Sequelize', () => {
  if (!dialect.startsWith('momento')) {
    return;
  }

  it('should successfully create a client', async () => {
    const instance = Support.createSingleTestSequelizeInstance();
    await instance.connectionManager.connect({});
  });
});
