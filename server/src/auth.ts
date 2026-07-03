import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";

const JWT_SECRET = process.env.JWT_SECRET || "tiza-dev-secret-change-me";
const TOKEN_TTL = "30d";

if (!process.env.JWT_SECRET) {
  console.warn(
    "[auth] JWT_SECRET not set — using an insecure dev secret. Set it in production."
  );
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signToken(userId: string): string {
  return jwt.sign({ uid: userId }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export function verifyToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { uid: string };
    return payload.uid;
  } catch {
    return null;
  }
}

/** Express request with the authenticated user id attached. */
export interface AuthedRequest extends Request {
  userId?: string;
}

export function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const uid = token ? verifyToken(token) : null;
  if (!uid) {
    res.status(401).json({ error: "no autenticado" });
    return;
  }
  req.userId = uid;
  next();
}
