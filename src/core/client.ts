import type {
  SsoClientOptions,
  SsoClientConfig,
  SsoLoginResult,
  SsoUserInfo,
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
 * 支持泛型参数 `U` 以精确描述 `onLoginSuccess` 回调中 `data.userInfo` 的类型。
 * 通常通过 `createSsoClient<UserInfo>({...})` 工厂函数创建，无需直接使用类。
 *
 * @example
 * ```ts
 * import { createSsoClient } from 'sz-sso-client-web-sdk';
 * import type { UserInfo } from '@/api/types/system/login';
 *
 * const client = createSsoClient<UserInfo>({
 *   apiBaseUrl: 'http://127.0.0.1:9991/api',
 *   onLoginSuccess(data) {
 *     // data.userInfo 直接推断为 UserInfo，无需强转
 *     userStore.setToken(data.accessToken);
 *     userStore.setUserInfo(data.userInfo);
 *   },
 * });
 *
 * // 跳转到认证中心
 * client.goSsoLogin();
 * ```
 */
export class SsoClient<U = SsoUserInfo> {
  private config: SsoClientConfig<U>;
  private httpClient: SsoHttpClient;

  constructor(options: SsoClientOptions<U>) {
    this.config = {
      apiBaseUrl: options.apiBaseUrl,
      apiPrefix: options.apiPrefix ?? DEFAULTS.apiPrefix,
      callbackPath: options.callbackPath ?? DEFAULTS.callbackPath,
      httpTimeout: options.httpTimeout ?? DEFAULTS.httpTimeout,
      successCode: options.successCode ?? DEFAULTS.successCode,
      theme: options.theme,
      ucenterBaseUrl: options.ucenterBaseUrl,
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
   * @returns 登录结果（`userInfo` 类型为泛型参数 `U`）
   */
  async handleCallback(
    ticket: string,
    backUrl?: string,
  ): Promise<SsoLoginResult<U>> {
    // doLoginByTicket 返回原始 SsoLoginResult，通过 as 断言对齐业务泛型类型
    const result = await this.httpClient.doLoginByTicket(ticket) as SsoLoginResult<U>;
    await this.config.onLoginSuccess(result);
    console.log("[sso-sdk] Login successful:", result);
    return result;
  }

  /**
   * 获取认证中心个人中心页面 URL（不跳转）
   *
   * @param targetPath 目标路径，默认 `'/user/apps'`（认证中心个人中心首页）
   * @returns 完整的认证中心页面 URL
   * @throws 若未配置 `ucenterBaseUrl` 则抛出明确的配置缺失错误
   *
   * @example
   * ```ts
   * const url = client.getSsoPortalUrl('/user/account')
   * // => 'http://localhost:3310/user/account'
   * ```
   */
  getSsoPortalUrl(targetPath: string = "/user/apps"): string {
    if (!this.config.ucenterBaseUrl) {
      throw new Error(
        "[sso-sdk] ucenterBaseUrl is not configured. " +
          "Pass ucenterBaseUrl to createSsoClient() to enable portal navigation.",
      );
    }
    const base = this.config.ucenterBaseUrl.replace(/\/$/, "");
    return `${base}${targetPath}`;
  }

  /**
   * 跳转到认证中心个人中心页面
   *
   * 认证中心 session cookie 仍然有效时，用户无需重新登录即可直接访问目标页面。
   *
   * 需要在 `createSsoClient` 中配置 `ucenterBaseUrl` 才能使用此方法。
   *
   * @param targetPath 目标路径，默认 `'/user/apps'`（认证中心个人中心首页）
   * @throws 若未配置 `ucenterBaseUrl` 则抛出明确的配置缺失错误
   *
   * @example
   * ```ts
   * // 跳转到个人中心首页（我的应用）
   * client.goSsoPortal()
   *
   * // 跳转到账号安全页
   * client.goSsoPortal('/user/account')
   *
   * // 跳转到基本资料页
   * client.goSsoPortal('/user/info')
   * ```
   */
  goSsoPortal(targetPath: string = "/user/apps"): void {
    window.location.href = this.getSsoPortalUrl(targetPath);
  }

  /** 获取内部配置（只读） */
  getConfig(): Readonly<SsoClientConfig<U>> {
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
 *
 * 支持泛型参数 `U` 指定 `onLoginSuccess` 中 `data.userInfo` 的业务类型，
 * 可彻底消除 `onLoginSuccess` 回调中的类型强转。
 *
 * @example 不指定泛型（向后兼容，data.userInfo 类型为 SsoUserInfo）
 * ```ts
 * const client = createSsoClient({ ... })
 * ```
 *
 * @example 指定业务 UserInfo 类型（推荐）
 * ```ts
 * import type { UserInfo } from '@/api/types/system/login'
 *
 * const client = createSsoClient<UserInfo>({
 *   apiBaseUrl: import.meta.env.VITE_API_URL,
 *   onLoginSuccess(data) {
 *     // data.userInfo 直接推断为 UserInfo，零强转
 *     userStore.setToken(data.accessToken)
 *     userStore.setUserInfo(data.userInfo)
 *   }
 * })
 * ```
 */
export function createSsoClient<U = SsoUserInfo>(
  options: SsoClientOptions<U>,
): SsoClient<U> {
  return new SsoClient<U>(options);
}
