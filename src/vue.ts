// ============================================================
// sz-sso-client-web-sdk Vue 适配层导出
// import { createSsoPlugin, useSsoClient, SsoCallback, SsoClientLoginPage, SsoUserMenu, SsoForbidden, getSsoRoutes } from 'sz-sso-client-web-sdk/vue'
// ============================================================

export { createSsoPlugin } from "./vue/plugin";
export { useSsoClient } from "./vue/composables";
export { SSO_CALLBACK_PATH } from "./core/client";
export { default as SsoCallback } from "./vue/SsoCallback.vue";
export { default as SsoClientLoginPage } from "./vue/SsoClientLoginPage.vue";
export { default as SsoUserMenu } from "./vue/SsoUserMenu.vue";
export { default as SsoForbidden } from "./vue/SsoForbidden.vue";
export { getSsoRoutes, SSO_FORBIDDEN_PATH } from "./vue/routes";
