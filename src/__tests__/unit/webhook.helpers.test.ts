import { expect, sinon } from '@loopback/testlab';
import axios, { AxiosError } from 'axios';
import {
  computeEventSignature,
  dispatchWebhookEvent,
  sanitizeWebhookEndpoint,
} from '../../helpers/webhook';
import { WEBHOOK_EVENT_TYPE } from '../../types';

describe('helpers > webhook', () => {
  const mockWebhookEvent = {
    data: { user: { id: 'ede4bf8e-38f8-4ff7-b07a-2836de2ba904' } },
    type: WEBHOOK_EVENT_TYPE.USER__SIGN_UP,
  };

  describe('dispatchWebhookEvent', () => {
    it('Correctly sets "Webhook-Signature"', async () => {
      const axiosPost = sinon.stub(axios, 'post').resolves();

      await dispatchWebhookEvent(mockWebhookEvent, {
        endpoint: 'https://example.com/webhook',
        secret: 'testkey',
      });

      sinon.assert.calledOnce(axiosPost);
      expect(axiosPost.getCall(0).args[0]).to.be.eql(
        'https://example.com/webhook',
      );
      expect(axiosPost.getCall(0).args[1]).to.be.eql(mockWebhookEvent);

      // Check signature was properly formatted and passed as HTTP header:
      const axiosConfigArgument = axiosPost.getCall(0).args[2];
      expect(axiosConfigArgument.headers).have.property('Webhook-Signature');
      expect(axiosConfigArgument.headers['Webhook-Signature']).to.match(
        /^t=\d+\sv1=.+$/,
      );

      axiosPost.restore();
    });

    it('Handles and wraps errors', async () => {
      const axiosPost = sinon
        .stub(axios, 'post')
        .rejects(new AxiosError('Gateway Timeout (from unit test)', '504'));

      try {
        await dispatchWebhookEvent(mockWebhookEvent, {
          endpoint: 'https://example.com/webhook',
          secret: 'testkey',
        });
      } catch (err) {
        expect(err.message).to.be.eql(
          'Webhook failed: status="504" message="Gateway Timeout (from unit test)"',
        );
      }

      axiosPost.restore();
    });
  });

  describe('sanitizeWebhookEndpoint', () => {
    [
      ['https://example.com/webhook', 'https://example.com/webhook'],
      [
        'https://example.com/webhook?whatever=1',
        'https://example.com/webhook?whatever=1',
      ],
      ['http://localhost:4000/webhook', 'http://localhost:4000/webhook'],
    ].forEach(([input, expected], i) => {
      it(`Works #${i + 1}`, () => {
        expect(sanitizeWebhookEndpoint(input)).to.eql(expected);
      });
    });

    [
      '',
      undefined,
      null,
      '12',
      'false',
      '/without-domain',
      'example/some/endpoint',
    ].forEach((input, i) => {
      it(`Throws for invalid input #${i + 1}`, () => {
        expect(() => {
          sanitizeWebhookEndpoint(input);
        }).to.throw(/Invalid webhook endpoint, expected valid URL, got/);
      });
    });
  });

  describe('computeEventSignature', () => {
    it('Computes correct signature for tuple (event, timestamp, secret)', () => {
      const expectedSignature = 'YVDHA/tG6mDid95MtrBpcc4+RegJ7WpMpQlGQIekcQc=';
      expect(
        computeEventSignature(mockWebhookEvent, 1683561413, 'testkey'),
      ).to.eql(expectedSignature);

      expect(
        computeEventSignature(
          {
            data: { user: { id: '0ab2bde4-9f31-4562-9d2a-5989dcf7db48' } }, // <- different uuid
            type: WEBHOOK_EVENT_TYPE.USER__SIGN_UP,
          },
          1683561413,
          'testkey',
        ),
      ).to.not.eql(expectedSignature);

      expect(
        computeEventSignature(
          mockWebhookEvent,
          1683561634, // <- different timestamp
          'testkey',
        ),
      ).to.not.eql(expectedSignature);

      expect(
        computeEventSignature(
          mockWebhookEvent,
          1683561413,
          'othertestkey', // <- different key
        ),
      ).to.not.eql(expectedSignature);
    });
  });
});
