<template>
  <div class="login-page">
    <div class="login-bg-grid" />
    <div class="login-card">
      <div class="login-header">
        <svg viewBox="0 0 24 24" width="34" height="34">
          <path d="M12 2L2 8v8l10 6 10-6V8L12 2zm0 2.3l7 4.2v2L12 15l-7-4.5v-2l7-4.2zM5 12.4l6.3 4 1.7-1.1V16l-3 1.8L5 14.6v-2.2zm14 0v2.2L12 17.8 9.7 16.4l1.6-1v-1.2l3.7 2.4L19 12.4z" fill="#37c6ff" />
        </svg>
        <div>
          <h1 class="login-title">英歌石科学城</h1>
          <p class="login-subtitle">综合资源监测可视化平台</p>
        </div>
      </div>

      <el-form ref="formRef" :model="form" :rules="rules" size="large" @keyup.enter="handleLogin">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="请输入登录账号" :prefix-icon="User" clearable />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入登录密码"
            :prefix-icon="Lock"
            show-password
            clearable
          />
        </el-form-item>
        <el-form-item>
          <el-button class="login-btn" type="primary" :loading="loading" @click="handleLogin">
            {{ loading ? '登 录 中…' : '登 录' }}
          </el-button>
        </el-form-item>
      </el-form>

      <el-divider class="demo-divider">演示账号(密码均为 123456)</el-divider>
      <div class="demo-accounts">
        <el-button v-for="acc in demoAccounts" :key="acc.username" size="small" plain @click="fillAccount(acc)">
          {{ acc.label }}
        </el-button>
      </div>
    </div>

    <div class="login-footer">大连英歌石科学城 · 能源资源运维监测系统 v1.0</div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { Lock, User } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const formRef = ref<FormInstance>()
const loading = ref(false)
const form = reactive({ username: 'admin', password: '123456' })

const rules: FormRules = {
  username: [{ required: true, message: '请输入登录账号', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入登录密码', trigger: 'blur' },
    { min: 6, message: '密码长度不少于 6 位', trigger: 'blur' }
  ]
}

const demoAccounts = [
  { username: 'admin', password: '123456', label: '管理员' },
  { username: 'operator', password: '123456', label: '运维工程师' },
  { username: 'viewer', password: '123456', label: '只读访客' }
]

function fillAccount(acc: { username: string; password: string }): void {
  form.username = acc.username
  form.password = acc.password
}

async function handleLogin(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  loading.value = true
  try {
    await userStore.login({ username: form.username, password: form.password })
    ElMessage.success('登录成功')
    const redirect = (route.query.redirect as string) || '/'
    // replace 重放导航,守卫会完成动态路由注册
    router.replace(redirect)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.login-page {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background:
    radial-gradient(900px 500px at 20% 10%, rgba(47, 107, 255, 0.28), transparent 60%),
    radial-gradient(800px 460px at 85% 90%, rgba(37, 208, 171, 0.16), transparent 60%),
    linear-gradient(160deg, #060d1d 0%, #0a1730 55%, #071022 100%);

  .login-bg-grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(64, 128, 255, 0.08) 1px, transparent 1px),
      linear-gradient(90deg, rgba(64, 128, 255, 0.08) 1px, transparent 1px);
    background-size: 44px 44px;
    mask-image: radial-gradient(ellipse at center, black 30%, transparent 75%);
  }
}

.login-card {
  position: relative;
  z-index: 1;
  width: 400px;
  padding: 36px 36px 28px;
  border-radius: 12px;
  background: rgba(13, 26, 50, 0.78);
  border: 1px solid rgba(64, 128, 255, 0.25);
  box-shadow: 0 18px 50px rgba(2, 8, 20, 0.55);
  backdrop-filter: blur(6px);
}

.login-header {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 26px;

  .login-title {
    font-size: 20px;
    letter-spacing: 2px;
    color: #eaf3ff;
  }

  .login-subtitle {
    margin-top: 2px;
    font-size: 13px;
    letter-spacing: 4px;
    color: #7d93b8;
  }
}

.login-btn {
  width: 100%;
  letter-spacing: 6px;
}

.demo-divider {
  margin: 8px 0 14px;

  :deep(.el-divider__text) {
    background-color: transparent;
    color: #7d93b8;
    font-size: 12px;
  }
}

.demo-accounts {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.login-footer {
  position: absolute;
  bottom: 22px;
  width: 100%;
  text-align: center;
  font-size: 12px;
  letter-spacing: 1px;
  color: rgba(160, 180, 210, 0.45);
}

:deep(.el-input__wrapper) {
  background: rgba(8, 17, 34, 0.6);
  box-shadow: 0 0 0 1px rgba(64, 128, 255, 0.25) inset;
}

:deep(.el-input__inner) {
  color: #d7e3f4;
}

:deep(.el-input__inner::placeholder) {
  color: #5d7396;
}
</style>
