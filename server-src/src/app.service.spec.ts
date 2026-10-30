import { AppService } from './app.service';

describe('AppService', () => {
  it('should be defined', () => {
    const service = new AppService();
    expect(service).toBeDefined();
  });
});
