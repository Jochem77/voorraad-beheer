import { useState } from 'react'
import type { InventoryItem, Condition, Status } from '../types'
import { PRODUCT_LABELS, CONDITION_LABELS, STATUS_LABELS } from '../types'
import './InventoryListView.css'

interface InventoryListViewProps {
  items: InventoryItem[]
  onDelete: (id: number) => void
  onUpdate: (id: number, updated: Partial<InventoryItem>) => void
  onEditCard: (item: InventoryItem) => void
  totalItems: number
  onFilterClick?: () => void
  onAddClick?: () => void
  onSettingsClick?: () => void
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

export function InventoryListView({ items, onDelete, onUpdate, onEditCard, totalItems, onFilterClick, onAddClick, onSettingsClick }: InventoryListViewProps) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editKleur, setEditKleur] = useState('')
  const [editSerienummer, setEditSerienummer] = useState('')

  const saveEdit = (id: number) => {
    onUpdate(id, {
      kleur: editKleur.trim(),
      serienummer: editSerienummer.trim()
    })
    setEditingId(null)
  }

  if (totalItems === 0) {
    return (
      <div className="inventory-list-view">
        <div className="list-header">
          <div className="list-title">
            <h2>Voorraadlijst</h2>
            <p className="list-count">Aantal: 0</p>
          </div>
          <div className="list-actions-buttons">
            {onFilterClick && (
              <button className="btn-filter-small" onClick={onFilterClick}>
                🔍 Filter
              </button>
            )}
            {onAddClick && (
              <button className="btn-add-small" onClick={onAddClick}>
                + Toevoegen
              </button>
            )}
            {onSettingsClick && (
              <button className="btn-settings-small" onClick={onSettingsClick} title="Instellingen">
                ⚙️
              </button>
            )}
          </div>
        </div>
        <div className="empty-state">
          <p>Geen producten toegevoegd</p>
          <p className="text-muted">Voeg uw eerste product toe om te beginnen</p>
        </div>
      </div>
    )
  }

  return (
    <div className="inventory-list-view">
      <div className="list-header">
        <div className="list-title">
          <h2>Voorraadlijst</h2>
          <p className="list-count">Aantal: {items.length}{items.length !== totalItems ? ` / ${totalItems}` : ''}</p>
        </div>
        <div className="list-actions-buttons">
          {onFilterClick && (
            <button className="btn-filter-small" onClick={onFilterClick}>
              🔍 Filter
            </button>
          )}
          {onAddClick && (
            <button className="btn-add-small" onClick={onAddClick}>
              + Toevoegen
            </button>
          )}
          {onSettingsClick && (
            <button className="btn-settings-small" onClick={onSettingsClick} title="Instellingen">
              ⚙️
            </button>
          )}
        </div>
      </div>
      <div className="table-wrapper">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Type</th>
              <th>Kleur</th>
              <th>Serienummer</th>
              <th>Staat</th>
              <th>Status</th>
              <th>Toegevoegd</th>
              <th>Acties</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr 
                key={item.id} 
                className="table-row"
                onDoubleClick={() => onEditCard(item)}
              >
                <td className="sku-cell">
                  <code>{item.sku}</code>
                </td>
                <td className="type-cell">
                  <div className="type-with-color">
                    {PRODUCT_LABELS[item.type]}
                  </div>
                </td>
                <td>
                  {editingId === item.id ? (
                    <input
                      type="text"
                      value={editKleur}
                      onChange={(e) => setEditKleur(e.target.value)}
                      className="edit-input-table"
                    />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {item.kleur_hex && (
                        <div 
                          style={{
                            width: '14px',
                            height: '14px',
                            backgroundColor: item.kleur_hex,
                            borderRadius: '2px',
                            border: '1px solid #999'
                          }}
                          title={item.kleur_hex}
                        />
                      )}
                      <span>{item.kleur}</span>
                    </div>
                  )}
                </td>
                <td>
                  {editingId === item.id ? (
                    <input
                      type="text"
                      value={editSerienummer}
                      onChange={(e) => setEditSerienummer(e.target.value)}
                      className="edit-input-table"
                    />
                  ) : (
                    <code>{item.serienummer}</code>
                  )}
                </td>
                <td>
                  {editingId === item.id ? (
                    <select
                      value={item.staat}
                      onChange={(e) =>
                        onUpdate(item.id, {
                          staat: e.target.value as Condition
                        })
                      }
                      className="edit-select-table"
                    >
                      <option value="als_nieuw">Als nieuw</option>
                      <option value="licht_gebruikt">Licht gebruikt</option>
                      <option value="gebruikt">Gebruikt</option>
                      <option value="beschadigd">Beschadigd</option>
                    </select>
                  ) : (
                    <span 
                      className="badge"
                      style={{ backgroundColor: conditionColors[item.staat] }}
                    >
                      {CONDITION_LABELS[item.staat]}
                    </span>
                  )}
                </td>
                <td>
                  {editingId === item.id ? (
                    <select
                      value={item.status}
                      onChange={(e) =>
                        onUpdate(item.id, {
                          status: e.target.value as Status
                        })
                      }
                      className="edit-select-table"
                    >
                      <option value="nieuw">Nieuw</option>
                      <option value="getest">Getest</option>
                      <option value="defect">Defect</option>
                      <option value="verkocht">Verkocht</option>
                    </select>
                  ) : (
                    <span 
                      className="badge"
                      style={{ backgroundColor: statusColors[item.status] }}
                    >
                      {STATUS_LABELS[item.status]}
                    </span>
                  )}
                </td>
                <td className="date-cell">
                  {item.created_at 
                    ? new Date(item.created_at).toLocaleDateString('nl-NL')
                    : item.date_added 
                    ? new Date(item.date_added).toLocaleDateString('nl-NL')
                    : '-'
                  }
                </td>
                <td className="actions-cell">
                  {editingId === item.id ? (
                    <>
                      <button
                        onClick={() => saveEdit(item.id)}
                        className="btn-action btn-save"
                        title="Opslaan"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="btn-action btn-cancel"
                        title="Annuleren"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => onEditCard(item)}
                        className="btn-action btn-edit"
                        title="Kaartweergave"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Zeker dit product verwijderen?')) {
                            onDelete(item.id)
                          }
                        }}
                        className="btn-action btn-delete"
                        title="Verwijderen"
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
