import { z } from "zod";
import { AvailabilityError, getAvailability } from "@/lib/availability";

const Query = z.object({
  serviceId: z.coerce.number().int().positive(),
  staffId: z
    .union([z.literal("any"), z.coerce.number().int().positive()])
    .default("any")
    .transform((v) => (v === "any" ? null : v)),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/** GET /api/availability?serviceId=1&staffId=any&date=2026-12-01 */
export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = Query.safeParse(params);
  if (!parsed.success) {
    return Response.json({ error: "Invalid query" }, { status: 400 });
  }
  try {
    const slots = await getAvailability(parsed.data);
    return Response.json({ slots }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof AvailabilityError) return Response.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
