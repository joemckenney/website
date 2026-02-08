/**
 * Hocuspocus Server for Yjs Collaboration
 *
 * Handles WebSocket connections for real-time Yjs sync.
 * Uses LevelDB for persistent storage of Y.Doc state.
 */

import {
  Hocuspocus,
  type onAuthenticatePayload,
  type onLoadDocumentPayload,
  type onStoreDocumentPayload,
  type onConnectPayload,
  type onDisconnectPayload,
} from "@hocuspocus/server";
import * as Y from "yjs";
import jwt from "jsonwebtoken";
// @ts-expect-error - y-leveldb doesn't have proper ESM types
import { LeveldbPersistence } from "y-leveldb";
import { config } from "../config.js";
import { prisma } from "../db/client.js";
import { queueMaterialization } from "./materializer.js";
import { getTableMeta, initializeTableDoc } from "./schema.js";

// LevelDB persistence for Yjs documents
const DATA_DIR = process.env.YJS_DATA_DIR ?? "./data/yjs";
let persistence: LeveldbPersistence;

/**
 * Initialize the LevelDB persistence layer
 */
async function initPersistence(): Promise<void> {
  persistence = new LeveldbPersistence(DATA_DIR);
  console.log(`Yjs LevelDB persistence initialized at ${DATA_DIR}`);
}

/**
 * The Hocuspocus instance for Yjs sync
 */
export const hocuspocus = new Hocuspocus({
  timeout: 30000,
  debounce: 2000,
  maxDebounce: 10000,

  /**
   * Authenticate incoming connections
   */
  async onAuthenticate(data: onAuthenticatePayload) {
    const { token, documentName, requestHeaders } = data;

    // Extract userId from JWT token (email) or x-user-id header
    let userId: string | undefined;

    // Try x-user-id header first (from gateway proxy)
    if (requestHeaders["x-user-id"]) {
      userId = requestHeaders["x-user-id"] as string;
    }

    // Fall back to decoding JWT token to get email
    if (!userId && token && typeof token === "string") {
      const decoded = jwt.decode(token) as { email?: string; sub?: string } | null;
      userId = decoded?.email || decoded?.sub;
    }

    if (!userId || typeof userId !== "string") {
      throw new Error("Unauthorized: Missing user ID");
    }

    // Extract tableId from documentName (format: "table:{tableId}")
    const tableId = documentName.replace("table:", "");

    // Verify user has access to this table
    const tableMeta = await prisma.tableMeta.findFirst({
      where: {
        id: tableId,
        userId: userId,
      },
    });

    if (!tableMeta) {
      console.log("[Yjs] Auth failed: table not found for", tableId, "user", userId);
      throw new Error("Unauthorized: Table not found or access denied");
    }

    console.log("[Yjs] Auth successful for table", tableId, "user", userId);

    // Store userId in connection context for later use
    return {
      userId,
      tableId,
    };
  },

  /**
   * Load document from LevelDB persistence
   */
  async onLoadDocument(data: onLoadDocumentPayload) {
    const { document, documentName } = data;
    const tableId = documentName.replace("table:", "");

    try {
      // Try to load from LevelDB first
      const persistedDoc = await persistence.getYDoc(documentName);

      if (persistedDoc) {
        // Apply persisted state to the document
        const update = Y.encodeStateAsUpdate(persistedDoc);
        Y.applyUpdate(document, update);
        console.log(`Loaded Y.Doc for table ${tableId} from persistence`);
      } else {
        // No persisted doc - check if we need to initialize from database
        const tableMeta = await prisma.tableMeta.findUnique({
          where: { id: tableId },
        });

        if (tableMeta) {
          // Initialize empty doc with table metadata
          initializeTableDoc(document, {
            name: tableMeta.name,
            createdAt: tableMeta.createdAt.toISOString(),
          });
          console.log(
            `Initialized new Y.Doc for existing table ${tableId}: ${tableMeta.name}`,
          );
        }
      }
    } catch (err) {
      console.error(`Error loading Y.Doc for ${tableId}:`, err);
      // Continue with empty document
    }

    return document;
  },

  /**
   * Store document updates to LevelDB and queue materialization
   */
  async onStoreDocument(data: onStoreDocumentPayload) {
    const { document, documentName } = data;
    const tableId = documentName.replace("table:", "");

    try {
      // Store the update in LevelDB
      const update = Y.encodeStateAsUpdate(document);
      await persistence.storeUpdate(documentName, update);

      // Queue async materialization to PostgreSQL
      queueMaterialization(tableId, document);

      // Update table metadata timestamp
      const meta = getTableMeta(document);
      await prisma.tableMeta.update({
        where: { id: tableId },
        data: {
          name: meta.name,
          updatedAt: new Date(),
        },
      });
    } catch (err) {
      console.error(`Error storing Y.Doc for ${tableId}:`, err);
    }
  },

  /**
   * Handle new connections
   */
  async onConnect(data: onConnectPayload) {
    const { documentName, context } = data;
    const tableId = documentName.replace("table:", "");
    const ctx = context as { userId?: string } | undefined;
    console.log(
      `Client connected to table ${tableId} (user: ${ctx?.userId})`,
    );
  },

  /**
   * Handle disconnections
   */
  async onDisconnect(data: onDisconnectPayload) {
    const { documentName, context } = data;
    const tableId = documentName.replace("table:", "");
    const ctx = context as { userId?: string } | undefined;
    console.log(
      `Client disconnected from table ${tableId} (user: ${ctx?.userId})`,
    );
  },
});

