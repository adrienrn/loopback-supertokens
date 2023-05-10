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
