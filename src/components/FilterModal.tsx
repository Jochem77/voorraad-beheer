import { useState } from 'react'
import './FilterModal.css'
import { ProductType, Condition, Status } from '../types'
import { PRODUCT_LABELS, CONDITION_LABELS, STATUS_LABELS } from '../types'

export interface FilterState {
  types: ProductType[]
  conditions: Condition[]
  statuses: Status[]
  dateFrom?: string
  dateTo?: string
  skuSearch: string
  serienummerSearch: string
}

interface FilterModalProps {
  isOpen: boolean
  onClose: () => void
  onApply: (filters: FilterState) => void
  currentFilters: FilterState
}

const allProductTypes: ProductType[] = [
  'switch_joycon_left',
  'switch_joycon_right',
  'switch_pro',
  'ps5_dualsense',
  'switch_regular',
  'switch_oled',
  'switch_lite',
  'xbox_series'
]

const allConditions: Condition[] = ['als_nieuw', 'licht_gebruikt', 'gebruikt', 'beschadigd']
const allStatuses: Status[] = ['nieuw', 'getest', 'defect', 'verkocht']

export function FilterModal({ isOpen, onClose, onApply, currentFilters }: FilterModalProps) {
  const [filters, setFilters] = useState<FilterState>(currentFilters)

  if (!isOpen) return null

  const handleTypeToggle = (type: ProductType) => {
    setFilters(prev => ({
      ...prev,
      types: prev.types.includes(type)
        ? prev.types.filter(t => t !== type)
        : [...prev.types, type]
    }))
  }

  const handleConditionToggle = (condition: Condition) => {
    setFilters(prev => ({
      ...prev,
      conditions: prev.conditions.includes(condition)
        ? prev.conditions.filter(c => c !== condition)
        : [...prev.conditions, condition]
    }))
  }

  const handleStatusToggle = (status: Status) => {
    setFilters(prev => ({
      ...prev,
      statuses: prev.statuses.includes(status)
        ? prev.statuses.filter(s => s !== status)
        : [...prev.statuses, status]
    }))
  }

  const handleApply = () => {
    onApply(filters)
    onClose()
  }

  const handleReset = () => {
    setFilters({
      types: allProductTypes,
      conditions: allConditions,
      statuses: allStatuses,
      dateFrom: undefined,
      dateTo: undefined,
      skuSearch: '',
      serienummerSearch: ''
    })
  }

  const toggleAllTypes = () => {
    if (filters.types.length === allProductTypes.length) {
      setFilters(prev => ({ ...prev, types: [] }))
    } else {
      setFilters(prev => ({ ...prev, types: [...allProductTypes] }))
    }
  }

  const toggleAllConditions = () => {
    if (filters.conditions.length === allConditions.length) {
      setFilters(prev => ({ ...prev, conditions: [] }))
    } else {
      setFilters(prev => ({ ...prev, conditions: [...allConditions] }))
    }
  }

  const toggleAllStatuses = () => {
    if (filters.statuses.length === allStatuses.length) {
      setFilters(prev => ({ ...prev, statuses: [] }))
    } else {
      setFilters(prev => ({ ...prev, statuses: [...allStatuses] }))
    }
  }

  return (
    <div className="filter-overlay" onClick={onClose}>
      <div className="filter-modal" onClick={(e) => e.stopPropagation()}>
        <div className="filter-header">
          <h2>Filter producten</h2>
          <button className="btn-close-filter" onClick={onClose}>✕</button>
        </div>

        <div className="filter-content">
          {/* Product types */}
          <div className="filter-section">
            <div className="filter-section-header">
              <label className="checkbox-label checkbox-header">
                <input
                  type="checkbox"
                  checked={filters.types.length === allProductTypes.length}
                  onChange={toggleAllTypes}
                />
                <h3>Producttype</h3>
              </label>
            </div>
            <div className="checkbox-group">
              {allProductTypes.map(type => (
                <label key={type} className="checkbox-label checkbox-sub">
                  <input
                    type="checkbox"
                    checked={filters.types.includes(type)}
                    onChange={() => handleTypeToggle(type)}
                  />
                  {PRODUCT_LABELS[type]}
                </label>
              ))}
            </div>
          </div>

          {/* Conditions */}
          <div className="filter-section">
            <div className="filter-section-header">
              <label className="checkbox-label checkbox-header">
                <input
                  type="checkbox"
                  checked={filters.conditions.length === allConditions.length}
                  onChange={toggleAllConditions}
                />
                <h3>Staat</h3>
              </label>
            </div>
            <div className="checkbox-group">
              {allConditions.map(condition => (
                <label key={condition} className="checkbox-label checkbox-sub">
                  <input
                    type="checkbox"
                    checked={filters.conditions.includes(condition)}
                    onChange={() => handleConditionToggle(condition)}
                  />
                  {CONDITION_LABELS[condition]}
                </label>
              ))}
            </div>
          </div>

          {/* Statuses */}
          <div className="filter-section">
            <div className="filter-section-header">
              <label className="checkbox-label checkbox-header">
                <input
                  type="checkbox"
                  checked={filters.statuses.length === allStatuses.length}
                  onChange={toggleAllStatuses}
                />
                <h3>Status</h3>
              </label>
            </div>
            <div className="checkbox-group">
              {allStatuses.map(status => (
                <label key={status} className="checkbox-label checkbox-sub">
                  <input
                    type="checkbox"
                    checked={filters.statuses.includes(status)}
                    onChange={() => handleStatusToggle(status)}
                  />
                  {STATUS_LABELS[status]}
                </label>
              ))}
            </div>
          </div>

          {/* Search field */}
          <div className="filter-section">
            <h3>Zoeken</h3>
            <div className="filter-group">
              <label>Serienummer</label>
              <input
                type="text"
                value={filters.serienummerSearch}
                onChange={(e) => setFilters({...filters, serienummerSearch: e.target.value})}
                placeholder="Serienummer zoeken..."
                className="filter-input"
              />
            </div>
          </div>

          {/* Date range */}
          <div className="filter-section">
            <h3>Datum toegevoegd</h3>
            <div className="filter-group">
              <label>Van</label>
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => setFilters({...filters, dateFrom: e.target.value || undefined})}
                className="filter-input"
              />
            </div>
            <div className="filter-group">
              <label>Tot</label>
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => setFilters({...filters, dateTo: e.target.value || undefined})}
                className="filter-input"
              />
            </div>
          </div>
        </div>

        <div className="filter-actions">
          <button onClick={handleReset} className="btn-reset">
            Reset
          </button>
          <button onClick={handleApply} className="btn-apply">
            Filters toepassen
          </button>
        </div>
      </div>
    </div>
  )
}
