<template>
  <main class="sso-client-login-page">
    <div class="sso-client-login-page__shell">
      <slot name="theme" />

      <section
        class="sso-client-login-page__intro"
        aria-labelledby="sso-client-login-page-title"
      >
        <span class="sso-client-login-page__edition">{{ edition }}</span>
        <h1 id="sso-client-login-page-title">{{ title }}</h1>
        <p>{{ description }}</p>

        <div
          v-if="tags.length"
          class="sso-client-login-page__tags"
          aria-label="SSO capability tags"
        >
          <span v-for="tag in tags" :key="tag">{{ tag }}</span>
        </div>

        <slot name="illustration">
          <div
            v-if="illustration"
            class="sso-client-login-page__illustration"
            aria-hidden="true"
          >
            <img :src="illustration" alt="" />
          </div>
          <div v-else class="sso-client-login-page__diagram" aria-hidden="true">
            <div class="sso-client-login-page__diagram-lock">
              <el-icon><Lock /></el-icon>
            </div>
            <span class="sso-client-login-page__diagram-node sso-client-login-page__diagram-node--user">
              <el-icon><User /></el-icon>
            </span>
            <span class="sso-client-login-page__diagram-node sso-client-login-page__diagram-node--client">
              <el-icon><Monitor /></el-icon>
            </span>
            <span class="sso-client-login-page__diagram-node sso-client-login-page__diagram-node--key">
              <el-icon><Key /></el-icon>
            </span>
          </div>
        </slot>
      </section>

      <section
        class="sso-client-login-page__card"
        aria-labelledby="sso-client-login-page-card-title"
      >
        <div class="sso-client-login-page__auth-label">{{ authLabel }}</div>

        <slot name="logo">
          <img
            v-if="logo"
            class="sso-client-login-page__logo-img"
            :src="logo"
            alt="logo"
          />
          <SsoLogo v-else size="lg" class="sso-client-login-page__logo" />
        </slot>

        <h2 id="sso-client-login-page-card-title">{{ appName }}</h2>
        <p>{{ appDescription }}</p>

        <ElButton
          class="sso-client-login-page__sso-button"
          type="primary"
          size="large"
          :loading="loading"
          @click="handleSsoLogin"
        >
          <el-icon><Link /></el-icon>
          {{ ssoButtonText }}
        </ElButton>

        <slot name="actions" />

        <div
          v-if="showLocalLogin && hasDefaultSlot"
          class="sso-client-login-page__local-login"
        >
          <div class="sso-client-login-page__divider">
            <span>{{ localLoginTitle }}</span>
          </div>
          <slot />
        </div>

        <slot name="footer" />
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, ref, useSlots } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElButton, ElIcon, ElMessage } from "element-plus";
import { Key, Link, Lock, Monitor, User } from "@element-plus/icons-vue";
import { useSsoClient } from "./composables";
import SsoLogo from "./SsoLogo.vue";

defineOptions({ name: "SsoClientLoginPage" });

type BeforeSsoLogin = (backUrl: string) => void | boolean | Promise<void | boolean>;
type ResolveBackUrl = () => string;

interface Props {
  edition?: string;
  title?: string;
  description?: string;
  tags?: string[];
  authLabel?: string;
  appName?: string;
  appDescription?: string;
  ssoButtonText?: string;
  localLoginTitle?: string;
  showLocalLogin?: boolean;
  autoRedirect?: boolean;
  defaultBackUrl?: string;
  loginPaths?: string[];
  logo?: string;
  illustration?: string;
  resolveBackUrl?: ResolveBackUrl;
  beforeSsoLogin?: BeforeSsoLogin;
}

const props = withDefaults(defineProps<Props>(), {
  edition: "SSO Community Edition",
  title: "统一身份入口",
  description: "为业务系统提供稳定、清晰的统一登录体验，连接用户、Client 与账号中心。",
  tags: () => ["统一登录", "Client 接入", "账号管理"],
  authLabel: "认证中心",
  appName: "业务系统",
  appDescription: "通过统一认证中心安全登录",
  ssoButtonText: "认证中心登录",
  localLoginTitle: "本地登录",
  showLocalLogin: true,
  autoRedirect: true,
  defaultBackUrl: "",
  loginPaths: () => ["/login", "/sso-login"],
  logo: "",
  illustration: "",
  resolveBackUrl: undefined,
  beforeSsoLogin: undefined,
});

const emit = defineEmits<{
  /** 点击 SSO 登录时触发；autoRedirect=false 时由业务方接管跳转。 */
  "sso-login": [backUrl: string];
  /** SSO 登录跳转失败时触发。 */
  "sso-login-error": [error: unknown];
}>();

