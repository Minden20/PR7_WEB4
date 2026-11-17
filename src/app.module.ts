import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DishesModule } from './dishes/dishes.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { SharedModule } from './shared/shared.module.js';
import { HttpLoggingMiddleware } from './common/middleware/http-logger.middleware.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'online-store',
    }),
    // Підключення до PostgreSQL з docker-compose.yml.
    // Значення за замовчуванням збігаються з налаштуваннями контейнера,
    // але їх можна перевизначити змінними оточення.
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USER ?? 'food_user',
      password: process.env.DB_PASSWORD ?? 'food_password',
      database: process.env.DB_NAME ?? 'food_delivery',
      autoLoadEntities: true,
      synchronize: true, // лише для навчального проєкту / розробки
      logging: true, // показує SQL (у т.ч. DDL CREATE TABLE) у консолі
    }),
    DishesModule,
    OrdersModule,
    SharedModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HttpLoggingMiddleware).forRoutes('*');
  }
}