// Simple WebSocket server using ws
import { WebSocketServer } from "ws";
import type { Server as HttpServer } from "node:http";
import { createServer } from "node:http";

let httpServer: HttpServer;
let wsServer: WebSocketServer;

/**
 * Start the Hocuspocus server
 */
export async function startYjsServer(): Promise<void> {
  await initPersistence();

  // Create HTTP server
  httpServer = createServer();

  // Create WebSocket server
  wsServer = new WebSocketServer({ server: httpServer });

  // Handle WebSocket connections
  wsServer.on("connection", async (socket, request) => {
    console.log("[Yjs] WebSocket connection received, URL:", request.url);
    try {
      hocuspocus.handleConnection(socket, request);
      console.log("[Yjs] handleConnection completed");
    } catch (err) {
      console.error("[Yjs] handleConnection error:", err);
    }
  });

  // Start listening
  httpServer.listen(config.yjsPort, () => {
    console.log(`Hocuspocus Yjs server listening on port ${config.yjsPort}`);
  });
}

/**
 * Stop the Hocuspocus server
 */
export async function stopYjsServer(): Promise<void> {
  // Close all connections and cleanup
  for (const [, doc] of hocuspocus.documents) {
    hocuspocus.unloadDocument(doc);
  }

  if (wsServer) {
    wsServer.close();
  }

  if (httpServer) {
    httpServer.close();
  }

  if (persistence) {
    await persistence.destroy();
  }

  console.log("Hocuspocus server stopped");
}

/**
 * Get or create a Y.Doc for a table (for server-side access, e.g., MCP tools)
 */
export async function getTableDoc(tableId: string): Promise<Y.Doc> {
  const documentName = `table:${tableId}`;

  // Check if document is already loaded in Hocuspocus
  const existingDoc = hocuspocus.documents.get(documentName);
  if (existingDoc) {
    // Return the underlying Y.Doc from the Hocuspocus Document
    return existingDoc;
  }

  // Load from persistence
  const doc = new Y.Doc();
  const persistedDoc = await persistence.getYDoc(documentName);

  if (persistedDoc) {
    const update = Y.encodeStateAsUpdate(persistedDoc);
    Y.applyUpdate(doc, update);
  }

  return doc;
}

/**
 * Apply an update to a table's Y.Doc and broadcast to all connected clients
 */
export async function applyTableUpdate(
  tableId: string,
  updateFn: (doc: Y.Doc) => void,
): Promise<void> {
  const documentName = `table:${tableId}`;

  // Get the document - check Hocuspocus first, then load from persistence
  const hocusDoc = hocuspocus.documents.get(documentName);
  let doc: Y.Doc;

  if (hocusDoc) {
    // Use the Hocuspocus document (it's a Y.Doc with extensions)
    doc = hocusDoc;
  } else {
    // Load from persistence if not in memory
    doc = await getTableDoc(tableId);
  }

  // Apply the update
  doc.transact(() => {
    updateFn(doc);
  });

  // Store the update
  const update = Y.encodeStateAsUpdate(doc);
  await persistence.storeUpdate(documentName, update);

  // Queue materialization
  queueMaterialization(tableId, doc);
}

/**
 * Create a new table with Yjs document
 */
export async function createTableDoc(
  tableId: string,
  userId: string,
  name: string,
): Promise<void> {
  const documentName = `table:${tableId}`;

  // Create the Y.Doc
  const doc = new Y.Doc();
  initializeTableDoc(doc, { name });

  // Persist immediately
  const update = Y.encodeStateAsUpdate(doc);
  await persistence.storeUpdate(documentName, update);

  // Create metadata in PostgreSQL
  await prisma.tableMeta.create({
    data: {
      id: tableId,
      userId,
      name,
    },
  });

  console.log(`Created new table ${tableId}: ${name}`);
}

/**
 * Delete a table's Yjs document
 */
export async function deleteTableDoc(tableId: string): Promise<void> {
  const documentName = `table:${tableId}`;

  // Close any open connections to this document
  const doc = hocuspocus.documents.get(documentName);
  if (doc) {
    // Unload the document which will close connections
    hocuspocus.unloadDocument(doc);
  }

  // Clear from LevelDB
  await persistence.clearDocument(documentName);

  // Delete from PostgreSQL
  await prisma.tableMeta.delete({
    where: { id: tableId },
  });

  console.log(`Deleted table ${tableId}`);
}
