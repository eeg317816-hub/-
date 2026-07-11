import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/api";
import { signAdminSession } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const username = String(body?.username || "");
  const password = String(body?.password || "");
  const admin = await prisma.adminUser.findUnique({ where: { username } });
  if (
    !admin ||
    admin.status !== "active" ||
    !(await bcrypt.compare(password, admin.passwordHash))
  ) {
    return fail("账号或密码错误", 401);
  }
  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });
  const token = await signAdminSession({
    typ: "admin",
    adminId: String(admin.id),
    username: admin.username,
  });
  const jar = await cookies();
  jar.set("admin_token", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return ok({ username: admin.username, role: admin.role });
}
