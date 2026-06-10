<template>
  <!-- 独立全屏页面模式（SsoCallback 是路由页面，对应 AuthTransitionCard page 模式） -->
  <div class="sso-cb-page">
    <div class="sso-cb-card">
      <!-- Logo：对应 AuthLogo variant="icon" size="lg" -->
      <SsoLogo size="lg" class="sso-cb-logo" />

      <!-- 状态指示区：三态切换，动画与 AuthTransitionCard auth-tc-indicator 完全一致 -->
      <div class="sso-cb-indicator">
        <Transition name="sso-cb-indicator" mode="out-in">
          <div
            v-if="status === 'success'"
            key="success"
            class="sso-cb-success-icon"
          >
            <ElIcon :size="44"><CircleCheck /></ElIcon>
          </div>
          <div
            v-else-if="status === 'error'"
            key="error"
            class="sso-cb-error-icon"
          >
            <ElIcon :size="44"><CircleClose /></ElIcon>
          </div>
          <div v-else key="spinner" class="sso-cb-spinner"></div>
        </Transition>
      </div>

      <!-- 状态主文字，带上下滑动淡入淡出动画 -->
      <Transition name="sso-cb-text" mode="out-in">
        <p :key="statusText" class="sso-cb-text">{{ statusText }}</p>
      </Transition>

      <!-- 副文字：错误详情（对应 AuthTransitionCard subText） -->
      <p v-if="status === 'error' && errorMsg" class="sso-cb-sub-text">
        {{ errorMsg }}
      </p>

      <!-- 重试按钮（仅 error 态） -->
      <ElButton
        v-if="status === 'error'"
        type="primary"
        class="sso-cb-retry-btn"
        @click="retry"
      >
        重新登录
      </ElButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElIcon, ElButton } from "element-plus";
import { CircleCheck, CircleClose } from "@element-plus/icons-vue";
import { useSsoClient } from "./composables";
import SsoLogo from "./SsoLogo.vue";

defineOptions({ name: "SsoCallback" });

const SSO_CLIENT_FORBIDDEN_CODE = "O4031";

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
const router = useRouter();
const client = useSsoClient();

const status = ref<Status>("loading");
const errorMsg = ref("");
// 提前判断是否有 ticket，用于 statusText 计算
const hasTicket = ref(false);

const statusText = computed(() => {
  switch (status.value) {
    case "loading":
      return hasTicket.value ? "正在完成登录..." : "正在跳转登录...";
    case "success":
      return "登录成功，即将跳转...";
    case "error":
      return "登录失败";
  }
});

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
      await client.handleCallback(ticket);

      // 切换为成功态
      status.value = "success";

      // 展示成功状态后跳转：600ms = ✓图标入场动画（0.25s弹性）完整播完 + 约0.35s用户可感知停留
      await new Promise((resolve) => setTimeout(resolve, 600));

      // 确定跳转目标：back 解码后若指向登录页则兜底跳首页
      const target = back ? decodeURIComponent(back) : "/";
      window.location.href = isLoginPath(target) ? "/" : target;
    } else {
      // 无 ticket：跳转到认证中心
      const target = back ? decodeURIComponent(back) : undefined;
      await client.goSsoLogin(target);
      // goSsoLogin 执行 window.location.href，页面已离开，以下代码不会运行
    }
  } catch (e: any) {
    if (e?.code === SSO_CLIENT_FORBIDDEN_CODE) {
      // 无权限：跳转到独立无权限页
      router.replace({
        path: "/sso-forbidden",
        query: {
          clientName: e?.data?.clientName ?? "",
          back: back,
        },
      });
    } else {
      status.value = "error";
      errorMsg.value =
        e?.message ||
        e?.msg ||
        (typeof e === "string" ? e : "登录失败，请稍后重试");
      console.error("[sso-sdk] SSO callback failed:", e);
      client.getConfig().onLoginError?.(e);
    }
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
  // 优先应用主题，确保加载动画在正确的明/暗模式下渲染
  const theme = route.query.theme as string | undefined;
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else if (theme === "light") {
    document.documentElement.classList.remove("dark");
  }
  handleCallback();
});
</script>

