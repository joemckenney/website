import { type Static, Type } from "typebox";

/*
 * /refresh
 */
export const RefreshTokenResponse = Type.Object({
  access_token: Type.String({ description: "New access token" }),
});
export type RefreshTokenResponseType = Static<typeof RefreshTokenResponse>;

/*
 * /logout
 */
export const LogoutResponse = Type.Object({
  message: Type.String({ description: "Logout confirmation message" }),
});
export type LogoutResponseType = Static<typeof LogoutResponse>;

/*
 * /me
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
