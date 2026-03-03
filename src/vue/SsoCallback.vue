<template>
  <div class="sso-callback">
    <div v-if="error" class="sso-callback__error">
      <p class="sso-callback__error-title">SSO 登录失败</p>
      <p class="sso-callback__error-msg">{{ error }}</p>
      <button class="sso-callback__retry" @click="retry">重试</button>
    </div>
    <div v-else class="sso-callback__loading">
      <p>正在登录，请稍候...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useSsoClient } from "./composables";

defineOptions({ name: "SsoCallback" });

const route = useRoute();
const client = useSsoClient();
const error = ref("");

async function handleCallback() {
  error.value = "";

  const ticket = (route.query.ticket as string) || "";
  const back = (route.query.back as string) || "";

  try {
    if (ticket) {
      // 有 ticket：调后端换 token
      await client.handleCallback(ticket, back);
      // 跳转回原页面
      window.location.href = back ? decodeURIComponent(back) : "/";
    } else {
      // 无 ticket：调后端获取认证中心地址并跳转
      await client.goSsoLogin(back ? decodeURIComponent(back) : undefined);
    }
  } catch (e: any) {
    const msg =
      e?.message || e?.msg || (typeof e === "string" ? e : "登录失败");
    error.value = msg;
    console.error("[sso-sdk] SSO callback failed:", e);
    client.getConfig().onLoginError?.(e);
  }
}

function retry() {
  error.value = "";
  // 重试时直接请求认证中心地址
  const back = (route.query.back as string) || "";
  client
    .goSsoLogin(back ? decodeURIComponent(back) : undefined)
    .catch((e: any) => {
      error.value = e?.message || "重试失败";
    });
}

onMounted(() => {
  handleCallback();
});
</script>

<style scoped>
.sso-callback {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #333;
}
.sso-callback__loading p {
  font-size: 16px;
  color: #666;
}
.sso-callback__error {
  text-align: center;
}
.sso-callback__error-title {
  font-size: 18px;
  font-weight: 600;
  color: #e53e3e;
  margin-bottom: 8px;
}
.sso-callback__error-msg {
  font-size: 14px;
  color: #666;
  margin-bottom: 16px;
}
.sso-callback__retry {
  padding: 8px 24px;
  font-size: 14px;
  color: #fff;
  background-color: #3182ce;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}
.sso-callback__retry:hover {
  background-color: #2b6cb0;
}
</style>
