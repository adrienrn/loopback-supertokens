import { expect, sinon } from '@loopback/testlab';
import axios, { AxiosError } from 'axios';
import { SupertokensWebhookHelper } from '../../../helpers/supertokens-webhook.helper';
import { WebhookEventType } from '../../../types';

describe('SupertokensWebhookHelper', () => {
  const mockWebhookEvent = {
    data: { user: { id: 'ede4bf8e-38f8-4ff7-b07a-2836de2ba904' } },
    type: WebhookEventType.UserSignUp,
  };

  describe('dispatchWebhookEvent', () => {
    const webhookHelper = new SupertokensWebhookHelper('testkey');

    it('Correctly sets "Webhook-Signature"', async () => {
      const axiosPost = sinon.stub(axios, 'post').resolves();

      await webhookHelper.dispatchWebhookEvent(
        'https://example.com/webhook',
        mockWebhookEvent,
      );

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
        await webhookHelper.dispatchWebhookEvent(
          'https://example.com/webhook',
          mockWebhookEvent,
        );
      } catch (err) {
        expect(err.message).to.be.eql(
          'Webhook failed: status="504" message="Gateway Timeout (from unit test)"',
        );
      }

      axiosPost.restore();
    });
  });

  describe('verifyEventSignature', () => {
    const expected = 'k3sYVKM84CvM8szBhNkXJbbYUgb3WRKpSdVe/wEG5EY=';

    const webhookHelper = new SupertokensWebhookHelper(
      'Secret Enchanted Broccoli Forest',
      'webhook-signature',
    );

    it(`Can verify signature header against body`, () => {
      const clock = sinon.useFakeTimers(1683810604 + 320);
      expect(
        webhookHelper.verifyEventSignature(
          mockWebhookEvent,
          't=1683810604 v1=k3sYVKM84CvM8szBhNkXJbbYUgb3WRKpSdVe/wEG5EY=',
        ),
      ).to.eql(expected);

      clock.restore();
    });

    it(`Fails if signatures mismatch`, () => {
      const clock = sinon.useFakeTimers(1683810604 + 320);
      expect(() => {
        // Create a new helper instance with a different secret:
        const otherWebhookHelper = new SupertokensWebhookHelper(
          'Panic In Babylon',
          'webhook-signature',
        );

        otherWebhookHelper.verifyEventSignature(
          mockWebhookEvent,
          't=1683810604 v1=k3sYVKM84CvM8szBhNkXJbbYUgb3WRKpSdVe/wEG5EY=',
        );
      }).to.throw('Webhook request malformed, signature mismatch');

      clock.restore();
    });

    describe(`Fails if signature is missing or invalid`, () => {
      let clock;
      beforeEach(() => {
        clock = sinon.useFakeTimers(1683810604 + 1289 * 1000);
      });

      afterEach(() => {
        clock.restore();
      });

      ['', undefined, null, 't=1683810604 v1='].forEach(
        (inputSignatureHeader, i) => {
          it(`Throws #${i + 1}`, () => {
            expect(() => {
              webhookHelper.verifyEventSignature(
                mockWebhookEvent,
                inputSignatureHeader,
              );
            }).to.throw(
              'Webhook request malformed, missing or invalid signature header',
            );
          });
        },
      );
    });

    it(`Fails if event is _too late_`, () => {
      const clock = sinon.useFakeTimers(1683810604 + 5000 * 1000);
      expect(() => {
        webhookHelper.verifyEventSignature(
          mockWebhookEvent,
          't=1683810604 v1=k3sYVKM84CvM8szBhNkXJbbYUgb3WRKpSdVe/wEG5EY=',
        );
      }).to.throw('Webhook request malformed, expired signature header');

      clock.restore();
    });
  });

  describe('computeEventSignature', () => {
    const webhookHelper = new SupertokensWebhookHelper('testkey');

    it('Computes correct signature for tuple (event, timestamp, secret)', () => {
      const expectedSignature = 'YVDHA/tG6mDid95MtrBpcc4+RegJ7WpMpQlGQIekcQc=';
      expect(
        webhookHelper.computeEventSignature(mockWebhookEvent, 1683561413),
      ).to.eql(expectedSignature);

      expect(
        webhookHelper.computeEventSignature(
          {
            data: { user: { id: '0ab2bde4-9f31-4562-9d2a-5989dcf7db48' } }, // <- different uuid
            type: WebhookEventType.UserSignUp,
          },
          1683561413,
        ),
      ).to.not.eql(expectedSignature);

      expect(
        webhookHelper.computeEventSignature(
          mockWebhookEvent,
          1683561634, // <- different timestamp
        ),
      ).to.not.eql(expectedSignature);

      const otherWebhookHelper = new SupertokensWebhookHelper('othertestkey');
      expect(
        otherWebhookHelper.computeEventSignature(mockWebhookEvent, 1683561413),
      ).to.not.eql(expectedSignature);
    });
  });

  describe('parseSignatureHeader', () => {
    const webhookHelper = new SupertokensWebhookHelper('testkey');

    const expectedParsedObject = {
      timestamp: 1683810604,
      value: 'YVDHA/tG6mDid95MtrBpcc4+RegJ7WpMpQlGQIekcQc=',
    };

    [
      [
        't=1683810604 v1=YVDHA/tG6mDid95MtrBpcc4+RegJ7WpMpQlGQIekcQc=',
        expectedParsedObject,
      ],
      [
        'v1=YVDHA/tG6mDid95MtrBpcc4+RegJ7WpMpQlGQIekcQc= t=1683810604',
        expectedParsedObject,
      ],
      [
        't=1683810604 v1=YVDHA/tG6mDid95MtrBpcc4+RegJ7WpMpQlGQIekcQc= v2=8bv1rB6Hz9D4/UFyxbWN7PCci29eB7m7lblUTl+KmwA=',
        expectedParsedObject,
      ],
      [
        '    t=1683810604     v1=YVDHA/tG6mDid95MtrBpcc4+RegJ7WpMpQlGQIekcQc=   ',
        expectedParsedObject,
      ],
      [
        `
          t=1683810604
  
          v1=YVDHA/tG6mDid95MtrBpcc4+RegJ7WpMpQlGQIekcQc=
        `,
        expectedParsedObject,
      ],
    ].forEach(([input, expected], i) => {
      it(`Works #${i + 1}`, () => {
        expect(webhookHelper.parseSignatureHeader(input)).to.eql(expected);
      });
    });

    const MISSING_HEADER_ERROR_MSG = 'No signature header string to parse';
    const MALFORMED_HEADER_ERROR_MSG = 'Malformed signature header';

    [
      ['', MISSING_HEADER_ERROR_MSG],
      [undefined, MISSING_HEADER_ERROR_MSG],
      [null, MISSING_HEADER_ERROR_MSG],
      ['abc123', MALFORMED_HEADER_ERROR_MSG],
      ['t=1683810604 ', MALFORMED_HEADER_ERROR_MSG],
      [
        'v1=YVDHA/tG6mDid95MtrBpcc4+RegJ7WpMpQlGQIekcQc=',
        MALFORMED_HEADER_ERROR_MSG,
      ],
    ].forEach(([input, expectedErrorMsg], i) => {
      it(`Throws for invalid input #${i + 1}`, () => {
        expect(() => {
          webhookHelper.parseSignatureHeader(input);
        }).to.throw(expectedErrorMsg);
      });
    });
  });
});
