import http from './http'
import { useAuthStore } from '@/stores/auth'

export function createConsultation(chiefComplaint) {
  return http.post('/consultations', { chiefComplaint })
}

export function getConsultationList(page = 1, size = 20) {
  return http.get('/consultations', { params: { page, size } })
}

export function getMessages(consultationId) {
  return http.get(`/consultations/${consultationId}/messages`)
}

export function completeConsultation(consultationId) {
  return http.patch(`/consultations/${consultationId}/status`)
}

export async function sendMessageStream(consultationId, content, onToken, onDone) {
  const token = useAuthStore().token

  const response = await fetch(`/api/consultations/${consultationId}/messages/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ content })
  })

  if (!response.ok) {
    throw new Error(`Stream request failed: ${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()

    for (const line of lines) {
      if (line.startsWith('data:')) {
        const data = line.slice(5).trim()
        if (!data) continue

        if (data.startsWith('{') && data.includes('"type":"done"')) {
          const parsed = JSON.parse(data)
          onDone(parsed.riskLevel || null)
        } else {
          onToken(data)
        }
      }
    }
  }
}
