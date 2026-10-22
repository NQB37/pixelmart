import { STATUS_CODES } from 'node:http';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();

    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, error, message } =
      exception instanceof HttpException
        ? this.fromHttpException(exception)
        : this.fromUnknown(exception);

    response.status(statusCode).json({
      statusCode,
      error,
      message,
      path: request.originalUrl ?? request.url,
      requestId: request.id,
      timestamp: new Date().toISOString(),
    });
  }

  private fromHttpException(exception: HttpException) {
    const statusCode = exception.getStatus();
    const body = exception.getResponse();
    const reason = STATUS_CODES[statusCode] ?? 'Error';

    if (typeof body === 'string') {
      return { statusCode, error: reason, message: body };
    }

    // ValidationPipe puts an array of messages here; keep it as an array.
    const { message, error } = body as {
      message?: string | string[];
      error?: string;
    };

    return {
      statusCode,
      error: typeof error === 'string' ? error : reason,
      message: message ?? exception.message,
    };
  }

  // Anything that is not an HttpException is a bug: log the details,
  // but never send them to the client.
  private fromUnknown(exception: unknown) {
    if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    } else {
      this.logger.error(`Non-Error thrown: ${String(exception)}`);
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'Internal server error',
    };
  }
}
