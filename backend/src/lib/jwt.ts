import jwt from "jsonwebtoken";
import { createHash } from "crypto";

const SECRET = process.env.SESSION_SECRET ?? "change-me-in-production";

export interface TokenPayload {
  userId:  string;
  storeId: string;
  role:    string;
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: "15m" });
}

export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, SECRET) as TokenPayload;
}

export function hashPassword(password: string): string {
  return createHash("sha256").update(password + SECRET).digest("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
