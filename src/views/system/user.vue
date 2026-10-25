<template>
  <div class="page-container">
    <div class="card">
      <div class="table-toolbar">
        <el-button v-permission="'system:user:add'" type="primary" :icon="Plus" @click="openForm()">新增用户</el-button>
        <span class="tip-text">角色权限由后端菜单统一下发,admin 拥有全部权限</span>
      </div>

      <el-table v-loading="loading" :data="users" border stripe empty-text="暂无用户">
        <el-table-column prop="username" label="登录账号" min-width="110" />
        <el-table-column prop="name" label="姓名" min-width="100" />
        <el-table-column label="角色" width="130">
          <template #default="{ row }">
            <el-tag :type="roleTag(row.role)" size="small">{{ row.roleName }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="联系电话" width="130" />
        <el-table-column prop="email" label="邮箱" min-width="150" />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">{{ row.status === 1 ? '启用' : '停用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="165" />
        <el-table-column label="操作" width="200" fixed="right" align="center">
          <template #default="{ row }">
            <el-button v-permission="'system:user:edit'" link type="primary" size="small" @click="openForm(row)">编辑</el-button>
            <el-button v-permission="'system:user:reset'" link type="warning" size="small" @click="handleReset(row)">重置密码</el-button>
            <el-button v-if="row.status === 1" v-permission="'system:user:edit'" link type="danger" size="small" @click="handleToggle(row)">停用</el-button>
            <el-button v-else v-permission="'system:user:edit'" link type="success" size="small" @click="handleToggle(row)">启用</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="formVisible" :title="form.id ? '编辑用户' : '新增用户'" width="480px" destroy-on-close :close-on-click-modal="false">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="88px">
        <el-form-item label="登录账号" prop="username">
          <el-input v-model="form.username" :disabled="!!form.id" placeholder="登录用账号" />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="form.role" style="width: 100%">
            <el-option label="系统管理员" value="admin" />
            <el-option label="运维工程师" value="operator" />
            <el-option label="只读访客" value="viewer" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="!form.id" label="初始密码" prop="password">
          <el-input v-model="form.password" type="password" show-password placeholder="默认 123456" />
        </el-form-item>
        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="form.phone" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getUsersApi, resetUserPasswordApi, saveUserApi } from '@/api/system'
import { useUserStore } from '@/stores/user'
import type { RoleKey, UserInfo } from '@/types'

const userStore = useUserStore()

const loading = ref(false)
const users = ref<UserInfo[]>([])

async function loadUsers(): Promise<void> {
  loading.value = true
  try {
    users.value = await getUsersApi()
  } finally {
    loading.value = false
  }
}

onMounted(loadUsers)

function roleTag(role: RoleKey): 'danger' | 'warning' | 'info' {
  return role === 'admin' ? 'danger' : role === 'operator' ? 'warning' : 'info'
}

// ---- 新增 / 编辑 ----
const formVisible = ref(false)
const saving = ref(false)
const formRef = ref<FormInstance>()
const form = reactive<Partial<UserInfo> & { password?: string }>({})

const rules: FormRules = {
  username: [{ required: true, message: '请输入登录账号', trigger: 'blur' }],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
  phone: [{ pattern: /^1\d{10}$/, message: '请输入 11 位手机号', trigger: 'blur' }],
  email: [{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }]
}

function openForm(row?: UserInfo): void {
  Object.assign(form, row ? { ...row } : { username: '', name: '', role: 'operator', password: '', phone: '', email: '' })
  formVisible.value = true
}

async function handleSave(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  saving.value = true
  try {
    await saveUserApi({ ...form, password: form.password || '123456' })
    ElMessage.success(form.id ? '用户已更新' : '用户已创建,初始密码 123456')
    formVisible.value = false
    loadUsers()
  } finally {
    saving.value = false
  }
}

async function handleReset(row: UserInfo): Promise<void> {
  await ElMessageBox.confirm(`确认将【${row.name}】的密码重置为 123456?`, '操作确认', { type: 'warning' })
  await resetUserPasswordApi(row.id)
  ElMessage.success('密码已重置为 123456')
}

async function handleToggle(row: UserInfo): Promise<void> {
  if (row.username === userStore.userInfo?.username) {
    ElMessage.warning('不能停用当前登录账号')
    return
  }
  const next = row.status === 1 ? 0 : 1
  await saveUserApi({ ...row, status: next as 0 | 1 })
  ElMessage.success(next === 1 ? '已启用' : '已停用')
  loadUsers()
}
</script>

<style scoped lang="scss">
.tip-text {
  font-size: 12px;
  color: var(--text-secondary);
}
</style>
