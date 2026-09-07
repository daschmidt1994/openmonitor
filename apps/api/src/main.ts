import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import type { EnvConfig } from "./config/env.validation";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService<EnvConfig, true>);

  app.use(helmet());
  app.use(cookieParser());

  const corsOrigins = config.get("CORS_ORIGINS", { infer: true }).split(",").map((o) => o.trim());
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  });

  app.setGlobalPrefix("api", { exclude: ["health", "ready"] });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    })
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("OpenMonitor API")
    .setDescription("Self-hosted monitoring platform - REST API")
    .setVersion("1.0")
    .addBearerAuth({ type: "http", scheme: "bearer", bearerFormat: "JWT or API token" })
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document);

  const port = config.get("PORT", { infer: true });
  await app.listen(port, "0.0.0.0");
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), level: "info", service: "api", message: `Listening on port ${port}` }));
}

bootstrap();
