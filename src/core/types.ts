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
 *   apiBaseUrl: '...',
 *   onLoginSuccess(data) {
 *     // data.userInfo 类型为 UserInfo，无需任何强转
 *     userStore.setUserInfo(data.userInfo)
 *   }
 * })
 * ```
 */
export interface SsoClientOptions<U = SsoUserInfo> {
  /** 客户端后端 API 基础地址, e.g. 'http://127.0.0.1:9991/api' */
  apiBaseUrl: string;
  /** API 模块前缀, default: '/admin' */
  apiPrefix?: string;
  /** SSO 回调路径, default: '/sso-login' */
  callbackPath?: string;
  /** 请求超时(ms), default: 120000 */
  httpTimeout?: number;
  /** 成功响应码, default: '0000' */
  successCode?: string;
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
   * 认证中心（UCen）前端的 base URL，e.g. `'http://localhost:3310'`
   *
   * 配置后可使用 `client.goSsoPortal()` / `client.getSsoPortalUrl()` 跳转到
   * 认证中心的个人中心页面（如 `/user/apps`、`/user/info`、`/user/account` 等）。
   *
   * 未配置时调用上述方法会抛出明确的配置缺失错误。
   *
   * @example
   * ```ts
   * const client = createSsoClient({
   *   apiBaseUrl: 'http://localhost:9991/api',
   *   ucenterBaseUrl: 'http://localhost:3310',
   *   onLoginSuccess(data) { ... },
   * })
   *
   * // 跳转到认证中心个人中心首页
   * client.goSsoPortal()
   *
   * // 跳转到账号安全页
   * client.goSsoPortal('/user/account')
   * ```
   */
  ucenterBaseUrl?: string;
  /** 登录成功回调（业务方在此存储 token、用户信息等） */
  onLoginSuccess: (data: SsoLoginResult<U>) => void | Promise<void>;
  /** 登录失败回调（可选） */
  onLoginError?: (error: unknown) => void;
}

/** 内部完整配置（合并默认值后） */
export interface SsoClientConfig<U = SsoUserInfo> {
  apiBaseUrl: string;
  apiPrefix: string;
  callbackPath: string;
  httpTimeout: number;
  successCode: string;
  theme?: "light" | "dark" | "auto";
  ucenterBaseUrl?: string;
  onLoginSuccess: (data: SsoLoginResult<U>) => void | Promise<void>;
  onLoginError?: (error: unknown) => void;
}

/**
 * 登录成功返回数据（doLoginByTicket 响应）
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
