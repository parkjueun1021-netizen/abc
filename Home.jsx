import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import Header from '../components/Header'
import { supabase } from '../lib/supabase'

export default function Complete() {
  const [status, setStatus] = useState('ready')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function submit() {
    if (!supabase) {
      setError('Supabase 환경변수를 확인해 주세요.')
      return
    }
    const participant = JSON.parse(sessionStorage.getItem('participant') || 'null')
    const saved = JSON.parse(sessionStorage.getItem('dilemmaAnswers') || '{}')
    if (!participant || Object.keys(saved).length !== 3) {
      navigate('/participant', { replace: true })
      return
    }
    setStatus('sending')
    setError('')
    const answers = [1, 2, 3].map(i => saved[String(i)])
    const { error: submitError } = await supabase.rpc('submit_response', {
      p_age: participant.age,
      p_gender: participant.gender,
      p_answers: answers,
    })
    if (submitError) {
      setStatus('ready')
      setError('제출에 실패했습니다. 잠시 후 다시 시도해 주세요. (' + submitError.message + ')')
      return
    }
    sessionStorage.removeItem('participant')
    sessionStorage.removeItem('dilemmaAnswers')
    setStatus('done')
  }

  return (
    <div className="page-shell">
      <Header />
      <main className="complete-page">
        {status === 'done' ? (
          <>
            <CheckCircle2 size={58} className="success-icon" />
            <div className="eyebrow">THANK YOU</div>
            <h1 className="page-title">소중한 생각을<br /><em>나누어 주셔서 감사합니다.</em></h1>
            <p className="muted">응답이 안전하게 제출되었습니다.</p>
            <Link to="/" className="primary-button">처음으로</Link>
          </>
        ) : (
          <>
            <div className="eyebrow">ALMOST THERE · 03 / 03</div>
            <h1 className="page-title">모든 문항에<br /><em>답변하셨습니다.</em></h1>
            <p className="muted">제출하기를 누르면 응답이 저장됩니다.</p>
            <div className="review-box"><CheckCircle2 /> 딜레마 3문항 답변 완료</div>
            {error && <p className="error-text">{error}</p>}
            <button className="primary-button full" onClick={submit} disabled={status === 'sending'}>
              {status === 'sending' ? '제출 중...' : '최종 제출하기'} <span>→</span>
            </button>
          </>
        )}
      </main>
    </div>
  )
}
