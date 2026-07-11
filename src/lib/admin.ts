import { verifyToken, type AdminSessionPayload } from "@/lib/auth";
import { cookies } from "next/headers";

export async function requireAdmin(req?: Request) {
  const jar = await cookies();
  let token = jar.get("admin_token")?.value;
  if (!token && req) {
    token =
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || undefined;
  }
  if (!token) throw new Error("UNAUTHORIZED");
  const payload = await verifyToken<AdminSessionPayload>(token);
  if (payload.typ !== "admin") throw new Error("UNAUTHORIZED");
  return payload;
}
