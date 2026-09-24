import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { NotificationsService } from './notifications.service.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsGateway } from './notifications.gateway.js';

@Module({
  imports: [JwtModule.register({}), ConfigModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway],
  exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule {}
