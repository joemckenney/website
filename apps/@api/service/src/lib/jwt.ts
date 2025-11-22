import jwt from "jsonwebtoken";
import { config } from "../config.js";

export interface TokenPayload {
  email: string;
  type: "access" | "refresh";
}

export function generateAccessToken(email: string): string {
  const payload: TokenPayload = {
    email,
    type: "access",
  };

  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessTokenExpiry,
  });
}

export function generateRefreshToken(email: string): string {
  const payload: TokenPayload = {
    email,
    type: "refresh",
  };

  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshTokenExpiry,
  });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwt.accessSecret) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwt.refreshSecret) as TokenPayload;
}
