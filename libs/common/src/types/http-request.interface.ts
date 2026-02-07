/**
 * Minimal HTTP request shape for guards/interceptors.
 * Adapter-agnostic (no Express/Fastify dependency).
 */
export interface HttpRequestLike {
  headers: Record<string, string | string[] | undefined>;
  correlationId?: string;
  url?: string;
  method?: string;
}
