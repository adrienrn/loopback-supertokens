import { AuthenticationStrategy } from '@loopback/authentication';
import { inject } from '@loopback/core';
import {
  HttpErrors,
  MiddlewareContext,
  RedirectRoute,
  RestBindings,
} from '@loopback/rest';
import type { UserProfile } from '@loopback/security';
import { securityId } from '@loopback/security';

export class SuperTokensInternalAuthenticationStrategy
  implements AuthenticationStrategy
{
  name = 'supertokens-internal';

  constructor(
    @inject(RestBindings.Http.CONTEXT) private ctx: MiddlewareContext,
  ) {}

  async authenticate(): Promise<UserProfile | RedirectRoute | undefined> {
    // Extract apiKey from headers.
    const [format, apiKey] = (
      this.ctx.request.header('Authorization') || ''
    ).split(' ');

    if (
      format === 'Api-Key-V1' &&
      apiKey === process.env.SUPERTOKENS_INTERNAL_WEBHOOKS_API_KEY
    ) {
      // Format and key are matching, create a UserProfile for the app.
      return {
        [securityId]: 'SUPERTOKENS',
      };
    }

    throw new HttpErrors.Unauthorized();
  }
}
