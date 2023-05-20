import {
  AuthorizationContext,
  AuthorizationDecision,
  Authorizer,
} from '@loopback/authorization';
import { Context, InvocationContext, Provider } from '@loopback/core';
import {
  MiddlewareBindings,
  MiddlewareContext,
  RestBindings,
} from '@loopback/rest';
import { expect, sinon, stubExpressContext } from '@loopback/testlab';
import { Error as SuperTokensError } from 'supertokens-node';
import Session from 'supertokens-node/recipe/session';
import { SuperTokensRBACAuthorizeProvider } from '../../../authorization/supertokens-rbac-authorize.provider';
import { RefundController } from '../../fixtures/test-app/controllers/refund.controller';

describe('SuperTokensRBACAuthorizeProvider', () => {
  let context: Context;
  let authorizerProvider: Provider<Authorizer>;

  beforeEach(() => {
    context = new Context('app');
    context.bind(RestBindings.Http.CONTEXT).to(new Context());

    const requestContext = stubExpressContext();
    context
      .bind(MiddlewareBindings.CONTEXT)
      .to(
        new MiddlewareContext(requestContext.request, requestContext.response),
      );
  });

  it.skip('can execute authorize method', async () => {
    authorizerProvider = new SuperTokensRBACAuthorizeProvider();

    const getSessionStub = sinon.stub(Session, 'getSession').resolves({
      // getClaimValue<string[]>(claim, userContext) {
      //   return Promise.resolve(['chief']);
      // },
    } as unknown as any);

    const authorizeFn = await authorizerProvider.value();
    const mockInvocationContext = new InvocationContext(
      context,
      new RefundController(),
      'create',
      [],
    );
    const mockAuthorizationContext: AuthorizationContext = {
      invocationContext: mockInvocationContext,
      principals: [],
      resource: '',
      roles: [],
      scopes: [],
    };

    const decision = await authorizeFn(mockAuthorizationContext, {
      allowedRoles: ['chief'],
    });

    expect(decision).to.be.equal(AuthorizationDecision.DENY);
    sinon.assert.calledOnce(getSessionStub);
    getSessionStub.restore();
  });

  describe('doesUserHaveRoles', () => {
    authorizerProvider = new SuperTokensRBACAuthorizeProvider();

    [
      ['No roles found: 1 to 1', ['quartermaster'], ['chief'], []],
      [
        'No roles found: 1 to N',
        ['pirate'],
        ['quartermaster', 'chief', 'captain'],
        [],
      ],
      ['Roles found: 1 to 1', ['chief'], ['chief'], ['chief']],
      [
        'Roles found: 1 to N',
        ['captain'],
        ['quartermaster', 'chief', 'captain'],
        ['captain'],
      ],
      [
        'Roles found: N to N',
        ['pirate', 'captain'],
        ['quartermaster', 'chief', 'captain'],
        ['captain'],
      ],
    ].forEach(([testLabel, u, t, expected], i) => {
      it(`works "${testLabel}"`, () => {
        expect((authorizerProvider as any).doesUserHaveRoles(u, t)).to.eql(
          expected,
        );
      });
    });
  });
});
