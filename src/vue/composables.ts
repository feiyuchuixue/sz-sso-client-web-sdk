import { inject } from "vue";
import { SSO_CLIENT_KEY } from "./plugin";
import type { SsoClient } from "../core/client";

/**
 * 获取 SsoClient 实例（Vue Composable）
 *
 * @example
 * ```ts
 * import { useSsoClient } from 'sz-sso-client-web-sdk/vue';
 *
 * const client = useSsoClient();
 * client.goSsoLogin();
 * ```
 */
export function useSsoClient(): SsoClient {
  const client = inject(SSO_CLIENT_KEY);
  if (!client) {
    throw new Error(
      "[sso-sdk] SsoClient not provided. Did you call app.use(createSsoPlugin(client))?",
    );
  }
  return client;
}
