import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 4000);
  const env = configService.get<string>('NODE_ENV', 'development');

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Setup Swagger OpenAPI Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('DokanOS Core Marketplace API')
    .setDescription(
      'API documentation for DokanOS - AI-powered multi-vendor commerce operating system',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
  logger.log(
    `🚀 DokanOS Core API running in [${env}] mode on port ${port} (http://localhost:${port}/api/v1)`,
  );
  logger.log(
    `📖 Interactive API Documentation available at http://localhost:${port}/api/docs`,
  );
}

bootstrap();
