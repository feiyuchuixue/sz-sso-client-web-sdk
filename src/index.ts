// ============================================================
// sz-sso-client-web-sdk 核心层导出
// import { createSsoClient, SsoClient, SSO_CALLBACK_PATH } from 'sz-sso-client-web-sdk'
// ============================================================

export { SsoClient, createSsoClient, SSO_CALLBACK_PATH } from "./core/client";

export type {
  SsoClientOptions,
  SsoClientConfig,
  SsoLoginResult,
  SsoUserInfo,
  SsoApiResult,
} from "./core/types";
