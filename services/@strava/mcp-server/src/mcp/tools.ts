/**
 * Strava MCP Tool implementations
 *
 * Initial minimal set of tools:
 * - get-recent-activities: List recent workouts
 * - get-activity-details: Get specific activity
 * - get-athlete-stats: YTD/all-time stats
 */

const STRAVA_API_BASE = "https://www.strava.com/api/v3";

/**
 * Tool definition for MCP
 */
interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Get tool definitions for MCP tools/list
 */
export function getToolDefinitions(): ToolDefinition[] {
  return [
    {
      name: "get-recent-activities",
      description:
        "Get the authenticated athlete's recent activities. Returns a list of the most recent workouts with summary information including type, distance, time, and date.",
      inputSchema: {
        type: "object",
        properties: {
          per_page: {
            type: "number",
            description: "Number of activities to return (default: 30, max: 200)",
          },
          page: {
            type: "number",
            description: "Page number for pagination (default: 1)",
          },
        },
      },
    },
    {
      name: "get-activity-details",
      description:
        "Get detailed information about a specific activity by ID. Includes full activity data like segments, laps, splits, and other detailed metrics.",
      inputSchema: {
        type: "object",
        properties: {
          id: {
            type: "number",
            description: "The activity ID",
          },
          include_all_efforts: {
            type: "boolean",
            description: "Include all segment efforts (default: false)",
          },
        },
        required: ["id"],
      },
    },
    {
      name: "get-athlete-stats",
      description:
        "Get the authenticated athlete's statistics including recent, year-to-date, and all-time totals for runs, rides, and swims. Great for understanding training volume and progress.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
  ];
}

/**
 * Make authenticated request to Strava API
 */
async function stravaRequest<T>(
  endpoint: string,
  accessToken: string,
  params?: Record<string, string | number | boolean>,
): Promise<T> {
  const url = new URL(`${STRAVA_API_BASE}${endpoint}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Strava API error (${response.status}): ${error}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Handle a tool call
 */
export async function handleToolCall(
  toolName: string,
  args: Record<string, unknown>,
  accessToken: string,
): Promise<unknown> {
  switch (toolName) {
    case "get-recent-activities":
      return getRecentActivities(accessToken, args);

    case "get-activity-details":
      return getActivityDetails(accessToken, args);

    case "get-athlete-stats":
      return getAthleteStats(accessToken);

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

/**
 * Get recent activities
 */
async function getRecentActivities(
  accessToken: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const perPage = Math.min(Number(args.per_page) || 30, 200);
  const page = Number(args.page) || 1;

  const activities = await stravaRequest<unknown[]>(
    "/athlete/activities",
    accessToken,
    { per_page: perPage, page },
  );

  // Return simplified activity summaries
  return activities.map((activity: any) => ({
    id: activity.id,
    name: activity.name,
    type: activity.type,
    sport_type: activity.sport_type,
    start_date: activity.start_date_local,
    distance_meters: activity.distance,
    moving_time_seconds: activity.moving_time,
    elapsed_time_seconds: activity.elapsed_time,
    total_elevation_gain: activity.total_elevation_gain,
    average_speed: activity.average_speed,
    max_speed: activity.max_speed,
    average_heartrate: activity.average_heartrate,
    max_heartrate: activity.max_heartrate,
    suffer_score: activity.suffer_score,
  }));
}

/**
 * Get activity details
 */
async function getActivityDetails(
  accessToken: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const id = args.id as number;
  if (!id) {
    throw new Error("Activity ID is required");
  }

  const includeAllEfforts = Boolean(args.include_all_efforts);

  const activity = await stravaRequest<any>(
    `/activities/${id}`,
    accessToken,
    { include_all_efforts: includeAllEfforts },
  );

  return {
    id: activity.id,
    name: activity.name,
    description: activity.description,
    type: activity.type,
    sport_type: activity.sport_type,
    start_date: activity.start_date_local,
    timezone: activity.timezone,
    distance_meters: activity.distance,
    moving_time_seconds: activity.moving_time,
    elapsed_time_seconds: activity.elapsed_time,
    total_elevation_gain: activity.total_elevation_gain,
    elev_high: activity.elev_high,
    elev_low: activity.elev_low,
    average_speed: activity.average_speed,
    max_speed: activity.max_speed,
    average_cadence: activity.average_cadence,
    average_watts: activity.average_watts,
    weighted_average_watts: activity.weighted_average_watts,
    max_watts: activity.max_watts,
    average_heartrate: activity.average_heartrate,
    max_heartrate: activity.max_heartrate,
    calories: activity.calories,
    suffer_score: activity.suffer_score,
    perceived_exertion: activity.perceived_exertion,
    laps: activity.laps?.map((lap: any) => ({
      name: lap.name,
      distance: lap.distance,
      elapsed_time: lap.elapsed_time,
      moving_time: lap.moving_time,
      average_speed: lap.average_speed,
      average_heartrate: lap.average_heartrate,
    })),
    segment_efforts: activity.segment_efforts?.slice(0, 10).map((effort: any) => ({
      name: effort.name,
      distance: effort.distance,
      elapsed_time: effort.elapsed_time,
      moving_time: effort.moving_time,
      pr_rank: effort.pr_rank,
    })),
    splits_metric: activity.splits_metric?.map((split: any) => ({
      distance: split.distance,
      elapsed_time: split.elapsed_time,
      moving_time: split.moving_time,
      average_speed: split.average_speed,
      average_heartrate: split.average_heartrate,
      pace_zone: split.pace_zone,
    })),
  };
}

/**
 * Get athlete stats
 */
async function getAthleteStats(accessToken: string): Promise<unknown> {
  // First get the athlete ID
  const athlete = await stravaRequest<{ id: number }>("/athlete", accessToken);

  // Then get their stats
  const stats = await stravaRequest<any>(
    `/athletes/${athlete.id}/stats`,
    accessToken,
  );

  return {
    recent_run_totals: stats.recent_run_totals,
    recent_ride_totals: stats.recent_ride_totals,
    recent_swim_totals: stats.recent_swim_totals,
    ytd_run_totals: stats.ytd_run_totals,
    ytd_ride_totals: stats.ytd_ride_totals,
    ytd_swim_totals: stats.ytd_swim_totals,
    all_run_totals: stats.all_run_totals,
    all_ride_totals: stats.all_ride_totals,
    all_swim_totals: stats.all_swim_totals,
    biggest_ride_distance: stats.biggest_ride_distance,
    biggest_climb_elevation_gain: stats.biggest_climb_elevation_gain,
  };
}
