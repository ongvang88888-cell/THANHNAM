import { Controller, Get, Inject, Injectable, Module, Param, UseGuards } from "@nestjs/common";
import { AppError, ErrorCodes, hasAnyRole } from "@edu/shared-core";
import { PrismaService } from "../common/prisma.service";
import { AuthGuard, CurrentUser, type RequestUser } from "../auth/auth.guard";
import { AuthModule } from "../auth/auth.module";

@Injectable()
export class InvoicesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  list(user: RequestUser) {
    return this.prisma.invoice.findMany({
      where: { userId: user.userId, appId: user.appId },
      include: { order: { select: { id: true, status: true } } },
      orderBy: { issuedAt: "desc" },
      take: 50,
    });
  }

  async get(user: RequestUser, number: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        number,
        appId: user.appId,
        ...(hasAnyRole(user as never, ["admin", "super_admin"]) ? {} : { userId: user.userId }),
      },
      include: {
        order: { include: { items: { include: { product: { select: { name: true, type: true } } } } } },
      },
    });
    if (!invoice) throw new AppError(ErrorCodes.NOT_FOUND, "Invoice not found", 404);
    return invoice;
  }
}

@Controller("invoices")
@UseGuards(AuthGuard)
export class InvoicesController {
  constructor(@Inject(InvoicesService) private readonly invoices: InvoicesService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.invoices.list(user);
  }

  @Get(":number")
  get(@CurrentUser() user: RequestUser, @Param("number") number: string) {
    return this.invoices.get(user, number);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [InvoicesController],
  providers: [InvoicesService],
})
export class InvoicesModule {}
