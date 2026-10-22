import { Body, Controller, INestApplication, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IsString } from 'class-validator';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

// Test-only controller: exercises the global ValidationPipe without adding
// a route to the real app.
class CreateThingDto {
  @IsString()
  name: string;
}

@Controller('test-validation')
class TestValidationController {
  @Post()
  create(@Body() dto: CreateThingDto) {
    return dto;
  }
}

describe('Global ValidationPipe (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [TestValidationController],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('accepts a valid body', async () => {
    await request(app.getHttpServer())
      .post('/test-validation')
      .send({ name: 'Pixel' })
      .expect(201, { name: 'Pixel' });
  });

  it('rejects an unknown field with 400 and names it', async () => {
    const res = await request(app.getHttpServer())
      .post('/test-validation')
      .send({ name: 'Pixel', foo: 'bar' })
      .expect(400);

    expect(res.body).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      path: '/test-validation',
      requestId: res.headers['x-request-id'],
    });
    expect(res.body.message).toEqual(
      expect.arrayContaining([expect.stringContaining('foo')]),
    );
  });
});
