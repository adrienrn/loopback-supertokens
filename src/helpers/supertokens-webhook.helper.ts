import { inject } from '@loopback/core';
import axios, { AxiosError, AxiosResponse } from 'axios';
import crypto from 'crypto';
import { LoopbackSupertokensBindings } from '../keys';
import type {
  UserSignInEvent,
  UserSignUpEvent,
  WebhookEvent,
  WebhookEventUserInterface,
} from '../types';
import { WEBHOOK_EVENT_TYPE } from '../types';
import { sanitizeWebhookEndpoint } from '../utils/sanitizeWebhookEndpoint';

export class SupertokensWebhookHelper {
  constructor(
    @inject(LoopbackSupertokensBindings.WEBHOOK_SIGNATURE_SECRET)
    private webhookSignatureSecret: string,
    @inject(LoopbackSupertokensBindings.WEBHOOK_SIGNATURE_HEADER_KEY)
    private webhookSignatureHeaderKey: string,
    @inject(LoopbackSupertokensBindings.WEBHOOK_EVENT_EXPIRY)
    private eventExpiryInSeconds: number = 180,
  ) {}

  async dispatchWebhookEvent(
    event: WebhookEvent,
    options: {
      endpoint: string;
    },
  ) {
    const timestamp = new Date().getTime();
    const signature = this.computeEventSignature(event, timestamp);

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

  computeEventSignature(event: WebhookEvent, timestamp: number) {
    return crypto
      .createHmac('sha256', this.webhookSignatureSecret)
      .update(`${timestamp}.${JSON.stringify(event)}`)
      .digest('base64');
  }

  verifyEventSignature(event: WebhookEvent, signatureHeader: string) {
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

    if (
      timestamp - givenSignature.timestamp >
      this.eventExpiryInSeconds * 1000
    ) {
      // Expired after N minutes, protects against replay attacks.
      throw new Error('Webhook request malformed, expired signature header');
    }

    const expectedSignature = this.computeEventSignature(
      event,
      givenSignature.timestamp,
    );

    if (expectedSignature !== givenSignature.value) {
      // Supplied signature string is different, timestamp does not match or
      // it has been signed with a different key.
      throw new Error('Webhook request malformed, signature mismatch');
    }

    return expectedSignature;
  }

  getEventFactory() {
    return new WebhookEventFactory();
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

export class WebhookEventFactory {
  createUserSignInEvent(data: {
    user: WebhookEventUserInterface;
  }): UserSignInEvent {
    return {
      data: {
        user: {
          id: data.user.id,
        },
      },
      type: WEBHOOK_EVENT_TYPE.USER__SIGN_IN,
    };
  }

  createUserSignUpEvent(data: {
    user: WebhookEventUserInterface;
  }): UserSignUpEvent {
    return {
      data: {
        user: {
          id: data.user.id,
        },
      },
      type: WEBHOOK_EVENT_TYPE.USER__SIGN_UP,
    };
  }
}
