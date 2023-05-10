import {
  Interceptor,
  InvocationContext,
  Next,
  Provider,
  inject,
} from '@loopback/core';
import { HttpErrors } from '@loopback/rest';
import { computeEventSignature } from '../helpers';

export class WebhookSignatureInterceptorProvider
  implements Provider<Interceptor>
{
  static SIGNATURE_VERIFICATION_FAILED_OBSCURED_MESSAGE =
    'Webhook request malformed, missing or invalid signature';

  constructor(
    @inject('loopback-supertokens.webhook-signature-header-key')
    private webhookSignatureHeaderKey: string,
    @inject('loopback-supertokens.webhook-signature-secret')
    private webhookSignatureSecret: string,
    private debug = false,
  ) {}

  value() {
    return this.intercept.bind(this);
  }

  async intercept(invocationCtx: InvocationContext, next: Next) {
    const request = (invocationCtx.target as any).request;

    let givenSignature;
    try {
      givenSignature = this.parseSignatureHeader(
        request.headers[this.webhookSignatureHeaderKey],
      );
    } catch (err) {
      // Missing signature header altogether, can't authentify the message.
      throw new HttpErrors.BadRequest(
        this.debug
          ? 'Webhook request malformed, missing signature header'
          : WebhookSignatureInterceptorProvider.SIGNATURE_VERIFICATION_FAILED_OBSCURED_MESSAGE,
      );
    }

    const timestamp = new Date().getTime();

    if (givenSignature.timestamp + 180 * 1000 < timestamp) {
      // Expired after N minutes, protects against replay attacks.
      throw new HttpErrors.BadRequest(
        this.debug
          ? 'Webhook request malformed, expired signature header'
          : WebhookSignatureInterceptorProvider.SIGNATURE_VERIFICATION_FAILED_OBSCURED_MESSAGE,
      );
    }

    const expectedSignature = computeEventSignature(
      request.body,
      givenSignature.timestamp,
      this.webhookSignatureSecret,
    );

    if (expectedSignature !== givenSignature.value) {
      // Supplied signature string is different, timestamp does not match or
      // it has been signed with a different key.
      throw new HttpErrors.BadRequest(
        this.debug
          ? 'Webhook request malformed, signature mismatch'
          : WebhookSignatureInterceptorProvider.SIGNATURE_VERIFICATION_FAILED_OBSCURED_MESSAGE,
      );
    }

    return next();
  }

  parseSignatureHeader(rawHeaderString) {
    if (!rawHeaderString) {
      throw new Error('No signature header string to parse');
    }

    const tokens: Record<string, string> = rawHeaderString
      .split(' ')
      .reduce((accumulator, currentToken) => {
        const [tokenKey, tokenValue] = currentToken.split(/=(.*)/, 2);
        accumulator[tokenKey] = tokenValue;
        return accumulator;
      }, {});

    return {
      value: tokens['v1'],
      timestamp: parseInt(tokens['t']),
    };
  }
}
