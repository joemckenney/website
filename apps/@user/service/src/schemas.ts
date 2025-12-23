import { type Static, Type } from "typebox";

/**
 * User schema - matches Prisma User model
 */
export const User = Type.Object({
  id: Type.String({ description: "User ID (UUID)" }),
  email: Type.String({ description: "User email address" }),
  name: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  avatarUrl: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  provider: Type.String({ description: "OAuth provider (e.g., google)" }),
  providerId: Type.String({ description: "OAuth provider user ID" }),
  createdAt: Type.String({ description: "Creation timestamp (ISO 8601)" }),
  updatedAt: Type.String({ description: "Last update timestamp (ISO 8601)" }),
  metadata: Type.Any({ description: "Additional metadata (JSON)" }),
});
export type UserType = Static<typeof User>;

/**
 * Create user request body
 */
export const CreateUserBody = Type.Object({
  email: Type.String({ description: "User email address" }),
  name: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  avatarUrl: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  provider: Type.String({ description: "OAuth provider (e.g., google)" }),
  providerId: Type.String({ description: "OAuth provider user ID" }),
  metadata: Type.Optional(Type.Any({ description: "Additional metadata" })),
});
export type CreateUserBodyType = Static<typeof CreateUserBody>;

/**
 * Update user request body
 */
export const UpdateUserBody = Type.Object({
  email: Type.Optional(Type.String({ description: "User email address" })),
  name: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  avatarUrl: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  metadata: Type.Optional(Type.Any({ description: "Additional metadata" })),
});
export type UpdateUserBodyType = Static<typeof UpdateUserBody>;

/**
 * Path parameters
 */
export const UserIdParams = Type.Object({
  id: Type.String({ description: "User ID" }),
});
export type UserIdParamsType = Static<typeof UserIdParams>;

export const UserEmailParams = Type.Object({
  email: Type.String({ description: "User email" }),
});
export type UserEmailParamsType = Static<typeof UserEmailParams>;

export const UserProviderParams = Type.Object({
  provider: Type.String({ description: "OAuth provider" }),
  providerId: Type.String({ description: "OAuth provider user ID" }),
});
export type UserProviderParamsType = Static<typeof UserProviderParams>;

/**
 * Response schemas
 */
export const ErrorResponse = Type.Object({
  error: Type.String({ description: "Error message" }),
});
export type ErrorResponseType = Static<typeof ErrorResponse>;

export const HealthResponse = Type.Object({
  status: Type.String({ description: "Health status" }),
  timestamp: Type.String({ description: "Current timestamp" }),
});
export type HealthResponseType = Static<typeof HealthResponse>;
