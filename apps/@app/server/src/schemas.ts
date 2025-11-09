import { Type, Static } from "@sinclair/typebox";

// Ping endpoint schemas
export const PingResponse = Type.Object({
  message: Type.String({ description: "Response message" }),
});

export type PingResponseType = Static<typeof PingResponse>;

// Squared endpoint schemas
export const SquaredRequest = Type.Object({
  number: Type.Number({ description: "The number to square" }),
});

export const SquaredResponse = Type.Object({
  input: Type.Number({ description: "The input number" }),
  result: Type.Number({ description: "The squared result" }),
});

export type SquaredRequestType = Static<typeof SquaredRequest>;
export type SquaredResponseType = Static<typeof SquaredResponse>;

// Auth endpoint schemas
export const RefreshTokenResponse = Type.Object({
  access_token: Type.String({ description: "New access token" }),
});

export const LogoutResponse = Type.Object({
  message: Type.String({ description: "Logout confirmation message" }),
});

export const MeResponse = Type.Object({
  email: Type.String({ description: "User email address" }),
});

export const ErrorResponse = Type.Object({
  error: Type.String({ description: "Error message" }),
});

export type RefreshTokenResponseType = Static<typeof RefreshTokenResponse>;
export type LogoutResponseType = Static<typeof LogoutResponse>;
export type MeResponseType = Static<typeof MeResponse>;
export type ErrorResponseType = Static<typeof ErrorResponse>;
