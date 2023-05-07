import axios from 'axios';
import crypto from 'crypto';
import type {
  User,
  UserSignInEvent,
  UserSignUpEvent,
  WebhookEvent,
} from '../types';
import { WEBHOOK_EVENT_TYPE } from '../types';

export function dispatchWebhookEvent(
  event: UserSignInEvent | UserSignUpEvent,
  options: {
    endpoint: string;
    secret: string;
  },
) {
  const timestamp = new Date().getTime();
  const signature = createEventSignature(event, timestamp, options.secret);

  const sanitiziedEndpoint = sanitizeWebhookEndpoint(options.endpoint);
  return axios.post(sanitiziedEndpoint, event, {
    headers: {
      'Webhook-Signature': `t=${timestamp} v1=${signature}`,
    },
  });
}

export function verifyWebhookEventSignature(signature: string, secret: string) {
  // @TODO implement verify signature and timestamp
  return false;
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

function sanitizeWebhookEndpoint(endpoint: string) {
  try {
    const parsedUrl = new URL(endpoint);

    return parsedUrl.toString();
  } catch (err) {
    throw new Error(`Invalid endpoint, expected valid URL, got "${endpoint}"`);
  }
}

function createEventSignature(
  event: WebhookEvent<unknown>,
  timestamp: number,
  secret: string,
) {
  return crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${JSON.stringify(event)}`)
    .digest('base64');
}
