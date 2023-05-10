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
import { computeEventSignature } from '../helpers';
import { LoopbackSupertokensBindings } from '../keys';

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
    @inject(LoopbackSupertokensBindings.WEBHOOK_SIGNATURE_HEADER_KEY)
    private webhookSignatureHeaderKey: string,
    @inject(LoopbackSupertokensBindings.WEBHOOK_SIGNATURE_SECRET)
    private webhookSignatureSecret: string,
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

    const expectedSignature = verifyForRequest(this.request, {
      debug: this.debug,
      secret: this.webhookSignatureSecret,
      signatureHeaderKey: this.webhookSignatureHeaderKey,
    });

    return {
      [securityId]: expectedSignature,
    };
  }
}

function verifyForRequest(
  request: Request,
  options: {
    debug: boolean;
    signatureHeaderKey: string;
    secret: string;
  },
) {
  let givenSignature;
  try {
    givenSignature = parseSignatureHeader(
      request.headers[options.signatureHeaderKey],
    );
  } catch (err) {
    // Missing signature header altogether, can't authentify the message.
    throw new HttpErrors.Unauthorized(
      options.debug
        ? 'Webhook request malformed, missing signature header'
        : undefined,
    );
  }

  const timestamp = new Date().getTime();

  if (givenSignature.timestamp + 180 * 1000 < timestamp) {
    // Expired after N minutes, protects against replay attacks.
    throw new HttpErrors.Unauthorized(
      options.debug
        ? 'Webhook request malformed, expired signature header'
        : undefined,
    );
  }

  const expectedSignature = computeEventSignature(
    request.body,
    givenSignature.timestamp,
    options.secret,
  );

  if (expectedSignature !== givenSignature.value) {
    // Supplied signature string is different, timestamp does not match or
    // it has been signed with a different key.
    throw new HttpErrors.Unauthorized(
      options.debug
        ? 'Webhook request malformed, signature mismatch'
        : undefined,
    );
  }

  return expectedSignature;
}

function parseSignatureHeader(rawHeaderString) {
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
