import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { CATALOG_TAG } from "@/lib/catalog";
import { db } from "@/lib/db";
import { seedDemo } from "@/lib/demo-data";
import { anonymizeExpired } from "@/lib/gdpr";

/**
 * Daily job, called by Vercel Cron (see vercel.json) with "Authorization: Bearer $CRON_SECRET".
 * - always: GDPR retention cleanup
 * - public demo (DEMO_MODE=1): reset all data, so visitors always see a tidy shop
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (!secret || auth.length !== expected.length || !timingSafeEqual(auth, expected)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const anonymized = await anonymizeExpired();
  let demo = null;
  if (process.env.DEMO_MODE === "1") {
    demo = await seedDemo(db);
    revalidateTag(CATALOG_TAG, { expire: 0 });
  }
  return Response.json({ ok: true, anonymized, demo });
}
