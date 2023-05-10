import { expect } from '@loopback/testlab';
import { computeEventSignature } from '../../../utils/computeEventSignature';
import { WEBHOOK_EVENT_TYPE } from '../../../types';

describe('computeEventSignature', () => {
  const mockWebhookEvent = {
    data: { user: { id: 'ede4bf8e-38f8-4ff7-b07a-2836de2ba904' } },
    type: WEBHOOK_EVENT_TYPE.USER__SIGN_UP,
  };

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
