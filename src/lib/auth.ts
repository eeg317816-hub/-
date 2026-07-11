import { SignJWT, jwtVerify } from "jose";

const secret = () =>
  new TextEncoder().encode(process.env.ADMIN_JWT_SECRET || "dev-secret");

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
