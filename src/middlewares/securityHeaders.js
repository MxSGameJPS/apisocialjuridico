import { env } from '../config/env.js';

const API_CSP = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";

function shouldSkipStrictCsp(url = '') {
  return url.startsWith('/docs') || url.startsWith('/documentation');
}

export async function aplicarHeadersSeguranca(request, reply) {
  reply.header('X-Content-Type-Options', 'nosniff');
  reply.header('X-Frame-Options', 'DENY');
  reply.header('Referrer-Policy', 'no-referrer');
  reply.header('X-Permitted-Cross-Domain-Policies', 'none');
  reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()');
  reply.header('Cross-Origin-Opener-Policy', 'same-origin');

  if (env.NODE_ENV === 'production') {
    reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  if (!shouldSkipStrictCsp(request.url)) {
    reply.header('Content-Security-Policy', API_CSP);
  }
}
