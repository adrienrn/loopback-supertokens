import { UserProfile } from '@loopback/security';

export type SupertokensUserProfile = UserProfile & {
  session: string;
  userDataInAccessToken: Record<string, unknown>;
  userId: string;
};

export interface WebhookEventUserInterface {
  id: string;
}

export interface WebhookEventInterface<D> {
  data: D;
  type: WebhookEventType;
}

// @TODO should we actually use enums?
export enum WebhookEventType {
  UserSignIn = 'user.sign_in',
  UserSignUp = 'user.sign_up',
}

export interface UserSignInEvent
  extends WebhookEventInterface<{ user: WebhookEventUserInterface }> {}
export interface UserSignUpEvent
  extends WebhookEventInterface<{ user: WebhookEventUserInterface }> {}

export type WebhookEvent = UserSignInEvent | UserSignUpEvent;
