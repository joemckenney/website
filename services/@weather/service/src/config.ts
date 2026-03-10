export const config = {
  port: Number(process.env.PORT) || 3004,
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgresql://weather:devpassword@localhost:5435/weather",
  nodeEnv: process.env.NODE_ENV || "development",
  awnApiKey: process.env.AWN_API_KEY || "",
  awnAppKey: process.env.AWN_APP_KEY || "",
  awnMacAddress: process.env.AWN_MAC_ADDRESS || "94:3C:C6:45:0A:BB",
};
