import axios, { AxiosError } from 'axios';
import type { User, UserSignInEvent, UserSignUpEvent } from '../types';
import { WEBHOOK_EVENT_TYPE } from '../types';
import { computeEventSignature } from '../utils/computeEventSignature';
import { sanitizeWebhookEndpoint } from '../utils/sanitizeWebhookEndpoint';

export function dispatchWebhookEvent(
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
      let message = err.response.statusText;
      if (
        err.response.data &&
        // @ts-ignore
        err.response.data.error &&
        // @ts-ignore
        err.response.data.error.message
      ) {
        // @ts-ignore
        message = err.response.data.error.message;
      }

      throw new Error(
        `Webhook failed: status="${err.response.status}" message="${message}"`,
      );
    });
}

export function createUserSignInEvent(data: { user: User }): UserSignInEvent {
  return {
    data: {
      user: {
        id: data.user.id,
      },
    },
    type: WEBHOOK_EVENT_TYPE.USER__SIGN_IN,
  };
}

export function createUserSignUpEvent(data: { user: User }): UserSignUpEvent {
  return {
    data: {
      user: {
        id: data.user.id,
      },
    },
    type: WEBHOOK_EVENT_TYPE.USER__SIGN_UP,
  };
}
