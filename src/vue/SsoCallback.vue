<template>
  <!-- 全屏绿色渐变覆盖层 -->
  <div class="sso-cb-overlay">
    <div class="sso-cb-card">
      <!-- Logo：与 UCenterWeb AuthLogo variant="icon" size="lg" 保持一致 -->
      <div class="sso-cb-logo">
        <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="56" height="56" rx="14" fill="url(#sso-logo-grad)" />
          <path
            d="M28 16a12 12 0 1 0 0 24 12 12 0 0 0 0-24zm0 4.8a7.2 7.2 0 1 1 0 14.4 7.2 7.2 0 0 1 0-14.4z"
            fill="white"
            fill-opacity="0.3"
          />
          <circle cx="28" cy="28" r="4.8" fill="white" />
          <defs>
            <linearGradient
              id="sso-logo-grad"
              x1="0"
              y1="0"
              x2="56"
              y2="56"
              gradientUnits="userSpaceOnUse"
            >
              <stop stop-color="#10b981" />
              <stop offset="1" stop-color="#3b82f6" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <!-- 状态指示区：loading / success / error 三态 -->
      <div class="sso-cb-indicator">
        <!-- loading 态：spinner -->
        <div v-if="status === 'loading'" class="sso-cb-spinner" />

        <!-- success 态：✓ 图标 -->
        <div v-else-if="status === 'success'" class="sso-cb-success-icon">
          <svg
            viewBox="0 0 52 52"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="26"
              cy="26"
              r="25"
              stroke="#10b981"
              stroke-width="2"
              fill="none"
            />
            <path
              d="M14 26l8 8 16-16"
              stroke="#10b981"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>

        <!-- error 态：❌ 图标 -->
        <div v-else-if="status === 'error'" class="sso-cb-error-icon">
          <svg
            viewBox="0 0 52 52"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="26"
              cy="26"
              r="25"
              stroke="#e53e3e"
              stroke-width="2"
              fill="none"
            />
            <path
              d="M18 18l16 16M34 18l-16 16"
              stroke="#e53e3e"
              stroke-width="3"
              stroke-linecap="round"
            />
          </svg>
        </div>
      </div>

      <!-- 状态文字 -->
      <p class="sso-cb-status-text" :class="{ 'is-error': status === 'error' }">
        {{ statusText }}
      </p>

      <!-- 错误详情 + 重试按钮（仅 error 态显示） -->
      <template v-if="status === 'error'">
        <p v-if="errorMsg" class="sso-cb-error-msg">{{ errorMsg }}</p>
        <button class="sso-cb-retry-btn" @click="retry">重新登录</button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useSsoClient } from "./composables";

defineOptions({ name: "SsoCallback" });

// ---- 类型 ----
type Status = "loading" | "success" | "error";

// ---- 登录路径检测（防止 back 参数指向登录页导致死循环） ----
const LOGIN_PATHS = ["/login", "/sso-login"];

function isLoginPath(url: string): boolean {
  if (!url) return false;
  try {
    const pathname = new URL(url).pathname;
    return LOGIN_PATHS.some(
      (p) =>
        pathname === p ||
        pathname.startsWith(p + "/") ||
        pathname.startsWith(p + "?"),
    );
  } catch {
    // 纯路径
    return LOGIN_PATHS.some(
      (p) => url === p || url.startsWith(p + "/") || url.startsWith(p + "?"),
    );
  }
}

// ---- 状态 ----
const route = useRoute();
const client = useSsoClient();

const status = ref<Status>("loading");
const errorMsg = ref("");

const statusText = computed(() => {
  switch (status.value) {
    case "loading":
      return hasTicket.value ? "正在登录，请稍候..." : "正在跳转到认证中心...";
    case "success":
      return "登录成功，即将跳转...";
    case "error":
      return "SSO 登录失败";
  }
});

// 提前判断是否有 ticket，用于 statusText 计算
const hasTicket = ref(false);

