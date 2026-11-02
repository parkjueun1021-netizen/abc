import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Download, LogOut, Users } from 'lucide-react'
import Header from '../components/Header'
import { supabase } from '../lib/supabase'

const ageGroup = age => age < 20 ? '10대 이하' : age < 30 ? '20대' : age < 40 ? '30대' : age < 50 ? '40대' : '50대 이상'

export default function Dashboard() {
  const [responses, setResponses] = useState([])
  const [dilemmas, setDilemmas] = useState([])
  const [ageFilter, setAgeFilter] = useState('전체')
  const [genderFilter, setGenderFilter] = useState('전체')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    async function load() {
      const [r, d] = await Promise.all([
        supabase.from('responses').select('id, age, gender, submitted_at').order('submitted_at', { ascending: false }),
        supabase.from('dilemmas').select('id, order_no, title').order('order_no'),
      ])
      if (!active) return
      if (r.error || d.error) setError('데이터를 불러오지 못했습니다. 관리자 권한과 RLS 정책을 확인해 주세요.')
      else {
        const responseIds = (r.data || []).map(x => x.id)
        let answerData = []
        if (responseIds.length) {
          const a = await supabase.from('answers')
            .select('id, response_id, dilemma_id, choice, reason')
            .in('response_id', responseIds)
          if (a.error) setError('답변 데이터를 불러오지 못했습니다.')
          else answerData = a.data || []
        }
        const byResponse = new Map((r.data || []).map(x => [x.id, { ...x, answers: [] }]))
        answerData.forEach(a => byResponse.get(a.response_id)?.answers.push(a))
        setResponses([...byResponse.values()])
        setDilemmas(d.data || [])
      }
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [])

  const filtered = useMemo(() => responses.filter(r =>
    (ageFilter === '전체' || ageGroup(r.age) === ageFilter) &&
    (genderFilter === '전체' || r.gender === genderFilter)
  ), [responses, ageFilter, genderFilter])

  const chartData = useMemo(() => dilemmas.map(d => {
    const answers = filtered.flatMap(r => r.answers).filter(a => a.dilemma_id === d.id)
    const a = answers.filter(x => x.choice === 'A').length
    const b = answers.filter(x => x.choice === 'B').length
    return { name: `문항 ${d.order_no}`, title: d.title, A: a, B: b }
  }), [dilemmas, filtered])

  const allAnswers = filtered.flatMap(r => r.answers.map(a => ({
    ...a, age: r.age, gender: r.gender, submitted_at: r.submitted_at,
    dilemma: dilemmas.find(d => d.id === a.dilemma_id)?.title || '문항',
  })))

  async function logout() {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  function exportCsv() {
    const rows = [['응답시각', '연령', '성별', '문항', '선택', '선택이유']]
    filtered.forEach(r => r.answers.forEach(a => rows.push([
      r.submitted_at, r.age, r.gender,
      dilemmas.find(d => d.id === a.dilemma_id)?.title || '',
      a.choice, a.reason
    ])))
    const csv = '\uFEFF' + rows.map(row => row.map(v => `"${String(v ?? '').replaceAll('"', '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'ai-ethics-responses.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="center-page">통계 데이터를 불러오는 중...</div>

  return (
    <div className="dashboard-shell">
      <Header admin />
      <main className="dashboard-main">
        <div className="dashboard-top">
          <div><div className="eyebrow">OVERVIEW</div><h1 className="dashboard-title">응답 대시보드</h1></div>
          <div className="dashboard-actions">
            <button className="secondary-button" onClick={exportCsv}><Download size={16} /> CSV 다운로드</button>
            <button className="icon-button" onClick={logout} aria-label="로그아웃"><LogOut size={17} /></button>
          </div>
        </div>
        {error && <p className="error-text">{error}</p>}
        <section className="filter-panel">
          <div><label>연령</label><select value={ageFilter} onChange={e => setAgeFilter(e.target.value)}>
            {['전체', '10대 이하', '20대', '30대', '40대', '50대 이상'].map(x => <option key={x}>{x}</option>)}
          </select></div>
          <div><label>성별</label><select value={genderFilter} onChange={e => setGenderFilter(e.target.value)}>
            {['전체', '남성', '여성', '기타', '응답하지 않음'].map(x => <option key={x}>{x}</option>)}
          </select></div>
          <button className="reset-button" onClick={() => { setAgeFilter('전체'); setGenderFilter('전체') }}>필터 초기화</button>
        </section>
        <section className="stat-grid">
          <div className="stat-card"><span>필터 적용 참여자</span><strong>{filtered.length.toLocaleString()}<small>명</small></strong><Users size={20} /></div>
          <div className="stat-card"><span>수집된 답변</span><strong>{allAnswers.length.toLocaleString()}<small>건</small></strong></div>
          <div className="stat-card"><span>평균 응답 연령</span><strong>{filtered.length ? Math.round(filtered.reduce((s, r) => s + r.age, 0) / filtered.length) : 0}<small>세</small></strong></div>
        </section>
        <section className="dashboard-card">
          <div className="card-heading"><div><span className="eyebrow">CHOICE ANALYSIS</span><h2>문항별 A/B 선택 현황</h2></div><span className="muted small">선택 건수</span></div>
          {chartData.length ? <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 12, left: -18, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9edf2" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="A" fill="#397fbd" radius={[5, 5, 0, 0]} />
                <Bar dataKey="B" fill="#e3a04b" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div> : <p className="empty-state">등록된 문항이 없습니다.</p>}
          <div className="chart-labels">{chartData.map(d => <p key={d.name}><b>{d.name}</b> · {d.title}</p>)}</div>
        </section>
        <section className="dashboard-card">
          <div className="card-heading"><div><span className="eyebrow">QUALITATIVE DATA</span><h2>선택 이유</h2></div><span className="muted small">{allAnswers.length}건</span></div>
          {allAnswers.length ? <div className="answer-list">
            {allAnswers.map(a => <article className="answer-item" key={a.id}>
              <div className="answer-meta"><b>{a.dilemma}</b><span className={`choice-tag ${a.choice === 'A' ? 'tag-a' : 'tag-b'}`}>{a.choice} 선택</span></div>
              <p>{a.reason}</p>
              <div className="answer-foot">{a.age}세 · {a.gender} · {new Date(a.submitted_at).toLocaleString('ko-KR')}</div>
            </article>)}
          </div> : <p className="empty-state">선택한 필터에 해당하는 응답이 없습니다.</p>}
        </section>
      </main>
    </div>
  )
}
