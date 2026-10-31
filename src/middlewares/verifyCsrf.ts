import { type Request, type Response, type NextFunction } from "express";
import handleResponse from "../utils/handleResponse.js";
import { ALLOWED_ORIGINS, CSRF_HEADER_NAME } from "../config/globals.js";

/**
 * Guards cookie-authenticated endpoints (/auth/refresh, /auth/logout) against
 * CSRF by combining two independent checks. Either alone would block the
 * attack; both together cover edge cases (browser omitting Origin, CORS
 * misconfiguration) and enforce defense-in-depth.
 *
 * Why only these two endpoints: every other endpoint is authenticated by
 * the Authorization: Bearer header. A cross-site attacker cannot read the
 * access token from the victim's memory, so those endpoints are CSRF-immune
 * by construction. Only endpoints that trust a cookie sent automatically
 * by the browser need this guard.
 */
export function verifyCsrf(req: Request, res: Response, next: NextFunction) {
  // --- Layer 1: Origin / Referer must be in the allowlist ---
  // Browsers always send Origin on cross-origin POST/DELETE (and on
  // same-origin ones too, since ~2020). If the header is absent, we fall
  // back to Referer's origin. Rejecting requests with NEITHER header is
  // deliberate: only non-browser clients (curl, Postman) can trigger this
  // path, and they cannot use the cookie-authenticated flow meaningfully
  // because they'd need the HttpOnly cookie value anyway. Allowing them
  // would just create an unnecessary bypass.
  const originHeader = req.headers.origin;
  const refererHeader = req.headers.referer;

  let sourceOrigin: string | null = null;
  if (originHeader) {
    sourceOrigin = originHeader;
  } else if (refererHeader) {
    try {
      sourceOrigin = new URL(refererHeader).origin;
    } catch {
      sourceOrigin = null; // malformed Referer: treat as missing
    }
  }

  if (!sourceOrigin || !ALLOWED_ORIGINS.includes(sourceOrigin)) {
    return handleResponse(res, false, 403, "Origin not allowed");
  }

  // --- Layer 2: X-CSRF-Token header must be present ---
  // Value is irrelevant (we do not compare it to anything). What matters is
  // that a custom header exists:
  //   - HTML forms cannot set custom headers (browser spec).
  //   - Cross-origin fetch with a custom header triggers a preflight, which
  //     our strict CORS policy rejects for unknown origins.
  // So the mere presence of this header proves the request came from our
  // own JavaScript, not from a cross-site attacker.
  // Header names are lowercased by Node's http parser.
  const csrfHeader = req.headers[CSRF_HEADER_NAME];
  if (!csrfHeader) {
    return handleResponse(res, false, 403, "CSRF header missing");
  }

  next();
}
