export const config = {
  port: Number(process.env.PORT) || 3002,
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgresql://users:devpassword@localhost:5432/users",
  nodeEnv: process.env.NODE_ENV || "development",
};
