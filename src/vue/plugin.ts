import type { App, InjectionKey, Plugin } from "vue";
import type { SsoClient } from "../core/client";

/** Provide/Inject key */
export const SSO_CLIENT_KEY: InjectionKey<SsoClient> = Symbol("SsoClient");

/**
 * 创建 Vue 插件，将 SsoClient 实例注入到 Vue 应用中
 *
 * @example
 * ```ts
 * import { createSsoClient } from 'sz-sso-client-web-sdk';
 * import { createSsoPlugin } from 'sz-sso-client-web-sdk/vue';
 *
 * const client = createSsoClient({ ... });
 * app.use(createSsoPlugin(client));
 * ```
 */
export function createSsoPlugin(client: SsoClient): Plugin {
  return {
    install(app: App) {
      app.provide(SSO_CLIENT_KEY, client);
    },
  };
}
