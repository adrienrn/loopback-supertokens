import {
  Interceptor,
  InvocationContext,
  Next,
  Provider,
  inject,
} from '@loopback/core';
import { HttpErrors, RestBindings } from '@loopback/rest';
import { LoopbackSupertokensBindings } from '../keys';
import { SupertokensWebhookHelper } from '../helpers/supertokens-webhook.helper';

export class WebhookSignatureInterceptorProvider
  implements Provider<Interceptor>
{
  static SIGNATURE_VERIFICATION_FAILED_OBSCURED_MESSAGE =
    'Webhook request malformed, missing or invalid signature';

  constructor(
    @inject(LoopbackSupertokensBindings.WEBHOOK_HELPER_SERVICE)
    private webhookHelper: SupertokensWebhookHelper /* TODO interface */,
    @inject(LoopbackSupertokensBindings.WEBHOOK_SIGNATURE_HEADER_KEY)
    private webhookSignatureHeaderKey: string,
    private debug = false,
  ) {}

  value() {
    return this.intercept.bind(this);
  }

  async intercept(invocationCtx: InvocationContext, next: Next) {
    const request = await invocationCtx.get(RestBindings.Http.REQUEST);

    const signatureHeader = request.headers[this.webhookSignatureHeaderKey];
    try {
      this.webhookHelper.verifyEventSignature(
        request.body,
        Array.isArray(signatureHeader)
          ? signatureHeader.shift()
          : signatureHeader,
      );
    } catch (err) {
      throw new HttpErrors.Unauthorized(this.debug ? err.message : null);
    }

    return next();
  }
}
