<template>
  <div class="panel">
    <div class="panel__header">
      <h1 class="panel__title">Retrieval Test</h1>
      <p class="panel__desc">向量相似度检索测试，验证知识库召回效果</p>
    </div>

    <!-- Query input -->
    <div class="query-box">
      <el-input
        v-model="query"
        type="textarea"
        :rows="3"
        placeholder="输入查询语句，例如：高血压的常见症状有哪些？"
        resize="none"
        class="query-textarea"
        @keydown.ctrl.enter="handleSearch"
      />

      <!-- Params bar -->
      <div class="params-bar">
        <div class="param-item">
          <span class="param-label mono">top_k</span>
          <div class="topk-group">
            <button
              v-for="k in [3, 5, 10]"
              :key="k"
              class="topk-btn"
              :class="{ 'topk-btn--active': topK === k }"
              @click="topK = k"
            >{{ k }}</button>
          </div>
        </div>

        <div class="param-item param-item--slider">
          <span class="param-label mono">similarity_threshold</span>
          <el-slider
            v-model="similarityThreshold"
            :min="0" :max="1" :step="0.05"
            :format-tooltip="(v) => (v * 100).toFixed(0) + '%'"
            style="flex: 1; margin: 0 10px"
          />
          <span class="threshold-val mono">{{ (similarityThreshold * 100).toFixed(0) }}%</span>
        </div>

        <button
          class="run-btn"
          :disabled="searching || !query.trim()"
          @click="handleSearch"
        >
          <span v-if="searching" class="mono">Running...</span>
          <span v-else>▶ Run</span>
        </button>
      </div>
    </div>

    <!-- Results header -->
    <div v-if="searched" class="results-meta">
      <span class="mono text-muted">
        {{ results.length }} result{{ results.length !== 1 ? 's' : '' }}
        · top_k={{ topK }}
        · threshold={{ (similarityThreshold * 100).toFixed(0) }}%
      </span>
    </div>

    <!-- Results -->
    <div v-loading="searching" class="results">
      <div
        v-for="(item, idx) in results"
        :key="idx"
        class="result-card"
        :class="{ 'result-card--open': expandedIndex === idx }"
        @click="toggleExpand(idx)"
      >
        <!-- Row header -->
        <div class="result-row">
          <!-- Index -->
          <span class="result-idx mono">[{{ idx }}]</span>

          <!-- Score bar -->
          <div class="score-wrap">
            <div class="score-bar-bg">
              <div
                class="score-bar-fill"
                :style="{ width: (item.score ?? 0) * 100 + '%', background: scoreColor(item.score) }"
              />
            </div>
            <span class="score-val mono" :style="{ color: scoreColor(item.score) }">
              {{ item.score != null ? item.score.toFixed(4) : 'n/a' }}
            </span>
          </div>

          <!-- Source -->
          <div class="result-source">
            <span v-if="item.docName" class="source-file mono">{{ item.docName }}</span>
            <span v-if="item.chunkIndex !== null" class="source-chunk mono text-muted">·chunk_{{ String(item.chunkIndex).padStart(3,'0') }}</span>
            <template v-if="item.tags">
              <span v-for="t in item.tags.split(',')" :key="t" class="tag">{{ t.trim() }}</span>
            </template>
          </div>

          <!-- Expand arrow -->
          <span class="expand-arrow" :class="{ 'expand-arrow--open': expandedIndex === idx }">›</span>
        </div>

        <!-- Content preview (collapsed) -->
        <div class="result-preview mono">{{ item.content.slice(0, 120) }}{{ item.content.length > 120 ? '…' : '' }}</div>

        <!-- Expanded highlight view -->
        <transition name="slide">
          <div v-if="expandedIndex === idx" class="result-detail" @click.stop>
            <div class="detail-header">
              <span class="detail-label mono text-muted">// full chunk · {{ item.content.length }} chars</span>
            </div>
            <pre class="detail-content" v-html="highlight(item.content, query)" />
          </div>
        </transition>
      </div>

      <div v-if="searched && results.length === 0" class="no-results mono text-muted">
        // no results above threshold. try lowering similarity_threshold or rephrasing the query.
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { searchKnowledge } from '@/services/knowledgeService'

const query = ref('')
const topK = ref(5)
const similarityThreshold = ref(0.5)
const results = ref([])
const searching = ref(false)
const searched = ref(false)
const expandedIndex = ref(null)

async function handleSearch() {
  if (!query.value.trim()) return
  searching.value = true
  searched.value = false
  results.value = []
  expandedIndex.value = null
  try {
    const res = await searchKnowledge({ query: query.value.trim(), topK: topK.value, similarityThreshold: similarityThreshold.value })
    results.value = res.data || []
    searched.value = true
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '检索失败')
  } finally {
    searching.value = false
  }
}

function toggleExpand(idx) {
  expandedIndex.value = expandedIndex.value === idx ? null : idx
}

