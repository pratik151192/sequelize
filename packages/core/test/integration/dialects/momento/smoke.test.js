'use strict';
const Support = require('../../support');

const chai = require('chai');

const expect = chai.expect;
const dialect = Support.getTestDialect();
const { DataTypes } = require('@sequelize/core');

if (dialect === 'momento') {
  describe('[Momento Specific] Smoke test', () =>{
    describe('[Momento Specific] Basic test for one table', () => {

      let MomentoUser;

      before(async () => {
        const sequelize = Support.createSequelizeInstance();
        MomentoUser = sequelize.define('MomentoUser', {
          username: {
            type: DataTypes.STRING,
            primaryKey: true,
          },
          lastActivity: {
            type: DataTypes.DATE,
          },
          id: DataTypes.INTEGER,
          adult: DataTypes.BOOLEAN,
          accountBalance: DataTypes.FLOAT,
        });

        await MomentoUser.sync({ force: false });

      });

      after(async () => {
        await MomentoUser.drop();
      });

      it('insert and select success', async () => {
        await MomentoUser.create({
          id: 1, username: 'alexa', adult: false, lastActivity: new Date(Date.UTC(2021, 5, 21)),

        });
        let user = await MomentoUser.findOne({
          where:
            {
              username: 'alexa',
            },
        });
        user.id.should.equal(1);
        user.username.should.equal('alexa');

        await MomentoUser.destroy({
          where: {
            username: 'alexa',
          },
        });
        user = await MomentoUser.findOne({
          where:
            {
              username: 'alexa',
            },
        });
        expect(user.username).to.equal(null);

      });
    });
  });
}
