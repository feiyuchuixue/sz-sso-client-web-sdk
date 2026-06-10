<template>
  <div class="sso-fb-page">
    <div class="sso-fb-card">
      <SsoLogo size="lg" class="sso-fb-logo" />
      <div class="sso-fb-indicator">
        <ElIcon :size="44" class="sso-fb-lock-icon"><Lock /></ElIcon>
      </div>
      <p class="sso-fb-text">暂无访问权限</p>
      <p v-if="clientName" class="sso-fb-sub-text">
        您没有访问「{{ clientName }}」的权限，请联系管理员授权
      </p>
      <p v-else class="sso-fb-sub-text">请联系管理员为您开通访问权限</p>
      <div class="sso-fb-actions">
        <ElButton type="primary" @click="switchAccount">切换账号</ElButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { ElIcon, ElButton } from "element-plus";
import { Lock } from "@element-plus/icons-vue";
import { useSsoClient } from "./composables";
import SsoLogo from "./SsoLogo.vue";

defineOptions({ name: "SsoForbidden" });

const route = useRoute();
const client = useSsoClient();

/** 从路由 query 中读取无权限的客户端名称 */
const clientName = computed(() => (route.query.clientName as string) || "");

/**
 * 切换账号：跳转到认证中心登录页（不携带 redirect 参数）。
 * 用户在认证中心重新登录后，可从"我的应用"进入有权限的应用。
 * 需要 client 配置 authCenterBaseUrl，否则降级到 console.warn。
 */
function switchAccount() {
  try {
    client.goSsoPortal(client.getPortalRoutes().login);
  } catch (e: any) {
    console.warn("[sso-sdk] SsoForbidden switchAccount failed: authCenterBaseUrl may not be configured.", e);
  }
}
</script>

<style scoped>
/* ---- 独立全屏页面 ---- */
.sso-fb-page {
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

/* ---- 卡片 ---- */
.sso-fb-card {
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

/* ---- Logo ---- */
.sso-fb-logo {
  margin: 0 auto 20px;
}

/* ---- 指示器容器 ---- */
.sso-fb-indicator {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 锁图标 */
.sso-fb-lock-icon {
  color: var(--el-color-warning, #e6a23c);
}

.sso-fb-lock-icon :deep(.el-icon) {
  color: var(--el-color-warning, #e6a23c);
}

/* ---- 主文字 ---- */
.sso-fb-text {
  font-size: 15px;
  font-weight: 500;
  color: var(--el-text-color-primary, #303133);
  margin: 0;
  min-height: 1.5em;
}

/* ---- 副文字 ---- */
.sso-fb-sub-text {
  font-size: 13px;
  color: var(--el-text-color-secondary, #909399);
  margin: 10px 0 0;
  line-height: 1.5;
}

/* ---- 操作按钮组 ---- */
.sso-fb-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 20px;
}
</style>
