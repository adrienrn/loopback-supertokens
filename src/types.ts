// @TODO should we actually use enums?
export enum WEBHOOK_EVENT_TYPE {
  USER__SIGN_IN = 'user.sign_in',
  USER__SIGN_UP = 'user.sign_up',
}

export interface WebhookEvent<D> {
  data: D;
  type: WEBHOOK_EVENT_TYPE;
}

export interface UserSignInEvent extends WebhookEvent<{ user: User }> {}
export interface UserSignUpEvent extends WebhookEvent<{ user: User }> {}

export interface User {
  id: string;
}
