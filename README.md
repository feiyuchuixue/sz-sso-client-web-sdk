# sz-sso-client-web-sdk

`sz-sso-client-web-sdk` 是前端 Client 接入 `sz-sso` 统一认证中心的轻量 SDK。

它的职责是 **连接 SSO 协议，不接管业务状态**：

- 构造认证中心登录地址。
- 处理 `/sso-login` 回调。
- 使用 `ticket` 调用 Client 后端换取当前应用 token。
- 提供 Vue 3 接入胶水和可选用户菜单组件。

它不会内置路由守卫、业务 token 存储、菜单权限初始化、axios 拦截器、WebSocket 清理等业务逻辑。这些逻辑仍由接入应用自己完成。

## 设计原则

- `core` 层只依赖浏览器 API，默认使用 `fetch`，不依赖 `axios`。
- Vue、Vue Router、Element Plus 都是可选 peer dependency。
- UI 组件是可选能力，不是接入 SSO 的必需条件。
- 后端地址、认证中心地址、页面路径都由接入应用配置，SDK 不写死具体业务部署地址。
- 退出登录由业务方实现，但应调用 `/sso/logout` 完成全局登出。

## 安装

```bash
pnpm add sz-sso-client-web-sdk
```

或：

```bash
npm install sz-sso-client-web-sdk
```

## 导出入口

### Core

```ts
import {
  createSsoClient,
  SsoClient,
  SSO_CALLBACK_PATH,
} from 'sz-sso-client-web-sdk'

import type {
  SsoClientOptions,
  SsoLoginResult,
  SsoRequest,
  SsoPortalRoutes,
} from 'sz-sso-client-web-sdk'
```

### Vue 适配层

```ts
import {
  createSsoPlugin,
  useSsoClient,
  getSsoRoutes,
  SsoCallback,
  SsoForbidden,
  SsoUserMenu,
  SSO_FORBIDDEN_PATH,
} from 'sz-sso-client-web-sdk/vue'
```

### 可选样式

如果使用 SDK 内置的 `SsoCallback`、`SsoForbidden` 或 `SsoUserMenu`，需要引入样式：

```ts
import 'sz-sso-client-web-sdk/style.css'
```

## 快速接入：Vue 3 + Vue Router

### 1. 创建 SSO Client

```ts
// src/main.ts
import { createApp } from 'vue'
import App from '@/App.vue'
import router from '@/router'
import pinia from '@/stores'
import { useUserStore } from '@/stores/modules/user'

import { createSsoClient } from 'sz-sso-client-web-sdk'
import { createSsoPlugin } from 'sz-sso-client-web-sdk/vue'
import 'sz-sso-client-web-sdk/style.css'

const app = createApp(App)

app.use(pinia)

const userStore = useUserStore()

const ssoClient = createSsoClient({
  // SSO Client 标识，对应服务端 clientFlag，例如 platform、oa、crm
  clientFlag: import.meta.env.VITE_SSO_CLIENT_FLAG,

  // 当前 Client 后端 SSO API 基础地址。
  // 开发环境推荐传相对路径 /api，让 Vite proxy 转发，避免 CORS。
  // 生产环境可按部署方式传 /api 或 https://client.example.com/api。
  ssoClientApiBaseUrl: import.meta.env.VITE_API_CONTEXT_PATH || '/api',

  // 认证中心前端地址，用于跳转登录页、账号安全页、个人中心页。
  authCenterBaseUrl: import.meta.env.VITE_UCENTER_URL,

  // 可选：认证中心页面路径，默认就是当前开源版路径。
  portalRoutes: {
    login: '/login',
    security: '/ucenter/password',
    applications: '/ucenter/applications',
  },

  // 登录成功后由业务方落 token、初始化 store、拉取菜单权限等。
  onLoginSuccess(data) {
    userStore.setToken(data.accessToken)
    // userStore.setUserInfo(data.userInfo)
  },
})

app.use(createSsoPlugin(ssoClient))
app.use(router)
app.mount('#app')
```

### 2. 注册 SSO 路由

