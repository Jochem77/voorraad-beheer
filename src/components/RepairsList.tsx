import { useState } from 'react'
import './InventoryList.css'
import './InventoryListView.css'
import type { RepairItem } from '../types'
import { PRODUCT_LABELS } from '../types'

interface RepairsListProps {
  repairs: RepairItem[]
  onItemClick: (repair: RepairItem) => void
  onAddClick: () => void
}

export function RepairsList({ repairs, onItemClick, onAddClick }: RepairsListProps) {
  const [sortField, setSortField] = useState<keyof RepairItem>('date_added')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const handleSort = (field: keyof RepairItem) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedRepairs = [...repairs].sort((a, b) => {
    let aValue = a[sortField]
    let bValue = b[sortField]

    if (aValue === undefined || aValue === null) return 1
    if (bValue === undefined || bValue === null) return -1

    if (typeof aValue === 'string') aValue = aValue.toLowerCase()
    if (typeof bValue === 'string') bValue = bValue.toLowerCase()

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const formatPrice = (price?: number) => {
    if (price === undefined || price === null) return '-'
    return `€${price.toFixed(2)}`
  }

  return (
    <div className="inventory-list-view">
      <div className="list-header">
        <div className="list-title">
          <h2>Reparatielijst</h2>
          <p className="list-count">Aantal: {repairs.length}</p>
        </div>
        <div className="list-actions-buttons">
          <button className="btn-add-small" onClick={onAddClick}>
            + Toevoegen
          </button>
        </div>
      </div>

      {repairs.length === 0 ? (
        <div className="empty-state">
          <p>Geen reparaties gevonden</p>
          <p className="text-muted">Gebruik de scanner of klik op + Toevoegen om een reparatie toe te voegen</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="inventory-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('type')}>
                  Type {sortField === 'type' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('kleur')}>
                  Kleur {sortField === 'kleur' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('serienummer')}>
                  Serienummer {sortField === 'serienummer' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('customer_name')}>
                  Klant {sortField === 'customer_name' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('notes')}>
                  Opmerkingen
                </th>
                <th onClick={() => handleSort('repair_date')}>
                  Reparatie Datum {sortField === 'repair_date' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('repair_price')}>
                  Prijs {sortField === 'repair_price' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('date_added')}>
                  Toegevoegd {sortField === 'date_added' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedRepairs.map((repair) => (
                <tr key={repair.id} onDoubleClick={() => onItemClick(repair)} className="clickable-row">
                  <td>{PRODUCT_LABELS[repair.type]}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {repair.kleur_hex && (
                        <div 
                          style={{ 
                            width: '20px', 
                            height: '20px', 
                            backgroundColor: repair.kleur_hex,
                            border: '1px solid #333',
                            borderRadius: '3px'
                          }}
                        />
                      )}
                      {repair.kleur}
                    </div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>
                    {repair.serienummer}
                  </td>
                  <td>{repair.customer_name || '-'}</td>
                  <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {repair.notes || '-'}
                  </td>
                  <td>{formatDate(repair.repair_date)}</td>
                  <td style={{ fontWeight: 'bold' }}>{formatPrice(repair.repair_price)}</td>
                  <td>{formatDate(repair.date_added)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
