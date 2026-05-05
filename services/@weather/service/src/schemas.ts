import { Type } from "typebox";

export const WeatherReading = Type.Object(
  {
    id: Type.String({ description: "Unique reading ID" }),
    timestamp: Type.String({
      format: "date-time",
      description: "Reading timestamp",
    }),
    tempf: Type.Number({ description: "Temperature (Fahrenheit)" }),
    humidity: Type.Integer({ description: "Outdoor humidity (%)" }),
    windspeedmph: Type.Number({ description: "Wind speed (mph)" }),
    windgustmph: Type.Number({ description: "Wind gust (mph)" }),
    maxdailygust: Type.Number({ description: "Max daily gust (mph)" }),
    winddir: Type.Integer({ description: "Wind direction (degrees)" }),
    winddir_avg10m: Type.Integer({
      description: "10-min avg wind direction (degrees)",
    }),
    uv: Type.Integer({ description: "UV index" }),
    solarradiation: Type.Number({ description: "Solar radiation (W/m2)" }),
    hourlyrainin: Type.Number({ description: "Hourly rain (inches)" }),
    dailyrainin: Type.Number({ description: "Daily rain (inches)" }),
    baromrelin: Type.Number({
      description: "Relative barometric pressure (inHg)",
    }),
    baromabsin: Type.Number({
      description: "Absolute barometric pressure (inHg)",
    }),
    tempinf: Type.Number({ description: "Indoor temperature (Fahrenheit)" }),
    humidityin: Type.Integer({ description: "Indoor humidity (%)" }),
    feelsLike: Type.Number({
      description: "Feels like temperature (Fahrenheit)",
    }),
    dewPoint: Type.Number({ description: "Dew point (Fahrenheit)" }),
  },
  { $id: "WeatherReading", description: "A single weather station reading" },
);

export const WeatherReadingArray = Type.Array(WeatherReading);

export const HistoryQuery = Type.Object({
  start: Type.Optional(
    Type.String({
      format: "date-time",
      description: "Start of range (ISO 8601)",
    }),
  ),
  end: Type.Optional(
    Type.String({
      format: "date-time",
      description: "End of range (ISO 8601)",
    }),
  ),
  limit: Type.Optional(
    Type.Integer({
      minimum: 1,
      maximum: 10000,
      default: 288,
      description: "Max results (288 = 1 day at 5-min intervals)",
    }),
  ),
});

export const ErrorResponse = Type.Object({
  error: Type.String({ description: "Error message" }),
});

export const HealthResponse = Type.Object({
  status: Type.String(),
  timestamp: Type.String({ format: "date-time" }),
});
