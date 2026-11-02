import { Link } from 'react-router-dom'

export default function Header({ admin = false }) {
  return (
    <header className="site-header">
      <Link to="/" className="brand">AI ETHICS <span>LAB</span></Link>
      <span className="header-label">{admin ? 'ADMIN DASHBOARD' : 'AI 윤리 딜레마'}</span>
    </header>
  )
}
