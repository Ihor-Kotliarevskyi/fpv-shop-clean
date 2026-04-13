import axios from 'axios'

// Server-side API client (no auth interceptors)
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1',
})
