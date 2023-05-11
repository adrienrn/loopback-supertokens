import {
  Interceptor,
  InvocationContext,
  Next,
  Provider,
  inject,
} from '@loopback/core';
import { HttpErrors, RestBindings } from '@loopback/rest';
import { LoopbackSupertokensBindings } from '../keys';
import { verifyForRequest } from '../utils/verifyWebhookSignatureForRequest';

export class WebhookSignatureInterceptorProvider
  implements Provider<Interceptor>
{
  static SIGNATURE_VERIFICATION_FAILED_OBSCURED_MESSAGE =
    'Webhook request malformed, missing or invalid signature';

  constructor(
    @inject(LoopbackSupertokensBindings.WEBHOOK_SIGNATURE_HEADER_KEY)
    private webhookSignatureHeaderKey: string,
    @inject(LoopbackSupertokensBindings.WEBHOOK_SIGNATURE_SECRET)
    private webhookSignatureSecret: string,
    private debug = true,
  ) {}

  value() {
    return this.intercept.bind(this);
  }

  async intercept(invocationCtx: InvocationContext, next: Next) {
    const request = await invocationCtx.get(RestBindings.Http.REQUEST);

    const signatureHeader = request.headers[this.webhookSignatureHeaderKey];
    try {
      verifyForRequest(
        request.body,
        Array.isArray(signatureHeader)
          ? signatureHeader.shift()
          : signatureHeader,
        {
          secret: this.webhookSignatureSecret,
          signatureHeaderKey: this.webhookSignatureHeaderKey,
        },
      );
    } catch (err) {
      throw new HttpErrors.Unauthorized(this.debug ? err.message : null);
    }

    return next();
  }
}
