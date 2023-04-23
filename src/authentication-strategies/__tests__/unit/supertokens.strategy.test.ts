import { Context, instantiateClass } from '@loopback/core';
import { RestBindings } from '@loopback/rest';
import { expect, sinon } from '@loopback/testlab';
import { Error as SuperTokensError } from 'supertokens-node';
import Session from 'supertokens-node/recipe/session';
import { SuperTokensAuthenticationStrategy } from '../../supertokens.strategy';

describe('SuperTokensAuthenticationStrategy', () => {
  let context: Context;

  beforeEach(() => {
    context = new Context('app');
    context.bind(RestBindings.Http.CONTEXT).to(new Context());
  });

  it('has proper key', async () => {
    context.bind(RestBindings.Http.CONTEXT).to(new Context());
    const strategy = await instantiateClass(
      SuperTokensAuthenticationStrategy,
      context,
    );

    expect(strategy.name).to.equal('supertokens');
  });

  it('can execute authenticate', async () => {
    sinon.stub(Session, 'getSession').returns(
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
    context.bind(RestBindings.Http.CONTEXT).to(new Context());
    const strategy = await instantiateClass(
      SuperTokensAuthenticationStrategy,
      context,
    );

    const profile = await strategy.authenticate();
    const sym =
      Object.getOwnPropertySymbols(profile).find(
        s => s.description === 'securityId',
      ) || '';

    expect((profile as any)[sym]).to.be.equal('123');
    expect((profile as any).userId).to.be.equal('123');
    expect((profile as any).userDataInAccessToken).to.be.deepEqual({
      'st-role': {
        t: 1681996316335,
        v: ['admin'],
      },
    });

    (Session.getSession as sinon.SinonStub).restore();
  });

  it('throws on getSession error', async () => {
    sinon.stub(Session, 'getSession').throws(
      new SuperTokensError({
        message: '401 error from unit test',
        type: 'stub',
      }),
    );
    context.bind(RestBindings.Http.CONTEXT).to(new Context());
    const strategy = await instantiateClass(
      SuperTokensAuthenticationStrategy,
      context,
    );

    return strategy
      .authenticate()
      .finally(() => {
        (Session.getSession as sinon.SinonStub).restore();
      })
      .catch(error => {
        expect(error.message).to.be.equal('401 error from unit test');
        expect(error.status).to.be.equal(401);
      });
  });

  it('throws the underlying on unexpected error', async () => {
    sinon
      .stub(Session, 'getSession')
      .throws(new Error('unexpected error from unit test'));
    context.bind(RestBindings.Http.CONTEXT).to(new Context());
    const strategy = await instantiateClass(
      SuperTokensAuthenticationStrategy,
      context,
    );

    return strategy
      .authenticate()
      .finally(() => {
        (Session.getSession as sinon.SinonStub).restore();
      })
      .catch(error => {
        expect(error.message).to.be.equal('unexpected error from unit test');
        expect(error.status).to.be.undefined();
      });
  });
});
