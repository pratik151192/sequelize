const Support = require('../../support');

const dialect = Support.getTestDialect();

describe('[Momento] Sequelize', () => {
  if (!dialect.startsWith('momento')) {
    return;
  }

  it('should not set client_min_messages if clientMinMessages is false (deprecated in v7)', async () => {
    Support.createSingleTestSequelizeInstance();
  });
});
