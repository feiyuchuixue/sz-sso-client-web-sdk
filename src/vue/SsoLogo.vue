<script setup lang="ts">
import { computed } from "vue";

/**
 * SsoLogo - SDK 内置 Logo 组件
 *
 * 对应 UCenterWeb AuthLogo variant="icon"，视觉完全一致。
 * 支持预设尺寸：sm(32) | md(48) | lg(56) | xl(64)，或自定义数值(px)。
 */

interface Props {
  /** 预设尺寸或自定义尺寸(px) */
  size?: "sm" | "md" | "lg" | "xl" | number;
  /** 是否显示阴影 */
  shadow?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  size: "md",
  shadow: true,
});

const sizeMap: Record<string, number> = { sm: 32, md: 48, lg: 56, xl: 64 };

const computedSize = computed(() =>
  typeof props.size === "number" ? props.size : (sizeMap[props.size] ?? 48),
);

// 内部图标尺寸，与 AuthLogo 计算公式一致
const iconInnerSize = computed(() => Math.round(computedSize.value * 0.57));
</script>

<template>
  <div
    class="sso-logo"
    :class="{ 'sso-logo--shadow': shadow }"
    :style="{ width: `${computedSize}px`, height: `${computedSize}px` }"
  >
    <div class="sso-logo__wrapper">
      <svg
        class="sso-logo__svg"
        :style="{ width: `${iconInnerSize}px`, height: `${iconInnerSize}px` }"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <!-- 盾牌+钥匙图标，与 AuthLogo icon 变体完全一致 -->
        <path
          d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"
          fill="white"
        />
      </svg>
    </div>
  </div>
</template>

<style scoped>
.sso-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sso-logo__wrapper {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: box-shadow 0.3s ease;
}

.sso-logo--shadow .sso-logo__wrapper {
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
}

/* 暗黑模式：阴影用更亮的绿色，与 AuthLogo dark 规则一致 */
:root.dark .sso-logo--shadow .sso-logo__wrapper {
  box-shadow: 0 4px 12px rgba(52, 211, 153, 0.3);
}
</style>
