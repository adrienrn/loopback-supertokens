import { registerAuthenticationStrategy } from '@loopback/authentication';
import { AuthorizationTags } from '@loopback/authorization';
import { Binding, Component, CoreBindings, inject } from '@loopback/core';
import { RestApplication } from '@loopback/rest';
import { middleware } from 'supertokens-node/framework/loopback';
import { SupertokensInternalWebhookAuthenticationStrategy } from './authentication/supertokens-internal-webhook.strategy';
import { SuperTokensAuthenticationStrategy } from './authentication/supertokens.strategy';
import {
  DEFAULT_WEBHOOK_EVENT_EXPIRY,
  DEFAULT_WEBHOOK_SIGNATURE_HEADER_KEY,
  DEFAULT_WEBHOOK_SIGNATURE_SECRET,
  LoopbackSupertokensBindings,
} from './keys';
import { SuperTokensRBACAuthorizeProvider } from './authorization/supertokens-rbac-authorize.provider';
import { WebhookSignatureInterceptorProvider } from './authentication/webhook-signature-interceptor.provider';
import { SupertokensWebhookHelper } from './helpers/supertokens-webhook.helper';

export class SupertokensComponent implements Component {
  bindings: Binding[] = [
    // Global register role-based access control authorizer:
    Binding.bind(LoopbackSupertokensBindings.AUTHORIZATION_RBAC_AUTHORIZER)
      .toProvider(SuperTokensRBACAuthorizeProvider)
      .tag(AuthorizationTags.AUTHORIZER),
    // Interceptor for webhook endpoint to verify the request signature:
    Binding.bind(
      LoopbackSupertokensBindings.WEBHOOK_SIGNATURE_INTERCEPTOR,
    ).toProvider(WebhookSignatureInterceptorProvider),
    // Header that is expected to be set on webhook requests:
    Binding.bind(LoopbackSupertokensBindings.WEBHOOK_SIGNATURE_HEADER_KEY).to(
      DEFAULT_WEBHOOK_SIGNATURE_HEADER_KEY,
    ),
    // Encryption key used to sign webhook requests:
    Binding.bind(LoopbackSupertokensBindings.WEBHOOK_SIGNATURE_SECRET).to(
      DEFAULT_WEBHOOK_SIGNATURE_SECRET,
    ),
    // Default time in seconds an event is still valid (replay attacks protection):
    Binding.bind(LoopbackSupertokensBindings.WEBHOOK_EVENT_EXPIRY).to(
      DEFAULT_WEBHOOK_EVENT_EXPIRY,
    ),
    // Helper for SuperTokens callbacks and webhooks:
    Binding.bind(LoopbackSupertokensBindings.WEBHOOK_HELPER_SERVICE).toClass(
      SupertokensWebhookHelper,
    ),
  ];

  constructor(@inject(CoreBindings.APPLICATION_INSTANCE) app: RestApplication) {
    // Set up the main middleware
    app.middleware(middleware);

    /**
     * Register the authentication stragegy to be used in controllers as:
     *
     * @example
     * ```ts
     *   @get('/items')
     *   @authenticate('supertokens')
     *   find(Filter<Item> filter) {
     *     return super.find(filter)
     *   }
     * ```
     *
     */
    registerAuthenticationStrategy(app, SuperTokensAuthenticationStrategy);
    registerAuthenticationStrategy(
      app,
      SupertokensInternalWebhookAuthenticationStrategy,
    );
  }
}
