<template>
  <div class="profile-page">
    <div class="profile-container">
      <!-- Back button -->
      <div class="profile-back">
        <el-button :icon="ArrowLeft" @click="router.push('/chat')">返回问诊</el-button>
      </div>

      <!-- Header -->
      <div class="profile-header">
        <el-avatar :size="64" :style="{ background: '#2F80ED', fontSize: '24px' }">
          {{ avatarLetter }}
        </el-avatar>
        <div class="profile-header__info">
          <h2 class="profile-header__name">{{ authStore.username }}</h2>
          <span class="profile-header__role" :class="'role--' + (authStore.role || 'USER').toLowerCase()">
            {{ authStore.role === 'ADMIN' ? '管理员' : '普通用户' }}
          </span>
        </div>
      </div>

      <!-- Basic Info Card -->
      <el-card class="profile-card" shadow="never">
        <template #header>
          <span class="card-title">基本信息</span>
        </template>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="用户名">{{ authStore.username }}</el-descriptions-item>
          <el-descriptions-item label="邮箱">{{ currentEmail || '未设置' }}</el-descriptions-item>
          <el-descriptions-item label="角色">{{ authStore.role === 'ADMIN' ? '管理员' : '普通用户' }}</el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- Update Email Card -->
      <el-card class="profile-card" shadow="never">
        <template #header>
          <span class="card-title">编辑资料</span>
        </template>
        <el-form
          ref="profileFormRef"
          :model="profileForm"
          :rules="profileRules"
          label-width="80px"
          @submit.prevent="submitProfile"
        >
          <el-form-item label="邮箱" prop="email">
            <el-input v-model="profileForm.email" placeholder="请输入新邮箱" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="profileLoading" @click="submitProfile">
              保存
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- Change Password Card -->
      <el-card class="profile-card" shadow="never">
        <template #header>
          <span class="card-title">修改密码</span>
        </template>
        <el-form
          ref="passwordFormRef"
          :model="passwordForm"
          :rules="passwordRules"
          label-width="100px"
          @submit.prevent="submitPassword"
        >
          <el-form-item label="旧密码" prop="oldPassword">
            <el-input v-model="passwordForm.oldPassword" type="password" show-password placeholder="请输入当前密码" />
          </el-form-item>
          <el-form-item label="新密码" prop="newPassword">
            <el-input v-model="passwordForm.newPassword" type="password" show-password placeholder="6~20 位字符" />
          </el-form-item>
          <el-form-item label="确认新密码" prop="confirmPassword">
            <el-input v-model="passwordForm.confirmPassword" type="password" show-password placeholder="再次输入新密码" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="passwordLoading" @click="submitPassword">
              修改密码
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getUserInfo, updatePassword, updateProfile } from '@/services/authService'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'

const router = useRouter()

const authStore = useAuthStore()
const avatarLetter = computed(() => (authStore.username || 'U')[0].toUpperCase())
const currentEmail = ref('')

onMounted(async () => {
  try {
    const res = await getUserInfo()
    currentEmail.value = res.data?.email || ''
  } catch {
    // ignore
  }
})

// --- Profile form ---
const profileFormRef = ref(null)
const profileLoading = ref(false)
const profileForm = ref({ email: '' })
const profileRules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' }
  ]
}

async function submitProfile() {
  try {
    await profileFormRef.value.validate()
  } catch {
    return
  }
  profileLoading.value = true
  try {
    const res = await updateProfile(profileForm.value.email)
    currentEmail.value = res.data?.email || profileForm.value.email
    profileForm.value.email = ''
    ElMessage.success('邮箱更新成功')
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '更新失败')
  } finally {
    profileLoading.value = false
  }
}

// --- Password form ---
const passwordFormRef = ref(null)
const passwordLoading = ref(false)
const passwordForm = ref({ oldPassword: '', newPassword: '', confirmPassword: '' })

const passwordRules = {
  oldPassword: [{ required: true, message: '请输入旧密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度 6~20 位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== passwordForm.value.newPassword) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

async function submitPassword() {
  try {
    await passwordFormRef.value.validate()
  } catch {
    return
  }
  passwordLoading.value = true
  try {
    await updatePassword(passwordForm.value.oldPassword, passwordForm.value.newPassword)
    passwordForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
    ElMessage.success('密码修改成功')
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '修改失败，请检查旧密码是否正确')
  } finally {
    passwordLoading.value = false
  }
}
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: var(--color-surface, #f5f7fa);
  padding: 40px 24px;
}

.profile-back {
  margin-bottom: 16px;
}

.profile-container {
  max-width: 600px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid var(--color-border, #e4e7ed);
}

.profile-header__info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.profile-header__name {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text, #1a1a1a);
  margin: 0;
}

.profile-header__role {
  display: inline-block;
  font-size: 12px;
  font-weight: 500;
  padding: 2px 10px;
  border-radius: 99px;
}

.role--admin {
  background: #FEF3C7;
  color: #D97706;
}

.role--user {
  background: #DBEAFE;
  color: #2563EB;
}

.profile-card {
  border-radius: 12px;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text, #1a1a1a);
}
</style>
