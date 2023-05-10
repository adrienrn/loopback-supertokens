import { expect } from '@loopback/testlab';
import { sanitizeWebhookEndpoint } from '../../../utils/sanitizeWebhookEndpoint';

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
