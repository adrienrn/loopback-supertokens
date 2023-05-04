# loopback-supertokens

LoopBack extension for [SuperTokens](https://supertokens.com/).

# Setup

**This assumes SuperTokens is already set up with your application. If that's not the case, you will need to install `supertokens-node` and properly initialize it with your application. Head to [SuperTokens > Docs > EmailPassword recipe > Backend](https://supertokens.com/docs/emailpassword/pre-built-ui/setup/backend) for detailed instructions.**

Install the dependency:

```
pnpm add loopback-supertokens @loopback/authentication @loopback/authorization
```

Open `src/application.ts` and mount `SupertokensComponent` after the `AuthenticationComponent` and `AuthorizationComponent`:

```ts
// ...
import { SupertokensComponent } from 'loopback-supertokens';

export class TestApplication extends BootMixin(
  ServiceMixin(RepositoryMixin(RestApplication)),
) {
  constructor(options: ApplicationConfig = {}) {
    super(options);

    // Mount authentication, authorization and supertokens in that order:
    this.component(AuthenticationComponent);
    this.component(AuthorizationComponent);
    this.component(SupertokensComponent);
  }

  // ...
}
```

That's pretty much it. Start using `@authenticate` and `@authorize` in your controller files as described in Usage below.

# Usage

## Authentication

Use `@authenticate('supertokens')` to annotate/decorate controllers or controller endpoints as you would normally do with any other LoopBack authentication strategy.

```ts
import { authenticate } from '@loopback/authentication';

// ...

// Use @authenticate('supertokens') here if all methods should be protected.
export class TeamController {
  @authenticate('supertokens')
  @get('/teams/{id}' /* ... */)
  async find(
    @param.path.number('id') id: number,
    @param.query.object('filter') filter?: Filter<Team>,
  ): Promise<Team> {
    return this.repository.findById(id, filter);
  }

  // ...
}
```

See [LoopBack authentication component](https://loopback.io/doc/en/lb4/Loopback-component-authentication.html) for more details.

## Authorization

Use `@authorize()` to define allowed roles per controller or per controller method.

In that example, we are declaring that only users with role 'admin' or 'manager' can list all teams:

```ts
import { authenticate } from '@loopback/authentication';
import { authorize } from '@loopback/authorization';

// ...

export class TeamController {
  @authenticate('supertokens')
  @authorize({
    allowedRoles: ['admin', 'manager'],
  })
  @get('/teams' /* ... */)
  async find(
    @param.query.object('filter') filter?: Filter<Team>,
  ): Promise<Team[]> {
    return this.teamRepository.find(filter);
  }

  // ...
}
```

Refer to [Loopback authorization component](https://loopback.io/doc/en/lb4/Authorization-overview.html) for more details.

# Using with `@loopback/rest-crud`

LoopBack offers a way to generate controllers automatically which does not allow to annotate methods or controllers. This isn't only an issue with this extension but with any app that wants to use the `@authenticate` decorator with `@loopback/rest-crud`.

As a work-around, one can bypass the auto-wiring provided by `@loopback/rest-crud` and manually set up the container, manually calling the `defineCrudRestController` function to register/configure the controller.

Instead of creating a file inside the `src/model-endpoints` directory, create a file inside `src/controllers` with the following content:

```ts
import { authenticate } from '@loopback/authentication';
import { Filter, repository } from '@loopback/repository';
import { HttpErrors } from '@loopback/rest';
import { defineCrudRestController } from '@loopback/rest-crud';
import { Team } from '../models';
import { TeamRepository } from '../repositories';

const CrudRestController = defineCrudRestController<
  Team,
  typeof Team.prototype.id,
  'id'
>(Team, { basePath: '/teams' });

@authenticate('supertokens')
export class TeamController extends CrudRestController {
  constructor(
    @repository(TeamRepository) protected entityRepository: TeamRepository,
  ) {
    super(entityRepository);
  }
}
```

See also:

- https://github.com/loopbackio/loopback-next/discussions/8905
- https://github.com/loopbackio/loopback-next/tree/0ece5e7f0113dcc070ba44210c472257f8bd0e93/packages/rest-crud#creating-a-crud-controller

# Why SuperTokens?

LoopBack authentication examples and extensions can be limitating and require to roll your own implementation in many places to have a fully-fledge production-ready authentication. Security is hard and rolling your own implementation is hardly a good idea.

SuperTokens provides a all-in-one open-source authentication solution including various auth. methods (email/password, social logins, passwordless, etc), session/token management, multi-factor authentication and user roles (role-based access control, i.e. _RBAC_) and both an admin user management dashboard and a front-end SDK.

# What are alternatives?

- [@loopback/authentication-jwt](https://www.npmjs.com/package/@loopback/authentication-jwt)
- [@loopback/authentication-passport](https://www.npmjs.com/package/@loopback/authentication-passport)
- [github.com/loopbackio/loopback-next > examples > passport-login](https://github.com/loopbackio/loopback-next/tree/master/examples/passport-login)
