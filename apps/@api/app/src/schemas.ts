import { Type, Static } from "typebox";

/*
 * /ping
 */
export const PingResponse = Type.Object({
  message: Type.String({ description: "Response message" }),
});

export type PingResponseType = Static<typeof PingResponse>;

/*
 * /squared
 */
export const SquaredRequest = Type.Object({
  number: Type.Number({ description: "The number to square" }),
});
export type SquaredRequestType = Static<typeof SquaredRequest>;

export const SquaredResponse = Type.Object({
  input: Type.Number({ description: "The input number" }),
  result: Type.Number({ description: "The squared result" }),
});
export type SquaredResponseType = Static<typeof SquaredResponse>;

/*
 * /auth/refresh
 */
export const RefreshTokenResponse = Type.Object({
  access_token: Type.String({ description: "New access token" }),
});
export type RefreshTokenResponseType = Static<typeof RefreshTokenResponse>;

/*
 * /auth/logout
 */
export const LogoutResponse = Type.Object({
  message: Type.String({ description: "Logout confirmation message" }),
});
export type LogoutResponseType = Static<typeof LogoutResponse>;

/*
 * /auth/me
 */
export const MeResponse = Type.Object({
  email: Type.String({ description: "User email address" }),
});
export type MeResponseType = Static<typeof MeResponse>;

/*
 * misc
 */
export const ErrorResponse = Type.Object({
  error: Type.String({ description: "Error message" }),
});
export type ErrorResponseType = Static<typeof ErrorResponse>;
