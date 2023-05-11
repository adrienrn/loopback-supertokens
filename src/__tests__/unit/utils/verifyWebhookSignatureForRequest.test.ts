import { expect, sinon } from '@loopback/testlab';
import { WEBHOOK_EVENT_TYPE, WebhookEvent } from '../../../types';
import { verifyForRequest } from '../../../utils/verifyWebhookSignatureForRequest';

describe('verifyForRequest', () => {
  const expected = 'k3sYVKM84CvM8szBhNkXJbbYUgb3WRKpSdVe/wEG5EY=';

  const mockWebhookEvent: WebhookEvent<unknown> = {
    data: { user: { id: 'ede4bf8e-38f8-4ff7-b07a-2836de2ba904' } },
    type: WEBHOOK_EVENT_TYPE.USER__SIGN_UP,
  };

  const mockOptions = {
    signatureHeaderKey: 'webhook-signature',
    secret: 'Secret Enchanted Broccoli Forest',
  };

  it(`Can verify signature header against body`, () => {
    const clock = sinon.useFakeTimers(1683810604 + 320);
    expect(
      verifyForRequest(
        mockWebhookEvent,
        't=1683810604 v1=k3sYVKM84CvM8szBhNkXJbbYUgb3WRKpSdVe/wEG5EY=',
        mockOptions,
      ),
    ).to.eql(expected);

    clock.restore();
  });

  it(`Fails if signatures mismatch`, () => {
    const clock = sinon.useFakeTimers(1683810604 + 320);
    expect(() => {
      verifyForRequest(
        mockWebhookEvent,
        't=1683810604 v1=k3sYVKM84CvM8szBhNkXJbbYUgb3WRKpSdVe/wEG5EY=',
        { ...mockOptions, secret: 'Panic In Babylon' },
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
            verifyForRequest(
              mockWebhookEvent,
              inputSignatureHeader,
              mockOptions,
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
      verifyForRequest(
        mockWebhookEvent,
        't=1683810604 v1=k3sYVKM84CvM8szBhNkXJbbYUgb3WRKpSdVe/wEG5EY=',
        mockOptions,
      );
    }).to.throw('Webhook request malformed, expired signature header');

    clock.restore();
  });
});
