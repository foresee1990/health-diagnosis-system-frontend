<template>
  <div class="chat-header">
    <div class="chat-header__left">
      <span class="chat-header__title">{{ title }}</span>
      <RiskBadge :level="riskLevel" />
    </div>
    <div class="chat-header__actions">
      <el-button
        v-if="status === 'ongoing'"
        size="small"
        type="danger"
        plain
        :loading="completing"
        @click="handleComplete"
      >
        End Consultation
      </el-button>

      <el-button
        v-if="status === 'completed' && !reportInfo"
        size="small"
        type="primary"
        plain
        :loading="generating"
        @click="handleGenerate"
      >
        Generate Report
      </el-button>

      <el-button
        v-if="reportInfo"
        size="small"
        type="success"
        plain
        :loading="downloading"
        @click="handleDownload"
      >
        Download Report
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import RiskBadge from '@/components/common/RiskBadge.vue'
import { generateReport, getReport, downloadReport } from '@/services/reportService'

const props = defineProps({
  title: { type: String, default: 'AI Health Consultation' },
  status: { type: String, default: null },
  riskLevel: { type: String, default: null },
  consultationId: { type: Number, default: null }
})

const emit = defineEmits(['complete'])

const completing = ref(false)
const generating = ref(false)
const downloading = ref(false)
const reportInfo = ref(null)

// Load existing report when consultation changes
watch(() => props.consultationId, async (id) => {
  reportInfo.value = null
  if (id && props.status === 'completed') {
    try {
      const res = await getReport(id)
      if (res.data?.reportId) reportInfo.value = res.data
    } catch {
      // No report yet, that's fine
    }
  }
}, { immediate: true })

watch(() => props.status, async (status) => {
  if (status === 'completed' && props.consultationId && !reportInfo.value) {
    try {
      const res = await getReport(props.consultationId)
      if (res.data?.reportId) reportInfo.value = res.data
    } catch {
      // No report yet
    }
  }
})

async function handleComplete() {
  try {
    await ElMessageBox.confirm('End this consultation?', 'Confirm', {
      confirmButtonText: 'End',
      cancelButtonText: 'Cancel',
      type: 'warning'
    })
    completing.value = true
    emit('complete')
  } catch {
    // cancelled
  } finally {
    completing.value = false
  }
}

async function handleGenerate() {
  generating.value = true
  try {
    const res = await generateReport(props.consultationId)
    reportInfo.value = res.data
    ElMessage.success('Report generated successfully.')
  } catch {
    ElMessage.error('Failed to generate report.')
  } finally {
    generating.value = false
  }
}

async function handleDownload() {
  downloading.value = true
  try {
    await downloadReport(reportInfo.value.reportId)
  } catch {
    ElMessage.error('Failed to download report.')
  } finally {
    downloading.value = false
  }
}
</script>

<style scoped>
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  height: 60px;
  background: #ffffff;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.chat-header__left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.chat-header__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
}

.chat-header__actions {
  display: flex;
  gap: 8px;
}
</style>
