import { AuthenticationComponent } from '@loopback/authentication';
import {
  AuthorizationBindings,
  AuthorizationComponent,
  AuthorizationDecision,
} from '@loopback/authorization';
import { BootMixin } from '@loopback/boot';
import { ApplicationConfig } from '@loopback/core';
import { RepositoryMixin } from '@loopback/repository';
import { RestApplication } from '@loopback/rest';
import { ServiceMixin } from '@loopback/service-proxy';
import { SupertokensComponent } from '../../../loopback-supertokens.component';

export class TestApplication extends BootMixin(
  ServiceMixin(RepositoryMixin(RestApplication)),
) {
  constructor(options: ApplicationConfig = {}) {
    super(options);

    // Mount authentication system
    this.component(AuthenticationComponent);
    this.configure(AuthorizationBindings.COMPONENT).to({
      defaultDecision: AuthorizationDecision.DENY,
      precedence: AuthorizationDecision.ALLOW,
    });
    this.component(AuthorizationComponent);
    this.component(SupertokensComponent);

    this.projectRoot = __dirname;
    // Customize @loopback/boot Booter Conventions here
    this.bootOptions = {
      controllers: {
        dirs: ['controllers'],
        extensions: ['.controller.ts', '.controller.js'],
        nested: true,
      },
    };
  }
}
