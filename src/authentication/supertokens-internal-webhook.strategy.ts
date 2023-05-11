import { AuthenticationStrategy } from '@loopback/authentication';
import { inject } from '@loopback/core';
import {
  HttpErrors,
  OperationObject,
  RedirectRoute,
  Request,
  RequestBodyParser,
  RestBindings,
} from '@loopback/rest';
import { UserProfile, securityId } from '@loopback/security';
import { LoopbackSupertokensBindings } from '../keys';
import { SupertokensWebhookHelper } from '../helpers/supertokens-webhook.helper';

export class SupertokensInternalWebhookAuthenticationStrategy
  implements AuthenticationStrategy
{
  name = 'supertokens-internal-webhook';

  static SIGNATURE_VERIFICATION_FAILED_OBSCURED_MESSAGE =
    'Webhook request malformed, missing or invalid signature';

  constructor(
    @inject(RestBindings.OPERATION_SPEC_CURRENT)
    private operationSpec: OperationObject,
    @inject(RestBindings.REQUEST_BODY_PARSER)
    private requestBodyParser: RequestBodyParser,
    @inject(RestBindings.Http.REQUEST) private request: Request,
    @inject(LoopbackSupertokensBindings.WEBHOOK_HELPER_SERVICE)
    private webhookHelper: SupertokensWebhookHelper /* TODO interface */,
    @inject(LoopbackSupertokensBindings.WEBHOOK_SIGNATURE_HEADER_KEY)
    private webhookSignatureHeaderKey: string,
    private debug = true,
  ) {}

  async authenticate(): Promise<UserProfile | RedirectRoute | undefined> {
    // The 'authenticate' middleware executes before any of the request work is done,
    // to access the body (which is unusual for an authentication strategy), we have
    // to manually call the parsing of the body _early_.
    await this.requestBodyParser.loadRequestBodyIfNeeded(
      this.operationSpec,
      this.request,
    );

    const signatureHeader =
      this.request.headers[this.webhookSignatureHeaderKey];

    let expectedSignature;
    try {
      expectedSignature = this.webhookHelper.verifyEventSignature(
        this.request.body,
        Array.isArray(signatureHeader)
          ? signatureHeader.shift()
          : signatureHeader,
      );
    } catch (err) {
      throw new HttpErrors.Unauthorized(this.debug ? err.message : null);
    }

    return {
      [securityId]: expectedSignature,
    };
  }
}
