import { defineStore } from 'pinia'
import { login as loginApi } from '@/services/authService'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || null,
    userId: Number(localStorage.getItem('userId')) || null,
    username: localStorage.getItem('username') || null,
  }),

  actions: {
    async login(username, password) {
      const res = await loginApi(username, password)
      this.token = res.data.token
      this.userId = res.data.userId
      this.username = res.data.username
      localStorage.setItem('token', this.token)
      localStorage.setItem('userId', this.userId)
      localStorage.setItem('username', this.username)
    },

    logout() {
      this.token = null
      this.userId = null
      this.username = null
      localStorage.removeItem('token')
      localStorage.removeItem('userId')
      localStorage.removeItem('username')
    }
  }
})
