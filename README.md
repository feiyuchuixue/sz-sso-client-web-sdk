# sz-sso-client-web-sdk

前端 SSO 接入 SDK。**只做连接器，不做业务**——负责 SSO 协议对接（获取跳转地址、ticket 换 token、回调处理），不包含路由守卫、token 存储、axios 拦截器等（由业务方自行实现）。

---

## 专题文档

- `SsoUserMenu` 产品级接入指导：`docs/sso-user-menu-integration.md`

## 安装

```bash
npm install sz-sso-client-web-sdk
```

---

## 快速接入（Vue 3 + Vue Router）

### 1. 初始化 SDK（`main.ts`）

```typescript
import { createApp } from "vue";
import pinia from "@/stores";
import App from "@/App.vue";
import router from "@/router";

import { createSsoClient } from "sz-sso-client-web-sdk";
import { createSsoPlugin } from "sz-sso-client-web-sdk/vue";
import "sz-sso-client-web-sdk/style.css";

import { useUserStore } from "@/stores/modules/user";

const app = createApp(App);

// pinia 必须在 useUserStore() 之前注册
app.use(pinia);

const userStore = useUserStore();
const ssoClient = createSsoClient({
  apiBaseUrl: import.meta.env.VITE_API_URL, // 客户端后端地址，e.g. 'http://127.0.0.1:9991/api'
  ucenterBaseUrl: import.meta.env.VITE_UCENTER_URL, // 认证中心前端地址，使用 SsoUserMenu 「账号安全」功能时必填
  onLoginSuccess(data) {
    // 登录成功：在此存储 token 和用户信息，其余逻辑由业务方自行实现
    userStore.setToken(data.accessToken);
    userStore.setUserInfo(data.userInfo);
  },
});

// 将 ssoClient 注入 Vue 应用（供组件内 useSsoClient() 使用）
app.use(createSsoPlugin(ssoClient));
app.use(router);
app.mount("#app");
```

### 2. 注册路由 + 白名单

**静态路由（`router/modules/staticRouter.ts`）：**

```typescript
import type { RouteRecordRaw } from "vue-router";
import { getSsoRoutes } from "sz-sso-client-web-sdk/vue";

export const staticRouter: RouteRecordRaw[] = [
  { path: "/login", component: () => import("@/views/login/index.vue") },

  // 一行注册 /sso-login 回调路由，使用 SDK 内置 SsoCallback 组件
  ...getSsoRoutes(),

  // ... 其他路由
];
```

**路由白名单（`src/config/index.ts`）：**

```typescript
import { SSO_CALLBACK_PATH } from "sz-sso-client-web-sdk";

// 使用常量而非硬编码，确保与 SDK 默认行为严格一致
export const ROUTER_WHITE_LIST: string[] = ["/500", SSO_CALLBACK_PATH];
```

**路由守卫（`router/index.ts`）：**

```typescript
import { ROUTER_WHITE_LIST, LOGIN_URL } from "@/config";
import { useUserStore } from "@/stores/modules/user";

router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore();

  if (to.path === LOGIN_URL) {
    return userStore.token ? next(from.fullPath) : next();
  }

  // ⚠️ /sso-login 必须在白名单中，否则守卫会因无 token 拦截 SSO 回调，导致登录失败
  if (ROUTER_WHITE_LIST.includes(to.path)) {
    return next();
  }

  if (!userStore.token) {
    return next({ path: LOGIN_URL, replace: true });
  }

  next();
});
```

### 3. 添加登录入口（登录页）

点击后跳转到 `/sso-login`，SDK 的 `SsoCallback` 组件会自动发起 SSO 流程：

```vue
<template>
  <ElButton type="primary" @click="handleSsoLogin">认证中心登录</ElButton>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter();

const handleSsoLogin = () => {
  router.push({
    path: "/sso-login",
    query: { back: location.href }, // 登录后回跳当前页
  });
};
</script>
```

---

## 纯 JS 接入（无 Vue 框架）

> `SsoCallback` 是 Vue 组件，纯 JS 场景不可用。回调页需业务方自行编写 HTML 页面，手动调用 `handleCallback()`。

**触发 SSO 登录（任意页面）：**

