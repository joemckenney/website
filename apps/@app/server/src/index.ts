import Fastify from 'fastify';
import type {TypeBoxTypeProvider} from '@fastify/type-provider-typebox';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import {writeFile, mkdir} from 'node:fs/promises';
//import {squared} from '@website/squared';
import {PingResponse, SquaredRequest, SquaredResponse} from './schemas.js';

const fastify = Fastify({
  logger: true,
}).withTypeProvider<TypeBoxTypeProvider>();

// Register CORS
await fastify.register(cors, {
  origin: true, // Allow all origins in development
});

// Register Swagger/OpenAPI
await fastify.register(swagger, {
  openapi: {
    info: {
      title: 'Squared API',
      description: 'API with ping and squared endpoints using WASM',
      version: '1.0.0',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
  },
});

await fastify.register(swaggerUi, {
  routePrefix: '/docs',
});

// Ping endpoint
fastify.get(
  '/ping',
  {
    schema: {
      description: 'Health check endpoint',
      tags: ['health'],
      response: {
        200: PingResponse,
      },
    },
  },
  async () => {
    return {message: 'pong'};
  }
);

// Squared endpoint
fastify.post(
  '/squared',
  {
    schema: {
      description: 'Calculate the square of a number using WASM',
      tags: ['math'],
      body: SquaredRequest,
      response: {
        200: SquaredResponse,
      },
    },
  },
  async (request) => {
    const {number} = request.body;
    const result = number * number;
    return {input: number, result};
  }
);

// Start server
const start = async () => {
  try {
    await fastify.listen({port: 3000, host: '0.0.0.0'});

    // Generate OpenAPI spec to dist folder
    await mkdir('./dist', {recursive: true});
    const spec = fastify.swagger();
    await writeFile('./dist/openapi.json', JSON.stringify(spec, null, 2));

    console.log('Server listening on http://localhost:3000');
    console.log('OpenAPI docs available at http://localhost:3000/docs');
    console.log('OpenAPI spec written to dist/openapi.json');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
