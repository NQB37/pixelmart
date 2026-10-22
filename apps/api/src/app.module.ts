import { randomUUID } from 'node:crypto';
import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { HealthModule } from './modules/health/health.module';
import { validateEnv, Env } from './config/env.schema';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

const REQUEST_ID_HEADER = 'x-request-id';
const MAX_REQUEST_ID_LENGTH = 128;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: '.env',
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        pinoHttp: {
          genReqId: (req, res) => {
            const header = req.headers[REQUEST_ID_HEADER];
            const id =
              typeof header === 'string' &&
              header.length > 0 &&
              header.length <= MAX_REQUEST_ID_LENGTH
                ? header
                : randomUUID();

            res.setHeader(REQUEST_ID_HEADER, id);
            return id;
          },
          level: config.get('LOG_LEVEL', { infer: true }),
          transport:
            config.get('NODE_ENV', { infer: true }) === 'development'
              ? { target: 'pino-pretty' }
              : undefined,
        },
      }),
    }),
    HealthModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    },
  ],
})
export class AppModule {}
