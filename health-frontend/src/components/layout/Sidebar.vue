<template>
  <aside class="sidebar">
    <div class="sidebar__top">
      <el-button
        type="primary"
        class="sidebar__new-btn"
        :icon="Plus"
        @click="handleNewConsultation"
      >
        New Consultation
      </el-button>
    </div>

    <div class="sidebar__section-title">Recent</div>

    <div class="sidebar__list" v-if="consultationStore.list.length">
      <div
        v-for="item in consultationStore.list"
        :key="item.id"
        class="sidebar__item"
        :class="{ 'sidebar__item--active': item.id === consultationStore.currentId }"
        @click="openConsultation(item.id)"
      >
        <div class="sidebar__item-title">{{ item.chiefComplaint || 'Consultation #' + item.id }}</div>
        <div class="sidebar__item-meta">
          <span class="sidebar__item-status" :class="'status--' + item.status">{{ item.status }}</span>
          <span class="sidebar__item-date">{{ formatDate(item.createdAt) }}</span>
        </div>
      </div>
    </div>

    <div class="sidebar__empty" v-else>
      <p>No consultations yet.</p>
    </div>

    <!-- Knowledge entry — visible to KNOWLEDGE_ENGINEER and ADMIN -->
    <div v-if="authStore.canAccessKnowledge" class="sidebar__admin-entry" @click="router.push('/knowledge')">
      <el-icon><Files /></el-icon>
      <span>知识库管理</span>
    </div>

    <!-- Admin entry — only visible to ADMIN -->
    <div v-if="authStore.isAdmin" class="sidebar__admin-entry" @click="router.push('/admin')">
      <el-icon><Setting /></el-icon>
      <span>管理后台</span>
    </div>

    <!-- New Consultation Dialog -->
    <el-dialog
      v-model="showNewDialog"
      title="New Consultation"
      width="420px"
      :close-on-click-modal="false"
    >
      <el-form @submit.prevent="createNew">
        <el-form-item label="Chief Complaint">
          <el-input
            v-model="chiefComplaint"
            type="textarea"
            :rows="3"
            placeholder="Describe your main symptom or concern..."
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showNewDialog = false">Cancel</el-button>
        <el-button
          type="primary"
          :loading="creating"
          :disabled="!chiefComplaint.trim()"
          @click="createNew"
        >
          Start
        </el-button>
      </template>
    </el-dialog>
  </aside>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useConsultationStore } from '@/stores/consultation'
import { useAuthStore } from '@/stores/auth'
import { Plus, Setting, Files } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getHealthProfile } from '@/services/authService'

const router = useRouter()
const consultationStore = useConsultationStore()
const authStore = useAuthStore()

const showNewDialog = ref(false)
const chiefComplaint = ref('')
const creating = ref(false)

async function handleNewConsultation() {
  try {
    const res = await getHealthProfile()
    if (!res.data?.filled) {
      await ElMessageBox.confirm(
        '填写健康档案后，AI 可以提供更个性化的问诊建议。是否现在前往填写？',
        '完善健康档案',
        {
          confirmButtonText: '去填写',
          cancelButtonText: '跳过',
          type: 'info',
          distinguishCancelAndClose: true
        }
      )
      router.push('/profile')
      return
    }
  } catch (action) {
    // "跳过" (cancel) or error — proceed to open dialog
    if (action === 'close') return
  }
  showNewDialog.value = true
}

async function createNew() {
  if (!chiefComplaint.value.trim()) return
  creating.value = true
  try {
    const id = await consultationStore.createConsultation(chiefComplaint.value.trim())
    showNewDialog.value = false
    chiefComplaint.value = ''
    router.push(`/chat/${id}`)
  } catch {
    ElMessage.error('Failed to create consultation.')
  } finally {
    creating.value = false
  }
}

function openConsultation(id) {
  router.push(`/chat/${id}`)
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
</script>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  height: 100%;
  background: #ffffff;
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar__top {
  padding: 16px 12px 8px;
}

.sidebar__new-btn {
  width: 100%;
  border-radius: var(--radius-btn);
}

.sidebar__section-title {
  padding: 12px 16px 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-secondary);
}

.sidebar__list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 8px;
}

.sidebar__item {
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
  margin-bottom: 2px;
}

.sidebar__item:hover {
  background: var(--color-surface);
}

.sidebar__item--active {
  background: #EBF4FF;
}

.sidebar__item--active .sidebar__item-title {
  color: var(--color-primary);
}

.sidebar__item-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.sidebar__item-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sidebar__item-status {
  font-size: 11px;
  font-weight: 500;
  text-transform: capitalize;
  border-radius: 4px;
  padding: 1px 6px;
}

.status--ongoing {
  background: #FEF3C7;
  color: #D97706;
}

.status--completed {
  background: #D1FAE5;
  color: #059669;
}

.sidebar__item-date {
  font-size: 11px;
  color: var(--color-text-secondary);
}

.sidebar__empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.sidebar__admin-entry {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  margin: 4px 8px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  border-top: 1px solid var(--color-border);
  transition: background 0.15s, color 0.15s;
}

.sidebar__admin-entry:hover {
  background: var(--color-surface);
  color: var(--color-primary);
}
</style>
