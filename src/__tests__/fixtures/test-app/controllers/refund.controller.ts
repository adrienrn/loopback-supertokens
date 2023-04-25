import { authenticate } from '@loopback/authentication';
import { authorize } from '@loopback/authorization';
import {
  post
} from '@loopback/rest';

export class RefundController {
  @authenticate('supertokens')
  @authorize({
    allowedRoles: ['admin', 'manager'],
  })
  @post('/refunds')
  async create(): Promise<{ id: string }> {
    return {
      id: '292983ea-a41a-4a83-b800-44b1764ee74e'
    };
  }
}
