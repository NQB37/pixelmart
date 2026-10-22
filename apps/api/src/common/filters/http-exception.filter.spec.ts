import {
  ArgumentsHost,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

function createHost(request: Record<string, unknown>) {
  const response = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;

  return { host, response };
}

describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter();
  const request = { id: 'req-1', originalUrl: '/things/42', url: '/42' };
  let logError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Keep expected 500 logs out of the test output.
    logError = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('formats a NotFoundException', () => {
    const { host, response } = createHost(request);

    filter.catch(new NotFoundException('Thing not found'), host);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 404,
      error: 'Not Found',
      message: 'Thing not found',
      path: '/things/42',
      requestId: 'req-1',
      timestamp: expect.any(String),
    });
  });

  it('keeps a validation message array as an array', () => {
    const { host, response } = createHost(request);

    filter.catch(
      new BadRequestException(['property foo should not exist']),
      host,
    );

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        error: 'Bad Request',
        message: ['property foo should not exist'],
      }),
    );
  });

  it('hides the details of a plain Error behind a 500', () => {
    const { host, response } = createHost(request);

    filter.catch(new Error('password=hunter2'), host);

    expect(response.status).toHaveBeenCalledWith(500);
    const body = response.json.mock.calls[0][0];
    expect(body).toMatchObject({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Internal server error',
    });
    expect(JSON.stringify(body)).not.toContain('hunter2');
    expect(logError).toHaveBeenCalled();
  });

  it('uses the request ID assigned by pino-http', () => {
    const { host, response } = createHost({ ...request, id: 'abc-123' });

    filter.catch(new NotFoundException(), host);

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: 'abc-123' }),
    );
  });
});
