import axios from 'axios'

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1',
  withCredentials: true,
})

api.interceptors.request.use(config => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refresh = localStorage.getItem('refresh_token')
        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/users/refresh`,
          { refreshToken: refresh }
        )
        localStorage.setItem('access_token', data.accessToken)
        localStorage.setItem('refresh_token', data.refreshToken)
        original.headers.Authorization = `Bearer ${data.accessToken}`
        return api(original)
      } catch {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/auth/login'
      }
    }
    return Promise.reject(err)
  }
)
