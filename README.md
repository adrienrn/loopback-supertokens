# loopback-supertokens

LoopBack extension for [SuperTokens](https://supertokens.com/).

# Setup

**This assumes SuperTokens is already set up with your application. If that's not the case, you will need to install `supertokens-node` and properly initialize it with your application. Head to [SuperTokens > Docs > EmailPassword recipe > Backend](https://supertokens.com/docs/emailpassword/pre-built-ui/setup/backend) for detailed instructions.**

Install the dependency:

```
pnpm add \
    loopback-supertokens \
    @loopback/authentication \
    @loopback/authorization
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

That's pretty much it.

# Usage

## Authentication

Use `@authenticate('supertokens')` to annotate/decorate controllers or controller endpoints as you would normally do with any other LoopBack authentication strategy.

```ts
import { authenticate } from '@loopback/authentication';

// ...

// Use @authenticate('supertokens') here if all methods should be protected.
export class PlaylistController {
  @authenticate('supertokens')
  @get('/playlists/{id}' /* ... */)
  async find(
    @param.path.number('id') id: number,
    @param.query.object('filter') filter?: Filter<Team>,
  ): Promise<Playlist> {
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

## Work-around: using with `@loopback/rest-crud`

LoopBack offers a way to generate controllers automatically which does not allow to annotate methods or controllers.

As a work-around, one can bypass the auto-wiring provided by `@loopback/rest-crud` and manually set up the container, manually calling the `defineCrudRestController` function to register/configure the controller. Instead of creating a file inside the `src/model-endpoints` directory, create a file inside `src/controllers` with the following content:

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

This isn't only an issue with this extension but with any app that wants to use the `@authenticate` decorator with `@loopback/rest-crud`.

See also:

- https://github.com/loopbackio/loopback-next/discussions/8905
- https://github.com/loopbackio/loopback-next/tree/0ece5e7f0113dcc070ba44210c472257f8bd0e93/packages/rest-crud#creating-a-crud-controller

## Communication with Loopback

Let's say your app is about users creating cool playlists.

Regardless if you use the managed service or self-hosted deployment, SuperTokens is an independant authentication service, separate from your app handling user sign-up, sign-in, sign-out, and other authentication-related tasks and storing users data in a separate database. It is quite a sensible pattern for services to be split up into smaller, more manageable, isolated/independant components.

Yet, it would be nice to be able to express the relationship between a `Playlist` entity and its owner, i.e. a `User` entity, leverage Loopback features to their fullest (inclusion resolvers and repositories) and ensure foreign key constraints in the database. This is a fairly typical use case where one service needs to tap into the logic (subscribe) of another service and replicate parts of its data.

```ts
import { Entity, model, property } from '@loopback/repository';

@model()
export class User extends Entity {
  @property({
    id: true,
    type: 'string',
  })
  id: string;

  constructor(data?: Partial<User>) {
    super(data);
  }
}

@model({
  settings: {
    foreignKeys: {
      fk_Playlist_User: {
        name: 'fk_Playlist_User',
        entity: 'User',
        entityKey: 'id',
        foreignKey: 'userid',
      },
    },
  },
})
export class Playlist extends Entity {
  @property({
    generated: true,
    id: true,
    type: 'number',
  })
  id: number;

  @property({
    required: true,
    type: 'string',
  })
  name: string;

  @belongsTo(() => User, undefined, {
    required: true,
  })
  userId: string;

  constructor(data?: Partial<Playlist>) {
    super(data);
  }
}
```

`loopback-supertokens` promotes a webhook pattern that integrates with SuperTokens' _post_ callbacks such as `signUpPost` and `signInPost` and lets us handle the request the Loopback way. [Read more on "Why a webhook pattern?"](#why-webhooks) below.

1. With SuperTokens `signUpPost` callback and `SupertokensWebhookHelper` class provided by `loopback-supertokens`, we dispatch an event to a webhook endpoint;
1. Our webhook endpoint receives said event and use `SupertokensWebhookHelper` to verify the authenticity of the request/event;
1. We persist the user to our database;

### Dispatch the webhook

**Most of the following code is from [SuperTokens "Post sign up callbacks" documentation](https://supertokens.com/docs/emailpassword/common-customizations/handling-signup-success#2-on-the-backend).**

```ts
import { SupertokensWebhookHelper } from 'loopback-supertokens';
// ...

// Use `.env` to declare these:
const WEBHOOK_SIGNATURE_SECRET = 'flying microtonal banana';
const WEBHOOK_SIGNATURE_HEADER_KEY = 'webhook-signature';
const WEBHOOK_ENDPOINT_URL = 'http://localhost:9000/authentication/webhook';

const webhookHelper = new SupertokensWebhookHelper(
  WEBHOOK_SIGNATURE_SECRET,
  WEBHOOK_SIGNATURE_HEADER_KEY,
);

supertokens.init({
  // ...
  recipeList: [
    EmailPassword.init({
      override: {
        apis: (apiImplementation) => {
          return {
            ...apiImplementation,
            signUpPOST: async (input) => {
              if (!apiImplementation.signUpPOST) {
                throw new Error('Should never happen');
              }

              // First we call the original implementation of signUpPOST.
              const response = await apiImplementation.signUpPOST(input);

              if (response.status === 'OK') {
                // Create an event to dispatch based on the response:
                const userSignUpEvent = webhookHelper
                  .getEventFactory()
                  .createUserSignUpEvent(response);

                // Dispatch the event:
                webhookHelper
                  .dispatchWebhookEvent(userSignUpEvent, {
                    WEBHOOK_ENDPOINT_URL,
                  })
                  .catch((err: Error) => {
                    console.error(err);
                  });
              }

              return response;
            },
          };
        },
      },
    }),
    // ...
  ],
  // ...
});
```

### Write the webhook endpoint

The key bit here is to write a controller that matches the endpoint hit by the callback. You can use `lb4 controller` for this.

Another important aspect is to use `@authenticate('supertokens-internal-webhook')` to protect the endpoint, enforce signature verification and replay attack protection. This is provided by `loopback-supertokens`. Read [more about webhook signature](#more-about-webhook-signature) below.

```ts
import { authenticate } from '@loopback/authentication';
import { repository } from '@loopback/repository';
import { post, requestBody } from '@loopback/rest';
import { WEBHOOK_EVENT_TYPE, WebhookEvent } from 'loopback-supertokens';
import { UserRepository } from '../../repositories';

export class WebhookController {
  constructor(
    @repository(UserRepository)
    protected userRepository: UserRepository,
  ) {}

  @authenticate('supertokens-internal-webhook')
  @post('/authentication/webhook')
  async execute(
    @requestBody()
    event: WebhookEvent,
  ): Promise<void> {
    switch (event.type) {
      case WEBHOOK_EVENT_TYPE.USER__SIGN_UP:
        // Create the user out of the event data/payload:
        this.userRepository.create(event.data.user);

        return;
    }
  }
}
```

### Why webhooks?

-

### More about webhook signature

-

# Why SuperTokens?

LoopBack authentication examples and extensions can be limitating and require to roll your own implementation in many places to have a fully-fledge production-ready authentication. Security is hard and rolling your own implementation is hardly a good idea.

SuperTokens provides a all-in-one open-source authentication solution including:

- **Various auth. methods:** email/password, social logins, passwordless, etc;
- **Complementary features:** session/token management, multi-factor authentication, user roles (role-based access control, i.e. _RBAC_), reset password flow, email verification, etc;
- **Tools:** such as user management dashboard and front-end SDK;

# What are alternatives?

- [@loopback/authentication-jwt](https://www.npmjs.com/package/@loopback/authentication-jwt)
- [@loopback/authentication-passport](https://www.npmjs.com/package/@loopback/authentication-passport)
- [github.com/loopbackio/loopback-next > examples > passport-login](https://github.com/loopbackio/loopback-next/tree/master/examples/passport-login)
