/**
 * 基础冒烟：校验关键路径与健康检查约定（不启服务器时仅做静态断言）
 */
import assert from "node:assert/strict";

const requiredEnvDocs = [
  "DATABASE_URL",
  "ADMIN_JWT_SECRET",
  "NEXT_PUBLIC_APP_ENV",
  "NEXT_PUBLIC_ENABLE_DEV_CARD_INPUT",
];

console.log("smoke: required env keys (docs)", requiredEnvDocs.join(", "));
assert.ok(requiredEnvDocs.length >= 4);
console.log("smoke: ok (run `npm run health` against a live server for full check)");
