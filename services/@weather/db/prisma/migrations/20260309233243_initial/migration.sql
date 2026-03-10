-- CreateTable
CREATE TABLE "WeatherReading" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "tempf" DOUBLE PRECISION NOT NULL,
    "humidity" INTEGER NOT NULL,
    "windspeedmph" DOUBLE PRECISION NOT NULL,
    "windgustmph" DOUBLE PRECISION NOT NULL,
    "maxdailygust" DOUBLE PRECISION NOT NULL,
    "winddir" INTEGER NOT NULL,
    "winddir_avg10m" INTEGER NOT NULL,
    "uv" INTEGER NOT NULL,
    "solarradiation" DOUBLE PRECISION NOT NULL,
    "hourlyrainin" DOUBLE PRECISION NOT NULL,
    "dailyrainin" DOUBLE PRECISION NOT NULL,
    "baromrelin" DOUBLE PRECISION NOT NULL,
    "baromabsin" DOUBLE PRECISION NOT NULL,
    "tempinf" DOUBLE PRECISION NOT NULL,
    "humidityin" INTEGER NOT NULL,
    "feelsLike" DOUBLE PRECISION NOT NULL,
    "dewPoint" DOUBLE PRECISION NOT NULL,
    "raw" JSONB NOT NULL,

    CONSTRAINT "WeatherReading_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WeatherReading_timestamp_key" ON "WeatherReading"("timestamp");

-- CreateIndex
CREATE INDEX "WeatherReading_timestamp_idx" ON "WeatherReading"("timestamp");
