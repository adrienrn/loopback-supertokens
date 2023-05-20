import {
  Client,
  createRestAppClient,
  expect,
  givenHttpServerConfig,
  sinon,
} from '@loopback/testlab';
import Session from 'supertokens-node/recipe/session';
import { TestApplication } from '../fixtures/test-app/application';
import { configureSupertokens } from '../fixtures/test-app/supertokens.config';
import { SuperTokensRBACAuthorizeProvider } from '../../authorization/supertokens-rbac-authorize.provider';

describe('@authorize w/ SuperTokensRBACAuthorizeProvider', () => {
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
    client = createRestAppClient(
      // @ts-ignore
      app,
    );
  });

  after(async () => {
    await app.stop();
  });

  afterEach(() => {
    getSessionStub.restore();
  });

  it('authorize is called for protected endpoint', async () => {
    const authorizerSpy = sinon.spy(
      SuperTokensRBACAuthorizeProvider.prototype,
      'authorize',
    );

    getSessionStub = sinon
      .stub(Session, 'getSession')
      .returns(givenSession(['admin']));

    await client.post('/refunds').expect(200);

    // authenticate calls 'getSession' with (req, res)
    expect(getSessionStub.firstCall.args.length).to.be.equal(2);

    // authorize calls 'getSession' with (req, res, options)
    expect(getSessionStub.secondCall.args.length).to.be.equal(2);

    sinon.assert.calledOnce(authorizerSpy);

    authorizerSpy.restore();
  });

  it('authorize returns 403 if user does not have "admin" role', async () => {
    const authorizerSpy = sinon.spy(
      SuperTokensRBACAuthorizeProvider.prototype,
      'authorize',
    );

    getSessionStub = sinon
      .stub(Session, 'getSession')
      .returns(givenSession(['guest']));

    await client.post('/refunds').expect(403);

    authorizerSpy.restore();
  });

  it('authorize returns 403 if user has one or more denied roles', async () => {
    const authorizerSpy = sinon.spy(
      SuperTokensRBACAuthorizeProvider.prototype,
      'authorize',
    );

    getSessionStub = sinon
      .stub(Session, 'getSession')
      .returns(givenSession(['guest']));

    await client
      .get('/products/b16b28be-8977-4488-8dd6-aaf7d8db2b8b/offers')
      .expect(403);

    sinon.assert.calledOnce(authorizerSpy);

    authorizerSpy.restore();
  });

  it('authorize returns 200 if user does not have any denied roles', async () => {
    const authorizerSpy = sinon.spy(
      SuperTokensRBACAuthorizeProvider.prototype,
      'authorize',
    );

    getSessionStub = sinon
      .stub(Session, 'getSession')
      .returns(givenSession(['manager']));

    await client
      .get('/products/b16b28be-8977-4488-8dd6-aaf7d8db2b8b/offers')
      .expect(200);

    sinon.assert.calledOnce(authorizerSpy);

    authorizerSpy.restore();
  });

  it('authorize returns 200 if user has BOTH one allowed role and one denied role', async () => {
    const authorizerSpy = sinon.spy(
      SuperTokensRBACAuthorizeProvider.prototype,
      'authorize',
    );

    getSessionStub = sinon
      .stub(Session, 'getSession')
      .returns(givenSession(['moderator', 'manager']));

    await client
      .get('/products/b16b28be-8977-4488-8dd6-aaf7d8db2b8b/offers')
      .expect(200);

    sinon.assert.calledOnce(authorizerSpy);

    authorizerSpy.restore();
  });
});

function givenSession(roles) {
  return Promise.resolve({
    getUserId: () => 'f48b7167-8d95-451c-bbfc-8a12cd49e763',
    getAccessTokenPayload: () => ({
      'st-role': {
        t: 1681996316335,
        v: roles,
      },
    }),
    getHandle: () => '3733a3f3-566f-40af-aa6c-febd29481279',
    getClaimValue: () => roles,
  } as unknown as any);
}
