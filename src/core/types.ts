// ============================================================
// sz-sso-client-web-sdk 类型定义
// ============================================================

/**
 * 用户配置接口（createSsoClient 入参）
 *
 * 支持泛型参数 `U` 以精确描述 `onLoginSuccess` 回调中 `data.userInfo` 的类型。
 * 通过 `createSsoClient<UserInfo>({...})` 传入，TypeScript 会自动推断回调参数类型。
 *
 * @example
 * ```ts
 * import type { UserInfo } from '@/api/types/system/login'
 *
 * createSsoClient<UserInfo>({
 *   clientFlag: 'platform',
 *   ssoClientApiBaseUrl: '...',
 *   authCenterBaseUrl: '...',
 *   onLoginSuccess(data) {
 *     // data.userInfo 类型为 UserInfo，无需任何强转
 *     userStore.setUserInfo(data.userInfo)
 *   }
 * })
 * ```
 */
export interface SsoClientOptions<U = SsoUserInfo> {
  /**
   * Client 应用标识，对应 SSO 服务端 sso_client.client_flag。
   *
   * 新接入项目必须显式传入。为兼容旧版本，暂不在类型层强制必填；
   * 未配置时会在调用登录跳转时抛出明确错误。
   */
  clientFlag?: string;
  /**
   * Client 后端 SSO API 基础地址，通常是当前业务应用后端的 context path。
   *
   * 例如 platform local 环境为 `http://127.0.0.1:5000/api`。
   */
  ssoClientApiBaseUrl?: string;
  /**
   * 认证中心前端基础地址，例如 `http://authcenter.com:3310`。
   */
  authCenterBaseUrl?: string;
  /**
   * @deprecated 请使用 `ssoClientApiBaseUrl`。保留用于兼容旧接入代码。
   */
  apiBaseUrl?: string;
  /**
   * Client 后端 SSO 接口前缀，默认空字符串。
   *
   * 若接入方后端将 Sa-Token SSO client 接口挂在 `/admin` 下，可显式传入。
   */
  apiPrefix?: string;
  /** SSO 回调路径, default: '/sso-login' */
  callbackPath?: string;
  /** 登录成功后的默认落地页，default: '/' */
  defaultBackUrl?: string;
  /** 认证中心协议 mode，default: 'sso-client3' */
  mode?: string;
  /** 请求超时(ms), default: 120000 */
  httpTimeout?: number;
  /** 成功响应码, default: '0000' */
  successCode?: string;
  /** 可注入请求函数；不传则使用浏览器 fetch。 */
  request?: SsoRequest;
  /**
   * fetch 凭证策略，默认 `same-origin`，与浏览器 fetch 默认行为一致。
   *
   * 开发环境通过 Vite proxy 走同源 `/api` 时无需额外配置；只有后端明确允许跨域
   * 携带 cookie 时才应设置为 `include`。
   */
  fetchCredentials?: RequestCredentials;
  /** 后端接口路径覆盖。 */
  endpoints?: Partial<SsoEndpoints>;
  /** 认证中心页面路径覆盖。 */
  portalRoutes?: Partial<SsoPortalRoutes>;
  /**
   * 指定 SSO 认证中心使用的主题，与 Client App 保持一致。
   * - `'light'`：强制明亮模式
   * - `'dark'`：强制暗黑模式
   * - `'auto'`：跟随系统 prefers-color-scheme（默认，不传参数到 SSO）
   *
   * 配置后，SDK 会在跳转 SSO 登录 URL 时追加 `theme` 参数，
   * SSO 前端收到后立即同步到 localStorage，确保整个认证流程主题一致。
   */
  theme?: "light" | "dark" | "auto";
  /**
   * @deprecated 请使用 `authCenterBaseUrl`。保留用于兼容旧接入代码。
   *
   */
  ucenterBaseUrl?: string;
  /** 登录成功回调（业务方在此存储 token、用户信息等） */
  onLoginSuccess: (data: SsoLoginResult<U>) => void | Promise<void>;
  /** 登录失败回调（可选） */
  onLoginError?: (error: unknown) => void;
}