```ts
// src/router/staticRoutes.ts
import type { RouteRecordRaw } from 'vue-router'
import { getSsoRoutes } from 'sz-sso-client-web-sdk/vue'

export const staticRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    component: () => import('@/views/login/index.vue'),
  },

  // 默认注册：
  // - /sso-login
  // - /sso-forbidden
  ...getSsoRoutes(),
]
```

如果自定义回调路径，`callbackPath` 与 `getSsoRoutes(path)` 必须保持一致：

```ts
const ssoClient = createSsoClient({
  callbackPath: '/auth/callback',
  // ...
})

const routes = getSsoRoutes('/auth/callback')
```

### 3. 加入路由白名单

`/sso-login` 是未登录状态下的回调入口，必须进入路由白名单。

```ts
// src/config/index.ts
import { SSO_CALLBACK_PATH } from 'sz-sso-client-web-sdk'
import { SSO_FORBIDDEN_PATH } from 'sz-sso-client-web-sdk/vue'

export const ROUTER_WHITE_LIST = [
  '/login',
  '/500',
  SSO_CALLBACK_PATH,
  SSO_FORBIDDEN_PATH,
]
```

路由守卫示例：

```ts
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()

  if (ROUTER_WHITE_LIST.includes(to.path)) {
    return next()
  }

  if (!userStore.token) {
    return next({
      path: '/login',
      query: { redirect: to.fullPath },
      replace: true,
    })
  }

  next()
})
```

### 4. 登录页跳转

登录按钮只需要跳到 `/sso-login`，由 SDK 的 `SsoCallback` 判断当前是否有 `ticket`：

- 没有 `ticket`：跳转认证中心登录页。
- 有 `ticket`：调用 Client 后端换 token。

```vue
<template>
  <el-button type="primary" @click="goSso">认证中心登录</el-button>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function goSso() {
  router.push({
    path: '/sso-login',
    query: {
      back: '/home/index',
    },
  })
}
</script>
```

也可以在任意组件中直接调用：

```ts
import { useSsoClient } from 'sz-sso-client-web-sdk/vue'

const client = useSsoClient()
await client.goSsoLogin('/home/index')
```

## 核心流程

### 登录跳转

`getSsoAuthUrl(backUrl?)` 会基于配置构造认证中心登录地址：

```text
{authCenterBaseUrl}{portalRoutes.login}
  ?client={clientFlag}
  &redirect={当前 Client 的 callback URL}
  &mode={mode}
  &theme={theme}
```

默认登录路径为：

```text
{authCenterBaseUrl}/login
```

### 回调换票

认证中心登录成功后会跳回：

```text
{clientOrigin}/sso-login?back=...&ticket=...&theme=...
```

`SsoCallback` 会调用：

```text
GET {ssoClientApiBaseUrl}{apiPrefix}{endpoints.loginByTicket}?ticket=...
```

默认等价于：

```text
GET /api/sso/doLoginByTicket?ticket=...
```

成功后 SDK 只执行 `onLoginSuccess(data)`，业务方应在回调中存储 token，并在自己的路由守卫或初始化流程中加载用户、菜单、按钮权限等数据。

## 配置项

### `createSsoClient(options)`

| 配置项 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | :---: | --- | --- |
| `clientFlag` | `string` | 是 | - | 当前 Client 标识，对应 SSO 服务端配置 |
| `ssoClientApiBaseUrl` | `string` | 是 | `''` | 当前 Client 后端 SSO API 基础地址 |
| `authCenterBaseUrl` | `string` | 是 | - | 认证中心前端基础地址 |
| `onLoginSuccess` | `(data) => void \| Promise<void>` | 是 | - | ticket 换 token 成功后的业务回调 |
| `apiPrefix` | `string` | 否 | `''` | Client 后端 SSO 接口前缀 |
| `callbackPath` | `string` | 否 | `'/sso-login'` | 当前 Client 的 SSO 回调路由 |
| `defaultBackUrl` | `string` | 否 | `'/'` | 未传 back 时的默认回跳地址 |
| `mode` | `string` | 否 | `'sso-client3'` | 认证中心协议 mode |
| `theme` | `'light' \| 'dark' \| 'auto'` | 否 | `'auto'` | 登录跳转时传给认证中心的主题 |
| `httpTimeout` | `number` | 否 | `120000` | fetch 超时时间，单位 ms |
| `successCode` | `string` | 否 | `'0000'` | 后端统一响应成功码 |
| `fetchCredentials` | `RequestCredentials` | 否 | `'same-origin'` | 默认 fetch 凭证策略 |
| `request` | `SsoRequest` | 否 | 内置 fetch | 自定义请求函数 |
| `endpoints` | `Partial<SsoEndpoints>` | 否 | 见下文 | 覆盖 Client 后端接口路径 |
| `portalRoutes` | `Partial<SsoPortalRoutes>` | 否 | 见下文 | 覆盖认证中心前端页面路径 |
| `onLoginError` | `(error) => void` | 否 | - | `SsoCallback` 登录失败后的可选回调 |
| `apiBaseUrl` | `string` | 否 | - | 旧版兼容字段，建议改用 `ssoClientApiBaseUrl` |
| `ucenterBaseUrl` | `string` | 否 | - | 旧版兼容字段，建议改用 `authCenterBaseUrl` |

