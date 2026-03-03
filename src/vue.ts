// ============================================================
// sz-sso-client-web-sdk Vue 适配层导出
// import { createSsoPlugin, useSsoClient, SsoCallback, getSsoRoutes } from 'sz-sso-client-web-sdk/vue'
// ============================================================

export { createSsoPlugin } from "./vue/plugin";
export { useSsoClient } from "./vue/composables";
export { default as SsoCallback } from "./vue/SsoCallback.vue";
export { getSsoRoutes } from "./vue/routes";