/** 内部完整配置（合并默认值后） */
export interface SsoClientConfig<U = SsoUserInfo> {
  clientFlag?: string;
  ssoClientApiBaseUrl: string;
  authCenterBaseUrl?: string;
  apiPrefix: string;
  callbackPath: string;
  defaultBackUrl: string;
  mode: string;
  httpTimeout: number;
  successCode: string;
  theme?: "light" | "dark" | "auto";
  request?: SsoRequest;
  fetchCredentials: RequestCredentials;
  endpoints: SsoEndpoints;
  portalRoutes: SsoPortalRoutes;
  onLoginSuccess: (data: SsoLoginResult<U>) => void | Promise<void>;
  onLoginError?: (error: unknown) => void;
}

/** SDK 内部使用的最小请求抽象，避免核心层绑定 axios。 */
export type SsoRequest = <T = unknown>(request: SsoRequestOptions) => Promise<T>;

export interface SsoRequestOptions {
  url: string;
  method?: "GET" | "POST";
  params?: Record<string, string | number | boolean | undefined>;
  timeout?: number;
  credentials?: RequestCredentials;
}

/** Client 后端 SSO 接口路径。 */
export interface SsoEndpoints {
  /** ticket 换取当前 client accessToken 的接口。 */
  loginByTicket: string;
  /** 获取认证中心个人门户一次性入口 URL 的接口。 */
  portalUrl: string;
}

/** 认证中心前端页面路径。 */
export interface SsoPortalRoutes {
  login: string;
  security: string;
  applications: string;
}

/**
 * 登录成功返回数据（ticket 换 token 响应）
 *
 * 支持泛型参数 `U` 以精确描述 `userInfo` 的类型，消除业务方的类型强转。
 *
 * @example 使用默认宽松类型（向后兼容）
 * ```ts
 * const client = createSsoClient({ ... })
 * // data.userInfo 类型为 SsoUserInfo
 * ```
 *
 * @example 指定业务 UserInfo 类型（推荐）
 * ```ts
 * import type { UserInfo } from '@/api/types/system/login'
 *
 * const client = createSsoClient<UserInfo>({
 *   onLoginSuccess(data) {
 *     // data.userInfo 直接推断为 UserInfo，无需强转
 *     userStore.setUserInfo(data.userInfo)
 *   }
 * })
 * ```
 */
export interface SsoLoginResult<U = SsoUserInfo> {
  accessToken: string;
  userInfo: U;
  [key: string]: unknown;
}

/**
 * 用户信息（宽松定义，所有字段均为可选，业务方可自行扩展）
 *
 * **与业务 UserInfo 的类型对齐：**
 *
 * SDK 使用宽松类型（所有字段可选、id 支持 string | number）以适配不同后端。
 * 业务方自己的 `UserInfo` 类型若有必填字段，需将其改为可选，或在 `onLoginSuccess`
 * 中做显式映射，否则 TypeScript 会报类型不兼容错误。
 *
 * @example 对齐方式一：将业务 UserInfo 字段改为可选（推荐）
 * ```ts
 * // src/api/types/system/login.ts
 * export type UserInfo = {
 *   id?: number | string;   // 兼容 SDK 的 string | number
 *   username?: string;      // 改为可选，与 SsoUserInfo 对齐
 *   // ...
 * };
 * ```
 *
 * @example 对齐方式二：在回调中显式映射
 * ```ts
 * onLoginSuccess(data) {
 *   userStore.setUserInfo({
 *     ...data.userInfo,
 *     username: data.userInfo.username ?? '',
 *   });
 * }
 * ```
 */
export interface SsoUserInfo {
  id?: number;
  username?: string;
  nickname?: string;
  phone?: string;
  email?: string;
  logo?: string;
  [key: string]: unknown;
}

/** 后端统一响应格式 */
export interface SsoApiResult<T = unknown> {
  code: string;
  message: string;
  data: T;
  param?: Record<string, unknown>;
}
