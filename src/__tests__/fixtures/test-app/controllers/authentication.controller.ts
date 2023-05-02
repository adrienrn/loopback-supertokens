import { authenticate } from '@loopback/authentication';
import { inject } from '@loopback/core';
import { get } from '@loopback/rest';
import { SecurityBindings, UserProfile } from '@loopback/security';

export class AuthenticationController {
  @authenticate('supertokens')
  @get('/authentication/users/me', {
    responses: {
      200: {
        content: {
          'application/json': {
            schema: {
              properties: {
                id: { type: 'string' },
              },
              type: 'object',
            },
          },
        },
      },
    },
    summary: 'Get the current logged in user, inferred from JWT token',
  })
  async getCurrentUser(@inject(SecurityBindings.USER) profile: UserProfile) {
    return {
      userId: profile.userId,
      userDataInAccessToken: profile.userDataInAccessToken,
    };
  }
}
