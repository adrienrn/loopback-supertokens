import {
  Client,
  createRestAppClient,
  expect,
  givenHttpServerConfig,
  sinon,
} from '@loopback/testlab';
import { Error as SuperTokensError } from 'supertokens-node';
import Session from 'supertokens-node/recipe/session';
import { TestApplication } from '../fixtures/test-app/application';
import { configureSupertokens } from '../fixtures/test-app/supertokens.config';

describe('@authenticate("supertokens")', () => {
  let app: TestApplication;
  let client: Client;
  let getSessionStub;

  before(async () => {
    configureSupertokens();
    app = new TestApplication({
      rest: givenHttpServerConfig(),
    });

    await app.boot();
    await app.start();
  });

  before(() => {
    client = createRestAppClient(app);
  });

  after(async () => {
    await app.stop();
  });

  afterEach(() => {
    getSessionStub.restore();
  });

  it('can call protected endpoint', async () => {
    getSessionStub = sinon.stub(Session, 'getSession').returns(
      Promise.resolve({
        getUserId: () => 'f48b7167-8d95-451c-bbfc-8a12cd49e763',
        getAccessTokenPayload: () => ({
          'st-role': {
            t: 1681996316335,
            v: ['admin'],
          },
        }),
        getHandle: () => '3733a3f3-566f-40af-aa6c-febd29481279',
      } as unknown as any),
    );

    const res = await client.get('/authentication/users/me').expect(200);
    sinon.assert.calledOnce(getSessionStub);
    expect(res.body).to.deepEqual({
      userDataInAccessToken: {
        'st-role': {
          t: 1681996316335,
          v: ['admin'],
        },
      },
      userId: 'f48b7167-8d95-451c-bbfc-8a12cd49e763',
    });
  });

  it('returns proper 401 on SuperTokens error', async () => {
    getSessionStub = sinon.stub(Session, 'getSession').throws(
      new SuperTokensError({
        message: '401 error from SuperTokens',
        type: 'stub',
      }),
    );

    const res = await client.get('/authentication/users/me').expect(401);
    sinon.assert.calledOnce(getSessionStub);
    expect(res.body).to.deepEqual({
      error: {
        message: '401 error from SuperTokens',
        name: 'UnauthorizedError',
        statusCode: 401,
      },
    });
  });

  it('returns 500 on unexpected error', async () => {
    getSessionStub = sinon
      .stub(Session, 'getSession')
      .throws(new Error('unexpected error from test'));

    const res = await client.get('/authentication/users/me').expect(500);
    sinon.assert.calledOnce(getSessionStub);
    expect(res.body).to.deepEqual({
      error: {
        message: 'Internal Server Error',
        statusCode: 500,
      },
    });
  });
});
