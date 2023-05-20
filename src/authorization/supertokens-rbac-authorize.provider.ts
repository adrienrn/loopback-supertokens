import type {
  AuthorizationContext,
  AuthorizationMetadata,
  Authorizer,
} from '@loopback/authorization';
import { AuthorizationDecision } from '@loopback/authorization';
import { Provider } from '@loopback/core';
import { MiddlewareBindings, MiddlewareContext } from '@loopback/rest';
import Session from 'supertokens-node/recipe/session';
import UserRoles from 'supertokens-node/recipe/userroles';

export class SuperTokensRBACAuthorizeProvider implements Provider<Authorizer> {
  value(): Authorizer {
    return this.authorize.bind(this);
  }

  async authorize(
    authorizationCtx: AuthorizationContext,
    metadata: AuthorizationMetadata,
  ) {
    const ctx = await authorizationCtx.invocationContext.get<MiddlewareContext>(
      MiddlewareBindings.CONTEXT,
    );

    try {
      const session = await Session.getSession(ctx, ctx);

      const userRolesFromSession = await session.getClaimValue(
        UserRoles.UserRoleClaim,
      );

      if (metadata.allowedRoles && metadata.allowedRoles.length) {
        return this.checkIfUserHasAtLeastOneRole(
          userRolesFromSession,
          metadata.allowedRoles,
        )
          ? AuthorizationDecision.ALLOW
          : AuthorizationDecision.DENY;
      }

      if (metadata.deniedRoles && metadata.deniedRoles.length) {
        return this.checkIfUserHasAtLeastOneRole(
          userRolesFromSession,
          metadata.deniedRoles,
        )
          ? AuthorizationDecision.DENY
          : AuthorizationDecision.ALLOW;
      }

      return AuthorizationDecision.ABSTAIN;
    } catch (err) {
      return AuthorizationDecision.DENY;
    }
  }

  checkIfUserHasAtLeastOneRole(userRoles: string[], targetRoles: string[]) {
    return (
      userRoles.filter((userRole) => targetRoles.includes(userRole)).length > 0
    );
  }
}
