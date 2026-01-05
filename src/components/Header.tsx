
import './Header.css'

interface HeaderProps {
  onLogout: () => void
  userEmail?: string
}

export function Header({ onLogout, userEmail }: HeaderProps) {
  return (
    <div className="app-header">
      <div className="header-left">
        <div className="logo-container">
          <img src="/voorraad-beheer/logo.png" alt="Save Our Stuff Logo" className="logo-image" />
          <div className="logo-text">
            <div className="logo-title">SAVE OUR STUFF</div>
            <div className="logo-subtitle">www.save-our-stuff.nl</div>
          </div>
        </div>
      </div>
      <div className="header-right">
        {userEmail && <span className="user-email">{userEmail}</span>}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <button className="btn-logout" onClick={onLogout}>
            Uitloggen
          </button>
          <div style={{ fontSize: '0.75rem', color: '#666' }}>
            v0.1.1
          </div>
        </div>
      </div>
    </div>
  )
}
