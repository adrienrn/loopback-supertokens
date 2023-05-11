export interface WebhookEventUserInterface {
  id: string;
}

export interface WebhookEventInterface<D> {
  data: D;
  type: WEBHOOK_EVENT_TYPE;
}

// @TODO should we actually use enums?
export enum WEBHOOK_EVENT_TYPE {
  USER__SIGN_IN = 'user.sign_in',
  USER__SIGN_UP = 'user.sign_up',
}

export interface UserSignInEvent
  extends WebhookEventInterface<{ user: WebhookEventUserInterface }> {}
export interface UserSignUpEvent
  extends WebhookEventInterface<{ user: WebhookEventUserInterface }> {}

export type WebhookEvent = UserSignInEvent | UserSignUpEvent;
