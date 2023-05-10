import crypto from 'crypto';
import type { WebhookEvent } from '../types';

export function computeEventSignature(
  event: WebhookEvent<unknown>,
  timestamp: number,
  secret: string,
) {
  return crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${JSON.stringify(event)}`)
    .digest('base64');
}

export function sanitizeWebhookEndpoint(endpoint: string) {
  try {
    const parsedUrl = new URL(endpoint);

    return parsedUrl.toString();
  } catch (err) {
    throw new Error(
      `Invalid webhook endpoint, expected valid URL, got "${endpoint}"`,
    );
  }
}