// ---- 核心逻辑 ----
async function handleCallback() {
  const ticket = (route.query.ticket as string) || "";
  const back = (route.query.back as string) || "";
  hasTicket.value = !!ticket;

  status.value = "loading";
  errorMsg.value = "";

  try {
    if (ticket) {
      // 有 ticket：调后端换 token
      await client.handleCallback(ticket, back);

      // 切换为成功态
      status.value = "success";

      // 等待 400ms 展示成功状态，再执行跳转
      await new Promise((resolve) => setTimeout(resolve, 400));

      // 确定跳转目标：back 解码后若指向登录页则兜底跳首页
      const target = back ? decodeURIComponent(back) : "/";
      window.location.href = isLoginPath(target) ? "/" : target;
    } else {
      // 无 ticket：跳转到认证中心
      const target = back ? decodeURIComponent(back) : undefined;
      await client.goSsoLogin(target);
      // goSsoLogin 会执行 window.location.href，页面已离开，以下代码不会运行
    }
  } catch (e: any) {
    status.value = "error";
    errorMsg.value =
      e?.message ||
      e?.msg ||
      (typeof e === "string" ? e : "登录失败，请稍后重试");
    console.error("[sso-sdk] SSO callback failed:", e);
    client.getConfig().onLoginError?.(e);
  }
}

function retry() {
  const back = (route.query.back as string) || "";
  status.value = "loading";
  errorMsg.value = "";
  hasTicket.value = false;
  client
    .goSsoLogin(back ? decodeURIComponent(back) : undefined)
    .catch((e: any) => {
      status.value = "error";
      errorMsg.value = e?.message || "重试失败，请稍后再试";
    });
}

onMounted(() => {
  handleCallback();
});
</script>

<style scoped>
/* ---- 全屏覆盖层：与 UCenterWeb oauth-overlay 完全一致的配色 ---- */
.sso-cb-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #d1fae5 100%);
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC",
    "Microsoft YaHei", sans-serif;
  z-index: 9999;
}

/* ---- 中央卡片：毛玻璃 + 绿色描边，与 UCenterWeb oauth-overlay-card 一致 ---- */
.sso-cb-card {
  box-sizing: border-box;
  text-align: center;
  width: 300px;
  padding: 40px 48px;
  background: rgba(255, 255, 255, 0.98);
  border-radius: 20px;
  backdrop-filter: blur(20px);
  box-shadow:
    0 8px 32px rgba(16, 185, 129, 0.08),
    0 0 0 1px rgba(16, 185, 129, 0.05);
  border: 1px solid rgba(16, 185, 129, 0.1);
  animation: sso-card-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes sso-card-in {
  from {
    opacity: 0;
    transform: scale(0.88) translateY(12px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* ---- Logo：与 UCenterWeb oauth-overlay-logo 一致（56×56 圆角方块图标） ---- */
.sso-cb-logo {
  width: 56px;
  height: 56px;
  margin: 0 auto 20px;
}

.sso-cb-logo svg {
  width: 100%;
  height: 100%;
  display: block;
  border-radius: 14px;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
}

/* ---- 状态指示区：与 UCenterWeb oauth-overlay-indicator 同尺寸同间距 ---- */
.sso-cb-indicator {
  width: 44px;
  height: 44px;
  margin: 0 auto 16px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Spinner：border 颜色与 UCenterWeb oauth-overlay-spinner 一致 */
.sso-cb-spinner {
  width: 44px;
  height: 44px;
  border: 3px solid #d1fae5;
  border-top-color: #10b981;
  border-radius: 50%;
  animation: sso-spin 0.8s linear infinite;
}

@keyframes sso-spin {
  to {
    transform: rotate(360deg);
  }
}

/* Success icon */
.sso-cb-success-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: sso-pop-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.sso-cb-success-icon svg {
  width: 100%;
  height: 100%;
}

/* Error icon */
.sso-cb-error-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: sso-pop-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.sso-cb-error-icon svg {
  width: 100%;
  height: 100%;
}

@keyframes sso-pop-in {
  from {
    opacity: 0;
    transform: scale(0.5);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* ---- 状态文字：与 UCenterWeb oauth-overlay-status 一致 ---- */
.sso-cb-status-text {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  color: #374151;
  text-align: center;
  min-height: 1.5em;
}

.sso-cb-status-text.is-error {
  color: #e53e3e;
}

/* ---- 错误详情 ---- */
.sso-cb-error-msg {
  margin: 12px auto 0;
  font-size: 13px;
  color: #6b7280;
  text-align: center;
  max-width: 240px;
  line-height: 1.5;
}

/* ---- 重试按钮 ---- */
.sso-cb-retry-btn {
  margin-top: 16px;
  padding: 9px 28px;
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition:
    opacity 0.2s,
    transform 0.1s;
}

.sso-cb-retry-btn:hover {
  opacity: 0.9;
}

.sso-cb-retry-btn:active {
  transform: scale(0.97);
}
</style>
