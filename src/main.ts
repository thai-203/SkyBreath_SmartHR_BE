import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, Logger, ClassSerializerInterceptor } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Global prefix
  const apiPrefix = configService.get<string>('app.apiPrefix', 'api');
  const apiVersion = configService.get<string>('app.apiVersion', 'v1');
  app.setGlobalPrefix(`${apiPrefix}/${apiVersion}`);

  // Security
  app.use(helmet());
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global Interceptor
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Swagger Documentation
  const swaggerEnabled = configService.get<boolean>('swagger.enabled', true);
  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle(configService.get<string>('swagger.title', 'SmartHR API'))
      .setDescription(
        configService.get<string>(
          'swagger.description',
          'API Documentation for SmartHR',
        ),
      )
      .setVersion(configService.get<string>('swagger.version', '1.0'))
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    const swaggerPath = configService.get<string>('swagger.path', 'api/docs');
    SwaggerModule.setup(swaggerPath, app, document);
    logger.log(`Swagger documentation available at /${swaggerPath}`);
  }

  // Start server
  const port = configService.get<number>('app.port', 3000);
  const host = configService.get<string>('app.host', 'localhost');

  await app.listen(port, host);
  logger.log(`Application is running on: http://${host}:${port}`);
  logger.log(`API endpoint: http://${host}:${port}/${apiPrefix}/${apiVersion}`);
}

bootstrap();
