export const config = {
  port: Number(process.env.PORT) || 3005,
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgresql://tables:devpassword@localhost:5434/tables",
  nodeEnv: process.env.NODE_ENV || "development",
  // Materializer config
  materializerIntervalMs: Number(process.env.MATERIALIZER_INTERVAL_MS) || 500,
  materializerBatchSize: Number(process.env.MATERIALIZER_BATCH_SIZE) || 100,
};
