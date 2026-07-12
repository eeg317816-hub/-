import { SignJWT, jwtVerify } from "jose";

function secret() {
  const raw = process.env.ADMIN_JWT_SECRET;
  if (!raw) {
    console.error("[auth] 缺少 ADMIN_JWT_SECRET");
    throw new Error("Missing ADMIN_JWT_SECRET");
  }
  return new TextEncoder().encode(raw);
}

export type AdminSessionPayload = {
  typ: "admin";
  adminId: string;
  username: string;
};

export async function signAdminSession(payload: AdminSessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("12h")
    .sign(secret());
}

export async function verifyToken<T>(token: string) {
  const { payload } = await jwtVerify(token, secret());
  return payload as unknown as T;
}
