import axios, { AxiosError } from 'axios';
import crypto from 'crypto';
import type {
  User,
  UserSignInEvent,
  UserSignUpEvent,
  WebhookEvent,
} from '../types';
import { WEBHOOK_EVENT_TYPE } from '../types';
import { sanitizeWebhookEndpoint } from '../utils/sanitizeWebhookEndpoint';
import { inject } from '@loopback/core';
import { LoopbackSupertokensBindings } from '../keys';

export class SupertokensWebhookHelper {
  constructor(
    @inject(LoopbackSupertokensBindings.WEBHOOK_SIGNATURE_SECRET)
    private webhookSignatureSecret: string,
    @inject(LoopbackSupertokensBindings.WEBHOOK_SIGNATURE_HEADER_KEY)
    private webhookSignatureHeaderKey: string,
  ) {}

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

  async dispatchWebhookEvent(
    event: UserSignInEvent | UserSignUpEvent,
    options: {
      endpoint: string;
    },
  ) {
    const timestamp = new Date().getTime();
    const signature = this.computeEventSignature(
      event,
      timestamp,
      this.webhookSignatureSecret,
    );

    const sanitiziedEndpoint = sanitizeWebhookEndpoint(options.endpoint);
    return axios
      .post(sanitiziedEndpoint, event, {
        headers: {
          [this.webhookSignatureHeaderKey]: `t=${timestamp} v1=${signature}`,
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

  computeEventSignature(
    event: WebhookEvent<unknown>,
    timestamp: number,
    secret: string,
  ) {
    return crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${JSON.stringify(event)}`)
      .digest('base64');
  }

  verifyEventSignature(event: WebhookEvent<unknown>, signatureHeader: string) {
    let givenSignature;
    try {
      givenSignature = this.parseSignatureHeader(signatureHeader);
    } catch (err) {
      // Invalid/missing signature header, can't authentify the message.
      throw new Error(
        'Webhook request malformed, missing or invalid signature header',
      );
    }

    const timestamp = new Date().getTime();

    if (givenSignature.timestamp + 180 * 1000 < timestamp) {
      // Expired after N minutes, protects against replay attacks.
      throw new Error('Webhook request malformed, expired signature header');
    }

    const expectedSignature = this.computeEventSignature(
      event,
      givenSignature.timestamp,
      this.webhookSignatureSecret,
    );

    if (expectedSignature !== givenSignature.value) {
      // Supplied signature string is different, timestamp does not match or
      // it has been signed with a different key.
      throw new Error('Webhook request malformed, signature mismatch');
    }

    return expectedSignature;
  }

  parseSignatureHeader(rawHeaderString) {
    if (!rawHeaderString) {
      throw new Error('No signature header string to parse');
    }

    const tokens: Record<string, string> = rawHeaderString
      .split(/[\s\n\r]+/)
      .reduce((accumulator, currentToken) => {
        const [tokenKey, tokenValue] = currentToken.split(/=(.*)/, 2);
        accumulator[tokenKey] = tokenValue;
        return accumulator;
      }, {});

    const timestampTokenValue = tokens['t'];
    const signatureTokenValue = tokens['v1'];

    if (!timestampTokenValue || !signatureTokenValue) {
      throw new Error('Malformed signature header');
    }

    return {
      value: tokens['v1'],
      timestamp: parseInt(tokens['t']),
    };
  }
}
