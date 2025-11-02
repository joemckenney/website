// Re-export everything from the generated client
export * from './generated/index.js';

// Import generated functions
import { client as baseClient, postSquared, getPing } from './generated/index.js';
import type { PostSquaredData, GetPingData } from './generated/types.gen.js';

// Create a wrapper with nested API structure
export const api = {
  client: baseClient,

  ping: {
    get: (options?: { client?: typeof baseClient }) => getPing(options),
  },

  squared: {
    post: (data: PostSquaredData, options?: { client?: typeof baseClient }) =>
      postSquared({ body: data.body, ...options }),
  },
};
