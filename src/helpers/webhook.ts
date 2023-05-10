import axios from 'axios';
import crypto from 'crypto';
import type {
  User,
  UserSignInEvent,
  UserSignUpEvent,
  WebhookEvent,
} from '../types';
import { WEBHOOK_EVENT_TYPE } from '../types';

const WEBHOOK_SIGNATURE_HEADER_KEY = 'webhook-signature';

export function dispatchWebhookEvent(
  event: UserSignInEvent | UserSignUpEvent,
  options: {
    endpoint: string;
    secret: string;
  },
) {
  const timestamp = new Date().getTime();
  const signature = computeEventSignature(event, timestamp, options.secret);

  const sanitiziedEndpoint = sanitizeWebhookEndpoint(options.endpoint);
  return axios
    .post(sanitiziedEndpoint, event, {
      headers: {
        [WEBHOOK_SIGNATURE_HEADER_KEY]: `t=${timestamp} v1=${signature}`,
      },
    })
    .catch((err) => {
      let message = err.message;
      if (
        err.response.data &&
        err.response.data.error &&
        err.response.data.error.message
      ) {
        message = err.response.data.error.message;
      }

      throw new Error(
        `Webhook failed: status="${err.code}" message="${message}"`,
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

export function computeEventSignature(
  event: WebhookEvent<unknown>,
  timestamp: number,
  secret: string,
) {
  return crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${JSON.stringify(event)}`)
    .digest('base64');
}

export function sanitizeWebhookEndpoint(endpoint: string) {
  try {
    const parsedUrl = new URL(endpoint);

    return parsedUrl.toString();
  } catch (err) {
    throw new Error(
      `Invalid webhook endpoint, expected valid URL, got "${endpoint}"`,
    );
  }
}
