import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';

/** 全局异常过滤器：统一返回 { status: 'error', message } */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const raw = exception instanceof HttpException ? exception.getResponse() : null;
    let message = '服务器内部错误';
    if (typeof raw === 'string') {
      message = raw;
    } else if (raw && typeof raw === 'object' && (raw as any).message) {
      const m = (raw as any).message;
      message = Array.isArray(m) ? m.join('、') : String(m);
    } else if (exception instanceof Error) {
      message = exception.message;
    }
    response.status(status).json({ status: 'error', message });
  }
}
