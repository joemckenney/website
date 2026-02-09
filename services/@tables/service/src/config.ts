export const config = {
  port: Number(process.env.PORT) || 3005,
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgresql://tables:devpassword@localhost:5434/tables",
  nodeEnv: process.env.NODE_ENV || "development",
  // Materializer config - background worker for PostgreSQL sync
  materializerIntervalMs: Number(process.env.MATERIALIZER_INTERVAL_MS) || 5000,
  materializerBatchSize: Number(process.env.MATERIALIZER_BATCH_SIZE) || 100,
};
