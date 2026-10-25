<template>
  <el-dialog
    v-model="visible"
    :title="form.id ? '编辑设备' : '新增设备'"
    width="560px"
    destroy-on-close
    :close-on-click-modal="false"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="92px">
      <el-row :gutter="12">
        <el-col :span="12">
          <el-form-item label="设备编号" prop="code">
            <el-input v-model="form.code" placeholder="如 YSRC-A-101" :disabled="!!form.id" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="设备名称" prop="name">
            <el-input v-model="form.name" placeholder="如 研发楼电表1" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="所属区域" prop="region">
            <el-select v-model="form.region" placeholder="请选择分区" style="width: 100%">
              <el-option v-for="r in REGION_NAMES" :key="r" :label="r" :value="r" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="设备类型" prop="type">
            <el-select v-model="form.type" placeholder="请选择类型" style="width: 100%">
              <el-option v-for="t in DEVICE_TYPES" :key="t" :label="t" :value="t" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="安装位置" prop="position">
            <el-input v-model="form.position" placeholder="如 A1栋3层301室" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="通讯协议" prop="protocol">
            <el-select v-model="form.protocol" placeholder="请选择协议" style="width: 100%">
              <el-option v-for="p in ['Modbus-RTU', 'Modbus-TCP', 'DL/T645', 'LoRaWAN', 'MQTT']" :key="p" :label="p" :value="p" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="通讯地址" prop="commAddress">
            <el-input v-model="form.commAddress" placeholder="如 Modbus-485:A021" />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { saveDeviceApi } from '@/api/device'
import { DEVICE_TYPES, ENERGY_OF_TYPE, REGION_NAMES } from '@/constants'
import type { Device } from '@/types'

/** 设备新增 / 编辑表单弹窗(按钮权限由入口按钮控制) */
const emit = defineEmits<{ (e: 'saved'): void }>()

const visible = ref(false)
const saving = ref(false)
const formRef = ref<FormInstance>()

const form = reactive<Partial<Device>>({})

const rules: FormRules = {
  code: [{ required: true, message: '请输入设备编号', trigger: 'blur' }],
  name: [{ required: true, message: '请输入设备名称', trigger: 'blur' }],
  region: [{ required: true, message: '请选择所属区域', trigger: 'change' }],
  type: [{ required: true, message: '请选择设备类型', trigger: 'change' }],
  position: [{ required: true, message: '请输入安装位置', trigger: 'blur' }],
  protocol: [{ required: true, message: '请选择通讯协议', trigger: 'change' }],
  commAddress: [{ required: true, message: '请输入通讯地址', trigger: 'blur' }]
}

function open(row?: Device): void {
  Object.assign(form, row ? { ...row } : { code: '', name: '', region: '', type: '', position: '', protocol: '', commAddress: '' })
  visible.value = true
}

async function handleSave(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  saving.value = true
  try {
    // 能源类型跟随设备类型,减少录入项
    await saveDeviceApi({ ...form, energyType: ENERGY_OF_TYPE[form.type ?? ''] ?? '电' })
    ElMessage.success(form.id ? '设备已更新' : '设备已新增')
    visible.value = false
    emit('saved')
  } finally {
    saving.value = false
  }
}

defineExpose({ open })
</script>
