<script setup lang="ts">
// export default {
//   setup () {

//     return {}
//   }
// }
</script>

<template>
  <div
    class="bg-white p-6 rounded-2xl w-10/12 max-w-80 absolute top-1/3 left-1/2 -translate-x-1/2 shadow-lg"
  >
    <div class="space-y-4">
      <input class="login-input" type="text" placeholder="请输入账号" />
      <input class="login-input" type="password" placeholder="请输入密码" maxlength="16" />
    </div>
    <div class="mt-4 flex items-center justify-between">
      <button class="bg-transparent text-[#5536D1]">游客进入</button>
      <button class="w-30 p-2 rounded-full bg-[#5536D1] text-white">
        登录
      </button>
    </div>
  </div>
</template>

<style>
.login-input {
  @apply bg-[#F2F4FB] py-2 px-4 rounded-full w-full;
}
</style>
