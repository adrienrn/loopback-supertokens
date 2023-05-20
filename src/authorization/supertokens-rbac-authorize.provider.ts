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
  ): Promise<AuthorizationDecision> {
    const ctx = await authorizationCtx.invocationContext.get<MiddlewareContext>(
      MiddlewareBindings.CONTEXT,
    );

    try {
      // Retrieve the current session.
      // We're not using `overrideGlobalClaimValidators` here because `allowedRoles`
      // and `deniedRoles` are an array with a logical "OR" between elements and
      // claim validators `includesAll` and `excludesAll` are a logical "AND".
      const session = await Session.getSession(ctx, ctx);

      // We manually extract the role claim from the session.
      const userRolesFromSession =
        (await session.getClaimValue(UserRoles.UserRoleClaim)) || [];

      const hasAllowedRoles =
        metadata.allowedRoles && metadata.allowedRoles.length;
      const hasDeniedRoles =
        metadata.deniedRoles && metadata.deniedRoles.length;

      const hasOneOfDeniedRoles =
        this.doesUserHaveRoles(userRolesFromSession, metadata.deniedRoles || [])
          .length > 0;
      const hasOneOfAllowedRoles =
        this.doesUserHaveRoles(
          userRolesFromSession,
          metadata.allowedRoles || [],
        ).length > 0;

      if (hasOneOfAllowedRoles) {
        // As soon as we have a match for an allowed role -> ALLOW
        return AuthorizationDecision.ALLOW;
      }

      if (hasOneOfDeniedRoles) {
        // As soon as we have a match for a denied role -> DENY
        return AuthorizationDecision.DENY;
      }

      // 1. we have allowedRoles AND deniedRoles
      if (hasAllowedRoles && hasDeniedRoles) {
        return AuthorizationDecision.DENY;
      }

      // 2. we have allowedRoles only
      if (hasAllowedRoles) {
        return AuthorizationDecision.DENY;
      }

      // 3. we have deniedRoles only
      if (hasDeniedRoles) {
        return AuthorizationDecision.ALLOW;
      }

      // 4. we have nothing (odd!)
      return AuthorizationDecision.ABSTAIN;
    } catch (err) {
      return AuthorizationDecision.DENY;
    }
  }

  doesUserHaveRoles(userRoles: string[], targetRoles: string[]) {
    return (userRoles || []).filter((r) => (targetRoles || []).includes(r));
  }
}
