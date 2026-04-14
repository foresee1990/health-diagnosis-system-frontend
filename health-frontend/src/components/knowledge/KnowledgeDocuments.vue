<template>
  <div class="panel">
    <!-- Page header -->
    <div class="panel__header">
      <div>
        <h1 class="panel__title">Documents</h1>
        <p class="panel__desc">管理已索引的医疗知识文档，查看切分结果</p>
      </div>
      <div class="upload-trigger">
        <el-upload
          accept=".pdf"
          :before-upload="beforeUpload"
          :http-request="handleUpload"
          :show-file-list="false"
        >
          <button class="btn btn--primary" :disabled="uploading">
            <el-icon v-if="!uploading"><Plus /></el-icon>
            <el-icon v-else class="spin"><Loading /></el-icon>
            {{ uploading ? 'Indexing...' : 'Upload PDF' }}
          </button>
        </el-upload>
      </div>
    </div>

    <!-- Tags input -->
    <div class="tags-row">
      <span class="field-label">Tags</span>
      <el-input
        v-model="uploadTags"
        placeholder="逗号分隔，如：心血管,高血压（上传前填写）"
        size="small"
        style="max-width: 360px"
        :disabled="uploading"
      />
    </div>

    <!-- Table -->
    <div class="table-wrap" v-loading="loading">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width:52px">ID</th>
            <th>File</th>
            <th style="width:80px">Size</th>
            <th>Tags</th>
            <th style="width:80px">Status</th>
            <th style="width:60px">Chunks</th>
            <th style="width:140px">Uploaded</th>
            <th style="width:110px"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="documents.length === 0 && !loading">
            <td colspan="8" class="empty-row">No documents yet. Upload a PDF to get started.</td>
          </tr>
          <tr v-for="row in documents" :key="row.id">
            <td class="mono text-muted">{{ row.id }}</td>
            <td class="file-cell">
              <el-icon class="file-icon"><Document /></el-icon>
              <span class="file-name">{{ row.originalName }}</span>
            </td>
            <td class="mono text-muted">{{ formatSize(row.fileSize) }}</td>
            <td>
              <span v-if="row.tags" class="tag-list">
                <span v-for="t in row.tags.split(',')" :key="t" class="tag">{{ t.trim() }}</span>
              </span>
              <span v-else class="text-muted">—</span>
            </td>
            <td>
              <span class="status-dot" :class="`status-dot--${row.status.toLowerCase()}`" />
              <span class="status-text">{{ row.status }}</span>
            </td>
            <td class="mono text-center">{{ row.chunkCount ?? '—' }}</td>
            <td class="mono text-muted">{{ formatDate(row.createdAt) }}</td>
            <td class="action-cell">
              <button
                class="link-btn"
                :disabled="row.status !== 'DONE'"
                @click.stop="viewChunks(row)"
              >Chunks</button>
              <span class="divider-v" />
              <button class="link-btn link-btn--danger" @click.stop="handleDelete(row)">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="table-footer">
      <span class="text-muted mono">{{ total }} document{{ total !== 1 ? 's' : '' }}</span>
      <el-pagination
        :current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="prev, pager, next"
        small
        @current-change="(p) => { page = p; loadDocuments() }"
      />
    </div>

    <!-- Chunks Drawer -->
    <el-drawer
      v-model="chunksDrawerVisible"
      direction="rtl"
      size="520px"
      :show-close="true"
    >
      <template #header>
        <div class="drawer-header">
          <span class="drawer-title">Chunk Inspector</span>
          <span class="drawer-filename">{{ selectedDoc?.originalName }}</span>
        </div>
      </template>

      <div v-loading="chunksLoading" class="chunks-body">
        <div v-if="chunks.length === 0 && !chunksLoading" class="empty-chunks">
          No chunks found.
        </div>
        <div v-for="chunk in chunks" :key="chunk.chunkIndex" class="chunk-row">
          <div class="chunk-meta">
            <span class="chunk-idx mono">chunk_{{ String(chunk.chunkIndex).padStart(3, '0') }}</span>
            <span class="chunk-len mono text-muted">{{ chunk.content.length }} chars</span>
          </div>
          <pre class="chunk-content">{{ chunk.content }}</pre>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Plus, Loading, Document } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { uploadDocument, getDocuments, getDocumentChunks, deleteDocument } from '@/services/knowledgeService'

const documents = ref([])
const loading = ref(false)
const page = ref(1)
const pageSize = 10
const total = ref(0)

const uploadTags = ref('')
const uploading = ref(false)

const chunksDrawerVisible = ref(false)
const chunksLoading = ref(false)
const chunks = ref([])
const selectedDoc = ref(null)

async function loadDocuments() {
  loading.value = true
  try {
    const res = await getDocuments({ page: page.value, size: pageSize })
    documents.value = res.data?.documents || []
    total.value = res.data?.total || 0
  } catch {
    ElMessage.error('获取文档列表失败')
  } finally {
    loading.value = false
  }
}

function beforeUpload(file) {
  if (file.type !== 'application/pdf') { ElMessage.error('仅支持 PDF 文件'); return false }
  if (file.size > 10 * 1024 * 1024) { ElMessage.error('文件大小不能超过 10MB'); return false }
  return true
}

