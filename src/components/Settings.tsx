import { useState, useEffect } from 'react'
import { settingsService } from '../lib/settingsService'
import './Settings.css'

interface SettingsProps {
  onClose: () => void
  onSettingsUpdated: () => void
}

export function Settings({ onClose, onSettingsUpdated }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<'conditions' | 'statuses' | 'joycon-actions' | 'switch-actions' | 'dualsense-actions' | 'xbox-actions'>('conditions')
  const [loading, setLoading] = useState(true)

  const [conditions, setConditions] = useState<Record<string, string>>({})
  const [statuses, setStatuses] = useState<Record<string, string>>({})
  const [joyconActions, setJoyconActions] = useState<Record<string, string>>({})
  const [switchActions, setSwitchActions] = useState<Record<string, string>>({})
  const [dualsenseActions, setDualSenseActions] = useState<Record<string, string>>({})
  const [xboxActions, setXboxActions] = useState<Record<string, string>>({})

  const [newKey, setNewKey] = useState('')
  const [newLabel, setNewLabel] = useState('')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const [cond, stat, jc, sw, ds, xb] = await Promise.all([
        settingsService.getConditions(),
        settingsService.getStatuses(),
        settingsService.getJoyconActions(),
        settingsService.getSwitchActions(),
        settingsService.getDualSenseActions(),
        settingsService.getXboxActions()
      ])
      setConditions(cond)
      setStatuses(stat)
      setJoyconActions(jc)
      setSwitchActions(sw)
      setDualSenseActions(ds)
      setXboxActions(xb)
    } catch (error) {
      console.error('Error loading settings:', error)
      alert('Fout bij laden van instellingen')
    } finally {
      setLoading(false)
    }
  }

  const handleConditionChange = async (key: string, value: string) => {
    setConditions({ ...conditions, [key]: value })
    try {
      await settingsService.updateCondition(key, value)
      onSettingsUpdated()
    } catch (error) {
      console.error('Error updating condition:', error)
      alert('Fout bij opslaan')
    }
  }

  const handleStatusChange = async (key: string, value: string) => {
    setStatuses({ ...statuses, [key]: value })
    try {
      await settingsService.updateStatus(key, value)
      onSettingsUpdated()
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Fout bij opslaan')
    }
  }

  const handleJoyconActionChange = async (key: string, value: string) => {
    setJoyconActions({ ...joyconActions, [key]: value })
    try {
      await settingsService.updateJoyconAction(key, value)
      onSettingsUpdated()
    } catch (error) {
      console.error('Error updating joycon action:', error)
      alert('Fout bij opslaan')
    }
  }

  const handleSwitchActionChange = async (key: string, value: string) => {
    setSwitchActions({ ...switchActions, [key]: value })
    try {
      await settingsService.updateSwitchAction(key, value)
      onSettingsUpdated()
    } catch (error) {
      console.error('Error updating switch action:', error)
      alert('Fout bij opslaan')
    }
  }

  const handleDualSenseActionChange = async (key: string, value: string) => {
    setDualSenseActions({ ...dualsenseActions, [key]: value })
    try {
      await settingsService.updateDualSenseAction(key, value)
      onSettingsUpdated()
    } catch (error) {
      console.error('Error updating dualsense action:', error)
      alert('Fout bij opslaan')
    }
  }

  const handleXboxActionChange = async (key: string, value: string) => {
    setXboxActions({ ...xboxActions, [key]: value })
    try {
      await settingsService.updateXboxAction(key, value)
      onSettingsUpdated()
    } catch (error) {
      console.error('Error updating xbox action:', error)
      alert('Fout bij opslaan')
    }
  }

  const handleAddCondition = async () => {
    if (!newKey.trim() || !newLabel.trim()) {
      alert('Voer zowel een sleutel als label in')
      return
    }
    try {
      await settingsService.addCondition(newKey.trim(), newLabel.trim())
      setConditions({ ...conditions, [newKey.trim()]: newLabel.trim() })
      setNewKey('')
      setNewLabel('')
      onSettingsUpdated()
    } catch (error) {
      console.error('Error adding condition:', error)
      alert('Fout bij toevoegen')
    }
  }

  const handleAddStatus = async () => {
    if (!newKey.trim() || !newLabel.trim()) {
      alert('Voer zowel een sleutel als label in')
      return
    }
    try {
      await settingsService.addStatus(newKey.trim(), newLabel.trim())
      setStatuses({ ...statuses, [newKey.trim()]: newLabel.trim() })
      setNewKey('')
      setNewLabel('')
      onSettingsUpdated()
    } catch (error) {
      console.error('Error adding status:', error)
      alert('Fout bij toevoegen')
    }
  }

  const handleAddJoyconAction = async () => {
    if (!newKey.trim() || !newLabel.trim()) {
      alert('Voer zowel een sleutel als label in')
      return
    }
    try {
      await settingsService.addJoyconAction(newKey.trim(), newLabel.trim())
      setJoyconActions({ ...joyconActions, [newKey.trim()]: newLabel.trim() })
      setNewKey('')
      setNewLabel('')
      onSettingsUpdated()
    } catch (error) {
      console.error('Error adding joycon action:', error)
      alert('Fout bij toevoegen')
    }
  }

  const handleAddSwitchAction = async () => {
    if (!newKey.trim() || !newLabel.trim()) {
      alert('Voer zowel een sleutel als label in')
      return
    }
    try {
      await settingsService.addSwitchAction(newKey.trim(), newLabel.trim())
      setSwitchActions({ ...switchActions, [newKey.trim()]: newLabel.trim() })
      setNewKey('')
      setNewLabel('')
      onSettingsUpdated()
    } catch (error) {
      console.error('Error adding switch action:', error)
      alert('Fout bij toevoegen')
    }
  }

  const handleAddDualSenseAction = async () => {
    if (!newKey.trim() || !newLabel.trim()) {
      alert('Voer zowel een sleutel als label in')
      return
    }
    try {
      await settingsService.addDualSenseAction(newKey.trim(), newLabel.trim())
      setDualSenseActions({ ...dualsenseActions, [newKey.trim()]: newLabel.trim() })
      setNewKey('')
      setNewLabel('')
      onSettingsUpdated()
    } catch (error) {
      console.error('Error adding dualsense action:', error)
      alert('Fout bij toevoegen')
    }
  }

  const handleAddXboxAction = async () => {
    if (!newKey.trim() || !newLabel.trim()) {
      alert('Voer zowel een sleutel als label in')
      return
    }
    try {
      await settingsService.addXboxAction(newKey.trim(), newLabel.trim())
      setXboxActions({ ...xboxActions, [newKey.trim()]: newLabel.trim() })
      setNewKey('')
      setNewLabel('')
      onSettingsUpdated()
    } catch (error) {
      console.error('Error adding xbox action:', error)
      alert('Fout bij toevoegen')
    }
  }

  const handleDeleteCondition = async (key: string) => {
    if (!confirm('Zeker dat je deze conditie wilt verwijderen?')) return
    try {
      await settingsService.deleteCondition(key)
      const { [key]: _, ...rest } = conditions
      setConditions(rest)
      onSettingsUpdated()
    } catch (error) {
      console.error('Error deleting condition:', error)
      alert('Fout bij verwijderen')
    }
  }

  const handleDeleteStatus = async (key: string) => {
    if (!confirm('Zeker dat je deze status wilt verwijderen?')) return
    try {
      await settingsService.deleteStatus(key)
      const { [key]: _, ...rest } = statuses
      setStatuses(rest)
      onSettingsUpdated()
    } catch (error) {
      console.error('Error deleting status:', error)
      alert('Fout bij verwijderen')
    }
  }

  const handleDeleteJoyconAction = async (key: string) => {
    if (!confirm('Zeker dat je deze actie wilt verwijderen?')) return
    try {
      await settingsService.deleteJoyconAction(key)
      const { [key]: _, ...rest } = joyconActions
      setJoyconActions(rest)
      onSettingsUpdated()
    } catch (error) {
      console.error('Error deleting joycon action:', error)
      alert('Fout bij verwijderen')
    }
  }

  const handleDeleteSwitchAction = async (key: string) => {
    if (!confirm('Zeker dat je deze actie wilt verwijderen?')) return
    try {
      await settingsService.deleteSwitchAction(key)
      const { [key]: _, ...rest } = switchActions
      setSwitchActions(rest)
      onSettingsUpdated()
    } catch (error) {
      console.error('Error deleting switch action:', error)
      alert('Fout bij verwijderen')
    }
  }

  const handleDeleteDualSenseAction = async (key: string) => {
    if (!confirm('Zeker dat je deze actie wilt verwijderen?')) return
    try {
      await settingsService.deleteDualSenseAction(key)
      const { [key]: _, ...rest } = dualsenseActions
      setDualSenseActions(rest)
      onSettingsUpdated()
    } catch (error) {
      console.error('Error deleting dualsense action:', error)
      alert('Fout bij verwijderen')
    }
  }

  const handleDeleteXboxAction = async (key: string) => {
    if (!confirm('Zeker dat je deze actie wilt verwijderen?')) return
    try {
      await settingsService.deleteXboxAction(key)
      const { [key]: _, ...rest } = xboxActions
      setXboxActions(rest)
      onSettingsUpdated()
    } catch (error) {
      console.error('Error deleting xbox action:', error)
      alert('Fout bij verwijderen')
    }
  }

  if (loading) {
    return (
      <div className="settings-modal-overlay" onClick={onClose}>
        <div className="settings-modal-content" onClick={(e) => e.stopPropagation()}>
          <p>Laden...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Instellingen</h2>
          <button className="btn-close-settings" onClick={onClose}>✕</button>
        </div>

        <div className="settings-tabs">
          <button
            className={`settings-tab ${activeTab === 'conditions' ? 'active' : ''}`}
            onClick={() => setActiveTab('conditions')}
          >
            Condities
          </button>
          <button
            className={`settings-tab ${activeTab === 'statuses' ? 'active' : ''}`}
            onClick={() => setActiveTab('statuses')}
          >
            Statuses
          </button>
          <button
            className={`settings-tab ${activeTab === 'joycon-actions' ? 'active' : ''}`}
            onClick={() => setActiveTab('joycon-actions')}
          >
            Joy-Con Acties
          </button>
          <button
            className={`settings-tab ${activeTab === 'switch-actions' ? 'active' : ''}`}
            onClick={() => setActiveTab('switch-actions')}
          >
            Switch Acties
          </button>
          <button
            className={`settings-tab ${activeTab === 'dualsense-actions' ? 'active' : ''}`}
            onClick={() => setActiveTab('dualsense-actions')}
          >
            DualSense Acties
          </button>
          <button
            className={`settings-tab ${activeTab === 'xbox-actions' ? 'active' : ''}`}
            onClick={() => setActiveTab('xbox-actions')}
          >
            Xbox Acties
          </button>
        </div>

        <div className="settings-content">
          {activeTab === 'conditions' && renderConditionsSection()}
          {activeTab === 'statuses' && renderStatusesSection()}
          {activeTab === 'joycon-actions' && renderJoyconActionsSection()}
          {activeTab === 'switch-actions' && renderSwitchActionsSection()}
          {activeTab === 'dualsense-actions' && renderDualSenseActionsSection()}
          {activeTab === 'xbox-actions' && renderXboxActionsSection()}
        </div>

        <div className="settings-footer">
          <button className="btn-close-settings-footer" onClick={onClose}>
            ✕ Sluiten
          </button>
        </div>
      </div>
    </div>
  )

  function renderConditionsSection() {
    return (
      <div className="settings-section">
        <h3>Condities</h3>
        {Object.entries(conditions).map(([key, value]) => (
          <div key={key} className="settings-item">
            <label>{key}</label>
            <input
              type="text"
              value={value}
              onChange={(e) => handleConditionChange(key, e.target.value)}
              className="settings-input"
            />
            <button
              className="btn-delete-setting"
              onClick={() => handleDeleteCondition(key)}
              title="Verwijderen"
            >
              🗑️
            </button>
          </div>
        ))}
        <div className="settings-add">
          <h4>Nieuw toevoegen</h4>
          <input
            type="text"
            placeholder="Sleutel"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            className="settings-input"
          />
          <input
            type="text"
            placeholder="Label"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="settings-input"
          />
          <button className="btn-add-setting" onClick={handleAddCondition}>+ Toevoegen</button>
        </div>
      </div>
    )
  }

  function renderStatusesSection() {
    return (
      <div className="settings-section">
        <h3>Statuses</h3>
        {Object.entries(statuses).map(([key, value]) => (
          <div key={key} className="settings-item">
            <label>{key}</label>
            <input
              type="text"
              value={value}
              onChange={(e) => handleStatusChange(key, e.target.value)}
              className="settings-input"
            />
            <button
              className="btn-delete-setting"
              onClick={() => handleDeleteStatus(key)}
              title="Verwijderen"
            >
              🗑️
            </button>
          </div>
        ))}
        <div className="settings-add">
          <h4>Nieuw toevoegen</h4>
          <input
            type="text"
            placeholder="Sleutel"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            className="settings-input"
          />
          <input
            type="text"
            placeholder="Label"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="settings-input"
          />
          <button className="btn-add-setting" onClick={handleAddStatus}>+ Toevoegen</button>
        </div>
      </div>
    )
  }

  function renderJoyconActionsSection() {
    return (
      <div className="settings-section">
        <h3>Joy-Con Acties</h3>
        {Object.entries(joyconActions).map(([key, value]) => (
          <div key={key} className="settings-item">
            <label>{key}</label>
            <input
              type="text"
              value={value}
              onChange={(e) => handleJoyconActionChange(key, e.target.value)}
              className="settings-input"
            />
            <button
              className="btn-delete-setting"
              onClick={() => handleDeleteJoyconAction(key)}
              title="Verwijderen"
            >
              🗑️
            </button>
          </div>
        ))}
        <div className="settings-add">
          <h4>Nieuw toevoegen</h4>
          <input
            type="text"
            placeholder="Sleutel"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            className="settings-input"
          />
          <input
            type="text"
            placeholder="Label"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="settings-input"
          />
          <button className="btn-add-setting" onClick={handleAddJoyconAction}>+ Toevoegen</button>
        </div>
      </div>
    )
  }

  function renderSwitchActionsSection() {
    return (
      <div className="settings-section">
        <h3>Switch Acties</h3>
        {Object.entries(switchActions).map(([key, value]) => (
          <div key={key} className="settings-item">
            <label>{key}</label>
            <input
              type="text"
              value={value}
              onChange={(e) => handleSwitchActionChange(key, e.target.value)}
              className="settings-input"
            />
            <button
              className="btn-delete-setting"
              onClick={() => handleDeleteSwitchAction(key)}
              title="Verwijderen"
            >
              🗑️
            </button>
          </div>
        ))}
        <div className="settings-add">
          <h4>Nieuw toevoegen</h4>
          <input
            type="text"
            placeholder="Sleutel"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            className="settings-input"
          />
          <input
            type="text"
            placeholder="Label"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="settings-input"
          />
          <button className="btn-add-setting" onClick={handleAddSwitchAction}>+ Toevoegen</button>
        </div>
      </div>
    )
  }

  function renderDualSenseActionsSection() {
    return (
      <div className="settings-section">
        <h3>DualSense Acties</h3>
        {Object.entries(dualsenseActions).map(([key, value]) => (
          <div key={key} className="settings-item">
            <label>{key}</label>
            <input
              type="text"
              value={value}
              onChange={(e) => handleDualSenseActionChange(key, e.target.value)}
              className="settings-input"
            />
            <button
              className="btn-delete-setting"
              onClick={() => handleDeleteDualSenseAction(key)}
              title="Verwijderen"
            >
              🗑️
            </button>
          </div>
        ))}
        <div className="settings-add">
          <h4>Nieuw toevoegen</h4>
          <input
            type="text"
            placeholder="Sleutel"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            className="settings-input"
          />
          <input
            type="text"
            placeholder="Label"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="settings-input"
          />
          <button className="btn-add-setting" onClick={handleAddDualSenseAction}>+ Toevoegen</button>
        </div>
      </div>
    )
  }

  function renderXboxActionsSection() {
    return (
      <div className="settings-section">
        <h3>Xbox Acties</h3>
        {Object.entries(xboxActions).map(([key, value]) => (
          <div key={key} className="settings-item">
            <label>{key}</label>
            <input
              type="text"
              value={value}
              onChange={(e) => handleXboxActionChange(key, e.target.value)}
              className="settings-input"
            />
            <button
              className="btn-delete-setting"
              onClick={() => handleDeleteXboxAction(key)}
              title="Verwijderen"
            >
              🗑️
            </button>
          </div>
        ))}
        <div className="settings-add">
          <h4>Nieuw toevoegen</h4>
          <input
            type="text"
            placeholder="Sleutel"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            className="settings-input"
          />
          <input
            type="text"
            placeholder="Label"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="settings-input"
          />
          <button className="btn-add-setting" onClick={handleAddXboxAction}>+ Toevoegen</button>
        </div>
      </div>
    )
  }
}
