import { authenticate } from '@loopback/authentication';
import { authorize } from '@loopback/authorization';
import { get, param } from '@loopback/rest';

export class ProductController {
  @authenticate('supertokens')
  @authorize({
    deniedRoles: ['guest'],
  })
  @get('/products/{id}/offers')
  async contactHost(@param.path.string('id') _id: string): Promise<[]> {
    return [];
  }
}
