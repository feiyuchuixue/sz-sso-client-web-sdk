import type { App, InjectionKey, Plugin } from "vue";
import type { SsoClient } from "../core/client";
import type { SsoUserInfo } from "../core/types";

/** Provide/Inject key（使用宽松类型以兼容任意泛型的 SsoClient） */
export const SSO_CLIENT_KEY: InjectionKey<SsoClient<SsoUserInfo>> = Symbol("SsoClient");

/**
 * 创建 Vue 插件，将 SsoClient 实例注入到 Vue 应用中
 *
 * 接受任意泛型参数 `U` 的 `SsoClient<U>` 实例，无需关心 userInfo 的具体类型。
 *
 * @example
 * ```ts
 * import { createSsoClient } from 'sz-sso-client-web-sdk';
 * import { createSsoPlugin } from 'sz-sso-client-web-sdk/vue';
 * import type { UserInfo } from '@/api/types/system/login';
 *
 * const client = createSsoClient<UserInfo>({ ... });
 * app.use(createSsoPlugin(client));
 * ```
 */
export function createSsoPlugin<U = SsoUserInfo>(client: SsoClient<U>): Plugin {
  return {
    install(app: App) {
      app.provide(SSO_CLIENT_KEY, client as unknown as SsoClient<SsoUserInfo>);
    },
  };
}
