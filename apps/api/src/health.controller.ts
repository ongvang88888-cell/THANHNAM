import { Controller, Get, Inject, ServiceUnavailableException } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { PrismaService } from "./common/prisma.service";
import { pingRedis } from "./common/redis-ping";

@SkipThrottle()
@Controller()
export class HealthController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get("health")
  health() {
    return { status: "ok", service: "edu-api" };
  }

  @Get("ready")
  async ready() {
    await this.prisma.$queryRaw`SELECT 1`;
    const redisUrl = process.env.REDIS_URL?.trim();
    if (redisUrl) {
      try {
        await pingRedis(redisUrl);
      } catch (error) {
        throw new ServiceUnavailableException({
          status: "not_ready",
          reason: error instanceof Error ? error.message : "redis",
        });
      }
    }
    return { status: "ready", redis: redisUrl ? "ok" : "skipped" };
  }
}
