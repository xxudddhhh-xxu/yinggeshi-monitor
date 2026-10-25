<template>
  <div class="error-page">
    <div class="error-code">404</div>
    <div class="error-text">抱歉,您访问的页面不存在</div>
    <div class="error-desc">请检查地址是否输入正确,或回到首页继续操作</div>
    <div class="error-actions">
      <el-button type="primary" @click="router.push('/')">回到首页</el-button>
      <el-button @click="router.back()">返回上一页</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<style scoped lang="scss">
.error-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: var(--bg-page);

  .error-code {
    font-size: 120px;
    font-weight: 700;
    line-height: 1;
    background: linear-gradient(135deg, #2f6bff, #37c6ff);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }

  .error-text {
    margin-top: 18px;
    font-size: 20px;
    color: var(--text-main);
  }

  .error-desc {
    margin-top: 8px;
    font-size: 13px;
    color: var(--text-secondary);
  }

  .error-actions {
    margin-top: 28px;
  }
}
</style>
