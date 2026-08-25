import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Inject,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { RoleCode } from "@edu/shared-core";
import { PrismaService } from "../common/prisma.service";

export interface RequestUser {
  userId: string;
  appId: string;
  sessionId: string;
  roles: RoleCode[];
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser => {
    const req = ctx.switchToHttp().getRequest<{ user?: RequestUser }>();
    if (!req.user) throw new UnauthorizedException();
    return req.user;
  },
);

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      user?: RequestUser;
    }>();
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException();
    }
    const token = header.slice("Bearer ".length);
    try {
      const payload = await this.jwt.verifyAsync<{
        sub: string;
        app_id: string;
        sid: string;
        roles: RoleCode[];
      }>(token);

      const session = await this.prisma.session.findUnique({
        where: { id: payload.sid },
        include: { user: { select: { status: true, appId: true } } },
      });
      if (
        !session ||
        session.revokedAt ||
        session.expiresAt.getTime() < Date.now() ||
        session.userId !== payload.sub ||
        session.user.status !== "ACTIVE"
      ) {
        throw new UnauthorizedException();
      }

      const roleRows = await this.prisma.userRole.findMany({
        where: { userId: payload.sub },
        include: { role: true },
      });

      req.user = {
        userId: payload.sub,
        appId: session.user.appId || payload.app_id,
        sessionId: payload.sid,
        roles: roleRows.map((r) => r.role.code as RoleCode),
      };
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
