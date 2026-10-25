<template>
  <div class="page-container">
    <el-row :gutter="12">
      <!-- 左:用户信息 -->
      <el-col :xs="24" :sm="9">
        <div class="card profile-card">
          <el-avatar :size="72" class="profile-avatar">{{ (userStore.userInfo?.name ?? '用').slice(0, 1) }}</el-avatar>
          <div class="profile-name">{{ userStore.userInfo?.name }}</div>
          <el-tag :type="userStore.userInfo?.role === 'admin' ? 'danger' : 'primary'" size="small">
            {{ userStore.userInfo?.roleName }}
          </el-tag>
          <el-descriptions :column="1" border size="small" class="profile-desc">
            <el-descriptions-item label="登录账号">{{ userStore.userInfo?.username }}</el-descriptions-item>
            <el-descriptions-item label="联系电话">{{ userStore.userInfo?.phone }}</el-descriptions-item>
            <el-descriptions-item label="电子邮箱">{{ userStore.userInfo?.email }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ userStore.userInfo?.createTime }}</el-descriptions-item>
            <el-descriptions-item label="持有权限">
              <el-tag v-for="p in showPerms" :key="p" size="small" class="perm-tag" effect="plain">{{ p }}</el-tag>
              <el-tag v-if="extraPermCount > 0" size="small" type="info" effect="plain">+{{ extraPermCount }}</el-tag>
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </el-col>

      <!-- 右:修改密码 -->
      <el-col :xs="24" :sm="15">
        <div class="card">
          <div class="card-title">修改登录密码</div>
          <el-form ref="pwdFormRef" :model="pwdForm" :rules="pwdRules" label-width="90px" class="pwd-form">
            <el-form-item label="原密码" prop="oldPassword">
              <el-input v-model="pwdForm.oldPassword" type="password" show-password placeholder="请输入当前密码" />
            </el-form-item>
            <el-form-item label="新密码" prop="newPassword">
              <el-input v-model="pwdForm.newPassword" type="password" show-password placeholder="不少于 6 位,含字母与数字" />
            </el-form-item>
            <el-form-item label="确认新密码" prop="confirmPassword">
              <el-input v-model="pwdForm.confirmPassword" type="password" show-password placeholder="再次输入新密码" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="saving" @click="handleChangePassword">确认修改</el-button>
              <el-button @click="pwdFormRef?.resetFields()">重置</el-button>
            </el-form-item>
          </el-form>
          <el-alert title="修改成功后请使用新密码重新登录" type="info" :closable="false" />
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { changePasswordApi } from '@/api/auth'
import { resetDynamicRoutes } from '@/router/guard'

const router = useRouter()
const userStore = useUserStore()

const showPerms = computed(() => userStore.permissions.slice(0, 6))
const extraPermCount = computed(() => Math.max(0, userStore.permissions.length - 6))

// ---- 修改密码 ----
const pwdFormRef = ref<FormInstance>()
const saving = ref(false)
const pwdForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })

const pwdRules: FormRules = {
  oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度不少于 6 位', trigger: 'blur' },
    {
      validator: (_rule, value: string, callback) => {
        if (value && !/[a-zA-Z]/.test(value)) callback(new Error('需包含字母'))
        else if (value && !/\d/.test(value)) callback(new Error('需包含数字'))
        else callback()
      },
      trigger: 'blur'
    }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (_rule, value: string, callback) => {
        if (value !== pwdForm.newPassword) callback(new Error('两次输入的密码不一致'))
        else callback()
      },
      trigger: 'blur'
    }
  ]
}

async function handleChangePassword(): Promise<void> {
  const valid = await pwdFormRef.value?.validate().catch(() => false)
  if (!valid) return
  saving.value = true
  try {
    await changePasswordApi({ oldPassword: pwdForm.oldPassword, newPassword: pwdForm.newPassword })
    ElMessage.success('密码修改成功,即将重新登录')
    userStore.resetAuth()
    resetDynamicRoutes(router)
    router.push('/login')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped lang="scss">
.profile-card {
  display: flex;
  flex-direction: column;
  align-items: center;

  .profile-avatar {
    background: linear-gradient(135deg, #2f6bff, #37c6ff);
    color: #fff;
    font-size: 28px;
  }

  .profile-name {
    margin: 12px 0 6px;
    font-size: 18px;
    font-weight: 600;
  }

  .profile-desc {
    width: 100%;
    margin-top: 16px;
  }

  .perm-tag {
    margin: 2px 4px 2px 0;
  }
}

.card-title {
  margin-bottom: 16px;
  font-size: 15px;
  font-weight: 600;
}

.pwd-form {
  max-width: 460px;
}
</style>
