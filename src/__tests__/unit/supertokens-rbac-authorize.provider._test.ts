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
import { SuperTokensRBACAuthorizeProvider } from '../../providers/supertokens-rbac-authorize.provider';
import { RefundController } from '../fixtures/test-app/controllers/refund.controller';

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

  it('can execute authorize method', async () => {
    authorizerProvider = new SuperTokensRBACAuthorizeProvider();

    const getSessionStub = sinon.stub(Session, 'getSession').throws(
      new SuperTokensError({
        message: '403 error from unit test',
        type: 'stub',
      }),
    );

    const authorizeFn = await authorizerProvider.value();
    const mockInvocationContext = new InvocationContext(
      context,
      new RefundController(),
      'create',
      [],
    );
    const mockAuthorizationContext: AuthorizationContext = {
      principals: [],
      resource: undefined,
      roles: [],
      scopes: [],
      invocationContext: mockInvocationContext,
    };

    const decision = await authorizeFn(mockAuthorizationContext, {
      allowedRoles: ['chief'],
    });

    expect(decision).to.be.equal(AuthorizationDecision.DENY);
    sinon.assert.calledOnce(getSessionStub);
    getSessionStub.restore();
  });
});