const route = useRoute();
const router = useRouter();
const client = useSsoClient();
const slots = useSlots();
const loading = ref(false);

const hasDefaultSlot = computed(() => Boolean(slots.default));

function decodeQueryValue(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isLoginPath(url: string): boolean {
  if (!url) return false;

  try {
    const pathname = new URL(url, window.location.origin).pathname;
    return getEffectiveLoginPaths().some((path) => pathname === path || pathname.startsWith(`${path}/`));
  } catch {
    return getEffectiveLoginPaths().some(
      (path) => url === path || url.startsWith(`${path}/`) || url.startsWith(`${path}?`),
    );
  }
}

function getEffectiveLoginPaths(): string[] {
  const callbackPath = client.getConfig().callbackPath;
  return Array.from(new Set([...props.loginPaths, callbackPath].filter(Boolean)));
}

function resolveSafeBackUrl(raw: string | undefined, fallback: string): string {
  if (!raw) return fallback;

  const value = decodeQueryValue(raw).trim();
  if (!value) return fallback;
  if (value.startsWith("//")) return fallback;
  if (/^(javascript|data|vbscript):/i.test(value)) return fallback;

  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return fallback;
    const result = `${url.pathname}${url.search}${url.hash}` || fallback;
    return isLoginPath(result) ? fallback : result;
  } catch {
    return fallback;
  }
}

function getBackFromRoute(): string | undefined {
  const back = route.query.back;
  const value = Array.isArray(back) ? back[0] : back;
  return typeof value === "string" ? value : undefined;
}

function resolveBackUrl(): string {
  const fallback = props.defaultBackUrl || client.getConfig().defaultBackUrl || "/";

  if (props.resolveBackUrl) {
    return resolveSafeBackUrl(props.resolveBackUrl(), fallback);
  }

  const fromQuery = getBackFromRoute();
  if (typeof fromQuery === "string") {
    return resolveSafeBackUrl(fromQuery, fallback);
  }

  const current = router.currentRoute.value.fullPath;
  if (current && current !== route.fullPath) {
    return resolveSafeBackUrl(current, fallback);
  }

  return fallback;
}

