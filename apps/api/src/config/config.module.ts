import { Controller, Get, Injectable, Module, Param, Req, Inject } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { AppError, ErrorCodes } from "@edu/shared-core";
import { AuthModule } from "../auth/auth.module";

@Injectable()
export class ConfigService {
  constructor(
  @Inject(PrismaService) private readonly prisma: PrismaService,
) {}

  private async app(header?: string) {
    const slug = header || process.env.APP_ID || "education_app";
    const app = await this.prisma.app.findFirst({ where: { OR: [{ id: slug }, { slug }] } });
    if (!app) throw new AppError(ErrorCodes.NOT_FOUND, "App not found", 404);
    return app;
  }

  async remoteConfig(appHeader?: string) {
    const app = await this.app(appHeader);
    const rows = await this.prisma.appConfig.findMany({ where: { appId: app.id } });
    const flags = await this.prisma.featureFlag.findMany({ where: { appId: app.id } });
    const config: Record<string, unknown> = {};
    for (const r of rows) config[r.key] = r.valueJson;
    return {
      app: {
        id: app.id,
        slug: app.slug,
        name: app.name,
        branding: app.brandingJson,
        enabledModules: app.enabledModulesJson,
        monetization: app.monetizationConfigJson,
      },
      config,
      featureFlags: Object.fromEntries(flags.map((f) => [f.key, { enabled: f.enabled, value: f.valueJson }])),
    };
  }

  async verifyCertificate(publicId: string) {
    const cert = await this.prisma.certificate.findUnique({
      where: { publicId },
      include: {
        user: { select: { displayName: true } },
        course: { select: { title: true } },
      },
    });
    if (!cert || cert.revokeAt) {
      return { valid: false };
    }
    return {
      valid: true,
      publicId: cert.publicId,
      studentName: cert.user.displayName,
      courseTitle: cert.course.title,
      issuedAt: cert.issuedAt,
    };
  }
}

@Controller()
export class ConfigController {
  constructor(
  @Inject(ConfigService) private readonly config: ConfigService,
) {}

  @Get("remote-config")
  remote(@Req() req: { headers: Record<string, string | undefined> }) {
    return this.config.remoteConfig(req.headers["x-app-id"]);
  }

  @Get("verify/certificate/:publicId")
  verify(@Param("publicId") publicId: string) {
    return this.config.verifyCertificate(publicId);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [ConfigController],
  providers: [ConfigService],
})
export class ConfigModule {}
