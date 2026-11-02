import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Header from '../components/Header'
import { supabase } from '../lib/supabase'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  async function login(event) {
    event.preventDefault()
    if (!supabase) return setError('Supabase 환경변수를 설정해 주세요.')
    setBusy(true)
    setError('')
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (authError) return setError('로그인 정보를 확인해 주세요.')
    if (data.user?.app_metadata?.role !== 'admin') {
      await supabase.auth.signOut()
      return setError('관리자 권한이 없는 계정입니다.')
    }
    navigate('/admin')
  }

  return (
    <div className="page-shell">
      <Header admin />
      <main className="form-page admin-login">
        <div className="eyebrow">ADMIN ACCESS</div>
        <h1 className="page-title">관리자<br /><em>로그인</em></h1>
        <form className="surface-card" onSubmit={login}>
          <label className="field-label" htmlFor="email">이메일</label>
          <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="관리자 이메일" />
          <label className="field-label spaced" htmlFor="password">비밀번호</label>
          <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="비밀번호" />
          {error && <p className="error-text">{error}</p>}
          <button className="primary-button full" disabled={busy}>{busy ? '확인 중...' : '로그인'}</button>
        </form>
        <Link to="/" className="back-link">← 설문 첫 화면</Link>
      </main>
    </div>
  )
}
