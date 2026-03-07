import { defineStore } from 'pinia'
import * as consultationService from '@/services/consultationService'

export const useConsultationStore = defineStore('consultation', {
  state: () => ({
    list: [],
    listTotal: 0,
    currentId: null,
    currentStatus: null,
    currentRiskLevel: null,
    messages: [],
    aiTyping: false,
  }),

  actions: {
    async fetchList(page = 1, size = 20) {
      const res = await consultationService.getConsultationList(page, size)
      this.list = res.data.consultations
      this.listTotal = res.data.total
    },

    async openConsultation(id) {
      this.currentId = id
      this.messages = []
      const res = await consultationService.getMessages(id)
      this.messages = res.data.messages
      this.currentStatus = res.data.status
      this.currentRiskLevel = res.data.riskLevel
    },

    async createConsultation(chiefComplaint) {
      const res = await consultationService.createConsultation(chiefComplaint)
      await this.fetchList()
      return res.data.consultationId
    },

    async sendMessage(content) {
      if (!this.currentId) return

      this.messages.push({ role: 'user', content, createdAt: new Date().toISOString() })

      const aiMsg = { role: 'assistant', content: '', createdAt: new Date().toISOString() }
      this.messages.push(aiMsg)
      this.aiTyping = true

      try {
        await consultationService.sendMessageStream(
          this.currentId,
          content,
          (token) => { aiMsg.content += token },
          (riskLevel) => {
            this.currentRiskLevel = riskLevel
            this.aiTyping = false
          }
        )
      } catch (e) {
        this.aiTyping = false
        throw e
      }
    },

    async completeConsultation() {
      if (!this.currentId) return
      await consultationService.completeConsultation(this.currentId)
      this.currentStatus = 'completed'
      const item = this.list.find(c => c.id === this.currentId)
      if (item) item.status = 'completed'
    }
  }
})
