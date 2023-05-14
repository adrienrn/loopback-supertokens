import { BindingKey } from '@loopback/core';

export const DEFAULT_WEBHOOK_EVENT_EXPIRY = 180;
export const DEFAULT_WEBHOOK_SIGNATURE_SECRET = 'flying.microtonal.banana';
export const DEFAULT_WEBHOOK_SIGNATURE_HEADER_KEY = 'webhook-signature';

export namespace LoopbackSupertokensBindings {
  export const AUTHORIZATION_RBAC_AUTHORIZER =
    'loopback-supertokens.authorization.rbac-authorizer';

  export const WEBHOOK_EVENT_EXPIRY = BindingKey.create<number>(
    'loopback-supertokens.webhook.event-expiry',
  );

  export const WEBHOOK_SIGNATURE_INTERCEPTOR =
    'loopback-supertokens.webhook.signature-interceptor';

  export const WEBHOOK_SIGNATURE_HEADER_KEY = BindingKey.create<string>(
    'loopback-supertokens.webhook.signature-header-key',
  );

  export const WEBHOOK_SIGNATURE_SECRET = BindingKey.create<string>(
    'loopback-supertokens.webhook.signature-secret',
  );

  export const WEBHOOK_HELPER_SERVICE =
    'loopback-supertokens.webhook.helper_service';
}
