import type {
  AuthorizationContext,
  AuthorizationMetadata,
  Authorizer,
} from '@loopback/authorization';
import { AuthorizationDecision } from '@loopback/authorization';
import { Provider } from '@loopback/core';
import { MiddlewareContext } from '@loopback/rest';
import Session, {
  SessionClaimValidator,
} from 'supertokens-node/recipe/session';
import UserRoles from 'supertokens-node/recipe/userroles';

export class SuperTokensRBACAuthorizeProvider implements Provider<Authorizer> {
  constructor() {}

  /**
   * @returns authenticateFn
   */
  value(): Authorizer {
    return this.authorize.bind(this);
  }

  async authorize(
    authorizationCtx: AuthorizationContext,
    metadata: AuthorizationMetadata,
  ) {
    const ctx = await authorizationCtx.invocationContext.get<MiddlewareContext>(
      'middleware.http.context',
    );

    const rbacSessionClaimValidator: SessionClaimValidator[] = [];
    if (!!metadata.allowedRoles) {
      rbacSessionClaimValidator.push(
        UserRoles.UserRoleClaim.validators.includesAll(metadata.allowedRoles),
      );
    } else if (!!metadata.deniedRoles) {
      rbacSessionClaimValidator.push(
        UserRoles.UserRoleClaim.validators.excludesAll(metadata.deniedRoles),
      );
    }

    try {
      await Session.getSession(ctx, ctx, {
        overrideGlobalClaimValidators(validators) {
          return validators.concat(rbacSessionClaimValidator);
        },
      });

      return AuthorizationDecision.ALLOW;
    } catch (err) {
      console.error(err);

      return AuthorizationDecision.DENY;
    }
  }
}
