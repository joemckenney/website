export const config = {
  port: Number.parseInt(process.env.PORT || "3002", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: process.env.DATABASE_URL || "",
  logLevel: process.env.LOG_LEVEL || "info",
};
