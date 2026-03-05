import type {
  SsoClientOptions,
  SsoClientConfig,
  SsoLoginResult,
} from "./types";
import { SsoHttpClient } from "./http";

/** 默认配置 */
const DEFAULTS = {
  apiPrefix: "/admin",
  callbackPath: "/sso-login",
  httpTimeout: 120000,
  successCode: "0000",
} as const;

/**
 * SSO 回调路由的默认路径。
 *
 * 业务方可直接引用此常量作为路由白名单条目，确保与 SDK 默认行为一致：
 *
 * @example
 * ```ts
 * import { SSO_CALLBACK_PATH } from 'sz-sso-client-web-sdk';
 *
 * // src/config/index.ts
 * export const ROUTER_WHITE_LIST = ['/500', SSO_CALLBACK_PATH];
 * ```
 *
 * 若业务方通过 `callbackPath` 自定义了回调路径，则应使用自定义值而非此常量。
 */
export const SSO_CALLBACK_PATH = DEFAULTS.callbackPath;

/**
 * SSO Client 核心类
 *
 * 纯 JS 实现，不依赖任何前端框架。
 * 负责：获取认证中心地址、跳转、处理 ticket 回调。
 *
 * @example
 * ```ts
 * import { createSsoClient } from 'sz-sso-client-web-sdk';
 *
 * const client = createSsoClient({
 *   apiBaseUrl: 'http://127.0.0.1:9991/api',
 *   onLoginSuccess(data) {
 *     localStorage.setItem('token', data.accessToken);
 *   },
 * });
 *
 * // 跳转到认证中心
 * client.goSsoLogin();
 * ```
 */
export class SsoClient {
  private config: SsoClientConfig;
  private httpClient: SsoHttpClient;

  constructor(options: SsoClientOptions) {
    this.config = {
      apiBaseUrl: options.apiBaseUrl,
      apiPrefix: options.apiPrefix ?? DEFAULTS.apiPrefix,
      callbackPath: options.callbackPath ?? DEFAULTS.callbackPath,
      httpTimeout: options.httpTimeout ?? DEFAULTS.httpTimeout,
      successCode: options.successCode ?? DEFAULTS.successCode,
      theme: options.theme,
      onLoginSuccess: options.onLoginSuccess,
      onLoginError: options.onLoginError,
    };

    this.httpClient = new SsoHttpClient(this.config);
  }

  /** 获取认证中心跳转 URL（调后端 getSsoAuthUrl） */
  async getSsoAuthUrl(backUrl?: string): Promise<string> {
    const callbackUrl = this.buildCallbackUrl(backUrl);
    return this.httpClient.getSsoAuthUrl(callbackUrl);
  }

  /** 获取认证中心 URL 并跳转 */
  async goSsoLogin(backUrl?: string): Promise<void> {
    const url = await this.getSsoAuthUrl(backUrl);
    window.location.href = this.appendThemeParam(url);
  }

  /**
   * 处理认证中心回调（ticket 换 token）
   *
   * @param ticket 认证中心回传的 ticket
   * @param backUrl 登录后回跳地址
   * @returns 登录结果
   */
  async handleCallback(
    ticket: string,
    backUrl?: string,
  ): Promise<SsoLoginResult> {
    const result = await this.httpClient.doLoginByTicket(ticket);
    await this.config.onLoginSuccess(result);
    return result;
  }

  /** 获取内部配置（只读） */
  getConfig(): Readonly<SsoClientConfig> {
    return this.config;
  }

  /**
   * 构造回调 URL：当前站点 + callbackPath + ?back=xxx
   */
  private buildCallbackUrl(backUrl?: string): string {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const back =
      backUrl ?? (typeof window !== "undefined" ? window.location.href : "/");
    return `${origin}${this.config.callbackPath}?back=${encodeURIComponent(back)}`;
  }

  /**
   * 向 SSO URL 追加 theme 参数。
   *
   * 优先级：
   * 1. config.theme 为 'dark' 或 'light' 时，直接使用配置值
   * 2. config.theme 为 'auto' 或未设置时，自动检测消费方当前的 html.dark class
   *    - html 元素含 'dark' class → 'dark'
   *    - 否则 → 'light'
   */
  private appendThemeParam(url: string): string {
    let theme = this.config.theme;
    if (!theme || theme === "auto") {
      // 自动检测：读取消费方当前 html.dark class（Element Plus 生态标准）
      theme =
        typeof document !== "undefined" &&
        document.documentElement.classList.contains("dark")
          ? "dark"
          : "light";
    }
    const u = new URL(url);
    u.searchParams.set("theme", theme);
    return u.toString();
  }
}

/**
 * 创建 SsoClient 实例
 */
export function createSsoClient(options: SsoClientOptions): SsoClient {
  return new SsoClient(options);
}
