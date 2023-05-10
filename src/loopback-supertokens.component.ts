import { registerAuthenticationStrategy } from '@loopback/authentication';
import { AuthorizationTags } from '@loopback/authorization';
import { Binding, Component, CoreBindings, inject } from '@loopback/core';
import { RestApplication } from '@loopback/rest';
import { middleware } from 'supertokens-node/framework/loopback';
import { SuperTokensInternalAuthenticationStrategy } from './authentication-strategies/supertokens-internal.strategy';
import { SuperTokensAuthenticationStrategy } from './authentication-strategies/supertokens.strategy';
import { SuperTokensRBACAuthorizeProvider } from './providers/supertokens-rbac-authorize.provider';
import { WebhookSignatureInterceptorProvider } from './providers/webhook-signature-interceptor.provider';
import { LoopbackSupertokensBindings } from './keys';

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
      'webhook-signature',
    ),
    // Encryption key used to sign webhook requests:
    Binding.bind(LoopbackSupertokensBindings.WEBHOOK_SIGNATURE_SECRET).to(
      'flying.microtonal.banana',
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
      SuperTokensInternalAuthenticationStrategy,
    );
  }
}
