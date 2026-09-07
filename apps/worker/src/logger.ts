type Level = "info" | "warn" | "error" | "debug";

function write(level: Level, message: string, meta?: Record<string, unknown>) {
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      service: "worker",
      message,
      ...meta,
    })
  );
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => write("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => write("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => write("error", message, meta),
  debug: (message: string, meta?: Record<string, unknown>) => write("debug", message, meta),
};
