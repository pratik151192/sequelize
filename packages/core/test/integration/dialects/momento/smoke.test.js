'use strict';

const Support = require('../../support');

const dialect = Support.getTestDialect();
const { DataTypes } = require('@sequelize/core');
const dayjs = require('dayjs');

if (dialect === 'momento') {
  describe('[Momento Specific] Smoke test', () => {
    describe('[Momento Specific] Basic test for one table', () => {
      let User;

      before(async () => {
        const sequelize = Support.createSequelizeInstance();
        User = sequelize.define('User', {
          username: DataTypes.STRING,
          lastActivity: {
            type: DataTypes.DATE,
            get() {
              const value = this.getDataValue('lastActivity');

              return value ? value.valueOf() : 0;
            },
          },
        });

        await User.sync({ force: true });

      });

      after(async () => {
        await User.drop();
      });

      it('insert and select success', async () => {
        //await User.create({ id: 1, username: 'jozef', lastActivity: new Date(Date.UTC(2021, 5, 21)) });
        const user = await User.findOne({
          where:
            {
              id: '1',
            },
        });
        console.log('user', user);
        user.username.should.equal('jozef');
      });

    });
  });
}
