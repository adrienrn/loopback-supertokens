import axios from 'axios';
import EmailPassword from 'supertokens-node/recipe/emailpassword';
import { URL } from 'url';

/**
 * @deprecated use dispatchWebhookEvent instead
 */
export async function sendPostSignUpWebhook(
  originalImplementation: EmailPassword.APIInterface,
  input: any /* @TODO: how to type this? */,
  options: {
    apiKey: string;
    endpoint: string;
  },
) {
  if (!originalImplementation.signUpPOST) {
    throw Error('Should never come here');
  }

  try {
    // eslint-disable-next-line no-new
    new URL(options.endpoint);
  } catch (err) {
    throw new Error(
      `Invalid endpoint, expected valid URL, got "${options.endpoint}"`,
    );
  }

  const response = await originalImplementation.signUpPOST(input);

  if (response.status === 'OK') {
    axios.post(
      options.endpoint,
      {
        id: response.user.id,
      },
      {
        headers: {
          Authorization: `Api-Key-V1 ${options.apiKey}`,
        },
      },
    );
  }

  return response;
}
