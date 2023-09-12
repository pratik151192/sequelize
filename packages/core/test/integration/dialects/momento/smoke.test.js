'use strict';
const Support = require('../../support');

const chai = require('chai');

const expect = chai.expect;
const dialect = Support.getTestDialect();
const { DataTypes } = require('@sequelize/core');
const { setResetMode } = require('../../support');

if (dialect === 'momento') {
  describe('[Momento Specific] Smoke test', () =>{
    describe('[Momento Specific] Basic test for one table', () => {
      setResetMode('none');

      let MomentoUser;
      let sequelize;

      before(async () => {
        sequelize = Support.createSequelizeInstance();
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

      it('insert, select, delete success all fields present', async () => {
        await MomentoUser.create({
          id: 1, username: 'taylor', adult: true, lastActivity: new Date(Date.UTC(2021, 5, 21)),
          accountBalance: 70.07,
        });

        let user = await MomentoUser.findOne({
          where:
            {
              username: 'taylor',
            },
        });
        user.id.should.equal(1);
        user.username.should.equal('taylor');
        user.lastActivity.toISOString().should.equal(new Date(Date.UTC(2021, 5, 21)).toISOString());
        user.adult.should.equal(true);
        user.accountBalance.should.equal(70.07);
        await MomentoUser.destroy({
          where: {
            username: 'taylor',
          },
        });
        user = await MomentoUser.findOne({
          where:
            {
              username: 'taylor',
            },
        });
        expect(user.username).to.equal(null);
      });

      it('insert, select, delete success partial fields', async () => {
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
        user.lastActivity.toISOString().should.equal(new Date(Date.UTC(2021, 5, 21)).toISOString());
        user.adult.should.equal(false);
        expect(user.accountBalance).to.equal(null);
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

      it('define momento model without primary key throws error even with id present', async () => {
        try {
          sequelize.define('MomentoUser', {
            username: {
              type: DataTypes.STRING,
            },
            id: DataTypes.INTEGER,
          });
          expect.fail('Error should have been thrown from the test as the model doesn\'t define a primary key');
        } catch (error) {
          expect(error.message).to.equal('A Momento model must have a primary key.');
        }
      });

      it('create without a primary key where clause throws error', async () => {
        try {
          await MomentoUser.create({
            id: 1, adult: false, lastActivity: new Date(Date.UTC(2021, 5, 21)),
          });
          expect.fail('Error should have been thrown from the test as the create doesn\'t provide the primary key column');
        } catch (error) {
          expect(error.message).to.equal('Primary key value must be set for a Momento cache Model.');
        }

        // now specify PK in create but as null
        try {
          await MomentoUser.create({
            id: 1, username: null, adult: false, lastActivity: new Date(Date.UTC(2021, 5, 21)),
          });
          expect.fail('Error should have been thrown from the test as the create doesn\'t provide the primary key column');
        } catch (error) {
          expect(error.message).to.equal('Primary key value must be set for a Momento cache Model.');
        }
      });

      it('select without a primary key where clause throws error', async () => {
        try {
          await MomentoUser.create({
            id: 1, username: 'alexa', adult: false, lastActivity: new Date(Date.UTC(2021, 5, 21)),
          });

          await MomentoUser.findOne({
            where:
              {
                id: 1,
              },
          });
          expect.fail('Error should have been thrown from the test as the select operation where clause doesn\'t provide ' +
            'the primary key');
        } catch (error) {
          expect(error.message).to.contains('Momento only supports 1 attribute in the where clause which has to be ' +
            'the primary key.');
        }
      });

      it('delete without a primary key where clause throws error', async () => {
        try {
          await MomentoUser.create({
            id: 1, username: 'alexa', adult: false, lastActivity: new Date(Date.UTC(2021, 5, 21)),
          });

          const user = await MomentoUser.findOne({
            where:
              {
                username: 'alexa',
              },
          });
          user.id.should.equal(1);

          await MomentoUser.destroy({
            where:
              {
                id: 1,
              },
          });
          expect.fail('Error should have been thrown from the test as the select operation where clause doesn\'t provide ' +
            'the primary key');
        } catch (error) {
          expect(error.message).to.contains('The identifier key must match the primary key of the model');
        }
      });

      it('select with more than 1 where clause throws error', async () => {
        try {
          await MomentoUser.create({
            id: 1, username: 'alexa', adult: false, lastActivity: new Date(Date.UTC(2021, 5, 21)),
          });

          await MomentoUser.findOne({
            where:
              {
                id: 1,
                username: 'alexa',
              },
          });
          expect.fail('Error should have been thrown from the test as the select operation provides more than 1 where clause');
        } catch (error) {
          expect(error.message).to.contains('Momento only supports 1 attribute in the where clause which has to be ' +
            'the primary key.');
        }
      });

      it('delete with more than 1 where clause throws error', async () => {
        try {
          await MomentoUser.create({
            id: 1, username: 'alexa', adult: false, lastActivity: new Date(Date.UTC(2021, 5, 21)),
          });

          const user = await MomentoUser.findOne({
            where:
              {
                username: 'alexa',
              },
          });
          user.id.should.equal(1);

          await MomentoUser.destroy({
            where:
              {
                id: 1,
                username: 'alexa',
              },
          });
          expect.fail('Error should have been thrown from the test as the select operation where clause doesn\'t provide ' +
            'the primary key');
        } catch (error) {
          expect(error.message).to.equal('Momento supports a where clause with exactly one key');
        }
      });

      it('tableExists returns true for an existing cache and false for non-existent', async () => {
        expect(await sequelize.getQueryInterface().tableExists('MomentoUsers')).to.equal(true);
        expect(await sequelize.getQueryInterface().tableExists('MomentoUser')).to.equal(false);
      });

    });
  });
}