```javascript
import { createSsoClient } from "sz-sso-client-web-sdk";

const ssoClient = createSsoClient({
  apiBaseUrl: "http://127.0.0.1:9991/api",
  onLoginSuccess(data) {
    localStorage.setItem("token", data.accessToken);
    localStorage.setItem("userInfo", JSON.stringify(data.userInfo));
  },
});

// 跳转到认证中心，认证完成后回跳到 /sso-callback.html
await ssoClient.goSsoLogin();
```

**回调页（`/sso-callback.html`）：**

```html
<!doctype html>
<html>
  <body>
    <p>登录中，请稍候...</p>
    <script type="module">
      import { createSsoClient } from "sz-sso-client-web-sdk";

      const ssoClient = createSsoClient({
        apiBaseUrl: "http://127.0.0.1:9991/api",
        onLoginSuccess(data) {
          localStorage.setItem("token", data.accessToken);
        },
      });

      // 从 URL 查询参数中提取 ticket 和 back，然后调用 handleCallback()
      // 建议封装为工具函数，在触发页和回调页复用同一个 ssoClient 实例
      const params = new URLSearchParams(location.search);
      const ticket = params.get("ticket");
      const back = params.get("back") ?? "/";

      if (ticket) {
        await ssoClient.handleCallback(ticket, back);
        location.href = back; // 回跳到原页面
      } else {
        console.error("缺少 ticket 参数");
      }
    </script>
  </body>
</html>
```

> **建议**：将 `createSsoClient(...)` 的配置抽取到单独模块（如 `sso.js`），触发页和回调页共同 import，避免重复配置 `onLoginSuccess`。

---

## 登录页参考实现（Vue 3 + Element Plus）

SDK 不内置登录页 UI（避免 UI 框架耦合），但提供一份开箱即用的参考实现。将以下代码复制到项目中，按需修改 Logo、文案和样式即可。

**`src/views/login/index.vue`：**

```vue
<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-left">
        <!-- 替换为你的左侧插图 -->
        <img src="@/assets/images/login_left.png" alt="login" />
      </div>
      <div class="login-form">
        <div class="login-logo">
          <!-- 替换为你的 Logo 和标题 -->
          <img class="login-icon" src="@/assets/images/logo.svg" alt="logo" />
          <h2 class="logo-text">My Admin</h2>
        </div>
        <p class="sso-desc">通过统一认证中心安全登录</p>
        <el-button
          class="sso-btn"
          type="primary"
          size="large"
          round
          :loading="loading"
          @click="handleSsoLogin"
        >
          <el-icon v-if="!loading"><Connection /></el-icon>
          {{ loading ? "跳转中..." : "认证中心登录" }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Connection } from "@element-plus/icons-vue";
import { useSsoClient } from "sz-sso-client-web-sdk/vue";

const ssoClient = useSsoClient();
const loading = ref(false);

const handleSsoLogin = async () => {
  loading.value = true;
  try {
    await ssoClient.goSsoLogin(); // 获取认证中心 URL 并跳转，成功后页面跳走
  } finally {
    loading.value = false; // 仅在出错时恢复按钮状态
  }
};
</script>

<style scoped lang="scss">
.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background-color: #eeeeee;
  background-image: url("@/assets/images/login_bg.svg");
  background-size: cover;
}

.login-box {
  display: flex;
  align-items: center;
  justify-content: space-around;
  width: 96.5%;
  height: 94%;
  padding: 0 50px;
  background-color: rgb(255 255 255 / 80%);
  border-radius: 10px;
}

.login-left img {
  width: 100%;
  height: 100%;
}

.login-form {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 420px;
  min-height: 380px;
  padding: 50px 40px;
  background-color: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 10px 2px rgb(0 0 0 / 10%);
}

.login-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;

  .login-icon {
    width: 60px;
    height: 52px;
  }

  .logo-text {
    padding-left: 25px;
    margin: 0;
    font-size: 42px;
    font-weight: bold;
    color: #34495e;
    white-space: nowrap;
  }
}

.sso-desc {
  margin: 0 0 48px;
  font-size: 14px;
  color: #909399;
  text-align: center;
}

.sso-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
  letter-spacing: 2px;
}

/* 小屏隐藏左侧插图 */
@media screen and (width <= 1250px) {
  .login-left {
    display: none;
  }
}

@media screen and (width <= 600px) {
  .login-form {
    width: 97%;
  }
}
</style>
```

