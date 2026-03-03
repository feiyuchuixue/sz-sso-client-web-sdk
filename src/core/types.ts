// ============================================================
// sz-sso-client-web-sdk 类型定义
// ============================================================

/** 用户配置接口（createSsoClient 入参） */
export interface SsoClientOptions {
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
  /** 登录成功回调（业务方在此存储 token、用户信息等） */
  onLoginSuccess: (data: SsoLoginResult) => void | Promise<void>;
  /** 登录失败回调（可选） */
  onLoginError?: (error: unknown) => void;
}

/** 内部完整配置（合并默认值后） */
export interface SsoClientConfig {
  apiBaseUrl: string;
  apiPrefix: string;
  callbackPath: string;
  httpTimeout: number;
  successCode: string;
  onLoginSuccess: (data: SsoLoginResult) => void | Promise<void>;
  onLoginError?: (error: unknown) => void;
}

/** 登录成功返回数据（doLoginByTicket 响应） */
export interface SsoLoginResult {
  accessToken: string;
  userInfo: SsoUserInfo;
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
  id?: number | string;
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
