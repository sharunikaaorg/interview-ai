import axios from 'axios'

const api = axios.create({ baseURL: '/api', timeout: 30000 })

// JDs
export const createJD = (data) => api.post('/jds', data)
export const listJDs = () => api.get('/jds')
export const getJD = (jdId) => api.get(`/jds/${jdId}`)

// Candidates
export const addCandidate = (jdId, data) => api.post(`/jds/${jdId}/candidates`, data)
export const listCandidates = (jdId) => api.get(`/jds/${jdId}/candidates`)
export const getCandidate = (jdId, cid) => api.get(`/jds/${jdId}/candidates/${cid}`)

// Questions
export const generateQuestions = (jdId, cid, numQuestions = 8) => {
  const formData = new FormData()
  formData.append('num_questions', numQuestions.toString())
  return api.post(`/jds/${jdId}/candidates/${cid}/generate-questions`, formData)
}

// Transcript & Scoring
export const saveTranscript = (jdId, cid, transcript) =>
  api.post(`/jds/${jdId}/candidates/${cid}/transcript`, transcript)

export const scoreCandidate = (jdId, cid) =>
  api.post(`/jds/${jdId}/candidates/${cid}/score`)

// File processing
export const processFile = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post('/process-file', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
}

export default api
