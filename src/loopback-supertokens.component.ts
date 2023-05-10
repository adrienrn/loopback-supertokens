import { registerAuthenticationStrategy } from '@loopback/authentication';
import { AuthorizationTags } from '@loopback/authorization';
import { Binding, Component, CoreBindings, inject } from '@loopback/core';
import { RestApplication } from '@loopback/rest';
import { middleware } from 'supertokens-node/framework/loopback';
import { SuperTokensInternalAuthenticationStrategy } from './authentication-strategies/supertokens-internal.strategy';
import { SuperTokensAuthenticationStrategy } from './authentication-strategies/supertokens.strategy';
import { SuperTokensRBACAuthorizeProvider } from './providers/supertokens-rbac-authorize.provider';
import { WebhookSignatureInterceptorProvider } from './providers/webhook-signature-interceptor.provider';

export class SupertokensComponent implements Component {
  bindings: Binding[] = [
    Binding.bind('loopback-supertokens.rbac-authorizer-provider')
      .toProvider(SuperTokensRBACAuthorizeProvider)
      .tag(AuthorizationTags.AUTHORIZER),
    Binding.bind(
      'loopback-supertokens.webhook-signature-interceptor',
    ).toProvider(WebhookSignatureInterceptorProvider),
    Binding.bind('loopback-supertokens.webhook-signature-secret').to('banana'),
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