<style scoped>
/*
 * 所有颜色均使用 Element Plus CSS 变量，与 AuthTransitionCard 完全一致。
 * 消费方加载 EP（含暗黑主题）后自动跟随；未加载 EP 时 fallback 值生效。
 */

/* ---- 独立全屏页面（对应 AuthTransitionCard .auth-tc-page） ---- */
.sso-cb-page {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: linear-gradient(
    135deg,
    var(--el-color-primary-light-9, #f0fdf4) 0%,
    var(--el-fill-color-blank, #ffffff) 100%
  );
  font-family: var(
    --el-font-family,
    "Helvetica Neue",
    Helvetica,
    "PingFang SC",
    "Hiragino Sans GB",
    "Microsoft YaHei",
    "微软雅黑",
    Arial,
    sans-serif
  );
}

/* ---- 卡片（对应 AuthTransitionCard .auth-tc-card） ---- */
.sso-cb-card {
  text-align: center;
  width: 300px;
  padding: 40px 48px;
  background: var(--el-bg-color, #ffffff);
  border-radius: 20px;
  backdrop-filter: blur(20px);
  box-shadow:
    0 8px 32px
      color-mix(in srgb, var(--el-color-primary, #10b981) 8%, transparent),
    0 0 0 1px
      color-mix(in srgb, var(--el-color-primary, #10b981) 5%, transparent);
  border: 1px solid var(--el-border-color-light, #e5e7eb);
  box-sizing: border-box;
}

/* ---- Logo（对应 .auth-tc-logo） ---- */
.sso-cb-logo {
  margin: 0 auto 20px;
}

/* ---- 指示器容器（对应 .auth-tc-indicator） ---- */
.sso-cb-indicator {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  margin: 0 auto 16px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Spinner（对应 .auth-tc-spinner） */
.sso-cb-spinner {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  aspect-ratio: 1 / 1;
  border: 3px solid var(--el-color-primary-light-7, #d1fae5);
  border-top-color: var(--el-color-primary, #10b981);
  border-radius: 50%;
  animation: sso-cb-spin 0.8s linear infinite;
}

@keyframes sso-cb-spin {
  to {
    transform: rotate(360deg);
  }
}

/* 成功图标（对应 .auth-tc-success-icon） */
.sso-cb-success-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  color: var(--el-color-success, #10b981);
}

.sso-cb-success-icon :deep(.el-icon) {
  color: var(--el-color-success, #10b981);
}

/* 错误图标（对应 .auth-tc-error-icon） */
.sso-cb-error-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
}

.sso-cb-error-icon :deep(.el-icon) {
  color: var(--el-color-danger, #f56c6c);
}

/* ---- 主文字（对应 .auth-tc-text） ---- */
.sso-cb-text {
  font-size: 15px;
  font-weight: 500;
  color: var(--el-text-color-primary, #303133);
  margin: 0;
  min-height: 1.5em;
}

/* ---- 副文字/错误详情（对应 .auth-tc-sub-text） ---- */
.sso-cb-sub-text {
  font-size: 13px;
  color: var(--el-text-color-secondary, #909399);
  margin: 10px 0 0;
  line-height: 1.5;
}

/* ---- 重试按钮 ---- */
.sso-cb-retry-btn {
  margin-top: 16px;
}

/* ============================================================
   动画：与 AuthTransitionCard 完全一致的参数
   ============================================================ */

/* 指示器切换：缩放 + 淡入淡出（弹性曲线）*/
.sso-cb-indicator-enter-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.sso-cb-indicator-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.sso-cb-indicator-enter-from {
  opacity: 0;
  transform: scale(0.6);
}

.sso-cb-indicator-leave-to {
  opacity: 0;
  transform: scale(0.8);
}
</style>
