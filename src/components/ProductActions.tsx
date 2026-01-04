import { useState, useEffect } from 'react'
import type { InventoryItem, RepairItem, ActionRecord, JoyConAction, SwitchAction, DualSenseAction, XboxAction, Action } from '../types'
import { JOYCON_ACTIONS, SWITCH_ACTIONS, DUALSENSE_ACTIONS, XBOX_ACTIONS } from '../types'
import { settingsService } from '../lib/settingsService'
import './ProductActions.css'

interface ProductActionsProps {
  item: InventoryItem | RepairItem
  actions: ActionRecord[]
  onAddAction: (itemId: number, action: Action, otherAction?: string) => Promise<void>
  onDeleteAction: (actionId: number) => Promise<void>
}

export function ProductActions({
  item,
  actions,
  onAddAction,
  onDeleteAction
}: ProductActionsProps) {
  const [selectedAction, setSelectedAction] = useState<Action | ''>('')
  const [otherActionText, setOtherActionText] = useState('')
  const [isAddingAction, setIsAddingAction] = useState(false)
  const [joyconActions, setJoyconActions] = useState<Record<string, string>>(JOYCON_ACTIONS)
  const [switchActions, setSwitchActions] = useState<Record<string, string>>(SWITCH_ACTIONS)
  const [dualsenseActions, setDualsenseActions] = useState<Record<string, string>>(DUALSENSE_ACTIONS)
  const [xboxActions, setXboxActions] = useState<Record<string, string>>(XBOX_ACTIONS)

  useEffect(() => {
    loadActionsFromSettings()
  }, [])

  const loadActionsFromSettings = async () => {
    try {
      const [jc, sw, ds, xb] = await Promise.all([
        settingsService.getJoyconActions(),
        settingsService.getSwitchActions(),
        settingsService.getDualSenseActions(),
        settingsService.getXboxActions()
      ])
      setJoyconActions(jc)
      setSwitchActions(sw)
      setDualsenseActions(ds)
      setXboxActions(xb)
    } catch (error) {
      console.error('Error loading actions from settings:', error)
    }
  }

  const isJoycon = item.type === 'switch_joycon_left' || item.type === 'switch_joycon_right'
  const isSwitch = item.type === 'switch_regular' || item.type === 'switch_oled' || item.type === 'switch_lite'
  const isDualSense = item.type === 'ps5_dualsense'
  const isXbox = item.type === 'xbox_series'
  const showActions = isJoycon || isSwitch || isDualSense || isXbox

  const handleAddAction = async () => {
    if (!selectedAction) {
      alert('Selecteer een actie')
      return
    }
    if (selectedAction === 'other' && !otherActionText.trim()) {
      alert('Voer een beschrijving in voor "Overig"')
      return
    }
    try {
      await onAddAction(item.id, selectedAction as Action, selectedAction === 'other' ? otherActionText : undefined)
      setSelectedAction('')
      setOtherActionText('')
      setIsAddingAction(false)
    } catch (error) {
      console.error('Error adding action:', error)
    }
  }

  const getActionsList = () => {
    // Get unique actions for this product type from the database
    const itemActions = actions.filter(a => a.item_id === item.id)
    const usedActions = new Set(itemActions.map(a => a.action))
    
    let baseActions: Array<[string, string]> = []
    
    if (isJoycon) baseActions = Object.entries(joyconActions)
    else if (isSwitch) baseActions = Object.entries(switchActions)
    else if (isDualSense) baseActions = Object.entries(dualsenseActions)
    else if (isXbox) baseActions = Object.entries(xboxActions)
    
    // Always include unused actions plus 'other'
    return baseActions.filter(([key]) => !usedActions.has(key as Action)).concat([['other', 'Overig']])
  }

  const getActionLabel = (action: Action, otherText?: string) => {
    if (action === 'other' && otherText) return otherText
    if (isJoycon && action in joyconActions) {
      return joyconActions[action as JoyConAction]
    }
    if (isSwitch && action in switchActions) {
      return switchActions[action as SwitchAction]
    }
    if (isDualSense && action in dualsenseActions) {
      return dualsenseActions[action as DualSenseAction]
    }
    if (isXbox && action in xboxActions) {
      return xboxActions[action as XboxAction]
    }
    return action
  }

  return (
    <div className="product-actions">
      {/* Acties sectie - zichtbaar voor Joy-Con en Switch producten */}
      {showActions && (
        <div className="actions-section">
          <h4>Ondernomen acties</h4>

          {!isAddingAction ? (
            <button 
              className="btn-add-action"
              onClick={() => setIsAddingAction(true)}
            >
              + Actie toevoegen
            </button>
          ) : (
            <div className="add-action-form">
              <select
                value={selectedAction}
                onChange={(e) => {
                  setSelectedAction(e.target.value as Action | '')
                  if (e.target.value !== 'other') {
                    setOtherActionText('')
                  }
                }}
                className="action-select"
              >
                <option value="">Selecteer actie...</option>
                {getActionsList().map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              {selectedAction === 'other' && (
                <input
                  type="text"
                  value={otherActionText}
                  onChange={(e) => setOtherActionText(e.target.value)}
                  className="other-action-input"
                  placeholder="Beschrijf de overige actie..."
                />
              )}
              <button 
                className="btn-confirm"
                onClick={handleAddAction}
              >
                ✓ Toevoegen
              </button>
              <button 
                className="btn-cancel-action"
                onClick={() => {
                  setIsAddingAction(false)
                  setSelectedAction('')
                  setOtherActionText('')
                }}
              >
                ✕ Annuleren
              </button>
            </div>
          )}

          {actions.length > 0 && (
            <div className="actions-list">
              {actions.map((action) => (
                <div key={action.id} className="action-item">
                  <div className="action-content">
                    <span className="action-date">
                      {new Date(action.date_added).toLocaleDateString('nl-NL')}
                    </span>
                    <span className="action-name">
                      {getActionLabel(action.action, action.other_action)}
                    </span>
                  </div>
                  <button
                    className="btn-delete-action"
                    onClick={() => onDeleteAction(action.id)}
                    title="Verwijderen"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
          {actions.length === 0 && (
            <p className="text-muted">Geen acties geregistreerd</p>
          )}
        </div>
      )}
    </div>
  )
}
