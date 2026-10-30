import { PatchController } from './patch.controller';
import { PatchService } from './patch.service';
describe('PatchController', () => {
  let controller: PatchController;
  beforeEach(() => {
    controller = new PatchController({ getPatches: () => Promise.resolve({ patches: [] }) } as any);
  });
  it('should be defined', () => expect(controller).toBeDefined());
});
