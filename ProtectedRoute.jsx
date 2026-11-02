import { Link } from 'react-router-dom'
import { ArrowRight, ShieldCheck, BrainCircuit } from 'lucide-react'
import Header from '../components/Header'

export default function Home() {
  return (
    <div className="page-shell">
      <Header />
      <main className="hero">
        <div className="eyebrow"><span className="eyebrow-dot" /> THINK ABOUT AI</div>
        <h1>AI의 선택,<br /><em>당신의 생각은?</em></h1>
        <p className="hero-copy">
          정답이 정해져 있지 않은 세 가지 AI 윤리 딜레마를 만나보세요.
          각 상황에서 어떤 선택을 하는지, 그 이유는 무엇인지 들려주세요.
        </p>
        <div className="info-strip">
          <div><BrainCircuit size={18} /><span>총 3개의 딜레마</span></div>
          <div><ShieldCheck size={18} /><span>이름 없이 참여</span></div>
        </div>
        <Link to="/participant" className="primary-button">시작하기 <ArrowRight size={18} /></Link>
        <p className="fine-print">응답은 연구 및 교육 목적의 통계 분석에 활용됩니다.</p>
      </main>
      <footer className="site-footer"><span>AI ETHICS LAB</span><Link to="/admin/login">관리자</Link></footer>
    </div>
  )
}
