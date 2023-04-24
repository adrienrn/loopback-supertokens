import { registerAuthenticationStrategy } from '@loopback/authentication';
import { AuthorizationTags } from '@loopback/authorization';
import { Binding, Component, CoreBindings, inject } from '@loopback/core';
import { Entity } from '@loopback/repository';
import { RestApplication } from '@loopback/rest';
import { middleware } from 'supertokens-node/framework/loopback';
import { SuperTokensInternalAuthenticationStrategy } from './authentication-strategies/supertokens-internal.strategy';
import { SuperTokensAuthenticationStrategy } from './authentication-strategies/supertokens.strategy';
import { SuperTokensRBACAuthorizeProvider } from './providers/supertokens-rbac-authorize.provider';

export class SupertokensComponent<U extends Entity, C extends Entity>
  implements Component
{
  bindings = [
    Binding.bind('loopback-supertokens.rbac-authorizer-provider')
      .toProvider(SuperTokensRBACAuthorizeProvider)
      .tag(AuthorizationTags.AUTHORIZER),
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