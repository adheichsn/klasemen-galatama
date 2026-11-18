// Backward compatibility for older admin clients. Canonical route is /api/admin/events.
// Next.js route segment config must be declared directly in this file.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export { POST } from "../events/route";