async function handleSsoLogin() {
  const backUrl = resolveBackUrl();
  emit("sso-login", backUrl);

  if (!props.autoRedirect) {
    return;
  }

  try {
    loading.value = true;
    const beforeResult = await props.beforeSsoLogin?.(backUrl);
    if (beforeResult === false) {
      return;
    }

    await router.push({
      path: client.getConfig().callbackPath,
      query: { back: backUrl },
    });
  } catch (error: any) {
    emit("sso-login-error", error);
    ElMessage.error(error?.message || "无法跳转到认证中心");
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.sso-client-login-page {
  position: relative;
  display: flex;
  min-height: 100dvh;
  padding: 28px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background:
    linear-gradient(135deg, rgb(245 255 251 / 94%) 0%, rgb(246 249 255 / 96%) 45%, rgb(255 255 255 / 98%) 100%),
    radial-gradient(circle at 18% 16%, rgb(24 214 157 / 20%) 0, transparent 34%),
    radial-gradient(circle at 82% 10%, rgb(83 122 255 / 14%) 0, transparent 30%);
  font-family:
    var(--el-font-family),
    "Helvetica Neue",
    Helvetica,
    "PingFang SC",
    "Hiragino Sans GB",
    "Microsoft YaHei",
    Arial,
    sans-serif;
}

.sso-client-login-page::before {
  position: absolute;
  inset: 0;
  content: "";
  background-image:
    linear-gradient(rgb(31 45 61 / 4%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(31 45 61 / 4%) 1px, transparent 1px);
  background-size: 44px 44px;
  mask-image: linear-gradient(135deg, rgb(0 0 0 / 72%), transparent 74%);
}

.sso-client-login-page::after {
  position: absolute;
  right: -160px;
  bottom: 12%;
  width: 360px;
  height: 360px;
  content: "";
  background: linear-gradient(135deg, rgb(0 168 139 / 18%), rgb(73 116 255 / 14%));
  border-radius: 50%;
}

.sso-client-login-page__shell {
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) 456px;
  gap: clamp(42px, 6vw, 96px);
  align-items: center;
  width: min(1180px, 100%);
  min-height: min(760px, calc(100vh - 56px));
  padding: clamp(34px, 5vw, 70px);
  margin: 0 auto;
  overflow: hidden;
  background: rgb(255 255 255 / 76%);
  border: 1px solid rgb(255 255 255 / 78%);
  border-radius: 8px;
  box-shadow: 0 28px 80px rgb(26 38 61 / 12%);
  backdrop-filter: blur(18px);
}

.sso-client-login-page__intro {
  display: grid;
  gap: 34px;
  min-width: 0;
}

.sso-client-login-page__edition {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  height: 30px;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 700;
  line-height: 30px;
  color: #047f70;
  background: rgb(0 168 139 / 10%);
  border: 1px solid rgb(0 168 139 / 16%);
  border-radius: 999px;
}

.sso-client-login-page__intro h1 {
  max-width: 560px;
  margin: -12px 0 -20px;
  font-size: clamp(38px, 4vw, 58px);
  font-weight: 800;
  line-height: 1.08;
  color: #1d2b3a;
  letter-spacing: 0;
}

.sso-client-login-page__intro p {
  max-width: 520px;
  margin: -12px 0 0;
  font-size: 17px;
  line-height: 1.8;
  color: #526579;
}

.sso-client-login-page__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: -10px;
}

.sso-client-login-page__tags span {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 14px;
  font-size: 14px;
  font-weight: 600;
  color: #24364a;
  background: rgb(255 255 255 / 72%);
  border: 1px solid rgb(71 92 120 / 10%);
  border-radius: 6px;
  box-shadow: 0 10px 22px rgb(31 45 61 / 6%);
}

.sso-client-login-page__illustration img {
  position: relative;
  display: block;
  width: min(540px, 100%);
  max-height: 430px;
  object-fit: contain;
  filter: drop-shadow(0 18px 28px rgb(43 58 84 / 12%));
}

.sso-client-login-page__diagram {
  position: relative;
  width: min(520px, 100%);
  height: 260px;
}

.sso-client-login-page__diagram::before,
.sso-client-login-page__diagram::after {
  position: absolute;
  inset: 42px 34px 28px;
  content: "";
  border: 1px dashed rgb(0 168 139 / 36%);
  border-radius: 50%;
  transform: rotate(-5deg);
}

.sso-client-login-page__diagram::after {
  border-color: rgb(73 116 255 / 26%);
  transform: rotate(8deg);
}

.sso-client-login-page__diagram-lock,
.sso-client-login-page__diagram-node {
  position: absolute;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #047f70;
  background: rgb(255 255 255 / 82%);
  border: 1px solid rgb(0 168 139 / 12%);
  box-shadow: 0 18px 32px rgb(31 45 61 / 8%);
}

.sso-client-login-page__diagram-lock {
  top: 56px;
  left: 50%;
  width: 76px;
  height: 76px;
  font-size: 34px;
  color: #fff;
  background: #0f8b7f;
  border: 0;
  border-radius: 18px;
  transform: translateX(-50%);
}

.sso-client-login-page__diagram-node {
  width: 56px;
  height: 56px;
  font-size: 24px;
  border-radius: 14px;
}

.sso-client-login-page__diagram-node--user {
  bottom: 44px;
  left: 18%;
}

.sso-client-login-page__diagram-node--client {
  top: 84px;
  right: 18%;
  color: #2563eb;
  border-color: rgb(37 99 235 / 12%);
}

.sso-client-login-page__diagram-node--key {
  right: 36%;
  bottom: 22px;
  color: #334155;
  border-color: rgb(51 65 85 / 12%);
}

.sso-client-login-page__card {
  box-sizing: border-box;
  width: 100%;
  padding: 46px 42px 42px;
  text-align: center;
  background:
    linear-gradient(180deg, rgb(255 255 255 / 98%), rgb(255 255 255 / 92%)),
    var(--el-bg-color);
  border: 1px solid rgb(71 92 120 / 10%);
  border-radius: 8px;
  box-shadow: 0 24px 58px rgb(26 38 61 / 14%);
}

.sso-client-login-page__auth-label {
  margin-bottom: 22px;
  font-size: 13px;
  font-weight: 700;
  color: #059b88;
}

.sso-client-login-page__logo,
.sso-client-login-page__logo-img {
  margin: 0 auto 16px;
}

.sso-client-login-page__logo-img {
  display: block;
  width: 58px;
  height: 58px;
  object-fit: cover;
  border-radius: 14px;
  box-shadow: 0 12px 24px rgb(0 168 139 / 18%);
}

.sso-client-login-page__card h2 {
  margin: 0;
  font-size: 30px;
  font-weight: 800;
  line-height: 1.15;
  color: #243447;
  letter-spacing: 0;
}

.sso-client-login-page__card p {
  margin: 28px 0 20px;
  font-size: 15px;
  line-height: 1.7;
  color: var(--el-text-color-regular);
}

.sso-client-login-page__sso-button {
  width: 100%;
  height: 44px;
  margin-top: 2px;
  font-size: 15px;
  font-weight: 700;
  border: 0;
  border-radius: 6px;
  box-shadow: 0 14px 28px rgb(0 168 139 / 22%);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;
}

.sso-client-login-page__sso-button:hover {
  box-shadow: 0 18px 34px rgb(0 150 136 / 26%);
  transform: translateY(-1px);
}

.sso-client-login-page__sso-button:active {
  transform: translateY(0);
}

.sso-client-login-page__local-login {
  margin-top: 26px;
}

.sso-client-login-page__divider {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 22px;
  color: #7c8a9a;
  font-size: 13px;
}

.sso-client-login-page__divider::before,
.sso-client-login-page__divider::after {
  flex: 1;
  height: 1px;
  content: "";
  background: #e6edf3;
}

:deep(.dark) {
  position: absolute;
  top: 24px;
  right: 24px;
  z-index: 2;
}

:global(html.dark .sso-client-login-page) {
  background:
    linear-gradient(135deg, rgb(13 18 24 / 98%) 0%, rgb(16 20 29 / 98%) 54%, rgb(12 15 19 / 98%) 100%),
    radial-gradient(circle at 18% 16%, rgb(0 168 139 / 14%) 0, transparent 34%),
    radial-gradient(circle at 82% 10%, rgb(83 122 255 / 12%) 0, transparent 30%);
}

:global(html.dark .sso-client-login-page__shell) {
  background: rgb(15 18 23 / 78%);
  border-color: rgb(255 255 255 / 6%);
}

:global(html.dark .sso-client-login-page__edition) {
  color: #55dec4;
  background: rgb(0 168 139 / 14%);
  border-color: rgb(85 222 196 / 16%);
}

:global(html.dark .sso-client-login-page__intro h1),
:global(html.dark .sso-client-login-page__card h2) {
  color: var(--el-text-color-primary);
}

:global(html.dark .sso-client-login-page__intro p),
:global(html.dark .sso-client-login-page__card p) {
  color: var(--el-text-color-secondary);
}

:global(html.dark .sso-client-login-page__tags span) {
  color: #dce8f1;
  background: rgb(255 255 255 / 5%);
  border-color: rgb(255 255 255 / 10%);
  box-shadow: none;
}

:global(html.dark .sso-client-login-page__illustration img) {
  opacity: 0.86;
  filter: saturate(0.92) brightness(0.95);
}

:global(html.dark .sso-client-login-page__card) {
  background: rgb(22 24 27 / 92%);
  border-color: rgb(255 255 255 / 8%);
  box-shadow: 0 18px 48px rgb(0 0 0 / 36%);
}

:global(html.dark .sso-client-login-page__diagram-lock) {
  background: #0b746d;
}

:global(html.dark .sso-client-login-page__diagram-node) {
  background: rgb(255 255 255 / 6%);
}

:global(html.dark .sso-client-login-page__divider) {
  color: #8d9baa;
}

:global(html.dark .sso-client-login-page__divider::before),
:global(html.dark .sso-client-login-page__divider::after) {
  background: rgb(255 255 255 / 10%);
}

@media screen and (width <= 1080px) {
  .sso-client-login-page__shell {
    grid-template-columns: 1fr;
    gap: 28px;
    place-items: center;
  }

  .sso-client-login-page__intro {
    max-width: 560px;
    text-align: center;
  }

  .sso-client-login-page__intro h1,
  .sso-client-login-page__intro p {
    margin-right: auto;
    margin-left: auto;
  }

  .sso-client-login-page__tags {
    justify-content: center;
  }

  .sso-client-login-page__diagram,
  .sso-client-login-page__illustration {
    display: none;
  }

  .sso-client-login-page__card {
    max-width: 456px;
    margin: 0 auto;
  }
}

@media screen and (width <= 620px) {
  .sso-client-login-page {
    padding: 0;
  }

  .sso-client-login-page::before,
  .sso-client-login-page::after {
    display: none;
  }

  .sso-client-login-page__shell {
    width: 100%;
    min-height: 100dvh;
    padding: 72px 18px 28px;
    border: none;
    border-radius: 0;
    box-shadow: none;
  }

  .sso-client-login-page__edition {
    margin-bottom: 16px;
  }

  .sso-client-login-page__intro p {
    font-size: 15px;
  }

  .sso-client-login-page__tags {
    margin-top: 20px;
  }

  .sso-client-login-page__card {
    max-width: 420px;
    padding: 38px 24px 34px;
  }

  .sso-client-login-page__card h2 {
    font-size: 26px;
    white-space: normal;
  }

  :deep(.dark) {
    top: 18px;
    right: 18px;
  }
}
</style>
