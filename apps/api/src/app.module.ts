import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { validateEnvironment } from './common/config/env.validation.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { LoggingMiddleware } from './common/middleware/logging.middleware.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { DatabaseModule } from './database/database.module.js';
import { UsersModule } from './users/users.module.js';
import { AuthModule } from './auth/auth.module.js';
import { StoresModule } from './stores/stores.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { ProductsModule } from './products/products.module.js';
import { CartModule } from './cart/cart.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { AiModule } from './ai/ai.module.js';
import { RedisModule } from './common/redis/redis.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { ChatModule } from './chat/chat.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
      envFilePath: ['.env'],
    }),
    DatabaseModule,
    RedisModule,
    UsersModule,
    AuthModule,
    StoresModule,
    CategoriesModule,
    ProductsModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    AiModule,
    NotificationsModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingMiddleware).forRoutes('*');
  }
}
