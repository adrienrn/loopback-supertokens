import supertokens from 'supertokens-node';
import EmailPassword from 'supertokens-node/recipe/emailpassword';
import Session from 'supertokens-node/recipe/session';
import UserRoles from 'supertokens-node/recipe/userroles';

export { default as supertokens } from 'supertokens-node';

const appInfo = {
  apiDomain: 'http://localhost:9001',
  appName: 'test-app',
  websiteDomain: 'http://localhost:9000',
};

export function configureSupertokens() {
  supertokens.init({
    appInfo,
    framework: 'loopback',
    recipeList: [EmailPassword.init(), Session.init(), UserRoles.init()],
    supertokens: {
      connectionURI: process.env.SUPERTOKENS_CORE_CONNECTION_URI || '',
    },
  });
}
