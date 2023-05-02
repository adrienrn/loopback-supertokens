import { Context, instantiateClass } from '@loopback/core';
import { RestBindings } from '@loopback/rest';
import { expect, sinon } from '@loopback/testlab';
import { Error as SuperTokensError } from 'supertokens-node';
import Session from 'supertokens-node/recipe/session';
import { SuperTokensAuthenticationStrategy } from '../../authentication-strategies/supertokens.strategy';

describe('SuperTokensAuthenticationStrategy', () => {
  let context: Context;

  beforeEach(() => {
    context = new Context('app');
    context.bind(RestBindings.Http.CONTEXT).to(new Context());
  });

  it('has proper name', async () => {
    const strategy = await instantiateClass(
      SuperTokensAuthenticationStrategy,
      context,
    );

    expect(strategy.name).to.equal('supertokens');
  });

  it('can execute authenticate', async () => {
    const getSessionStub = sinon.stub(Session, 'getSession').returns(
      Promise.resolve({
        getUserId: () => '123',
        getAccessTokenPayload: () => ({
          'st-role': {
            t: 1681996316335,
            v: ['admin'],
          },
        }),
      } as unknown as any),
    );

    const strategy = await instantiateClass(
      SuperTokensAuthenticationStrategy,
      context,
    );

    const profile = await strategy.authenticate();
    sinon.assert.calledOnce(getSessionStub);
    const sym =
      Object.getOwnPropertySymbols(profile).find(
        (s) => s.description === 'securityId',
      ) || '';

    expect((profile as any)[sym]).to.be.equal('123');
    expect((profile as any).userId).to.be.equal('123');
    expect((profile as any).userDataInAccessToken).to.be.deepEqual({
      'st-role': {
        t: 1681996316335,
        v: ['admin'],
      },
    });

    getSessionStub.restore();
  });

  it('throws on getSession error', async () => {
    const getSessionStub = sinon.stub(Session, 'getSession').throws(
      new SuperTokensError({
        message: '401 error from unit test',
        type: 'stub',
      }),
    );

    const strategy = await instantiateClass(
      SuperTokensAuthenticationStrategy,
      context,
    );

    return strategy
      .authenticate()
      .finally(() => {
        getSessionStub.restore();
      })
      .catch((error) => {
        expect(error.message).to.be.equal('401 error from unit test');
        expect(error.status).to.be.equal(401);
      });
  });

  it('throws the underlying on unexpected error', async () => {
    const getSessionStub = sinon
      .stub(Session, 'getSession')
      .throws(new Error('unexpected error from unit test'));
    const strategy = await instantiateClass(
      SuperTokensAuthenticationStrategy,
      context,
    );

    return strategy
      .authenticate()
      .finally(() => {
        getSessionStub.restore();
      })
      .catch((error) => {
        expect(error.message).to.be.equal('unexpected error from unit test');
        expect(error.status).to.be.undefined();
      });
  });
});
