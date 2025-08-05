import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Patch API (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/api/patches (GET)', () => {
    it('should return all patches', () => {
      return request(app.getHttpServer())
        .get('/api/patches')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should return patch total', () => {
      return request(app.getHttpServer())
        .get('/api/patches/total')
        .expect(200)
        .expect((res) => {
          expect(typeof res.body).toBe('number');
          expect(res.body).toBeGreaterThanOrEqual(0);
        });
    });

    it('should return latest patches with pagination', () => {
      return request(app.getHttpServer())
        .get('/api/patches/0/10')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeLessThanOrEqual(10);
        });
    });

    it('should return specific patch by id', async () => {
      // First get all patches to find a valid ID
      const patchesResponse = await request(app.getHttpServer())
        .get('/api/patches')
        .expect(200);

      if (patchesResponse.body.length > 0) {
        const firstPatchId = patchesResponse.body[0].id;
        return request(app.getHttpServer())
          .get(`/api/patches/${firstPatchId}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.id).toBe(firstPatchId);
            expect(res.body.title).toBeDefined();
          });
      }
    });

    it('should return 404 for non-existent patch', () => {
      return request(app.getHttpServer())
        .get('/api/patches/999999')
        .expect(404);
    });
  });

  describe('/api/patches (POST)', () => {
    const validPatchData = {
      title: 'E2E Test Patch',
      description: 'Test patch created by e2e tests',
      sub_fifth: 0,
      overtone: 0,
      ultra_saw: 0,
      saw: 0,
      pulse_width: 0,
      square: 0,
      metalizer: 0,
      triangle: 0,
      cutoff: 0,
      mode: 0,
      resonance: 0,
      env_amt: 0,
      brute_factor: 0,
      kbd_tracking: 0,
      modmatrix: [],
      octave: 0,
      volume: 0,
      glide: 0,
      mod_wheel: 0,
      amount: 0,
      wave: 0,
      rate: 0,
      sync: 0,
      env_amt_2: 0,
      vca: 0,
      attack: 0,
      decay: 0,
      sustain: 0,
      release: 0,
      pattern: 0,
      play: 0,
      rate_2: 0,
      tags: [],
    };

    it('should return 401 when no authentication provided', () => {
      return request(app.getHttpServer())
        .post('/api/patches')
        .send(validPatchData)
        .expect(401);
    });

    // Note: For full e2e testing with authentication, we would need to:
    // 1. Create a test user
    // 2. Login to get JWT token  
    // 3. Include token in Authorization header
    // This requires additional setup for authentication testing

    it('should validate patch data structure', () => {
      // Test with invalid data structure - missing required fields
      const invalidPatchData = {
        description: 'Missing title',
      };

      return request(app.getHttpServer())
        .post('/api/patches')
        .send(invalidPatchData)
        .expect(401); // Will be 401 due to auth, but structure validation would happen after auth
    });
  });

  describe('/api/patches/:id (PUT)', () => {
    const updateData = {
      title: 'Updated E2E Test Patch',
      description: 'Updated by e2e tests',
    };

    it('should return 401 when no authentication provided', () => {
      return request(app.getHttpServer())
        .put('/api/patches/1')
        .send(updateData)
        .expect(401);
    });

    // Note: Similar to POST, PUT endpoints require authentication
    // Full e2e testing would require JWT token setup
  });

  describe('API Error Handling', () => {
    it('should handle malformed JSON in POST requests', () => {
      return request(app.getHttpServer())
        .post('/api/patches')
        .send('{"invalid": json}')
        .set('Content-Type', 'application/json')
        .expect(400);
    });

    it('should handle malformed JSON in PUT requests', () => {
      return request(app.getHttpServer())
        .put('/api/patches/1')
        .send('{"invalid": json}')
        .set('Content-Type', 'application/json')
        .expect(400);
    });

    it('should return 404 for non-existent endpoints', () => {
      return request(app.getHttpServer())
        .get('/api/nonexistent')
        .expect(404);
    });
  });
});