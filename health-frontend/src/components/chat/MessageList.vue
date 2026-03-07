<template>
  <div class="message-list" ref="listEl">
    <div v-if="messages.length === 0" class="message-list__empty">
      <p>Start the conversation by typing below.</p>
    </div>

    <MessageItem
      v-for="(msg, i) in messages"
      :key="i"
      :message="msg"
      :is-loading="isLastAiMsg(i) && aiTyping && msg.content === ''"
    />
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import MessageItem from './MessageItem.vue'

const props = defineProps({
  messages: {
    type: Array,
    default: () => []
  },
  aiTyping: {
    type: Boolean,
    default: false
  }
})

const listEl = ref(null)

function isLastAiMsg(i) {
  return i === props.messages.length - 1 && props.messages[i]?.role === 'assistant'
}

function scrollToBottom() {
  nextTick(() => {
    if (listEl.value) {
      listEl.value.scrollTop = listEl.value.scrollHeight
    }
  })
}

watch(() => props.messages.length, scrollToBottom)
watch(() => {
  const last = props.messages[props.messages.length - 1]
  return last?.content
}, scrollToBottom)
</script>

<style scoped>
.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 24px 32px;
  display: flex;
  flex-direction: column;
}

.message-list__empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  font-size: 14px;
}
</style>
