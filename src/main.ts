import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { RedisCacheService } from './cache/redis-cache.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { requestContextMiddleware } from './common/middleware/request-context.middleware';
import { getCorsOrigins } from './config/env';
import { createRateLimitMiddleware } from './security/rate-limit.middleware';
import { securityHeadersMiddleware } from './security/security-headers.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');
  const port = configService.get<number>('PORT', 3000);

  const redisCache = app.get(RedisCacheService);

  app.use(requestContextMiddleware);
  app.use(securityHeadersMiddleware);
  app.use(createRateLimitMiddleware(configService, redisCache));
  app.setGlobalPrefix(apiPrefix);
  app.enableCors({
    origin: getCorsOrigins(configService.get<string>('CORS_ORIGINS')),
    credentials: true
  });
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Periódico Digital Premium API')
    .setDescription('Backend NestJS + Sequelize + PostgreSQL + Redis para periódico premium event-driven, con auth, cache, workers, smokes y seguridad de producción.')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document);

  await app.listen(port);
  Logger.log(`Server running on http://localhost:${port}/${apiPrefix}`, 'Bootstrap');
}

void bootstrap();
