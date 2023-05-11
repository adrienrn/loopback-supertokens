import { expect, sinon } from '@loopback/testlab';
import axios, { AxiosError } from 'axios';
import { SupertokensWebhookHelper } from '../../../helpers/supertokens-webhook.helper';
import { WEBHOOK_EVENT_TYPE } from '../../../types';

describe('SupertokensWebhookHelper', () => {
  const mockWebhookEvent = {
    data: { user: { id: 'ede4bf8e-38f8-4ff7-b07a-2836de2ba904' } },
    type: WEBHOOK_EVENT_TYPE.USER__SIGN_UP,
  };

  describe('dispatchWebhookEvent', () => {
    it('Correctly sets "Webhook-Signature"', async () => {
      const axiosPost = sinon.stub(axios, 'post').resolves();

      await SupertokensWebhookHelper.dispatchWebhookEvent(mockWebhookEvent, {
        endpoint: 'https://example.com/webhook',
        secret: 'testkey',
        signatureHeaderKey: 'webhook-signature',
      });

      sinon.assert.calledOnce(axiosPost);
      expect(axiosPost.getCall(0).args[0]).to.be.eql(
        'https://example.com/webhook',
      );
      expect(axiosPost.getCall(0).args[1]).to.be.eql(mockWebhookEvent);

      // Check signature was properly formatted and passed as HTTP header:
      const axiosConfigArgument = axiosPost.getCall(0).args[2];
      expect(axiosConfigArgument.headers).have.property('webhook-signature');
      expect(axiosConfigArgument.headers['webhook-signature']).to.match(
        /^t=\d+\sv1=.+$/,
      );

      axiosPost.restore();
    });

    it('Handles and wraps errors', async () => {
      const axiosPost = sinon
        .stub(axios, 'post')
        .rejects(new AxiosError('Gateway Timeout (from unit test)', '504'));

      try {
        await SupertokensWebhookHelper.dispatchWebhookEvent(mockWebhookEvent, {
          endpoint: 'https://example.com/webhook',
          secret: 'testkey',
          signatureHeaderKey: 'webhook-signature',
        });
      } catch (err) {
        expect(err.message).to.be.eql(
          'Webhook failed: status="504" message="Gateway Timeout (from unit test)"',
        );
      }

      axiosPost.restore();
    });
  });
});