function highlight(text, queryStr) {
  if (!queryStr || !text) return escapeHtml(text)
  const escaped = escapeHtml(text)
  const terms = queryStr.trim().split(/\s+/).filter(Boolean)
  if (!terms.length) return escaped
  const pattern = terms.map(escapeRegex).join('|')
  return escaped.replace(new RegExp(`(${pattern})`, 'gi'), '<mark>$1</mark>')
}

function escapeHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')
}

function scoreColor(score) {
  if (score == null) return '#9ca3af'
  if (score >= 0.8) return '#10b981'
  if (score >= 0.6) return '#f59e0b'
  return '#ef4444'
}
</script>

<style scoped>
.panel { padding: 28px 32px; max-width: 920px; }

.panel__header { margin-bottom: 20px; }
.panel__title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 2px;
  font-family: 'JetBrains Mono', 'Cascadia Code', monospace;
}
.panel__desc { font-size: 12px; color: #6b7280; margin: 0; }

/* Query box */
.query-box {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 16px;
}

.query-box :deep(.el-textarea__inner) {
  border: none;
  border-radius: 0;
  box-shadow: none !important;
  font-size: 13px;
  padding: 12px 14px;
  background: #fff;
  resize: none;
}

.params-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 14px;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
  flex-wrap: wrap;
}

.param-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.param-item--slider {
  flex: 1;
  min-width: 200px;
}

.param-label {
  font-size: 11px;
  color: #9ca3af;
  white-space: nowrap;
}

/* Top-K buttons */
.topk-group { display: flex; }

.topk-btn {
  width: 30px;
  height: 24px;
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 500;
  border: 1px solid #e5e7eb;
  background: #fff;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.1s;
}

.topk-btn:first-child { border-radius: 4px 0 0 4px; }
.topk-btn:last-child  { border-radius: 0 4px 4px 0; }
.topk-btn + .topk-btn { border-left: none; }

.topk-btn:hover { background: #f3f4f6; color: #111827; }
.topk-btn--active { background: #6366f1; border-color: #6366f1; color: #fff; }

/* Threshold */
.threshold-val { font-size: 12px; font-weight: 600; color: #6366f1; min-width: 32px; text-align: right; }

/* Run button */
.run-btn {
  padding: 5px 14px;
  font-size: 13px;
  font-weight: 600;
  background: #111827;
  color: #fff;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background 0.1s;
  white-space: nowrap;
}
.run-btn:hover:not(:disabled) { background: #374151; }
.run-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* Results meta */
.results-meta {
  font-size: 12px;
  margin-bottom: 10px;
}

/* Result cards */
.result-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  margin-bottom: 6px;
  cursor: pointer;
  transition: border-color 0.12s;
  overflow: hidden;
}

.result-card:hover { border-color: #a5b4fc; }
.result-card--open { border-color: #6366f1; }

.result-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px 4px;
}

.result-idx {
  font-size: 11px;
  color: #9ca3af;
  min-width: 24px;
}

/* Score bar */
.score-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.score-bar-bg {
  width: 80px;
  height: 4px;
  background: #f3f4f6;
  border-radius: 2px;
  overflow: hidden;
}

.score-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s;
}

.score-val {
  font-size: 12px;
  font-weight: 600;
  min-width: 52px;
}

/* Source info */
.result-source {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  overflow: hidden;
}

.source-file {
  font-size: 12px;
  color: #374151;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 240px;
}

.source-chunk { font-size: 11px; white-space: nowrap; }

.tag {
  font-size: 10px;
  padding: 1px 6px;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 3px;
  color: #6b7280;
  font-family: inherit;
  white-space: nowrap;
}

/* Expand arrow */
.expand-arrow {
  font-size: 18px;
  color: #9ca3af;
  transition: transform 0.2s;
  display: inline-block;
  line-height: 1;
  flex-shrink: 0;
}
.expand-arrow--open { transform: rotate(90deg); color: #6366f1; }

/* Preview */
.result-preview {
  font-size: 11px;
  color: #9ca3af;
  padding: 2px 14px 10px;
  line-height: 1.5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Detail */
.result-detail {
  border-top: 1px solid #f3f4f6;
}

.detail-header {
  padding: 8px 14px 4px;
  background: #f9fafb;
  border-bottom: 1px solid #f3f4f6;
}

.detail-label { font-size: 11px; }

.detail-content {
  margin: 0;
  padding: 14px;
  font-size: 12px;
  line-height: 1.8;
  color: #374151;
  font-family: 'JetBrains Mono', 'Cascadia Code', monospace;
  white-space: pre-wrap;
  word-break: break-word;
  background: #fff;
}

.detail-content :deep(mark) {
  background: #fef9c3;
  color: inherit;
  border-radius: 2px;
  padding: 0 1px;
  font-style: normal;
}

/* No results */
.no-results {
  padding: 32px 0;
  text-align: left;
  font-size: 12px;
}

/* Transition */
.slide-enter-active, .slide-leave-active {
  transition: opacity 0.15s, transform 0.15s;
  transform-origin: top;
}
.slide-enter-from, .slide-leave-to { opacity: 0; transform: scaleY(0.97); }

/* Helpers */
.mono { font-family: 'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace; }
.text-muted { color: #9ca3af; }
</style>