> **说明：**
>
> - 此模板依赖 Element Plus，如使用其他 UI 框架请替换 `el-button`、`el-icon` 部分
> - `useSsoClient()` 需要先在 `main.ts` 中通过 `createSsoPlugin(ssoClient)` 注入，见[快速接入第 1 步](#1-初始化-sdk-maints)
> - 若不使用 Vue Router（如纯 JS 场景），直接调用 `ssoClient.goSsoLogin()` 即可，无需此模板

---

## 配置项

### `createSsoClient(options)`

| 配置项           | 类型                                              | 必填 | 默认值         | 说明                                                              |
| ---------------- | ------------------------------------------------- | :--: | -------------- | ----------------------------------------------------------------- |
| `apiBaseUrl`     | `string`                                          |  ✅  | —              | 客户端后端 API 基础地址                                           |
| `onLoginSuccess` | `(data: SsoLoginResult) => void \| Promise<void>` |  ✅  | —              | 登录成功回调，在此存储 token 和用户信息                           |
| `apiPrefix`      | `string`                                          |      | `"/admin"`     | API 模块前缀，与后端 starter 配置保持一致                         |
| `callbackPath`   | `string`                                          |      | `"/sso-login"` | SSO 回调路由路径                                                  |
| `httpTimeout`    | `number`                                          |      | `120000`       | 请求超时（ms）                                                    |
| `successCode`    | `string`                                          |      | `"0000"`       | 后端成功响应码                                                    |
| `onLoginError`   | `(error: unknown) => void`                        |      | —              | 登录失败回调                                                      |
| `ucenterBaseUrl` | `string`                                          |      | —              | 认证中心前端地址，使用 `SsoUserMenu` 的「账号安全」功能时必须配置 |

---

## API

### 核心层（`sz-sso-client-web-sdk`）

#### `createSsoClient(options): SsoClient`

创建 SsoClient 实例。

#### `SSO_CALLBACK_PATH: string`

SDK 默认回调路径常量（值为 `'/sso-login'`），用于路由白名单配置，避免硬编码。

#### `SsoClient` 实例方法

| 方法                               | 说明                                                            |
| ---------------------------------- | --------------------------------------------------------------- |
| `goSsoLogin(backUrl?)`             | 获取认证中心 URL 并立即跳转                                     |
| `getSsoAuthUrl(backUrl?)`          | 仅获取认证中心 URL，不跳转                                      |
| `handleCallback(ticket, backUrl?)` | ticket 换 token，触发 `onLoginSuccess` 回调（Vue 场景自动调用） |
| `goSsoPortal(targetPath?)`         | 跳转到认证中心指定页面（需配置 `ucenterBaseUrl`）                |
| `getSsoPortalUrl(targetPath?)`     | 获取认证中心页面完整 URL，不跳转（需配置 `ucenterBaseUrl`）      |
| `getConfig()`                      | 获取当前配置（只读）                                            |

### Vue 适配层（`sz-sso-client-web-sdk/vue`）

#### `getSsoRoutes(path?): RouteRecordRaw[]`

返回 SSO 所需的路由配置数组，展开到静态路由中即完成注册。

```typescript
...getSsoRoutes()                  // 默认路径 /sso-login
...getSsoRoutes('/auth/callback')  // 自定义路径（需与 callbackPath 一致）
```

#### `createSsoPlugin(client): Plugin`

将 SsoClient 实例注入 Vue 应用，供组件内 `useSsoClient()` 使用。

#### `useSsoClient(): SsoClient`

在组件或 composable 中获取 SsoClient 实例：

```typescript
import { useSsoClient } from "sz-sso-client-web-sdk/vue";

const client = useSsoClient();
await client.goSsoLogin();
```

#### `SsoCallback`

SSO 回调处理组件，内置 loading 状态和失败重试。通过 `getSsoRoutes()` 自动注册，无需手动引入。

#### `SsoUserMenu`

统一用户菜单组件，提供产品级的右上角账户面板，内部分为「本系统」与「认证中心」两类能力：

- 顶部账户摘要：展示用户名称，并提示"统一身份由认证中心管理"
- 本系统：`个人信息`（由 client 自己处理弹窗或页面）
- 认证中心：`账号与安全`、`个人中心` 两个新标签页入口
- 底部：`退出登录`

**使用前提**：`createSsoClient` 中需配置 `ucenterBaseUrl`，否则点击认证中心入口时会抛出配置缺失错误。

**Props：**

| Prop          | 类型     | 默认值 | 说明                                              |
| ------------- | -------- | ------ | ------------------------------------------------- |
| `avatarSrc`   | `string` | `''`   | 头像图片 URL（由 client 处理 OSS 转换后传入）     |
| `displayName` | `string` | `''`   | 摘要区主名称，建议传昵称                          |
| `username`    | `string` | `''`   | 兜底账户名，`displayName` 为空时展示              |

**Emits：**

| 事件                  | 说明                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------ |
| `personal-info-click` | 点击「个人信息」菜单项时触发，client 监听并打开弹窗                                 |
| `logout`              | 用户在确认弹窗中点击「确定」后触发，client 监听并执行退出清理（调接口、清 store 等） |

**Slots：**

| Slot            | 说明                                           |
| --------------- | ---------------------------------------------- |
| `personal-info` | 用于放置 client 的个人信息弹窗组件              |

**完整示例（与 `sz-sso-client-web-v2` 对接方式）：**

```vue
<template>
  <SsoUserMenu
    :avatar-src="avatarSrc || ''"
    :display-name="userStore.userInfo.nickname || ''"
    :username="userStore.userInfo.username || ''"
    @personal-info-click="infoRef?.openDialog()"
    @logout="onLogout"
  >
    <template #personal-info>
      <!-- client 自己的业务弹窗，展示用户名、部门、身份证等 client 侧字段 -->
      <InfoDialog ref="infoRef" />
    </template>
  </SsoUserMenu>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { SsoUserMenu } from 'sz-sso-client-web-sdk/vue'
import { ElMessage } from 'element-plus'
import { LOGIN_URL } from '@/config'
import { logoutApi } from '@/api/modules/system/login'
import { useUserStore } from '@/stores/modules/user'
import { useAuthStore } from '@/stores/modules/auth'
import InfoDialog from './InfoDialog.vue'

const router = useRouter()
const userStore = useUserStore()
const authStore = useAuthStore()
const infoRef = ref<InstanceType<typeof InfoDialog>>()
const avatarSrc = ref<string | null>(null)

// 头像加载逻辑（client 自行处理 OSS 转换）
const resolveAvatar = async () => {
  avatarSrc.value = userStore.userInfo.logo || null
}

// 退出登录：由 SsoUserMenu 触发确认弹窗后 emit logout 事件
const onLogout = async () => {
  try {
    await logoutApi()   // ✅ 必须调 /sso/logout（全局登出），而非 /auth/logout
  } catch { /* 静默处理 */ }
  userStore.clear()
  authStore.clear()
  router.replace(LOGIN_URL)
  ElMessage.success('退出登录成功！')
}

resolveAvatar()
watch(() => userStore.userInfo.logo, resolveAvatar)
</script>
```

> **说明：**
>
> - `SsoUserMenu` 内置确认弹窗，用户点击「退出登录」后弹出"是否确认退出"，确认后才触发 `logout` 事件
> - `账号与安全` 会新标签页打开认证中心 `/user/account`
> - `个人中心` 会新标签页打开认证中心 `/user/apps`
> - 认证中心 session cookie 未过期时，用户进入上述页面通常无需重新登录
> - 头像 URL 由 client 侧处理（包括私有 OSS 地址转换），处理完成后通过 `avatar-src` prop 传入组件

---

## 类型说明

### `SsoLoginResult`

```typescript
interface SsoLoginResult {
  accessToken: string;
  userInfo: SsoUserInfo;
  [key: string]: unknown;
}
```

### `SsoUserInfo` 与业务 `UserInfo` 的类型对齐

`SsoUserInfo` 所有字段均为可选，`id` 同时支持 `string | number`，以适配不同后端。  
若业务方的 `UserInfo` 类型存在必填字段，TypeScript 会报类型不兼容错误，有两种解决方式：

**方式一：将业务 `UserInfo` 字段改为可选（推荐）**

```typescript
// src/api/types/system/login.ts
export type UserInfo = {
  id?: number | string; // 兼容 SDK 的 string | number
  username?: string; // 改为可选，与 SsoUserInfo 对齐
  // ...
};
```

**方式二：在 `onLoginSuccess` 中显式映射（业务 `UserInfo` 不方便修改时）**

```typescript
onLoginSuccess(data) {
  userStore.setUserInfo({
    ...data.userInfo,
    username: data.userInfo.username ?? "", // 提供明确的默认值
    id: Number(data.userInfo.id ?? 0),
  });
}
```

---

## 退出登录

SDK 不提供退出登录方法，退出逻辑由业务方自行实现。但有一个**常见踩坑点**需要注意：

**必须调用 SSO 全局登出接口，而不是普通的 token 失效接口。**

`sz-sso-client-starter` 注册了两个退出端点：

| 接口                           | 说明                                                         |
| ------------------------------ | ------------------------------------------------------------ |
| `POST {apiPrefix}/auth/logout` | 仅使客户端 token 失效，**不通知认证中心**                    |
| `POST {apiPrefix}/sso/logout`  | 使客户端 token 失效，**同时通知认证中心销毁全局 Session** ✅ |

若调用的是 `/auth/logout`，认证中心的 Session/Cookie 依然有效，用户退出后再次点击"认证中心登录"，认证中心会认为用户仍在线，**跳过身份验证直接颁发 ticket**，出现"退出后免密自动登录"的异常现象。

**正确写法：**

```typescript
// src/api/modules/system/login.ts
export const logoutApi = () => {
  return http.post(ADMIN_MODULE + `/sso/logout`); // ✅ SSO 全局登出
  // return http.post(ADMIN_MODULE + `/auth/logout`); // ❌ 仅客户端退出，认证中心 Session 未销毁
};
```

另外建议对退出接口的调用加 `try/catch`，防止接口失败时本地清理被阻塞、用户无法正常退出：

```typescript
const logout = async () => {
  try {
    await logoutApi();
  } catch {
    // 静默处理，本地清理照常进行
  }
  userStore.clear();
  router.replace(LOGIN_URL);
};
```

---

## 本地调试（SDK 联调开发）

### 方式一：file 协议 + 手动 build

```json
// package.json
{ "dependencies": { "sz-sso-client-web-sdk": "file:../sz-sso-client-web-sdk" } }
```

每次修改 SDK 源码后执行 `npm run build`（在 SDK 目录），再重启前端 dev server。

### 方式二：Vite alias 源码直链（推荐）

修改 SDK 源码后**无需重新 build**，Vite HMR 实时热更新。

```typescript
// vite.config.ts
import { resolve } from "path";

const IS_SDK_DEV = true; // 切换为 false 使用正式发布包
const SDK_SRC = resolve(__dirname, "../sz-sso-client-web-sdk/src");

const sdkAlias = IS_SDK_DEV
  ? [
      {
        // ⚠️ style.css 必须排在最前面单独配置：
        // 主包被 alias 指向源码后，package.json exports 解析失效，
        // style.css 子路径需显式指向 dist 里的实际 CSS 文件
        find: "sz-sso-client-web-sdk/style.css",
        replacement: resolve(
          __dirname,
          "node_modules/sz-sso-client-web-sdk/dist/sz-sso-client-web-sdk.css",
        ),
      },
      {
        // vue 子路径必须排在主路径之前，防止前缀误匹配
        find: "sz-sso-client-web-sdk/vue",
        replacement: resolve(SDK_SRC, "vue.ts"),
      },
      {
        find: "sz-sso-client-web-sdk",
        replacement: resolve(SDK_SRC, "index.ts"),
      },
    ]
  : [];

export default defineConfig({
  resolve: {
    alias: [{ find: "@", replacement: resolve(__dirname, "src") }, ...sdkAlias],
  },
});
```

> **alias 顺序必须为：** `style.css` → `vue` → 主包，顺序颠倒会导致前缀误匹配。

---

## 版本要求

| 依赖       | 版本   |
| ---------- | ------ |
| Vue        | ^3.3.0 |
| Vue Router | ^4.2.0 |
| axios      | ^1.7.0 |
