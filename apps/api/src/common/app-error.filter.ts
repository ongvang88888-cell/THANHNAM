import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { AppError } from "@edu/shared-core";
import type { Response } from "express";

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
          code: status === 401 ? "UNAUTHENTICATED" : "HTTP_ERROR",
          message: typeof body === "string" ? body : (body as { message?: string }).message ?? exception.message,
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
