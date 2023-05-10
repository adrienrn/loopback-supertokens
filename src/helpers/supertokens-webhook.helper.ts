import axios, { AxiosError } from 'axios';
import type { User, UserSignInEvent, UserSignUpEvent } from '../types';
import { WEBHOOK_EVENT_TYPE } from '../types';
import { computeEventSignature } from '../utils/computeEventSignature';
import { sanitizeWebhookEndpoint } from '../utils/sanitizeWebhookEndpoint';

export class SupertokensWebhookHelper {
  static createUserSignInEvent(data: { user: User }): UserSignInEvent {
    return {
      data: {
        user: {
          id: data.user.id,
        },
      },
      type: WEBHOOK_EVENT_TYPE.USER__SIGN_IN,
    };
  }

  static createUserSignUpEvent(data: { user: User }): UserSignUpEvent {
    return {
      data: {
        user: {
          id: data.user.id,
        },
      },
      type: WEBHOOK_EVENT_TYPE.USER__SIGN_UP,
    };
  }

  static async dispatchWebhookEvent(
    event: UserSignInEvent | UserSignUpEvent,
    options: {
      endpoint: string;
      secret: string;
      signatureHeaderKey: string;
    },
  ) {
    const timestamp = new Date().getTime();
    const signature = computeEventSignature(event, timestamp, options.secret);

    const sanitiziedEndpoint = sanitizeWebhookEndpoint(options.endpoint);
    return axios
      .post(sanitiziedEndpoint, event, {
        headers: {
          [options.signatureHeaderKey]: `t=${timestamp} v1=${signature}`,
        },
      })
      .catch((err: AxiosError) => {
        let message = err.message;
        if (err?.response?.statusText) {
          message = err.response.statusText;
        }

        if (
          // @ts-ignore
          err?.response?.data?.error?.message
        ) {
          // @ts-ignore
          message = err.response.data.error.message;
        }

        throw new Error(
          `Webhook failed: status="${
            err?.response?.status || err.code
          }" message="${message}"`,
        );
      });
  }
}
