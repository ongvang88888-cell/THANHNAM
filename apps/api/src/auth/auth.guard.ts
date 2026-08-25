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
  constructor(@Inject(JwtService) private readonly jwt: JwtService) {}

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
      req.user = {
        userId: payload.sub,
        appId: payload.app_id,
        sessionId: payload.sid,
        roles: payload.roles ?? [],
      };
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
