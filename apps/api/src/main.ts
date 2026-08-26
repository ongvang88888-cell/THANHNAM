import "reflect-metadata";
import { config } from "dotenv";
import { resolve } from "node:path";
import helmet from "helmet";

config({ path: resolve(process.cwd(), "../../.env") });
config();

(BigInt.prototype as unknown as { toJSON?: () => string }).toJSON = function toJSON() {
  return this.toString();
};

import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { raw as expressRaw } from "express";
import { AppModule } from "./app.module";
import { AppErrorFilter } from "./common/app-error.filter";
import { assertProductionSecrets, corsOrigins, isProduction } from "./common/runtime";

async function bootstrap() {
  assertProductionSecrets();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  // Memory/S3-local uploads send video/mp4 (not JSON). Capture the raw stream
  // before Nest's JSON parser so PUT /media/local actually stores bytes.
  app.use(
    "/api/v1/media/local",
    expressRaw({ type: () => true, limit: "256mb" }),
  );
  app.useBodyParser("json", { limit: "2mb" });
  app.setGlobalPrefix("api/v1");
  app.use(
    helmet({
      contentSecurityPolicy: isProduction() ? undefined : false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.enableCors({
    origin: corsOrigins(),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new AppErrorFilter());

  const port = Number(process.env.API_PORT ?? 3001);
  await app.listen(port, "0.0.0.0");
  console.log(`API listening on http://0.0.0.0:${port}/api/v1`);
}

bootstrap();
