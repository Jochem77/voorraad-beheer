import React from 'react'
import './Header.css'

interface HeaderProps {
  onLogout: () => void
  userEmail?: string
}

export function Header({ onLogout, userEmail }: HeaderProps) {
  return (
    <div className="app-header">
      <div className="header-left">
        <h1>Voorraad Beheer</h1>
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
