import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'

export default function ParticipantInfo() {
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const navigate = useNavigate()

  function submit(event) {
    event.preventDefault()
    const n = Number(age)
    if (!Number.isInteger(n) || n < 1 || n > 120 || !gender) return
    sessionStorage.setItem('participant', JSON.stringify({ age: n, gender }))
    sessionStorage.removeItem('dilemmaAnswers')
    navigate('/dilemma/1')
  }

  return (
    <div className="page-shell">
      <Header />
      <main className="form-page">
        <div className="eyebrow">ABOUT YOU · 01</div>
        <h1 className="page-title">먼저, 간단한 정보를<br /><em>알려주세요.</em></h1>
        <p className="muted">응답 경향을 분석하기 위한 정보입니다. 이름은 수집하지 않습니다.</p>
        <form onSubmit={submit} className="surface-card">
          <label className="field-label" htmlFor="age">연령</label>
          <div className="input-with-unit">
            <input id="age" type="number" min="1" max="120" value={age} onChange={e => setAge(e.target.value)} placeholder="나이를 입력해 주세요" required />
            <span>세</span>
          </div>
          <fieldset className="gender-field">
            <legend className="field-label">성별</legend>
            <div className="choice-grid">
              {['남성', '여성', '기타', '응답하지 않음'].map(value => (
                <button type="button" key={value} className={`choice-chip ${gender === value ? 'selected' : ''}`} onClick={() => setGender(value)}>{value}</button>
              ))}
            </div>
          </fieldset>
          <button className="primary-button full" disabled={!age || !gender}>다음으로 <span>→</span></button>
        </form>
      </main>
    </div>
  )
}