默认 `endpoints`：

```ts
{
  loginByTicket: '/sso/doLoginByTicket',
}
```

默认 `portalRoutes`：

```ts
{
  login: '/login',
  security: '/ucenter/password',
  applications: '/ucenter/applications',
}
```

### 关于 `ssoClientApiBaseUrl`

这个地址不是 SDK 写死的，必须由接入应用根据自己的部署方式传入。

开发环境推荐：

```ts
ssoClientApiBaseUrl: '/api'
```

配合 Vite proxy：

```ts
server: {
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:5000',
      changeOrigin: true,
    },
  },
}
```

生产环境可以是相对路径，也可以是完整 URL：

```ts
ssoClientApiBaseUrl: '/api'
ssoClientApiBaseUrl: 'https://platform.example.com/api'
ssoClientApiBaseUrl: 'https://gateway.example.com/platform/api'
```

如果使用完整 URL 且跨域，后端需要正确配置 CORS。SDK 默认 `fetchCredentials` 为 `same-origin`，不会强制跨域携带 cookie；确实需要跨域携带 cookie 时再设置：

```ts
fetchCredentials: 'include'
```

## 自定义请求函数

SDK 核心层不依赖 `axios`。如果项目希望复用自己的请求封装，可以传入 `request`：

```ts
const ssoClient = createSsoClient({
  clientFlag: 'platform',
  ssoClientApiBaseUrl: '/api',
  authCenterBaseUrl: 'http://authcenter.com:3310',
  async request(options) {
    const result = await myHttp.get(options.url, {
      params: options.params,
      timeout: options.timeout,
    })

    return result.data
  },
  onLoginSuccess(data) {
    userStore.setToken(data.accessToken)
  },
})
```

自定义 `request` 应直接返回业务数据，也就是 `SsoLoginResult`，不要再返回完整响应壳。

## Core API

### `createSsoClient(options)`

创建 SSO Client 实例。

```ts
const client = createSsoClient({
  clientFlag: 'platform',
  ssoClientApiBaseUrl: '/api',
  authCenterBaseUrl: 'http://authcenter.com:3310',
  onLoginSuccess(data) {
    localStorage.setItem('token', data.accessToken)
  },
})
```

### `client.getSsoAuthUrl(backUrl?)`

只构造认证中心登录 URL，不跳转。

```ts
const url = client.getSsoAuthUrl('/home/index')
```

### `client.goSsoLogin(backUrl?)`

构造认证中心登录 URL 并跳转。

```ts
await client.goSsoLogin('/home/index')
```

### `client.handleCallback(ticket)`

使用认证中心返回的 ticket 换取当前 Client token，并触发 `onLoginSuccess`。

```ts
await client.handleCallback(ticket)
```

### `client.getSsoPortalUrl(targetPath?)`

获取认证中心页面完整地址。

```ts
client.getSsoPortalUrl('/ucenter/password')
client.getSsoPortalUrl('/ucenter/applications')
```

### `client.goSsoPortal(targetPath?)`

跳转认证中心页面。

```ts
client.goSsoPortal('/ucenter/applications')
```

### `client.getPortalRoutes()`

读取认证中心页面路径配置。

```ts
const routes = client.getPortalRoutes()
```

