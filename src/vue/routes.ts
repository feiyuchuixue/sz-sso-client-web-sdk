import type { RouteRecordRaw } from "vue-router";
import { SSO_CALLBACK_PATH } from "../core/client";

export const SSO_FORBIDDEN_PATH = "/sso-forbidden";

/**
 * 返回 SSO 所需的静态路由配置。
 *
 * 将返回值展开到业务方的静态路由数组中，即可完成 `/sso-login` 路由注册，
 * 无需手动引入 `SsoCallback` 组件或硬编码路径字符串。
 *
 * @param path 自定义回调路径（默认为 '/sso-login'，需与 createSsoClient 中的 callbackPath 一致）
 *
 * @example
 * ```ts
 * // router/modules/staticRouter.ts
 * import { getSsoRoutes } from 'sz-sso-client-web-sdk/vue';
 *
 * export const staticRouter: RouteRecordRaw[] = [
 *   { path: '/login', component: () => import('@/views/login/index.vue') },
 *   ...getSsoRoutes(),   // 注册 /sso-login 回调路由
 *   // ... 其他路由
 * ];
 * ```
 *
 * @example 自定义回调路径
 * ```ts
 * // createSsoClient 与 getSsoRoutes 保持一致
 * const ssoClient = createSsoClient({ callbackPath: '/auth/callback', ... });
 * const routes = getSsoRoutes('/auth/callback');
 * ```
 */
export function getSsoRoutes(
  path: string = SSO_CALLBACK_PATH,
): RouteRecordRaw[] {
  return [
    {
      path,
      name: "SsoCallback",
      component: () => import("./SsoCallback.vue"),
      meta: { title: "登录中" },
    },
    {
      path: SSO_FORBIDDEN_PATH,
      name: "SsoForbidden",
      component: () => import("./SsoForbidden.vue"),
      meta: { title: "无访问权限" },
    },
  ];
}
