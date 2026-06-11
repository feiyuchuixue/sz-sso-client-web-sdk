import type {
  SsoClientConfig,
  SsoClientOptions,
  SsoLoginResult,
  SsoPortalRoutes,
  SsoUserInfo,
} from "./types";
import { SsoHttpClient } from "./http";

const DEFAULT_PORTAL_ROUTES: SsoPortalRoutes = {
  login: "/login",
  security: "/ucenter/password",
  applications: "/ucenter/applications",
};

const DEFAULTS = {
  apiPrefix: "",
  callbackPath: "/sso-login",
  defaultBackUrl: "/",
  httpTimeout: 120000,
  successCode: "0000",
  fetchCredentials: "same-origin",
  mode: "sso-client3",
  endpoints: {
    loginByTicket: "/sso/doLoginByTicket",
    portalUrl: "/sso/getSsoPortalUrl",
  },
} as const;

export const SSO_CALLBACK_PATH = DEFAULTS.callbackPath;

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function withLeadingSlash(value: string): string {
  return value.startsWith("/") ? value : `/${value}`;
}

function getWindowOrigin(): string {
  return typeof window !== "undefined" ? window.location.origin : "";
}

function getCurrentHref(fallback: string): string {
  return typeof window !== "undefined" ? window.location.href : fallback;
}

function requireConfigValue(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`[sso-sdk] ${name} is required.`);
  }
  return value;
}

export class SsoClient<U = SsoUserInfo> {
  private config: SsoClientConfig<U>;
  private httpClient: SsoHttpClient<U>;

  constructor(options: SsoClientOptions<U>) {
    const authCenterBaseUrl = options.authCenterBaseUrl ?? options.ucenterBaseUrl;
    const ssoClientApiBaseUrl = options.ssoClientApiBaseUrl ?? options.apiBaseUrl ?? "";

    this.config = {
      clientFlag: options.clientFlag,
      ssoClientApiBaseUrl,
      authCenterBaseUrl,
      apiPrefix: options.apiPrefix ?? DEFAULTS.apiPrefix,
      callbackPath: options.callbackPath ?? DEFAULTS.callbackPath,
      defaultBackUrl: options.defaultBackUrl ?? DEFAULTS.defaultBackUrl,
      httpTimeout: options.httpTimeout ?? DEFAULTS.httpTimeout,
      successCode: options.successCode ?? DEFAULTS.successCode,
      fetchCredentials: options.fetchCredentials ?? DEFAULTS.fetchCredentials,
      mode: options.mode ?? DEFAULTS.mode,
      theme: options.theme,
      request: options.request,
      endpoints: {
        ...DEFAULTS.endpoints,
        ...options.endpoints,
      },
      portalRoutes: {
        ...DEFAULT_PORTAL_ROUTES,
        ...options.portalRoutes,
      },
      onLoginSuccess: options.onLoginSuccess,
      onLoginError: options.onLoginError,
    };

    this.httpClient = new SsoHttpClient(this.config);
  }

  /** 获取认证中心登录 URL，不跳转。 */
  getSsoAuthUrl(backUrl?: string): string {
    const authCenterBaseUrl = requireConfigValue(this.config.authCenterBaseUrl, "authCenterBaseUrl");
    const clientFlag = requireConfigValue(this.config.clientFlag, "clientFlag");
    const loginUrl = new URL(this.config.portalRoutes.login, `${trimTrailingSlash(authCenterBaseUrl)}/`);

    loginUrl.searchParams.set("client", clientFlag);
    loginUrl.searchParams.set("redirect", this.buildCallbackUrl(backUrl));
    loginUrl.searchParams.set("mode", this.config.mode);
    this.applyThemeParam(loginUrl);

    return loginUrl.toString();
  }

  /** 获取认证中心 URL 并跳转。 */
  async goSsoLogin(backUrl?: string): Promise<void> {
    window.location.href = this.getSsoAuthUrl(backUrl);
  }

  /** 使用 ticket 换取当前 client 的登录凭证。 */
  async handleCallback(ticket: string): Promise<SsoLoginResult<U>> {
    if (!ticket) {
      throw new Error("[sso-sdk] ticket is required.");
    }

    const result = await this.httpClient.loginByTicket(ticket);
    await this.config.onLoginSuccess(result);
    return result;
  }

  /** 获取认证中心页面的直接 URL。仅适合认证中心已有登录态的场景。 */
  getSsoPortalUrl(targetPath: string = this.config.portalRoutes.applications): string {
    const authCenterBaseUrl = requireConfigValue(this.config.authCenterBaseUrl, "authCenterBaseUrl");
    return `${trimTrailingSlash(authCenterBaseUrl)}${withLeadingSlash(targetPath)}`;
  }

  /** 通过 Client 后端获取带一次性 portal ticket 的认证中心入口 URL。 */
  async getSsoPortalEntryUrl(targetPath: string = this.config.portalRoutes.applications): Promise<string> {
    return this.httpClient.getPortalUrl(targetPath);
  }

  /** 通过一次性 portal ticket 进入认证中心页面。 */
  async goSsoPortal(targetPath: string = this.config.portalRoutes.applications): Promise<void> {
    window.location.href = await this.getSsoPortalEntryUrl(targetPath);
  }

  getPortalRoutes(): Readonly<SsoPortalRoutes> {
    return this.config.portalRoutes;
  }

  getConfig(): Readonly<SsoClientConfig<U>> {
    return this.config;
  }

  private buildCallbackUrl(backUrl?: string): string {
    const origin = getWindowOrigin();
    const back = backUrl ?? getCurrentHref(this.config.defaultBackUrl);
    const callbackUrl = new URL(this.config.callbackPath, `${origin || "http://localhost"}/`);
    callbackUrl.searchParams.set("back", back);

    return origin ? callbackUrl.toString() : `${this.config.callbackPath}?back=${encodeURIComponent(back)}`;
  }

  private applyThemeParam(url: URL): void {
    let theme = this.config.theme;
    if (!theme || theme === "auto") {
      theme =
        typeof document !== "undefined" &&
        document.documentElement.classList.contains("dark")
          ? "dark"
          : "light";
    }
    url.searchParams.set("theme", theme);
  }
}

export function createSsoClient<U = SsoUserInfo>(
  options: SsoClientOptions<U>,
): SsoClient<U> {
  return new SsoClient<U>(options);
}