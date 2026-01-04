
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
          <div className="logo-shapes">
            <div className="shape-row">
              <div className="shape circle"></div>
              <div className="shape circle"></div>
              <div className="shape circle"></div>
            </div>
            <div className="shape-row">
              <div className="shape square"></div>
              <div className="shape square"></div>
              <div className="shape square"></div>
            </div>
            <div className="shape-row">
              <div className="shape circle"></div>
              <div className="shape circle"></div>
              <div className="shape circle"></div>
            </div>
          </div>
          <div className="logo-text">
            <div className="logo-title">SAVE OUR STUFF</div>
            <div className="logo-subtitle">www.save-our-stuff.nl</div>
          </div>
        </div>
      </div>
      <div className="header-right">
        {userEmail && <span className="user-email">{userEmail}</span>}
        <button className="btn-logout" onClick={onLogout}>
          Uitloggen
        </button>
      </div>
    </div>
  )
}
