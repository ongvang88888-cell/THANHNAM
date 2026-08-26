import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { AppError } from "@edu/shared-core";
import type { Response } from "express";

function httpErrorMessage(status: number, body: string | object, exception: HttpException): string {
  if (status === 429) {
    return "Đang có nhiều thao tác. Đợi vài giây rồi thử lại — không cần chọn lại video.";
  }
  if (typeof body === "string" && body.trim()) return body;
  if (body && typeof body === "object") {
    const message = (body as { message?: string | string[] }).message;
    if (Array.isArray(message) && message.length > 0) return message.join("; ");
    if (typeof message === "string" && message.trim()) return message;
  }
  return exception.message;
}

@Catch()
export class AppErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const requestId = (ctx.getRequest().headers["x-request-id"] as string) ?? crypto.randomUUID();

    if (exception instanceof AppError) {
      res.status(exception.status).json({
        error: {
          code: exception.code,
          message: exception.message,
          details: exception.details,
          requestId,
        },
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      res.status(status).json({
        error: {
          code: status === 401 ? "UNAUTHENTICATED" : status === 429 ? "TOO_MANY_REQUESTS" : "HTTP_ERROR",
          message: httpErrorMessage(status, body, exception),
          details: typeof body === "object" ? body : undefined,
          requestId,
        },
      });
      return;
    }

    // eslint-disable-next-line no-console
    console.error(exception);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: {
        code: "INTERNAL",
        message: "Internal server error",
        requestId,
      },
    });
  }
}
