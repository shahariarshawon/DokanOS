import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { ChatService } from './chat.service.js';
import { ChatController } from './chat.controller.js';
import { ChatGateway } from './chat.gateway.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [
    JwtModule.register({}),
    ConfigModule,
    NotificationsModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService, ChatGateway],
})
export class ChatModule {}
