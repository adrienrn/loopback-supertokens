import {
  UserSignInEvent,
  UserSignUpEvent,
  WebhookEventType,
  WebhookEventUserInterface,
} from '../types';

/**
 * Each Supertokens recipe can have a slightly different response type (i.e. not
 * all recipes share the same response shape for action like sign-up or sign-in)
 * and all types are declared in place, so not easily importable/usable from the
 * outside.
 *
 * This is why we declare a looser type here.
 */

type APIResponseSharedInterface = {
  user: WebhookEventUserInterface;
};

export class WebhookEventFactory {
  createUserSignInEvent(res: APIResponseSharedInterface): UserSignInEvent {
    return {
      data: {
        user: {
          id: res.user.id,
        },
      },
      type: WebhookEventType.UserSignIn,
    };
  }

  createUserSignUpEvent(res: APIResponseSharedInterface): UserSignUpEvent {
    return {
      data: {
        user: {
          id: res.user.id,
        },
      },
      type: WebhookEventType.UserSignUp,
    };
  }
}
