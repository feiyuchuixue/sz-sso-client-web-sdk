<template>
  <el-popover
    trigger="click"
    placement="bottom-end"
    :width="292"
    :popper-options="popperOptions"
    popper-class="sso-user-menu__popover-popper"
  >
    <template #reference>
      <button type="button" class="sso-user-menu__avatar" aria-label="当前用户">
        <img :src="avatarSrc || ''" alt="avatar" />
      </button>
    </template>

      <div class="sso-user-menu__panel">
        <div class="sso-user-menu__summary">
          <div class="sso-user-menu__summary-name">{{ summaryTitle }}</div>
          <div class="sso-user-menu__summary-desc">统一身份由认证中心管理</div>
        </div>

        <div class="sso-user-menu__section">
          <button type="button" class="sso-user-menu__item" @click="emit('personal-info-click')">
            <span class="sso-user-menu__item-icon">
              <el-icon><User /></el-icon>
            </span>
            <span class="sso-user-menu__item-content">
              <span class="sso-user-menu__item-title">个人信息</span>
              <span class="sso-user-menu__item-desc">本系统资料与业务信息</span>
            </span>
          </button>
        </div>

        <div class="sso-user-menu__section">
          <div class="sso-user-menu__section-title">认证中心</div>

          <button type="button" class="sso-user-menu__portal-card" @click="goAccountSecurity">
            <span class="sso-user-menu__portal-icon">
              <el-icon><Lock /></el-icon>
            </span>
            <span class="sso-user-menu__item-content">
              <span class="sso-user-menu__item-title">账号与安全</span>
              <span class="sso-user-menu__item-desc">密码、手机、邮箱、绑定管理</span>
            </span>
            <el-icon class="sso-user-menu__external"><TopRight /></el-icon>
          </button>

          <button type="button" class="sso-user-menu__portal-card" @click="goPortalHome">
            <span class="sso-user-menu__portal-icon">
              <el-icon><Grid /></el-icon>
            </span>
            <span class="sso-user-menu__item-content">
              <span class="sso-user-menu__item-title">个人中心</span>
              <span class="sso-user-menu__item-desc">我的应用、消息、登录记录</span>
            </span>
            <el-icon class="sso-user-menu__external"><TopRight /></el-icon>
          </button>
        </div>

        <div class="sso-user-menu__section sso-user-menu__section--footer">
          <button type="button" class="sso-user-menu__item" @click="handleLogout">
            <span class="sso-user-menu__item-icon sso-user-menu__item-icon--plain">
              <el-icon><SwitchButton /></el-icon>
            </span>
            <span class="sso-user-menu__item-title">退出登录</span>
          </button>
        </div>
      </div>
  </el-popover>

  <slot name="personal-info" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElIcon, ElPopover, ElMessageBox, ElMessage } from 'element-plus'
import { Grid, Lock, SwitchButton, TopRight, User } from '@element-plus/icons-vue'
import { useSsoClient } from './composables'

defineOptions({ name: 'SsoUserMenu' })

// ---- Props ----
interface Props {
  avatarSrc?: string
  displayName?: string
  username?: string
  securityPath?: string
  applicationsPath?: string
}

const props = withDefaults(defineProps<Props>(), {
  avatarSrc: '',
  displayName: '',
  username: '',
  securityPath: '',
  applicationsPath: '',
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

async function openPortal(targetPath: string) {
  const portalWindow = window.open('about:blank', '_blank')
  try {
    const url = await client.getSsoPortalEntryUrl(targetPath)
    if (portalWindow) {
      portalWindow.opener = null
      portalWindow.location.href = url
      return
    }
    window.location.href = url
  } catch (error: any) {
    portalWindow?.close()
    ElMessage.error(error?.message || '无法进入认证中心')
  }
}

function goAccountSecurity() {
  const targetPath = props.securityPath || client.getPortalRoutes().security
  void openPortal(targetPath)
}

function goPortalHome() {
  const targetPath = props.applicationsPath || client.getPortalRoutes().applications
  void openPortal(targetPath)
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  padding: 0;
  overflow: hidden;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 50%;
}

.sso-user-menu__avatar img {
  width: 34px;
  height: 34px;
  object-fit: cover;
  border-radius: 50%;
}

.sso-user-menu__panel {
  width: 292px;
  background: var(--el-bg-color);
  color: var(--el-text-color-primary);
}

.sso-user-menu__summary {
  padding: 18px 20px 14px;
}

.sso-user-menu__summary-name {
  min-width: 0;
  overflow: hidden;
  font-size: 15px;
  font-weight: 600;
  line-height: 22px;
  color: var(--el-text-color-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sso-user-menu__summary-desc {
  margin-top: 4px;
  font-size: 12px;
  line-height: 18px;
  color: var(--el-text-color-secondary);
}

.sso-user-menu__section {
  padding: 12px 14px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.sso-user-menu__section-title {
  padding: 0 4px 8px;
  font-size: 12px;
  line-height: 18px;
  color: var(--el-text-color-secondary);
}

.sso-user-menu__section--footer {
  padding-top: 8px;
  padding-bottom: 8px;
}

.sso-user-menu__item,
.sso-user-menu__portal-card {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 46px;
  padding: 8px 10px;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 6px;
  transition:
    color 0.2s ease,
    background-color 0.2s ease;
}

.sso-user-menu__item:hover,
.sso-user-menu__portal-card:hover {
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.sso-user-menu__portal-card + .sso-user-menu__portal-card {
  margin-top: 6px;
}

.sso-user-menu__item-icon,
.sso-user-menu__portal-icon {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin-right: 10px;
  font-size: 16px;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border-radius: 6px;
}

.sso-user-menu__item-icon--plain {
  color: var(--el-text-color-regular);
  background: transparent;
}

.sso-user-menu__item-content {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
}

.sso-user-menu__item-title {
  overflow: hidden;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  color: inherit;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sso-user-menu__item-desc {
  margin-top: 2px;
  overflow: hidden;
  font-size: 12px;
  line-height: 18px;
  color: var(--el-text-color-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sso-user-menu__external {
  flex: 0 0 auto;
  margin-left: 8px;
  font-size: 13px;
  color: var(--el-color-primary);
}
</style>

<style>
.sso-user-menu__popover-popper.el-popper {
  padding: 0;
  overflow: hidden;
  border-radius: 8px;
  box-shadow: var(--el-box-shadow-light);
}
</style>
