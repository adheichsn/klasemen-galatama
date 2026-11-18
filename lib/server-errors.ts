/** Report only stable database/application error codes; never dump a URL,
 * request body, authorization header, SQL parameters or stack with secrets. */
export function logServerFailure(area: string, error: unknown): void {
  const code =
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : "unknown";
  const safeCode = /^[a-zA-Z0-9_-]{1,40}$/.test(code) ? code : "unknown";
  const safeArea = /^[a-zA-Z0-9_-]{1,40}$/.test(area) ? area : "server";
  console.error(`[WEJI ${safeArea}] error_code=${safeCode}`);
}
