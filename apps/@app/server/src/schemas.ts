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
