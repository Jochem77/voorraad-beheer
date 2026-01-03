import { useState } from 'react'
import type { InventoryItem, Condition, Status, ActionRecord, Action } from '../types'
import { PRODUCT_LABELS, CONDITION_LABELS, STATUS_LABELS } from '../types'
import { ProductActions } from './ProductActions'
import './InventoryList.css'

interface InventoryListProps {
  items: InventoryItem[]
  actions: ActionRecord[]
  onDelete: (id: number) => void
  onUpdate: (id: number, updated: Partial<InventoryItem>) => void
  onAddAction: (itemId: number, action: Action, otherAction?: string) => Promise<void>
  onDeleteAction: (actionId: number) => Promise<void>
  totalItems: number
}

const statusColors: Record<Status, string> = {
  'nieuw': '#f59e0b',
  'getest': '#10b981',
  'defect': '#ef4444',
  'verkocht': '#3b82f6'
}

const conditionColors: Record<Condition, string> = {
  'als_nieuw': '#10b981',
  'licht_gebruikt': '#84cc16',
  'gebruikt': '#f59e0b',
  'beschadigd': '#ef4444'
}

export function InventoryList({ items, actions, onDelete, onUpdate, onAddAction, onDeleteAction, totalItems }: InventoryListProps) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editKleur, setEditKleur] = useState('')
  const [editSerienummer, setEditSerienummer] = useState('')

  const startEdit = (item: InventoryItem) => {
    setEditingId(item.id)
    setEditKleur(item.kleur)
    setEditSerienummer(item.serienummer)
  }

  const saveEdit = (id: number) => {
    onUpdate(id, {
      kleur: editKleur.trim(),
      serienummer: editSerienummer.trim()
    })
    setEditingId(null)
  }

  if (totalItems === 0) {
    return (
      <div className="empty-state">
        <p>Geen producten toegevoegd</p>
        <p className="text-muted">Voeg uw eerste product toe om te beginnen</p>
      </div>
    )
  }

  return (
    <div className="inventory-list">
      <h2>Voorraad ({items.length}{items.length !== totalItems ? ` / ${totalItems}` : ''})</h2>
      {items.length === 0 && totalItems > 0 && (
        <p className="text-muted">Geen resultaten voor uw zoekopdracht</p>
      )}
      <div className="items-grid">
        {items.map((item) => (
          <div key={item.id} className="item-card">
            <div className="item-header">
              <div className="item-type-label">
                {PRODUCT_LABELS[item.type]}
              </div>
              <span 
                className="status-badge" 
                style={{ backgroundColor: statusColors[item.status] }}
              >
                {STATUS_LABELS[item.status]}
              </span>
            </div>

            <div className="item-details">
              <div className="detail-row">
                <span className="label">Kleur:</span>
                {editingId === item.id ? (
                  <input
                    type="text"
                    value={editKleur}
                    onChange={(e) => setEditKleur(e.target.value)}
                    className="edit-input"
                  />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {item.kleur_hex && (
                      <div 
                        style={{
                          width: '16px',
                          height: '16px',
                          backgroundColor: item.kleur_hex,
                          borderRadius: '3px',
                          border: '1px solid #999'
                        }}
                        title={item.kleur_hex}
                      />
                    )}
                    <span className="value">{item.kleur}</span>
                  </div>
                )}
              </div>

              <div className="detail-row">
                <span className="label">Serienummer:</span>
                {editingId === item.id ? (
                  <input
                    type="text"
                    value={editSerienummer}
                    onChange={(e) => setEditSerienummer(e.target.value)}
                    className="edit-input"
                  />
                ) : (
                  <span className="value">{item.serienummer}</span>
                )}
              </div>

              <div className="detail-row">
                <span className="label">Staat:</span>
                {editingId === item.id ? (
                  <select
                    value={item.staat}
                    onChange={(e) =>
                      onUpdate(item.id, {
                        staat: e.target.value as Condition
                      })
                    }
                    className="edit-select"
                  >
                    <option value="als_nieuw">Als nieuw</option>
                    <option value="licht_gebruikt">Licht gebruikt</option>
                    <option value="gebruikt">Gebruikt</option>
                    <option value="beschadigd">Beschadigd</option>
                  </select>
                ) : (
                  <span 
                    className="condition-badge"
                    style={{ backgroundColor: conditionColors[item.staat] }}
                  >
                    {CONDITION_LABELS[item.staat]}
                  </span>
                )}
              </div>

              <div className="detail-row">
                <span className="label">Status:</span>
                <select
                  value={item.status}
                  onChange={(e) =>
                    onUpdate(item.id, {
                      status: e.target.value as Status
                    })
                  }
                  className="status-select"
                >
                  <option value="nieuw">Nieuw</option>
                  <option value="getest">Getest</option>
                  <option value="defect">Defect</option>
                  <option value="verkocht">Verkocht</option>
                </select>
              </div>

              <div className="detail-row">
                <span className="label">Toegevoegd:</span>
                <span className="date">
                  {item.created_at 
                    ? new Date(item.created_at).toLocaleDateString('nl-NL')
                    : item.date_added 
                    ? new Date(item.date_added).toLocaleDateString('nl-NL')
                    : '-'
                  }
                </span>
              </div>
            </div>

            <div className="item-actions">
              {editingId === item.id ? (
                <>
                  <button
                    onClick={() => saveEdit(item.id)}
                    className="btn-save"
                  >
                    Opslaan
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="btn-cancel"
                  >
                    Annuleren
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => startEdit(item)}
                    className="btn-edit"
                  >
                    Bewerken
                  </button>
                  <button
                    onClick={() => onDelete(item.id)}
                    className="btn-delete"
                  >
                    Verwijderen
                  </button>
                </>
              )}
            </div>

            <ProductActions
              item={item}
              actions={actions.filter(a => a.item_id === item.id)}
              onAddAction={onAddAction}
              onDeleteAction={onDeleteAction}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