### `client.getConfig()`

读取合并默认值后的配置。

## Vue API

### `createSsoPlugin(client)`

将 SSO Client 注入 Vue 应用。

```ts
app.use(createSsoPlugin(ssoClient))
```

### `useSsoClient()`

在 Vue 组件或 composable 中获取 SSO Client。

```ts
const client = useSsoClient()
```

### `getSsoRoutes(path?)`

返回 SSO 路由数组。

```ts
...getSsoRoutes()
...getSsoRoutes('/auth/callback')
```

默认包含：

- `/sso-login`
- `/sso-forbidden`

### `SsoCallback`

SSO 回调页组件。一般通过 `getSsoRoutes()` 注册，不需要手动使用。

行为：

- 无 `ticket`：跳转认证中心。
- 有 `ticket`：调用 `client.handleCallback(ticket)`。
- 成功后跳转 `back`。
- 后端返回无权限码 `O4031` 时跳转 `/sso-forbidden`。
- 失败时展示错误状态和重新登录按钮。

### `SsoForbidden`

无权限页面组件。用于当前用户没有访问某 Client 的权限时展示兜底页。

### `SsoUserMenu`

可选右上角用户菜单组件，适合需要统一账户入口的 Vue + Element Plus 项目。

能力：

- 展示当前用户摘要。
- 触发本系统个人信息入口。
- 打开认证中心账号安全页 `/ucenter/password`。
- 打开认证中心个人中心页 `/ucenter/applications`。
- 确认后触发业务方退出逻辑。

示例：

```vue
<template>
  <SsoUserMenu
    :avatar-src="avatarSrc"
    :display-name="userStore.profile?.nickname || ''"
    :username="userStore.profile?.username || ''"
    @personal-info-click="infoRef?.openDialog()"
    @logout="logout"
  >
    <template #personal-info>
      <InfoDialog ref="infoRef" />
    </template>
  </SsoUserMenu>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { SsoUserMenu } from 'sz-sso-client-web-sdk/vue'
import InfoDialog from '@/layouts/components/Header/components/InfoDialog.vue'

const infoRef = ref<InstanceType<typeof InfoDialog>>()

async function logout() {
  try {
    await logoutApi()
  } catch {
    // 即使后端退出异常，也建议继续清本地状态
  }

  userStore.clear()
  authStore.clear()
  socketStore.close()
  router.replace('/login')
}
</script>
```

Props：

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `avatarSrc` | `string` | `''` | 头像 URL，由业务方处理后传入 |
| `displayName` | `string` | `''` | 展示名称，通常传昵称 |
| `username` | `string` | `''` | 账号名兜底 |
| `securityPath` | `string` | `''` | 覆盖账号安全路径 |
| `applicationsPath` | `string` | `''` | 覆盖个人中心路径 |

Emits：

| 事件 | 说明 |
| --- | --- |
| `personal-info-click` | 点击个人信息时触发 |
| `logout` | 用户确认退出后触发 |

Slots：

| Slot | 说明 |
| --- | --- |
| `personal-info` | 放置业务方自己的个人信息弹窗 |

更完整的用户菜单说明见：

```text
docs/sso-user-menu-integration.md
```

## 纯 JS 接入

没有 Vue 时可以只使用 core。

```ts
import { createSsoClient } from 'sz-sso-client-web-sdk'

const client = createSsoClient({
  clientFlag: 'portal',
  ssoClientApiBaseUrl: '/api',
  authCenterBaseUrl: 'http://authcenter.com:3310',
  onLoginSuccess(data) {
    localStorage.setItem('token', data.accessToken)
  },
})

const params = new URLSearchParams(location.search)
const ticket = params.get('ticket')
const back = params.get('back') || '/'

if (ticket) {
  await client.handleCallback(ticket)
  location.href = back
} else {
  await client.goSsoLogin(back)
}
```

## 退出登录

SDK 不封装退出登录，因为退出时通常要处理业务状态：

- 调后端退出接口。
- 清 token。
- 清用户信息。
- 清菜单和按钮权限。
- 关闭 WebSocket。
- 跳转登录页。

`sz-sso` Client 应用应调用：

```text
POST /sso/logout
```

不要只调用：

