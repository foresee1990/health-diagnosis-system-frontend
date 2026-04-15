<template>
  <div class="message" :class="isUser ? 'message--user' : 'message--ai'">
    <div v-if="!isUser" class="message__avatar">
      <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="28" height="28" rx="7" fill="#2F80ED"/>
        <path d="M14 7v14M7 14h14" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
      </svg>
    </div>

    <div class="message__body">
      <!-- 思考过程气泡（流式输出时展开，结束后自动折叠） -->
      <div
        v-if="!isUser && message.thinking"
        class="thinking-block"
        :class="{ 'thinking-block--collapsed': collapsed }"
      >
        <div class="thinking-block__header" @click="collapsed = !collapsed">
          <span class="thinking-block__label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
            </svg>
            思考过程
            <span v-if="!message.thinkingDone" class="thinking-block__streaming">...</span>
          </span>
          <span class="thinking-block__toggle">{{ collapsed ? '展开' : '收起' }}</span>
        </div>
        <div v-show="!collapsed" class="thinking-block__content">
          <span class="thinking-text">{{ message.thinking }}</span>
          <span v-if="!message.thinkingDone" class="cursor-blink">|</span>
        </div>
      </div>

      <!-- 主气泡 -->
      <div class="message__bubble">
        <LoadingDots v-if="isLoading" />
        <!-- AI 回答：markdown 渲染 -->
        <div
          v-else-if="!isUser"
          class="message__markdown"
          v-html="renderedContent"
        />
        <!-- 用户消息：纯文本 -->
        <span v-else class="message__text">{{ message.content }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { marked } from 'marked'
import LoadingDots from '@/components/common/LoadingDots.vue'

marked.use({ gfm: true, breaks: true })

const props = defineProps({
  message: {
    type: Object,
    required: true
  },
  isLoading: {
    type: Boolean,
    default: false
  }
})

const isUser = computed(() => props.message.role === 'user')

// thinking 折叠状态：流式输出时展开，结束后自动折叠
const collapsed = ref(false)

watch(
  () => props.message.thinkingDone,
  (done) => { if (done) collapsed.value = true }
)

const renderedContent = computed(() => {
  const text = props.message.content
  if (!text) return ''
  return marked.parse(text)
})
</script>

<style scoped>
.message {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 16px;
}

.message--user {
  flex-direction: row-reverse;
}

.message__avatar {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  margin-top: 2px;
}

.message__avatar svg {
  width: 100%;
  height: 100%;
}

.message__body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 65%;
}

.message--user .message__body {
  align-items: flex-end;
}

/* ---- Thinking 气泡 ---- */
.thinking-block {
  background: #EBF4FF;
  border: 1px solid #BFDBFE;
  border-radius: 10px;
  font-size: 13px;
  color: #3B5BA5;
  overflow: hidden;
}

.thinking-block__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 12px;
  cursor: pointer;
  user-select: none;
  gap: 8px;
}

.thinking-block__header:hover {
  background: #DBEAFE;
}

.thinking-block__label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-weight: 500;
}

.thinking-block__streaming {
  color: #60A5FA;
  font-weight: 600;
  letter-spacing: 2px;
}

.thinking-block__toggle {
  font-size: 12px;
  color: #6B8FC7;
  flex-shrink: 0;
}

.thinking-block__content {
  padding: 8px 12px 10px;
  border-top: 1px solid #BFDBFE;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
  max-height: 300px;
  overflow-y: auto;
}

.thinking-text {
  color: #374B7B;
}

.cursor-blink {
  display: inline-block;
  color: #60A5FA;
  animation: blink 0.8s step-end infinite;
  margin-left: 1px;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* ---- 主气泡 ---- */
.message__bubble {
  padding: 12px 16px;
  border-radius: var(--radius-bubble);
  font-size: 14px;
  line-height: 1.7;
  word-break: break-word;
}

.message--user .message__bubble {
  background: var(--color-user-bubble);
  color: var(--color-text);
  border-bottom-right-radius: 4px;
}

.message--ai .message__bubble {
  background: #ffffff;
  border: 1px solid var(--color-border);
  color: var(--color-text);
  border-bottom-left-radius: 4px;
}

.message__text {
  white-space: pre-wrap;
}

/* ---- Markdown 渲染样式 ---- */
.message__markdown {
  line-height: 1.7;
}

.message__markdown :deep(p) {
  margin: 0 0 8px;
}

.message__markdown :deep(p:last-child) {
  margin-bottom: 0;
}

.message__markdown :deep(strong) {
  font-weight: 600;
  color: #1a1a1a;
}

.message__markdown :deep(ul),
.message__markdown :deep(ol) {
  margin: 6px 0 8px;
  padding-left: 20px;
}

.message__markdown :deep(li) {
  margin-bottom: 4px;
}

.message__markdown :deep(h3),
.message__markdown :deep(h4) {
  font-size: 14px;
  font-weight: 600;
  margin: 10px 0 4px;
}

.message__markdown :deep(code) {
  background: #F3F4F6;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 13px;
}
</style>
