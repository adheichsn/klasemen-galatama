/** Public images: only HTTPS URLs and WEJI's immutable, uploaded PNG/JPEG/WEBP assets. */
export const WEJI_ASSET_URL =
  /^\/api\/assets\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validBannerUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 500) return false;
  if (!value) return true;
  if (/[\s"'`()\\]/.test(value)) return false;
  if (WEJI_ASSET_URL.test(value)) return true;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !!url.hostname &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}
