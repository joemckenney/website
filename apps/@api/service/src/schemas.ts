import { type Static, Type } from "typebox";

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
 * misc
 */
export const ErrorResponse = Type.Object({
  error: Type.String({ description: "Error message" }),
});
export type ErrorResponseType = Static<typeof ErrorResponse>;
