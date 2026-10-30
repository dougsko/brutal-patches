import { PatchService } from './patch.service';

describe('PatchService', () => {
  it('should be defined', () => {
    const fn = () => new PatchService({} as any, {} as any, {} as any, {} as any);
    expect(fn).toBeDefined();
  });
});
