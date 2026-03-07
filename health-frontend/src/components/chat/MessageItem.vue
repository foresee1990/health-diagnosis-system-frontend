<template>
  <div class="message" :class="isUser ? 'message--user' : 'message--ai'">
    <div v-if="!isUser" class="message__avatar">
      <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="28" height="28" rx="7" fill="#2F80ED"/>
        <path d="M14 7v14M7 14h14" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
      </svg>
    </div>
    <div class="message__bubble">
      <LoadingDots v-if="isLoading" />
      <span v-else class="message__text">{{ message.content }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import LoadingDots from '@/components/common/LoadingDots.vue'

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
</script>

<style scoped>
.message {
  display: flex;
  align-items: flex-end;
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
}

.message__avatar svg {
  width: 100%;
  height: 100%;
}

.message__bubble {
  max-width: 65%;
  padding: 12px 16px;
  border-radius: var(--radius-bubble);
  font-size: 14px;
  line-height: 1.6;
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
</style>
