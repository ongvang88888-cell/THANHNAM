#!/usr/bin/env tsx
import { PrismaClient, PolicyType, ProductType, ProductStatus, Visibility, CourseStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedGplx } from "./seed-gplx";

const prisma = new PrismaClient();

async function main() {
  const app = await prisma.app.upsert({
    where: { slug: "education_app" },
    update: {
      enabledModulesJson: {
        courses: true,
        documents: true,
        bundles: true,
        rewardedAds: true,
        subscriptions: true,
        marketplace: false,
        gplx: true,
      },
      monetizationConfigJson: {
        purchaseEnabled: true,
        rewardedEnabled: true,
        adsEnabled: true,
        subscriptionEnabled: true,
      },
    },
    create: {
      slug: "education_app",
      name: "Education Commerce",
      brandingJson: {
        brandName: "EduCommerce",
        primaryColor: "#0F3D2E",
        accentColor: "#C4A35A",
      },
      enabledModulesJson: {
        courses: true,
        documents: true,
        bundles: true,
        rewardedAds: true,
        subscriptions: true,
        marketplace: false,
        gplx: true,
      },
      monetizationConfigJson: {
        purchaseEnabled: true,
        rewardedEnabled: true,
        adsEnabled: true,
        subscriptionEnabled: true,
      },
    },
  });

  const roles = ["student", "teacher", "admin", "super_admin", "affiliate", "support_agent"];
  for (const code of roles) {
    await prisma.role.upsert({
      where: { appId_code: { appId: app.id, code } },
      update: {},
      create: { appId: app.id, code, name: code },
    });
  }

  const passwordHash = await bcrypt.hash("Password123!", 12);

  const admin = await prisma.user.upsert({
    where: { appId_email: { appId: app.id, email: "admin@edu.local" } },
    update: { emailVerifiedAt: new Date() },
    create: {
      appId: app.id,
      email: "admin@edu.local",
      passwordHash,
      displayName: "Platform Admin",
      emailVerifiedAt: new Date(),
    },
  });

  const teacher = await prisma.user.upsert({
    where: { appId_email: { appId: app.id, email: "teacher@edu.local" } },
    update: { emailVerifiedAt: new Date() },
    create: {
      appId: app.id,
      email: "teacher@edu.local",
      passwordHash,
      displayName: "Demo Teacher",
      emailVerifiedAt: new Date(),
    },
  });

  const student = await prisma.user.upsert({
    where: { appId_email: { appId: app.id, email: "student@edu.local" } },
    update: { emailVerifiedAt: new Date() },
    create: {
      appId: app.id,
      email: "student@edu.local",
      passwordHash,
      displayName: "Demo Student",
      emailVerifiedAt: new Date(),
    },
  });

  const adminRole = await prisma.role.findFirstOrThrow({ where: { appId: app.id, code: "admin" } });
  const teacherRole = await prisma.role.findFirstOrThrow({ where: { appId: app.id, code: "teacher" } });
  const studentRole = await prisma.role.findFirstOrThrow({ where: { appId: app.id, code: "student" } });

  for (const [userId, roleId] of [
    [admin.id, adminRole.id],
    [teacher.id, teacherRole.id],
    [student.id, studentRole.id],
  ] as const) {
    const existing = await prisma.userRole.findFirst({ where: { userId, roleId } });
    if (!existing) {
      await prisma.userRole.create({ data: { userId, roleId, scopeType: "APP" } });
    }
  }

  const category = await prisma.category.upsert({
    where: { appId_slug: { appId: app.id, slug: "programming" } },
    update: {},
    create: { appId: app.id, name: "Programming", slug: "programming", path: "/programming" },
  });

  const product = await prisma.product.upsert({
    where: { appId_slug: { appId: app.id, slug: "typescript-fundamentals" } },
    update: {
      metadataJson: { playSku: "typescript_fundamentals", appleSku: "typescript_fundamentals" },
    },
    create: {
      appId: app.id,
      type: ProductType.VIDEO_COURSE,
      name: "TypeScript Fundamentals",
      slug: "typescript-fundamentals",
      description: "Learn TypeScript from zero to production-ready patterns.",
      status: ProductStatus.PUBLISHED,
      visibility: Visibility.PUBLIC,
      creatorUserId: teacher.id,
      categoryId: category.id,
      metadataJson: { playSku: "typescript_fundamentals", appleSku: "typescript_fundamentals" },
    },
  });

  await prisma.productPrice.deleteMany({ where: { productId: product.id } });
  await prisma.productPrice.create({
    data: { productId: product.id, currency: "VND", amountMinor: 49900000, compareAtMinor: 79900000 },
  });

  let course = await prisma.course.findUnique({ where: { productId: product.id } });
  if (!course) {
    course = await prisma.course.create({
      data: {
        appId: app.id,
        productId: product.id,
        title: "TypeScript Fundamentals",
        level: "beginner",
        language: "vi",
        status: CourseStatus.PUBLISHED,
        creatorUserId: teacher.id,
      },
    });
  }

  const sectionCount = await prisma.courseSection.count({ where: { courseId: course.id } });
  if (sectionCount === 0) {
    const section = await prisma.courseSection.create({
      data: { courseId: course.id, title: "Getting Started", position: 1 },
    });
    const freeLesson = await prisma.lesson.create({
      data: {
        sectionId: section.id,
        title: "Welcome & Preview",
        position: 1,
        durationSec: 420,
        isPreview: true,
      },
    });
    await prisma.lessonContent.create({
      data: {
        lessonId: freeLesson.id,
        contentType: "TEXT",
        body: "Chào mừng bạn đến khóa TypeScript Fundamentals. Bài này miễn phí xem trước.",
        position: 1,
      },
    });
    await prisma.accessPolicy.create({
      data: {
        resourceType: "lesson",
        resourceId: freeLesson.id,
        lessonId: freeLesson.id,
        policyType: PolicyType.FREE,
        priority: 10,
      },
    });

    const paidLesson = await prisma.lesson.create({
      data: {
        sectionId: section.id,
        title: "Types in Depth",
        position: 2,
        durationSec: 900,
        isPreview: false,
      },
    });
    await prisma.lessonContent.create({
      data: {
        lessonId: paidLesson.id,
        contentType: "TEXT",
        body: "Nội dung trả phí: union, intersection, generics cơ bản.",
        position: 1,
      },
    });

    // Demo READY video linked to a paid lesson (playback gated by entitlement)
    const demoVideo = await prisma.video.create({
      data: {
        appId: app.id,
        ownerUserId: teacher.id,
        title: "Types in Depth — demo video",
        status: "READY",
        storageKey: `app/${app.id}/videos/demo-types-in-depth.mp4`,
        assets: {
          create: {
            quality: "720p",
            format: "mp4",
            storageKey: `app/${app.id}/videos/demo-types-in-depth.mp4`,
            sizeBytes: 2048,
          },
        },
      },
    });
    // Ensure memory/S3 key exists for signed download in local memory storage
    await prisma.lessonContent.create({
      data: {
        lessonId: paidLesson.id,
        contentType: "VIDEO",
        refId: demoVideo.id,
        position: 2,
      },
    });

    await prisma.accessPolicy.create({
      data: {
        resourceType: "lesson",
        resourceId: paidLesson.id,
        lessonId: paidLesson.id,
        policyType: PolicyType.PURCHASE_REQUIRED,
        paramsJson: { productId: product.id },
        priority: 20,
      },
    });
    await prisma.accessPolicy.create({
      data: {
        resourceType: "lesson",
        resourceId: paidLesson.id,
        lessonId: paidLesson.id,
        policyType: PolicyType.REWARDED_AD,
        paramsJson: { policyCode: "lesson_unlock_24h" },
        priority: 30,
      },
    });
  }

  // Ensure paid lesson has a READY demo video (idempotent for re-seed)
  const paid = await prisma.lesson.findFirst({
    where: { section: { courseId: course.id }, title: "Types in Depth" },
    include: { contents: true },
  });
  if (paid && !paid.contents.some((c) => c.contentType === "VIDEO")) {
    const demoVideo = await prisma.video.create({
      data: {
        appId: app.id,
        ownerUserId: teacher.id,
        title: "Types in Depth — demo video",
        status: "READY",
        storageKey: `app/${app.id}/videos/demo-types-in-depth.mp4`,
        assets: {
          create: {
            quality: "720p",
            format: "mp4",
            storageKey: `app/${app.id}/videos/demo-types-in-depth.mp4`,
            sizeBytes: 2048,
          },
        },
      },
    });
    await prisma.lessonContent.create({
      data: {
        lessonId: paid.id,
        contentType: "VIDEO",
        refId: demoVideo.id,
        position: (paid.contents.length || 0) + 1,
      },
    });
  }

  await prisma.rewardPolicy.upsert({
    where: { appId_code: { appId: app.id, code: "lesson_unlock_24h" } },
    update: { enabled: true },
    create: {
      appId: app.id,
      code: "lesson_unlock_24h",
      resourceType: "lesson",
      durationHours: 24,
      dailyLimit: 5,
      cooldownMinutes: 30,
      enabled: true,
    },
  });

  // Quiz for course
  const quizCount = await prisma.quiz.count({ where: { courseId: course.id } });
  if (quizCount === 0) {
    await prisma.quiz.create({
      data: {
        courseId: course.id,
        title: "TypeScript Basics Check",
        configJson: { passScore: 70, maxAttempts: 5 },
        questions: {
          create: [
            {
              type: "mcq",
              stem: "TypeScript là gì?",
              position: 1,
              answers: {
                create: [
                  { body: "Superset của JavaScript với static types", isCorrect: true, position: 1 },
                  { body: "Một database", isCorrect: false, position: 2 },
                  { body: "Một CSS framework", isCorrect: false, position: 3 },
                ],
              },
            },
            {
              type: "true_false",
              stem: "interface trong TypeScript chỉ tồn tại lúc compile.",
              position: 2,
              answers: {
                create: [
                  { body: "Đúng", isCorrect: true, position: 1 },
                  { body: "Sai", isCorrect: false, position: 2 },
                ],
              },
            },
          ],
        },
      },
    });
  }

  await prisma.featureFlag.upsert({
    where: { appId_key: { appId: app.id, key: "quiz_enabled" } },
    update: { enabled: true },
    create: { appId: app.id, key: "quiz_enabled", enabled: true, valueJson: {} },
  });

  const configs: Record<string, unknown> = {
    ads_enabled: true,
    rewarded_enabled: true,
    reward_limit: 5,
    reward_duration: 24,
    purchase_enabled: true,
    subscription_enabled: true,
    maintenance_mode: false,
    minimum_version: "1.0.0",
    recommended_version: "1.0.0",
  };
  for (const [key, value] of Object.entries(configs)) {
    await prisma.appConfig.upsert({
      where: { appId_key: { appId: app.id, key } },
      update: { valueJson: value as object },
      create: { appId: app.id, key, valueJson: value as object },
    });
  }

  // Document product
  const docProduct = await prisma.product.upsert({
    where: { appId_slug: { appId: app.id, slug: "ts-cheat-sheet" } },
    update: { metadataJson: { playSku: "ts_cheat_sheet", appleSku: "ts_cheat_sheet" } },
    create: {
      appId: app.id,
      type: ProductType.DIGITAL_DOCUMENT,
      name: "TypeScript Cheat Sheet",
      slug: "ts-cheat-sheet",
      description: "Tài liệu PDF tóm tắt TypeScript.",
      status: ProductStatus.PUBLISHED,
      visibility: Visibility.PUBLIC,
      creatorUserId: teacher.id,
      categoryId: category.id,
      metadataJson: { playSku: "ts_cheat_sheet", appleSku: "ts_cheat_sheet" },
    },
  });
  await prisma.productPrice.deleteMany({ where: { productId: docProduct.id } });
  await prisma.productPrice.create({
    data: { productId: docProduct.id, currency: "VND", amountMinor: 9900000 },
  });
  const existingDoc = await prisma.document.findUnique({ where: { productId: docProduct.id } });
  if (!existingDoc) {
    await prisma.document.create({
      data: {
        appId: app.id,
        productId: docProduct.id,
        ownerUserId: teacher.id,
        title: "TypeScript Cheat Sheet",
        status: "PUBLISHED",
        versions: {
          create: {
            version: 1,
            storageKey: `app/${app.id}/documents/demo-cheatsheet.pdf`,
            mime: "application/pdf",
            sizeBytes: 102400,
            checksum: "demo",
          },
        },
      },
    });
  }

  // Bundle
  const bundleProduct = await prisma.product.upsert({
    where: { appId_slug: { appId: app.id, slug: "ts-starter-bundle" } },
    update: {},
    create: {
      appId: app.id,
      type: ProductType.MIXED_BUNDLE,
      name: "TypeScript Starter Bundle",
      slug: "ts-starter-bundle",
      description: "Combo khóa học + tài liệu.",
      status: ProductStatus.PUBLISHED,
      visibility: Visibility.PUBLIC,
      creatorUserId: teacher.id,
      categoryId: category.id,
    },
  });
  await prisma.productPrice.deleteMany({ where: { productId: bundleProduct.id } });
  await prisma.productPrice.create({
    data: { productId: bundleProduct.id, currency: "VND", amountMinor: 54900000 },
  });
  const existingBundle = await prisma.bundle.findUnique({ where: { productId: bundleProduct.id } });
  if (!existingBundle) {
    await prisma.bundle.create({
      data: {
        productId: bundleProduct.id,
        campaign: "launch",
        items: {
          create: [
            { productId: product.id, position: 1 },
            { productId: docProduct.id, position: 2 },
          ],
        },
      },
    });
  }

  const subProduct = await prisma.product.upsert({
    where: { appId_slug: { appId: app.id, slug: "premium-monthly" } },
    update: { status: ProductStatus.PUBLISHED, visibility: Visibility.PUBLIC },
    create: {
      appId: app.id,
      type: ProductType.SUBSCRIPTION,
      name: "Gói Premium tháng",
      slug: "premium-monthly",
      description: "Thư viện premium 30 ngày — thanh toán VNPay / MoMo / ZaloPay.",
      status: ProductStatus.PUBLISHED,
      visibility: Visibility.PUBLIC,
      creatorUserId: teacher.id,
      categoryId: category.id,
    },
  });
  await prisma.productPrice.deleteMany({ where: { productId: subProduct.id } });
  await prisma.productPrice.create({
    data: { productId: subProduct.id, currency: "VND", amountMinor: 9900000 },
  });

  await prisma.coupon.upsert({
    where: { appId_code: { appId: app.id, code: "WELCOME10" } },
    update: { percentOff: 10, enabled: true, currency: "VND", maxRedemptions: 1000 },
    create: {
      appId: app.id,
      code: "WELCOME10",
      percentOff: 10,
      currency: "VND",
      maxRedemptions: 1000,
      enabled: true,
    },
  });

  const affiliateRole = await prisma.role.findFirstOrThrow({
    where: { appId: app.id, code: "affiliate" },
  });
  const existingAffRole = await prisma.userRole.findFirst({
    where: { userId: teacher.id, roleId: affiliateRole.id },
  });
  if (!existingAffRole) {
    await prisma.userRole.create({
      data: { userId: teacher.id, roleId: affiliateRole.id, scopeType: "APP" },
    });
  }

  await prisma.affiliateCode.upsert({
    where: { appId_code: { appId: app.id, code: "TEACHERREF" } },
    update: { ownerUserId: teacher.id, commissionBps: 1000, active: true },
    create: {
      appId: app.id,
      code: "TEACHERREF",
      ownerUserId: teacher.id,
      commissionBps: 1000,
      active: true,
    },
  });

  // Flash campaign (P4-A)
  const flashEnds = new Date(Date.now() + 7 * 24 * 3600_000);
  const flash = await prisma.promotionCampaign.upsert({
    where: { appId_slug: { appId: app.id, slug: "flash-welcome" } },
    update: {
      enabled: true,
      percentOff: 15,
      startsAt: new Date(Date.now() - 3600_000),
      endsAt: flashEnds,
      badgeText: "Flash -15%",
    },
    create: {
      appId: app.id,
      name: "Flash Welcome",
      slug: "flash-welcome",
      percentOff: 15,
      badgeText: "Flash -15%",
      startsAt: new Date(Date.now() - 3600_000),
      endsAt: flashEnds,
    },
  });
  await prisma.promotionCampaignProduct.upsert({
    where: {
      campaignId_productId: { campaignId: flash.id, productId: product.id },
    },
    update: {},
    create: { campaignId: flash.id, productId: product.id },
  });

  // Drip + prereq on paid lesson (P4-B)
  const previewLesson = await prisma.lesson.findFirst({
    where: { section: { courseId: course.id }, isPreview: true },
  });
  const depthLesson = await prisma.lesson.findFirst({
    where: { section: { courseId: course.id }, title: "Types in Depth" },
  });
  if (depthLesson) {
    await prisma.lesson.update({
      where: { id: depthLesson.id },
      data: {
        dripDaysAfterPurchase: 1,
        prerequisiteLessonId: previewLesson?.id ?? null,
      },
    });
  }

  if (course) {
    const annCount = await prisma.courseAnnouncement.count({ where: { courseId: course.id } });
    if (annCount === 0) {
      await prisma.courseAnnouncement.create({
        data: {
          courseId: course.id,
          authorId: teacher.id,
          title: "Chào mừng khóa học",
          body: "Hãy hoàn thành bài preview trước khi mở Types in Depth (drip 1 ngày sau khi mua).",
        },
      });
    }
  }

  const gplx = await seedGplx(prisma, app.id);

  const gplxCat = await prisma.category.upsert({
    where: { appId_slug: { appId: app.id, slug: "gplx" } },
    update: {},
    create: { appId: app.id, name: "GPLX", slug: "gplx", path: "/gplx" },
  });

  const gplxPro = await prisma.product.upsert({
    where: { appId_slug: { appId: app.id, slug: "gplx-pro" } },
    update: {
      name: "GPLX Pro",
      description: "Thi thử không giới hạn, bỏ quảng cáo ôn tập, mở mẹo nâng cao.",
      status: ProductStatus.PUBLISHED,
      visibility: Visibility.PUBLIC,
      metadataJson: { feature: "gplx_pro", playSku: "gplx_pro", appleSku: "gplx_pro" },
    },
    create: {
      appId: app.id,
      type: ProductType.OTHER_DIGITAL_PRODUCT,
      name: "GPLX Pro",
      slug: "gplx-pro",
      description: "Thi thử không giới hạn, bỏ quảng cáo ôn tập, mở mẹo nâng cao.",
      status: ProductStatus.PUBLISHED,
      visibility: Visibility.PUBLIC,
      creatorUserId: admin.id,
      categoryId: gplxCat.id,
      metadataJson: { feature: "gplx_pro", playSku: "gplx_pro", appleSku: "gplx_pro" },
    },
  });
  await prisma.productPrice.deleteMany({ where: { productId: gplxPro.id } });
  await prisma.productPrice.create({
    data: {
      productId: gplxPro.id,
      currency: "VND",
      amountMinor: 7900000,
      compareAtMinor: 14900000,
    },
  });

  console.log("Seed complete");
  console.log({
    app: app.slug,
    gplx,
    gplxPro: gplxPro.slug,
    accounts: {
      admin: "admin@edu.local",
      teacher: "teacher@edu.local",
      student: "student@edu.local",
      password: "Password123!",
    },
    coupon: "WELCOME10 (10% off)",
    affiliate: "TEACHERREF (teacher, 10% commission)",
    campaign: "flash-welcome (15% while active)",
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
