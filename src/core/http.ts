import type {
  SsoApiResult,
  SsoClientConfig,
  SsoLoginResult,
  SsoRequest,
  SsoRequestOptions,
  SsoUserInfo,
} from "./types";

const ABSOLUTE_URL_RE = /^https?:\/\//i;

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function trimLeadingSlash(value: string): string {
  return value.replace(/^\/+/, "");
}

function normalizePathPart(value: string): string {
  return trimLeadingSlash(trimTrailingSlash(value.trim()));
}

function joinPath(...parts: string[]): string {
  return parts
    .map(normalizePathPart)
    .filter(Boolean)
    .join("/");
}

function joinUrl(baseUrl: string, path: string): string {
  if (ABSOLUTE_URL_RE.test(path)) return path;
  const base = trimTrailingSlash(baseUrl);
  const next = trimLeadingSlash(path);
  return next ? `${base}/${next}` : base;
}

function buildApiUrl(baseUrl: string, apiPrefix: string, endpoint: string): string {
  if (ABSOLUTE_URL_RE.test(endpoint)) return endpoint;
  return joinUrl(baseUrl, joinPath(apiPrefix, endpoint));
}

function appendParams(url: string, params?: SsoRequestOptions["params"]): string {
  if (!params) return url;

  const target = new URL(url, typeof window !== "undefined" ? window.location.origin : "http://localhost");
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      target.searchParams.set(key, String(value));
    }
  });

  return ABSOLUTE_URL_RE.test(url) ? target.toString() : `${target.pathname}${target.search}`;
}

function createTimeoutSignal(timeout: number): AbortSignal | undefined {
  if (typeof AbortController === "undefined" || timeout <= 0) return undefined;

  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeout);
  return controller.signal;
}

export function createFetchRequest(successCode: string): SsoRequest {
  return async <T = unknown>(request: SsoRequestOptions): Promise<T> => {
    const url = appendParams(request.url, request.params);
    const response = await fetch(url, {
      method: request.method ?? "GET",
      credentials: request.credentials ?? "same-origin",
      signal: request.timeout ? createTimeoutSignal(request.timeout) : undefined,
    });

    if (!response.ok) {
      throw new Error(`[sso-sdk] HTTP ${response.status} ${response.statusText}`);
    }

    const payload = (await response.json()) as SsoApiResult<T>;
    if (payload && payload.code === successCode) {
      return payload.data;
    }

    throw payload;
  };
}

export class SsoHttpClient<U = SsoUserInfo> {
  private config: SsoClientConfig<U>;
  private request: SsoRequest;

  constructor(config: SsoClientConfig<U>) {
    this.config = config;
    this.request = config.request ?? createFetchRequest(config.successCode);
  }

  async loginByTicket(ticket: string): Promise<SsoLoginResult<U>> {
    return this.request<SsoLoginResult<U>>({
      url: buildApiUrl(this.config.ssoClientApiBaseUrl, this.config.apiPrefix, this.config.endpoints.loginByTicket),
      method: "GET",
      params: { ticket },
      timeout: this.config.httpTimeout,
      credentials: this.config.fetchCredentials,
    });
  }

  async getPortalUrl(targetPath: string): Promise<string> {
    return this.request<string>({
      url: buildApiUrl(this.config.ssoClientApiBaseUrl, this.config.apiPrefix, this.config.endpoints.portalUrl),
      method: "GET",
      params: { targetPath },
      timeout: this.config.httpTimeout,
      credentials: this.config.fetchCredentials,
    });
  }
}
