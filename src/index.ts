// ============================================================
// sz-sso-client-web-sdk 核心层导出
// import { createSsoClient, SsoClient, SSO_CALLBACK_PATH } from 'sz-sso-client-web-sdk'
// ============================================================

export { SsoClient, createSsoClient, SSO_CALLBACK_PATH } from "./core/client";
export {
  SsoCallbackError,
  SSO_CALLBACK_ERROR_MESSAGES,
  normalizeSsoServerError,
  normalizeTicketLoginError,
} from "./core/errors";
export type { SsoCallbackErrorType } from "./core/errors";

export type {
  SsoClientOptions,
  SsoClientConfig,
  SsoLoginResult,
  SsoUserInfo,
  SsoApiResult,
  SsoRequest,
  SsoRequestOptions,
  SsoEndpoints,
  SsoPortalRoutes,
  SsoLogoutActions,
} from "./core/types";
