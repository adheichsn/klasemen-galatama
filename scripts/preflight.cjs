// Read-only environment sanity check. Never print credential values.
const errors = [];
const warnings = [];
const db = process.env.DATABASE_URL;
function checkUrl(name, url, required) {
  if (!url && !required) return null;
  if (!url) {
    errors.push(`${name} belum diisi`);
    return null;
  }
  try {
    const u = new URL(url);
    if (
      !["postgres:", "postgresql:"].includes(u.protocol) ||
      !u.hostname ||
      !u.username ||
      !u.password
    ) {
      errors.push(`${name} tidak berupa URL PostgreSQL lengkap`);
      return null;
    }
    if (
      u.searchParams.get("sslmode") !== "require" &&
      process.env.NODE_ENV === "production"
    )
      warnings.push(`${name}: periksa apakah TLS PostgreSQL wajib/aktif`);
    return u;
  } catch {
    errors.push(`${name} bukan URL yang valid`);
    return null;
  }
}
const main = checkUrl("DATABASE_URL", db, true);
const listener = checkUrl(
  "WEJI_LISTEN_DATABASE_URL",
  process.env.WEJI_LISTEN_DATABASE_URL,
  false,
);
if (!process.env.WEJI_ADMIN_USERNAME?.trim())
  errors.push("WEJI_ADMIN_USERNAME belum diisi");
if (
  !/^[a-f0-9]{32,128}:[a-f0-9]{128}$/i.test(
    process.env.WEJI_ADMIN_PASSWORD_HASH || "",
  )
)
  errors.push("WEJI_ADMIN_PASSWORD_HASH tidak sesuai format scrypt");
if ((process.env.WEJI_SESSION_SECRET || "").length < 32)
  errors.push("WEJI_SESSION_SECRET minimal 32 karakter acak");
if (main?.port === "6543" && !listener)
  warnings.push(
    "DATABASE_URL transaction pooler: SSE nonaktif; polling tetap berjalan. Set WEJI_LISTEN_DATABASE_URL (session pooler) bila perlu push live.",
  );
if (listener?.port === "6543")
  warnings.push(
    "WEJI_LISTEN_DATABASE_URL port 6543 tidak mendukung LISTEN; gunakan session pooler port 5432.",
  );
if (process.env.VERCEL !== "1")
  warnings.push(
    "Tanpa trusted Vercel proxy, rate limit login menggunakan satu bucket bersama; terapkan WAF/reverse-proxy tepercaya untuk deployment non-Vercel.",
  );
for (const warning of warnings) console.warn(`WARNING: ${warning}`);
for (const error of errors) console.error(`ERROR: ${error}`);
if (errors.length) {
  console.error(
    `FAILED: ${errors.length} pengaturan perlu diperbaiki. Tidak ada secret yang dicetak.`,
  );
  process.exitCode = 1;
} else
  console.log(
    "PASS: konfigurasi server WEJI ARENA V3.0 terisi (koneksi database belum diuji)",
  );
