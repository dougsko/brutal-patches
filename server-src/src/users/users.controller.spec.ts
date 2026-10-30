import { UsersController } from './users.controller';
import { UsersService } from './users.service';
describe('UsersController', () => {
  let controller: UsersController;
  beforeEach(() => {
    controller = new UsersController({ findOneByUsername: () => Promise.resolve({}) } as any);
  });
  it('should be defined', () => expect(controller).toBeDefined());
});
