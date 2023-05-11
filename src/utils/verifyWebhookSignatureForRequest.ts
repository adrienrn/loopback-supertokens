import { WebhookEvent } from '../types';
import { computeEventSignature } from './computeEventSignature';
import { parseSignatureHeader } from './parseSignatureHeader';

export function verifyForRequest(
  body: WebhookEvent<unknown>,
  signatureHeader: string,
  options: {
    signatureHeaderKey: string;
    secret: string;
  },
) {
  let givenSignature;
  try {
    givenSignature = parseSignatureHeader(signatureHeader);
  } catch (err) {
    // Invalid/missing signature header, can't authentify the message.
    throw new Error(
      'Webhook request malformed, missing or invalid signature header',
    );
  }

  const timestamp = new Date().getTime();

  if (givenSignature.timestamp + 180 * 1000 < timestamp) {
    // Expired after N minutes, protects against replay attacks.
    throw new Error('Webhook request malformed, expired signature header');
  }

  const expectedSignature = computeEventSignature(
    body,
    givenSignature.timestamp,
    options.secret,
  );

  if (expectedSignature !== givenSignature.value) {
    // Supplied signature string is different, timestamp does not match or
    // it has been signed with a different key.
    throw new Error('Webhook request malformed, signature mismatch');
  }

  return expectedSignature;
}
