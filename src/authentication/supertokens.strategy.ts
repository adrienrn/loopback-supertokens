import { AuthenticationStrategy } from '@loopback/authentication';
import { inject } from '@loopback/core';
import {
  HttpErrors,
  MiddlewareContext,
  RedirectRoute,
  RestBindings,
} from '@loopback/rest';
import { securityId } from '@loopback/security';
import { Error as SuperTokensError } from 'supertokens-node';
import Session from 'supertokens-node/recipe/session';
import type { SupertokensUserProfile } from '../types';

export class SuperTokensAuthenticationStrategy
  implements AuthenticationStrategy
{
  name = 'supertokens';

  constructor(
    @inject(RestBindings.Http.CONTEXT) private ctx: MiddlewareContext,
  ) {}

  async authenticate(): Promise<
    SupertokensUserProfile | RedirectRoute | undefined
  > {
    try {
      // https://supertokens.com/docs/emailpassword/common-customizations/sessions/session-verification-in-api/get-session#using-getsession
      const session = await Session.getSession(this.ctx, this.ctx);

      return {
        [securityId]: session!.getUserId(),
        session: session!.getHandle(),
        userId: session!.getUserId(),
        userDataInAccessToken: session!.getAccessTokenPayload(),
      };
    } catch (err) {
      if (SuperTokensError.isErrorFromSuperTokens(err)) {
        throw new HttpErrors.Unauthorized(err.message);
      }

      throw err;
    }
  }
}
