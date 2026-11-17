import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

describe('Dishes + PostgreSQL (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('CRUD + пагінація + soft delete + restore', async () => {
    const server = app.getHttpServer();

    const created = await request(server)
      .post('/dishes')
      .send({
        title: `E2E страва ${Date.now()}`,
        price: 99.9,
        weightGrams: 100,
        calories: 50,
        isSpicy: true,
      })
      .expect(201);
    expect(created.body.id).toMatch(/[0-9a-f-]{36}/);
    expect(created.body.price).toBe(99.9);

    const list = await request(server)
      .get('/dishes?page=1&limit=2&sortBy=price&order=asc')
      .expect(200);
    expect(list.body.data.length).toBeLessThanOrEqual(2);
    expect(list.body.meta).toMatchObject({ page: 1, limit: 2 });
    expect(list.body.meta.totalPages).toBe(Math.ceil(list.body.meta.total / 2));

    await request(server)
      .patch(`/dishes/${created.body.id}`)
      .send({ price: 120 })
      .expect(200);

    await request(server).delete(`/dishes/${created.body.id}`).expect(204);
    await request(server).get(`/dishes/${created.body.id}`).expect(404);

    const deleted = await request(server).get('/dishes/deleted').expect(200);
    expect(
      deleted.body.some((d: { id: string }) => d.id === created.body.id),
    ).toBe(true);

    const restored = await request(server)
      .patch(`/dishes/${created.body.id}/restore`)
      .expect(200);
    expect(restored.body.deletedAt).toBeNull();

    await request(server).delete(`/dishes/${created.body.id}`).expect(204);
  });
});
