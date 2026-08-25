import { createHash, randomBytes } from "node:crypto";
import { Body, Controller, Get, Injectable, Module, Post, Req, UseGuards, Inject } from "@nestjs/common";
import { JwtModule, JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";
import { AppError, ErrorCodes, type AuthUserContext, type RoleCode } from "@edu/shared-core";
import { PrismaService } from "../common/prisma.service";
import { AuthGuard, CurrentUser, type RequestUser } from "./auth.guard";

class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(1)
  displayName!: string;
}

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;

  @IsOptional()
  @IsString()
  deviceId?: string;
}

class RefreshDto {
  @IsString()
  refreshToken!: string;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

@Injectable()
export class AuthService {
  constructor(
  @Inject(PrismaService) private readonly prisma: PrismaService,
  @Inject(JwtService) private readonly jwt: JwtService,
) {}

  private async resolveAppId(appIdHeader?: string) {
    const slug = appIdHeader || process.env.APP_ID || "education_app";
    const app = await this.prisma.app.findFirst({
      where: { OR: [{ id: slug }, { slug }] },
    });
    if (!app) throw new AppError(ErrorCodes.NOT_FOUND, "App not found", 404);
    return app;
  }

  private async rolesForUser(userId: string): Promise<RoleCode[]> {
    const rows = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
    return rows.map((r) => r.role.code as RoleCode);
  }

  private async issueTokens(user: { id: string; appId: string; email: string }, deviceId?: string) {
    const roles = await this.rolesForUser(user.id);
    const familyId = randomBytes(16).toString("hex");
    const refreshToken = randomBytes(48).toString("hex");
    const refreshTtlDays = 30;
    const expiresAt = new Date(Date.now() + refreshTtlDays * 24 * 60 * 60 * 1000);

    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: hashToken(refreshToken),
        deviceId,
        expiresAt,
        familyId,
      },
    });

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      app_id: user.appId,
      sid: session.id,
      roles,
      ver: 1,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: process.env.JWT_ACCESS_TTL ?? "15m",
      user: {
        id: user.id,
        email: user.email,
        appId: user.appId,
        roles,
      },
    };
  }

  async register(dto: RegisterDto, appHeader?: string) {
    const app = await this.resolveAppId(appHeader);
    const existing = await this.prisma.user.findUnique({
      where: { appId_email: { appId: app.id, email: dto.email.toLowerCase() } },
    });
    if (existing) throw new AppError(ErrorCodes.CONFLICT, "Email already registered", 409);

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        appId: app.id,
        email: dto.email.toLowerCase(),
        passwordHash,
        displayName: dto.displayName,
      },
    });

    const studentRole = await this.prisma.role.findFirst({
      where: { appId: app.id, code: "student" },
    });
    if (studentRole) {
      await this.prisma.userRole.create({
        data: { userId: user.id, roleId: studentRole.id, scopeType: "APP" },
      });
    }

    return this.issueTokens(user);
  }

  async login(dto: LoginDto, appHeader?: string) {
    const app = await this.resolveAppId(appHeader);
    const user = await this.prisma.user.findUnique({
      where: { appId_email: { appId: app.id, email: dto.email.toLowerCase() } },
    });
    if (!user || user.status !== "ACTIVE") {
      throw new AppError(ErrorCodes.UNAUTHENTICATED, "Invalid credentials", 401);
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new AppError(ErrorCodes.UNAUTHENTICATED, "Invalid credentials", 401);
    return this.issueTokens(user, dto.deviceId);
  }

  async refresh(refreshToken: string) {
    const hash = hashToken(refreshToken);
    const session = await this.prisma.session.findFirst({
      where: { refreshTokenHash: hash },
      include: { user: true },
    });
    if (!session || session.revokedAt || session.expiresAt.getTime() < Date.now()) {
      if (session) {
        await this.prisma.session.updateMany({
          where: { familyId: session.familyId },
          data: { revokedAt: new Date() },
        });
      }
      throw new AppError(ErrorCodes.UNAUTHENTICATED, "Invalid refresh token", 401);
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(session.user, session.deviceId ?? undefined);
  }

  async logout(refreshToken: string) {
    const hash = hashToken(refreshToken);
    await this.prisma.session.updateMany({
      where: { refreshTokenHash: hash },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  async me(user: RequestUser) {
    const dbUser = await this.prisma.user.findUniqueOrThrow({ where: { id: user.userId } });
    const roles = await this.rolesForUser(user.userId);
    return {
      id: dbUser.id,
      email: dbUser.email,
      displayName: dbUser.displayName,
      appId: dbUser.appId,
      locale: dbUser.locale,
      roles,
    };
  }
}

@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Post("register")
  register(@Body() dto: RegisterDto, @Req() req: { headers: Record<string, string | undefined> }) {
    return this.auth.register(dto, req.headers["x-app-id"]);
  }

  @Post("login")
  login(@Body() dto: LoginDto, @Req() req: { headers: Record<string, string | undefined> }) {
    return this.auth.login(dto, req.headers["x-app-id"]);
  }

  @Post("refresh")
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post("logout")
  logout(@Body() dto: RefreshDto) {
    return this.auth.logout(dto.refreshToken);
  }

  @Get("me")
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: RequestUser) {
    return this.auth.me(user);
  }
}

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_ACCESS_SECRET || "dev-access-secret-change-me-32chars",
      signOptions: {
        expiresIn: (process.env.JWT_ACCESS_TTL as `${number}m`) || "15m",
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard],
  exports: [AuthService, AuthGuard],
})
export class AuthModule {}
