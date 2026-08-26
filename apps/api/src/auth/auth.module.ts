import { createHash, randomBytes } from "node:crypto";
import {
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Post,
  Req,
  UseGuards,
  Inject,
} from "@nestjs/common";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { Throttle } from "@nestjs/throttler";
import * as bcrypt from "bcryptjs";
import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";
import { AppError, ErrorCodes, type RoleCode } from "@edu/shared-core";
import { PrismaService } from "../common/prisma.service";
import { AuthGuard, CurrentUser, type RequestUser } from "./auth.guard";
import { jwtAccessSecret } from "../common/runtime";
import { sendPasswordResetEmail, sendVerificationEmail } from "../common/mailer";

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

class ForgotDto {
  @IsEmail()
  email!: string;
}

class ResetDto {
  @IsString()
  @MinLength(16)
  token!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

class VerifyDto {
  @IsString()
  @MinLength(16)
  token!: string;
}

function hashToken(token: string): string {
  return createHash("sha256").update(String(token), "utf8").digest("hex");
}

const LOCK_WINDOW_MS = 15 * 60_000;
const LOCK_AFTER = 8;

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

  private async assertNotLocked(appId: string, email: string) {
    const since = new Date(Date.now() - LOCK_WINDOW_MS);
    const fails = await this.prisma.loginAttempt.count({
      where: { appId, email, success: false, createdAt: { gte: since } },
    });
    if (fails >= LOCK_AFTER) {
      throw new AppError(
        ErrorCodes.UNAUTHENTICATED,
        "Too many failed logins. Try again in 15 minutes.",
        429,
      );
    }
  }

  private async issuePurposeToken(
    userId: string,
    purpose: "EMAIL_VERIFY" | "PASSWORD_RESET",
    ttlMs: number,
  ) {
    await this.prisma.authToken.updateMany({
      where: { userId, purpose, usedAt: null },
      data: { usedAt: new Date() },
    });
    const token = randomBytes(32).toString("hex");
    await this.prisma.authToken.create({
      data: {
        userId,
        purpose,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + ttlMs),
      },
    });
    return token;
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

    const verifyToken = await this.issuePurposeToken(user.id, "EMAIL_VERIFY", 24 * 3600_000);
    await sendVerificationEmail(user.email, verifyToken);
    const tokens = await this.issueTokens(user);
    return process.env.NODE_ENV === "production" ? tokens : { ...tokens, verifyToken };
  }

  async login(dto: LoginDto, appHeader?: string, ip?: string) {
    const app = await this.resolveAppId(appHeader);
    const email = dto.email.toLowerCase();
    await this.assertNotLocked(app.id, email);

    const user = await this.prisma.user.findUnique({
      where: { appId_email: { appId: app.id, email } },
    });
    const ok = user && user.status === "ACTIVE" && (await bcrypt.compare(dto.password, user.passwordHash));
    await this.prisma.loginAttempt.create({
      data: { appId: app.id, email, success: Boolean(ok), ip: ip ?? null },
    });
    if (!ok) throw new AppError(ErrorCodes.UNAUTHENTICATED, "Invalid credentials", 401);
    return this.issueTokens(user!, dto.deviceId);
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
          where: { familyId: String(session.familyId) },
          data: { revokedAt: new Date() },
        });
      }
      throw new AppError(ErrorCodes.UNAUTHENTICATED, "Invalid refresh token", 401);
    }
    if (session.user.status !== "ACTIVE") {
      throw new AppError(ErrorCodes.UNAUTHENTICATED, "Account disabled", 401);
    }

    await this.prisma.session.update({
      where: { id: String(session.id) },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(session.user, session.deviceId ?? undefined);
  }

  async logout(refreshToken: string) {
    const refreshTokenHash = String(hashToken(refreshToken));
    await this.prisma.session.updateMany({
      where: { refreshTokenHash },
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
      emailVerifiedAt: dbUser.emailVerifiedAt,
      roles,
    };
  }

  async forgot(dto: ForgotDto, appHeader?: string) {
    const app = await this.resolveAppId(appHeader);
    const user = await this.prisma.user.findUnique({
      where: { appId_email: { appId: app.id, email: dto.email.toLowerCase() } },
    });
    if (user && user.status === "ACTIVE") {
      const token = await this.issuePurposeToken(user.id, "PASSWORD_RESET", 60 * 60_000);
      await sendPasswordResetEmail(user.email, token);
      if (process.env.NODE_ENV !== "production") {
        return { ok: true, resetToken: token };
      }
    }
    return { ok: true };
  }

  async resetPassword(dto: ResetDto) {
    const row = await this.prisma.authToken.findUnique({
      where: { tokenHash: hashToken(dto.token) },
    });
    if (!row || row.purpose !== "PASSWORD_RESET" || row.usedAt || row.expiresAt.getTime() < Date.now()) {
      throw new AppError(ErrorCodes.VALIDATION, "Reset link is invalid or expired", 400);
    }
    const passwordHash = await bcrypt.hash(dto.password, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: row.userId }, data: { passwordHash } }),
      this.prisma.authToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
      this.prisma.session.updateMany({ where: { userId: row.userId }, data: { revokedAt: new Date() } }),
    ]);
    return { ok: true };
  }

  async verifyEmail(dto: VerifyDto) {
    const row = await this.prisma.authToken.findUnique({
      where: { tokenHash: hashToken(dto.token) },
    });
    if (!row || row.purpose !== "EMAIL_VERIFY" || row.usedAt || row.expiresAt.getTime() < Date.now()) {
      throw new AppError(ErrorCodes.VALIDATION, "Verify link is invalid or expired", 400);
    }
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: row.userId }, data: { emailVerifiedAt: new Date() } }),
      this.prisma.authToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    ]);
    return { ok: true };
  }

  async resendVerification(user: RequestUser) {
    const dbUser = await this.prisma.user.findUniqueOrThrow({ where: { id: user.userId } });
    if (dbUser.emailVerifiedAt) return { ok: true, already: true };
    const token = await this.issuePurposeToken(user.userId, "EMAIL_VERIFY", 24 * 3600_000);
    await sendVerificationEmail(dbUser.email, token);
    return process.env.NODE_ENV === "production" ? { ok: true } : { ok: true, verifyToken: token };
  }

  async exportMe(user: RequestUser) {
    const [profile, orders, entitlements, progress, notes, certificates] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: user.userId },
        select: { id: true, email: true, displayName: true, locale: true, createdAt: true },
      }),
      this.prisma.order.findMany({ where: { userId: user.userId }, include: { items: true } }),
      this.prisma.entitlement.findMany({ where: { userId: user.userId } }),
      this.prisma.lessonProgress.findMany({ where: { userId: user.userId } }),
      this.prisma.note.findMany({ where: { userId: user.userId } }),
      this.prisma.certificate.findMany({ where: { userId: user.userId } }),
    ]);
    return { exportedAt: new Date().toISOString(), profile, orders, entitlements, progress, notes, certificates };
  }

  async deleteMe(user: RequestUser) {
    await this.prisma.$transaction([
      this.prisma.session.updateMany({ where: { userId: user.userId }, data: { revokedAt: new Date() } }),
      this.prisma.user.update({
        where: { id: user.userId },
        data: {
          status: "DELETED",
          email: `deleted+${user.userId}@invalid.local`,
          displayName: "Deleted user",
          passwordHash: await bcrypt.hash(randomBytes(24).toString("hex"), 10),
        },
      }),
    ]);
    return { ok: true };
  }
}

