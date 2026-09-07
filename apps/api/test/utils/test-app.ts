import "../test-env";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AppModule } from "../../src/app.module";
import { PrismaService } from "../../src/common/prisma/prisma.service";

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();

  app.setGlobalPrefix("api", { exclude: ["health", "ready"] });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: true } })
  );

  await app.init();
  return app;
}

export async function resetDatabase(app: INestApplication): Promise<void> {
  const prisma = app.get(PrismaService);
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.monitorNotification.deleteMany(),
    prisma.notificationProvider.deleteMany(),
    prisma.statusPageMonitor.deleteMany(),
    prisma.statusPage.deleteMany(),
    prisma.incident.deleteMany(),
    prisma.monitorCheck.deleteMany(),
    prisma.monitorTag.deleteMany(),
    prisma.tag.deleteMany(),
    prisma.monitor.deleteMany(),
    prisma.apiToken.deleteMany(),
    prisma.passwordResetToken.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.systemSetting.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}