```text
POST /auth/logout
```

区别：

| 接口 | 作用 |
| --- | --- |
| `/auth/logout` | 只让当前 Client token 失效，不销毁认证中心 Session |
| `/sso/logout` | 当前 Client 退出，并通知认证中心销毁全局 Session |

示例：

```ts
export const logoutApi = () => {
  return adminHttp.post('/sso/logout')
}

async function logout() {
  try {
    await logoutApi()
  } catch {
    // 后端异常时也继续清本地状态
  }

  userStore.clear()
  authStore.clear()
  socketStore.close()
  router.replace('/login')
}
```

## 本地联调 SDK

如果业务项目通过 `file:` 方式依赖本 SDK：

```json
{
  "dependencies": {
    "sz-sso-client-web-sdk": "file:../../sso/sz-sso-client-web-sdk"
  }
}
```

需要注意：业务项目通常读取 SDK 的 `dist` 产物，而不是 `src` 源码。

修改 SDK 后按以下顺序处理：

```bash
# 1. 在 SDK 项目中重新构建
pnpm run build

# 2. 重启业务项目 dev server
pnpm run dev
```

如果 Vite 仍然使用旧产物，可以清理业务项目缓存后重启：

```powershell
Remove-Item -Recurse -Force node_modules\.vite
pnpm run dev
```

也可以在业务项目中配置 alias 直连 SDK 源码，用于 SDK 开发期 HMR。生产接入不建议这么做。

## 常见问题

### 1. `/sso-login` 显示 `Failed to fetch`

常见原因是 `ssoClientApiBaseUrl` 传了完整后端地址，浏览器绕开 Vite proxy 直接跨域请求。

开发环境建议：

```ts
ssoClientApiBaseUrl: '/api'
```

如果必须跨域访问，请确认后端 CORS 配置正确。

### 2. 改了 SDK 但页面样式没变

如果业务项目使用 `file:` 依赖，修改 SDK 源码后必须先在 SDK 中执行：

```bash
pnpm run build
```

然后重启业务项目 dev server。必要时清理 `node_modules/.vite`。

### 3. 登录成功后没有菜单或权限

SDK 只负责换 token，并调用 `onLoginSuccess`。菜单、权限、用户详情初始化应由业务项目在自己的登录成功流程或路由守卫中完成。

### 4. 退出后再次点击登录会自动登录

大概率是退出时调用了 `/auth/logout`，认证中心 Session 没有销毁。应改为 `/sso/logout`。

### 5. 是否必须使用 `SsoUserMenu`

不必须。`SsoUserMenu` 是可选 UI。只接入登录流程时只需要：

- `createSsoClient`
- `createSsoPlugin`
- `getSsoRoutes`
- `SSO_CALLBACK_PATH`

## 类型

### `SsoLoginResult`

```ts
interface SsoLoginResult<U = SsoUserInfo> {
  accessToken: string
  userInfo: U
  [key: string]: unknown
}
```

可以传入业务用户类型：

```ts
import type { UserInfo } from '@/api/types/system/login'

const client = createSsoClient<UserInfo>({
  // ...
  onLoginSuccess(data) {
    // data.userInfo 会推断为 UserInfo
  },
})
```

### `SsoUserInfo`

```ts
interface SsoUserInfo {
  id?: number
  username?: string
  nickname?: string
  phone?: string
  email?: string
  logo?: string
  [key: string]: unknown
}
```

## 依赖说明

运行时 dependencies 为空：

```json
"dependencies": {}
```

Peer dependencies：

| 依赖 | 用途 | 是否必须 |
| --- | --- | --- |
| `vue` | Vue 适配层和组件 | 使用 `sz-sso-client-web-sdk/vue` 时需要 |
| `vue-router` | `getSsoRoutes` / `SsoCallback` | 使用 Vue 路由接入时需要 |
| `element-plus` | `SsoCallback` / `SsoForbidden` / `SsoUserMenu` UI | 使用内置 UI 时需要 |

如果只使用 core：

```ts
import { createSsoClient } from 'sz-sso-client-web-sdk'
```

则不需要引入 Vue、Vue Router、Element Plus。

## 验证命令

```bash
pnpm run type-check
pnpm run build
```
