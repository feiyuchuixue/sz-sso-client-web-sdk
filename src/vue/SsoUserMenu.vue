<template>
  <el-dropdown trigger="click" popper-class="sso-user-menu__dropdown-popper" :popper-options="popperOptions">
    <div class="sso-user-menu__avatar">
      <img :src="avatarSrc || ''" alt="avatar" />
    </div>

    <template #dropdown>
      <div class="sso-user-menu__panel">
        <div class="sso-user-menu__summary">
          <div class="sso-user-menu__summary-name">{{ summaryTitle }}</div>
          <div class="sso-user-menu__summary-desc">统一身份由认证中心管理</div>
        </div>

        <div class="sso-user-menu__section">
          <button type="button" class="sso-user-menu__plain-item" @click="emit('personal-info-click')">
            <span class="sso-user-menu__plain-main">
              <el-icon><User /></el-icon>
              <span class="sso-user-menu__plain-title">个人信息</span>
            </span>
            <span class="sso-user-menu__plain-desc">本系统资料与业务信息</span>
          </button>
        </div>

        <div class="sso-user-menu__section sso-user-menu__section--portal">
          <div class="sso-user-menu__section-title">认证中心</div>

          <button type="button" class="sso-user-menu__portal-card" @click="goAccountSecurity">
            <span class="sso-user-menu__portal-icon-wrap">
              <el-icon class="sso-user-menu__portal-icon"><Lock /></el-icon>
            </span>
            <span class="sso-user-menu__portal-content">
              <span class="sso-user-menu__portal-header">
                <span class="sso-user-menu__portal-title">账号与安全</span>
                <el-icon class="sso-user-menu__external-icon"><TopRight /></el-icon>
              </span>
              <span class="sso-user-menu__portal-desc">密码、手机、邮箱、绑定管理</span>
            </span>
          </button>

          <button type="button" class="sso-user-menu__portal-card" @click="goPortalHome">
            <span class="sso-user-menu__portal-icon-wrap">
              <el-icon class="sso-user-menu__portal-icon"><Grid /></el-icon>
            </span>
            <span class="sso-user-menu__portal-content">
              <span class="sso-user-menu__portal-header">
                <span class="sso-user-menu__portal-title">个人中心</span>
                <el-icon class="sso-user-menu__external-icon"><TopRight /></el-icon>
              </span>
              <span class="sso-user-menu__portal-desc">我的应用、消息、登录记录</span>
            </span>
          </button>
        </div>

        <div class="sso-user-menu__footer">
          <button type="button" class="sso-user-menu__plain-item sso-user-menu__plain-item--logout" @click="handleLogout">
            <span class="sso-user-menu__plain-main">
              <el-icon><SwitchButton /></el-icon>
              <span class="sso-user-menu__plain-title">退出登录</span>
            </span>
          </button>
        </div>
      </div>
    </template>
  </el-dropdown>

  <slot name="personal-info" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElIcon, ElDropdown, ElMessageBox } from 'element-plus'
import { Grid, Lock, SwitchButton, TopRight, User } from '@element-plus/icons-vue'
import { useSsoClient } from './composables'

defineOptions({ name: 'SsoUserMenu' })

// ---- Props ----
interface Props {
  avatarSrc?: string
  displayName?: string
  username?: string
}

const props = withDefaults(defineProps<Props>(), {
  avatarSrc: '',
  displayName: '',
  username: '',
})

// ---- Emits ----
const emit = defineEmits<{
  /** 点击「个人信息」菜单项时触发（client 监听并打开弹窗） */
  'personal-info-click': []
  /** 用户确认退出后触发（client 监听并执行 store.clear、关闭 socket、跳转登录页等清理） */
  'logout': []
}>()

// ---- SSO Client ----
const client = useSsoClient()

const displayNameText = computed(() => props.displayName || props.username || '当前用户')
const summaryTitle = computed(() => {
  return displayNameText.value === '当前用户' ? '当前用户' : `当前用户 · ${displayNameText.value}`
})
const popperOptions = {
  modifiers: [
    {
      name: 'offset',
      options: {
        offset: [0, 10],
      },
    },
    {
      name: 'preventOverflow',
      options: {
        padding: 14,
      },
    },
  ],
}

function goAccountSecurity() {
  window.open(client.getSsoPortalUrl('/user/account'), '_blank', 'noopener,noreferrer')
}

function goPortalHome() {
  window.open(client.getSsoPortalUrl('/user/apps'), '_blank', 'noopener,noreferrer')
}

function handleLogout() {
  ElMessageBox.confirm('您是否确认退出登录?', '温馨提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    emit('logout')
  })
}
</script>

<style scoped>
.sso-user-menu__avatar {
  width: 40px;
  height: 40px;
  overflow: hidden;
  cursor: pointer;
  border-radius: 50%;
}

.sso-user-menu__avatar img {
  width: 100%;
  height: 100%;
}

.sso-user-menu__panel {
  width: 272px;
  padding: 8px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 14px;
  box-shadow: 0 8px 24px rgb(15 23 42 / 10%);
}

.sso-user-menu__summary {
  padding: 10px 12px 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.sso-user-menu__summary-name {
  overflow: hidden;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sso-user-menu__summary-desc {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.sso-user-menu__section,
.sso-user-menu__footer {
  padding: 6px 0;
}

.sso-user-menu__section--portal {
  border-top: 1px solid var(--el-border-color-lighter);
}

.sso-user-menu__section-title {
  padding: 2px 12px 8px;
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-secondary);
}

.sso-user-menu__plain-item,
.sso-user-menu__portal-card {
  width: 100%;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.sso-user-menu__plain-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 10px;
  transition: background-color 0.2s ease;
}

.sso-user-menu__plain-item:hover {
  background: var(--el-fill-color-light);
}

.sso-user-menu__plain-main {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.sso-user-menu__plain-title {
  font-weight: 500;
}

.sso-user-menu__plain-desc {
  padding-left: 24px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.sso-user-menu__portal-card {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 12px;
  border-radius: 12px;
  transition:
    background-color 0.2s ease,
    box-shadow 0.2s ease;
}

.sso-user-menu__portal-card:hover {
  background: var(--el-color-primary-light-9);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--el-color-primary) 12%, white);
}

.sso-user-menu__portal-icon-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--el-color-primary) 14%, white);
  flex-shrink: 0;
  transition: background-color 0.2s ease;
}

.sso-user-menu__portal-card:hover .sso-user-menu__portal-icon-wrap {
  background: color-mix(in srgb, var(--el-color-primary) 22%, white);
}

.sso-user-menu__portal-icon {
  color: var(--el-color-primary);
  font-size: 15px;
}

.sso-user-menu__portal-content {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.sso-user-menu__portal-header {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
}

.sso-user-menu__portal-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-color-primary);
}

.sso-user-menu__portal-desc {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}

.sso-user-menu__external-icon {
  font-size: 14px;
  color: color-mix(in srgb, var(--el-color-primary) 72%, white);
  flex-shrink: 0;
}

.sso-user-menu__plain-item--logout {
  border-top: 1px solid var(--el-border-color-lighter);
  border-radius: 0;
  padding-top: 12px;
}

.sso-user-menu__plain-item--logout:hover {
  background: transparent;
}

.sso-user-menu__plain-item--logout .sso-user-menu__plain-main {
  color: var(--el-text-color-primary);
}
</style>
