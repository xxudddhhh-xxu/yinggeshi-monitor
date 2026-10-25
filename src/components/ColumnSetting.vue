<template>
  <el-popover placement="bottom-end" :width="200" trigger="click">
    <template #reference>
      <el-button :icon="Setting" size="small">列配置</el-button>
    </template>
    <el-checkbox-group :model-value="visibleKeys" @update:model-value="onChange">
      <el-row v-for="col in columns" :key="col.key">
        <el-checkbox :value="col.key" :disabled="col.fixed === true" :label="col.key">
          {{ col.label }}
        </el-checkbox>
      </el-row>
    </el-checkbox-group>
    <div class="col-footer">
      <el-button link type="primary" size="small" @click="emit('update:visibleKeys', allKeys)">全选</el-button>
      <el-button link type="info" size="small" @click="emit('update:visibleKeys', columns.filter((c) => c.fixed).map((c) => c.key))">重置</el-button>
    </div>
  </el-popover>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Setting } from '@element-plus/icons-vue'

export interface ColumnOption {
  key: string
  label: string
  /** 固定列不允许隐藏 */
  fixed?: boolean
}

/** 表格列显隐配置 */
const props = defineProps<{
  columns: ColumnOption[]
  visibleKeys: string[]
}>()

const emit = defineEmits<{
  (e: 'update:visibleKeys', keys: string[]): void
}>()

const allKeys = computed(() => props.columns.map((c) => c.key))

function onChange(keys: string[]): void {
  // 至少保留一列,避免表格整体塌陷
  if (keys.length === 0) return
  emit('update:visibleKeys', keys)
}
</script>

<style scoped lang="scss">
.col-footer {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid var(--border-color);
  text-align: right;
}
</style>
