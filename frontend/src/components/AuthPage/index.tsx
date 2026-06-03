import { useState } from 'react'
import { useAuthStore } from '../../stores/auth'

interface AuthPageProps {
  onSuccess: () => void
}

export function AuthPage({ onSuccess }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.detail?.message || '操作失败')
      }

      if (isLogin) {
        setAuth(data.access_token, { id: '', email })
        onSuccess()
      } else {
        setIsLogin(true)
        setError('注册成功，请登录')
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full flex items-center justify-center bg-gray-50">
      <div className="w-96 bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-center mb-6">
          {isLogin ? '登录' : '注册'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2"
              placeholder="your@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="至少 6 位"
            />
          </div>
          {error && (
            <div className={`text-sm ${error.includes('成功') ? 'text-green-600' : 'text-red-500'}`}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-2 rounded-lg disabled:opacity-50"
          >
            {loading ? '处理中...' : (isLogin ? '登录' : '注册')}
          </button>
        </form>
        <div className="mt-4 text-center text-sm text-gray-600">
          {isLogin ? '没有账号？' : '已有账号？'}
          <button
            onClick={() => { setIsLogin(!isLogin); setError('') }}
            className="text-blue-600 hover:underline ml-1"
          >
            {isLogin ? '去注册' : '去登录'}
          </button>
        </div>
      </div>
    </div>
  )
}