async function handleUpload({ file }) {
  uploading.value = true
  const formData = new FormData()
  formData.append('file', file)
  formData.append('tags', uploadTags.value)
  try {
    await uploadDocument(formData)
    ElMessage.success('上传成功，正在处理')
    uploadTags.value = ''
    loadDocuments()
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '上传失败')
  } finally {
    uploading.value = false
  }
}

async function viewChunks(doc) {
  selectedDoc.value = doc
  chunksDrawerVisible.value = true
  chunksLoading.value = true
  chunks.value = []
  try {
    const res = await getDocumentChunks(doc.id)
    chunks.value = res.data || []
  } catch {
    ElMessage.error('获取切分结果失败')
  } finally {
    chunksLoading.value = false
  }
}

async function handleDelete(doc) {
  await ElMessageBox.confirm(
    `Delete "${doc.originalName}"? 相关向量数据也将一并删除。`,
    'Confirm Delete',
    { type: 'warning', confirmButtonText: 'Delete', confirmButtonClass: 'el-button--danger' }
  )
  try {
    await deleteDocument(doc.id)
    ElMessage.success('已删除')
    loadDocuments()
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '删除失败')
  }
}

function formatSize(bytes) {
  if (!bytes) return '—'
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)}KB` : `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

function formatDate(str) {
  if (!str) return '—'
  const d = new Date(str)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

onMounted(loadDocuments)
</script>

<style scoped>
/* ── Layout ── */
.panel { padding: 28px 32px; max-width: 1100px; }

.panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
}

.panel__title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 2px;
  font-family: 'JetBrains Mono', 'Cascadia Code', monospace;
}

.panel__desc {
  font-size: 12px;
  color: #6b7280;
  margin: 0;
}

/* ── Tags row ── */
.tags-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.field-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #9ca3af;
  white-space: nowrap;
}

/* ── Buttons ── */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 6px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: background 0.12s, opacity 0.12s;
  line-height: 1.4;
}

.btn:disabled { opacity: 0.55; cursor: not-allowed; }

.btn--primary {
  background: #6366f1;
  color: #fff;
  border-color: #6366f1;
}

.btn--primary:hover:not(:disabled) { background: #4f46e5; }

.link-btn {
  background: none;
  border: none;
  padding: 2px 4px;
  font-size: 12px;
  color: #6366f1;
  cursor: pointer;
  font-weight: 500;
}

.link-btn:hover { text-decoration: underline; }
.link-btn:disabled { color: #d1d5db; cursor: not-allowed; text-decoration: none; }
.link-btn--danger { color: #ef4444; }
.link-btn--danger:hover { color: #dc2626; }

.divider-v {
  display: inline-block;
  width: 1px;
  height: 12px;
  background: #e5e7eb;
  margin: 0 4px;
  vertical-align: middle;
}

/* ── Table ── */
.table-wrap {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.data-table th {
  padding: 9px 12px;
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6b7280;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.data-table td {
  padding: 10px 12px;
  border-bottom: 1px solid #f3f4f6;
  color: #111827;
  vertical-align: middle;
}

.data-table tbody tr:last-child td { border-bottom: none; }
.data-table tbody tr:hover td { background: #fafafa; }

.mono { font-family: 'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace; font-size: 12px; }
.text-muted { color: #9ca3af; }
.text-center { text-align: center; }

.file-cell { display: flex; align-items: center; gap: 7px; }
.file-icon { color: #9ca3af; font-size: 14px; flex-shrink: 0; }
.file-name { font-size: 13px; color: #111827; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 260px; }

.tag-list { display: flex; flex-wrap: wrap; gap: 4px; }
.tag {
  font-size: 11px;
  padding: 1px 7px;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  color: #374151;
  font-family: inherit;
}

/* Status dot */
.status-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: 6px;
  vertical-align: middle;
}
.status-dot--done    { background: #10b981; }
.status-dot--pending { background: #f59e0b; }
.status-dot--failed  { background: #ef4444; }
.status-text { font-size: 12px; font-family: 'JetBrains Mono', monospace; vertical-align: middle; }

.action-cell { display: flex; align-items: center; white-space: nowrap; }

.empty-row {
  text-align: center;
  padding: 40px 12px;
  color: #9ca3af;
  font-size: 13px;
}

/* ── Footer ── */
.table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
}

/* ── Drawer ── */
.drawer-header { display: flex; flex-direction: column; gap: 2px; }
.drawer-title { font-size: 14px; font-weight: 600; color: #111827; font-family: 'JetBrains Mono', monospace; }
.drawer-filename { font-size: 12px; color: #6b7280; }

.chunks-body { padding: 0 4px; }

.chunk-row {
  margin-bottom: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
}

.chunk-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.chunk-idx { font-size: 11px; font-weight: 600; color: #6366f1; }
.chunk-len { font-size: 11px; }

.chunk-content {
  margin: 0;
  padding: 12px;
  font-size: 12px;
  line-height: 1.7;
  color: #374151;
  font-family: 'JetBrains Mono', 'Cascadia Code', monospace;
  white-space: pre-wrap;
  word-break: break-word;
  background: #fff;
}

.empty-chunks {
  text-align: center;
  padding: 60px 0;
  color: #9ca3af;
  font-size: 13px;
}

/* Spinner */
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
