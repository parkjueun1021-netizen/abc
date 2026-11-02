import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import Header from '../components/Header'
import ProgressBar from '../components/ProgressBar'
import { supabase } from '../lib/supabase'

export default function Dilemma() {
  const { step } = useParams()
  const current = Number(step)
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [choice, setChoice] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!['1', '2', '3'].includes(step)) {
      navigate('/', { replace: true })
      return
    }
    const participant = sessionStorage.getItem('participant')
    if (!participant) {
      navigate('/participant', { replace: true })
      return
    }
    if (!supabase) {
      setError('Supabase 환경변수가 설정되지 않았습니다.')
      setLoading(false)
      return
    }
    supabase.from('dilemmas').select('id, order_no, title, scenario, option_a, option_b')
      .eq('is_active', true).order('order_no')
      .then(({ data, error: queryError }) => {
        if (queryError) setError(queryError.message)
        else if (!data || data.length !== 3) setError('관리자에게 문의해 주세요. 활성 문항이 정확히 3개여야 합니다.')
        else {
          setItems(data)
          const saved = JSON.parse(sessionStorage.getItem('dilemmaAnswers') || '{}')[String(current)]
          if (saved) {
            setChoice(saved.choice)
            setReason(saved.reason)
          }
        }
        setLoading(false)
      })
  }, [step, current, navigate])

  function next(event) {
    event.preventDefault()
    if (!choice || !reason.trim()) return
    const all = JSON.parse(sessionStorage.getItem('dilemmaAnswers') || '{}')
    all[String(current)] = { dilemma_id: items[current - 1].id, choice, reason: reason.trim() }
    sessionStorage.setItem('dilemmaAnswers', JSON.stringify(all))
    navigate(current === 3 ? '/complete' : `/dilemma/${current + 1}`)
  }

  if (loading) return <div className="center-page">문항을 불러오는 중...</div>
  if (error) return <div className="center-page"><p>{error}</p><Link to="/">처음으로</Link></div>
  const item = items[current - 1]
  if (!item) return null

  return (
    <div className="page-shell">
      <Header />
      <main className="dilemma-page">
        <ProgressBar current={current} />
        <div className="eyebrow">DILEMMA {String(current).padStart(2, '0')}</div>
        <h1 className="dilemma-title">{item.title}</h1>
        <section className="scenario-card">
          <span className="scenario-label">SITUATION</span>
          <p>{item.scenario}</p>
        </section>
        <form onSubmit={next}>
          <div className="field-label option-heading">당신의 선택은?</div>
          <div className="option-list">
            <button type="button" onClick={() => setChoice('A')} className={`option-card ${choice === 'A' ? 'selected' : ''}`}>
              <span className="option-letter">A</span><span>{item.option_a}</span><span className="radio-mark" />
            </button>
            <button type="button" onClick={() => setChoice('B')} className={`option-card ${choice === 'B' ? 'selected' : ''}`}>
              <span className="option-letter">B</span><span>{item.option_b}</span><span className="radio-mark" />
            </button>
          </div>
          <label className="field-label reason-label" htmlFor="reason">그렇게 선택한 이유는 무엇인가요?</label>
          <textarea id="reason" value={reason} onChange={e => setReason(e.target.value)} maxLength={3000} rows={5} placeholder="생각과 판단의 이유를 자유롭게 작성해 주세요." required />
          <div className="textarea-meta">{reason.length} / 3000</div>
          <button className="primary-button full" disabled={!choice || !reason.trim()}>{current === 3 ? '응답 제출하기' : '다음 문항으로'} <span>→</span></button>
        </form>
      </main>
    </div>
  )
}
