import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

describe('App (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('returns 200 with status ok', async () => {
      const res = await request(app.getHttpServer()).get('/health').expect(200);

      expect(res.body.status).toBe('ok');
      expect(typeof res.body.uptime).toBe('number');
      expect(typeof res.body.timestamp).toBe('string');
    });

    it('generates an x-request-id header', async () => {
      const res = await request(app.getHttpServer()).get('/health');

      expect(res.headers['x-request-id']).toEqual(expect.any(String));
    });

    it('echoes the x-request-id sent by the client', async () => {
      const res = await request(app.getHttpServer())
        .get('/health')
        .set('x-request-id', 'test-123');

      expect(res.headers['x-request-id']).toBe('test-123');
    });
  });

  it('returns the standard error format for an unknown route', async () => {
    const res = await request(app.getHttpServer())
      .get('/khong-co')
      .expect(404);

    expect(res.body).toEqual({
      statusCode: 404,
      error: 'Not Found',
      message: 'Cannot GET /khong-co',
      path: '/khong-co',
      requestId: res.headers['x-request-id'],
      timestamp: expect.any(String),
    });
  });
});
