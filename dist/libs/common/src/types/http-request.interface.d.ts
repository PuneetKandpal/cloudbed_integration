export interface HttpRequestLike {
    headers: Record<string, string | string[] | undefined>;
    correlationId?: string;
    url?: string;
    method?: string;
}