@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Throttle({ auth: { limit: 10, ttl: 60_000 } })
  @Post("register")
  register(@Body() dto: RegisterDto, @Req() req: { headers: Record<string, string | undefined> }) {
    return this.auth.register(dto, req.headers["x-app-id"]);
  }

  @Throttle({ auth: { limit: 10, ttl: 60_000 } })
  @Post("login")
  login(
    @Body() dto: LoginDto,
    @Req() req: { headers: Record<string, string | undefined>; ip?: string },
  ) {
    return this.auth.login(dto, req.headers["x-app-id"], req.ip || req.headers["x-forwarded-for"]);
  }

  @Throttle({ auth: { limit: 20, ttl: 60_000 } })
  @Post("refresh")
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post("logout")
  logout(@Body() dto: RefreshDto) {
    return this.auth.logout(dto.refreshToken);
  }

  @Throttle({ auth: { limit: 8, ttl: 60_000 } })
  @Post("forgot")
  forgot(@Body() dto: ForgotDto, @Req() req: { headers: Record<string, string | undefined> }) {
    return this.auth.forgot(dto, req.headers["x-app-id"]);
  }

  @Throttle({ auth: { limit: 8, ttl: 60_000 } })
  @Post("reset")
  reset(@Body() dto: ResetDto) {
    return this.auth.resetPassword(dto);
  }

  @Throttle({ auth: { limit: 10, ttl: 60_000 } })
  @Post("verify-email")
  verifyEmail(@Body() dto: VerifyDto) {
    return this.auth.verifyEmail(dto);
  }

  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  @Post("resend-verification")
  @UseGuards(AuthGuard)
  resend(@CurrentUser() user: RequestUser) {
    return this.auth.resendVerification(user);
  }

  @Get("me")
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: RequestUser) {
    return this.auth.me(user);
  }

  @Get("export")
  @UseGuards(AuthGuard)
  exportMe(@CurrentUser() user: RequestUser) {
    return this.auth.exportMe(user);
  }

  @Post("delete")
  @UseGuards(AuthGuard)
  deleteMe(@CurrentUser() user: RequestUser) {
    return this.auth.deleteMe(user);
  }
}

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: jwtAccessSecret(),
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
