import { useState, useEffect } from 'react'
import './AddItemForm.css'
import type { RepairItem, ProductType } from '../types'
import { JOYCON_COLORS, PRO_CONTROLLER_COLORS, DUALSENSE_COLORS, SWITCH_LITE_COLORS, XBOX_COLORS } from '../types'
import { TextScanner } from './TextScanner'

interface AddRepairFormProps {
  onAdd: (repair: Omit<RepairItem, 'id' | 'date_added' | 'created_at'>) => void
  onClose: () => void
  initialType?: ProductType
  prefillData?: {
    serialNumber?: string
    color?: string
    controllerType?: string
  } | null
  existingRepair?: RepairItem
}

export function AddRepairForm({ onAdd, onClose, initialType = 'switch_joycon_left', prefillData, existingRepair }: AddRepairFormProps) {
  const [currentTab, setCurrentTab] = useState<'info' | 'reparatie'>('info')
  const [type, setType] = useState<ProductType>(initialType)
  const [colorName, setColorName] = useState('Black')
  const [colorHex, setColorHex] = useState(JOYCON_COLORS.Black)
  const [serienummer, setSerienummer] = useState('')
  const [opmerkingen, setOpmerkingen] = useState('')
  const [repairDate, setRepairDate] = useState('')
  const [repairPrice, setRepairPrice] = useState('')
  const [repairInvoice, setRepairInvoice] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [showTextScanner, setShowTextScanner] = useState(false)

  useEffect(() => {
    setType(initialType)
    
    if (!prefillData?.color) {
      if (initialType === 'switch_joycon_left' || initialType === 'switch_joycon_right') {
        setColorName('Black')
        setColorHex(JOYCON_COLORS.Black)
      } else if (initialType === 'ps5_dualsense') {
        setColorName('White')
        setColorHex(DUALSENSE_COLORS.White)
      } else if (initialType === 'switch_lite') {
        setColorName('Gray')
        setColorHex(SWITCH_LITE_COLORS.Gray)
      } else if (initialType === 'xbox_series') {
        setColorName('White')
        setColorHex(XBOX_COLORS.White)
      }
    }
  }, [initialType, prefillData])

  useEffect(() => {
    if (prefillData) {
      if (prefillData.serialNumber) {
        setSerienummer(prefillData.serialNumber)
      }
      
      if (prefillData.color) {
        console.log('Prefill color:', prefillData.color)
        setTimeout(() => {
          const joyconMatch = Object.entries(JOYCON_COLORS).find(([_name, hex]) => 
            hex.toLowerCase() === prefillData.color?.toLowerCase()
          )
          
          if (joyconMatch) {
            console.log('Found hex match:', joyconMatch[0])
            setColorName(joyconMatch[0])
            setColorHex(joyconMatch[1])
          } else {
            console.log('No hex match, trying name match')
            const colorLower = (prefillData.color || '').toLowerCase()
            const hexColor = JOYCON_COLORS[colorLower as keyof typeof JOYCON_COLORS] ||
                           DUALSENSE_COLORS[colorLower as keyof typeof DUALSENSE_COLORS] ||
                           SWITCH_LITE_COLORS[colorLower as keyof typeof SWITCH_LITE_COLORS] ||
                           XBOX_COLORS[colorLower as keyof typeof XBOX_COLORS]
            
            if (hexColor) {
              setColorName(prefillData.color ?? '')
              setColorHex(hexColor)
            } else {
              const colorMap: Record<string, string> = {
                'white': '#F5F5F5',
                'midnight black': '#0B0B0B',
                'cosmic red': '#E63946',
                'nova pink': '#FF6B9D',
                'galactic purple': '#2D1B69',
                'starlight blue': '#4A90E2',
                'cobalt blue': '#0047AB',
                'grijs': '#808080',
                'grey camouflage': '#6B7280',
                'volcanic red': '#C41E3A',
                'sterling silver': '#C0C0C0',
                'chroma teal': '#008080',
                'chroma indigo': '#4B0082',
                'chroma pearl': '#E6E6FA',
                '30th anniversary': '#4A90E2',
                'god of war ragnarok': '#8B0000',
                'spider-man 2': '#DC143C',
                'astro bot': '#00CED1',
                'fortnite': '#7B68EE',
                'the last of us': '#556B2F'
              }
              
              const mappedColor = colorMap[colorLower] || '#808080'
              console.log('Setting hex color:', mappedColor, 'for', colorLower)
              setColorName(prefillData.color ?? '')
              setColorHex(mappedColor)
            }
          }
        }, 0)
      }
    }
  }, [prefillData])

  // Prefill existing repair data for editing
  useEffect(() => {
    if (existingRepair) {
      setType(existingRepair.type)
      setColorName(existingRepair.kleur)
      if (existingRepair.kleur_hex) {
        setColorHex(existingRepair.kleur_hex)
      }
      setSerienummer(existingRepair.serienummer)
      setOpmerkingen(existingRepair.notes || '')
      setRepairDate(existingRepair.repair_date ? existingRepair.repair_date.split('T')[0] : '')
      setRepairPrice(existingRepair.repair_price ? existingRepair.repair_price.toString() : '')
      setRepairInvoice(existingRepair.repair_invoice || '')
      setCustomerName(existingRepair.customer_name || '')
    }
  }, [existingRepair])

  const isJoycon = type === 'switch_joycon_left' || type === 'switch_joycon_right'
  const isProController = type === 'switch_pro'
  const isDualsense = type === 'ps5_dualsense'
  const isSwitchLite = type === 'switch_lite'
  const isXbox = type === 'xbox_series'

  const handleColorChange = (color: string) => {
    setColorName(color)
    if (isJoycon && JOYCON_COLORS[color as keyof typeof JOYCON_COLORS]) {
      setColorHex(JOYCON_COLORS[color as keyof typeof JOYCON_COLORS])
    } else if (isProController && PRO_CONTROLLER_COLORS[color as keyof typeof PRO_CONTROLLER_COLORS]) {
      setColorHex(PRO_CONTROLLER_COLORS[color as keyof typeof PRO_CONTROLLER_COLORS])
    } else if (isDualsense && DUALSENSE_COLORS[color as keyof typeof DUALSENSE_COLORS]) {
      setColorHex(DUALSENSE_COLORS[color as keyof typeof DUALSENSE_COLORS])
    } else if (isSwitchLite && SWITCH_LITE_COLORS[color as keyof typeof SWITCH_LITE_COLORS]) {
      setColorHex(SWITCH_LITE_COLORS[color as keyof typeof SWITCH_LITE_COLORS])
    } else if (isXbox && XBOX_COLORS[color as keyof typeof XBOX_COLORS]) {
      setColorHex(XBOX_COLORS[color as keyof typeof XBOX_COLORS])
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!colorName.trim()) {
      alert('Voer een kleur in')
      return
    }

    if (!serienummer.trim()) {
      alert('Voer een serienummer in')
      return
    }

    onAdd({
      type,
      kleur: colorName.trim(),
      kleur_hex: (isJoycon || isProController || isDualsense || isSwitchLite || isXbox) ? colorHex : undefined,
      serienummer: serienummer.trim(),
      repair_date: repairDate || undefined,
      repair_price: repairPrice ? parseFloat(repairPrice) : undefined,
      repair_invoice: repairInvoice.trim() || undefined,
      customer_name: customerName.trim() || undefined,
      notes: opmerkingen.trim() || undefined,
      photo_urls: []
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="item-card">
        <div className="item-header">
          <div className="modal-tabs">
            <button 
              type="button"
              className={`tab-button ${currentTab === 'info' ? 'active' : ''}`}
              onClick={() => setCurrentTab('info')}
            >
              Info
            </button>
            <button 
              type="button"
              className={`tab-button ${currentTab === 'reparatie' ? 'active' : ''}`}
              onClick={() => setCurrentTab('reparatie')}
            >
              Reparatie
            </button>
          </div>
        </div>

        <div className="item-details">
          {currentTab === 'info' && (
            <>
              <div className="detail-row">
                <span className="label">Kleur:</span>
                <span className="label">Kleur:</span>
                {isJoycon ? (
                  <select 
                    value={colorName} 
                    onChange={(e) => handleColorChange(e.target.value)}
                    className="edit-select"
                  >
                    {Object.keys(JOYCON_COLORS).map(color => (
                      <option key={color} value={color}>{color}</option>
                    ))}
                  </select>
                ) : isProController ? (
                  <select 
                    value={colorName} 
                    onChange={(e) => handleColorChange(e.target.value)}
                    className="edit-select"
                  >
                    {Object.keys(PRO_CONTROLLER_COLORS).map(color => (
                      <option key={color} value={color}>{color}</option>
                    ))}
                  </select>
                ) : isDualsense ? (
                  <select 
                    value={colorName} 
                    onChange={(e) => handleColorChange(e.target.value)}
                    className="edit-select"
                  >
                    {Object.keys(DUALSENSE_COLORS).map(color => (
                      <option key={color} value={color}>{color}</option>
                    ))}
                  </select>
                ) : isSwitchLite ? (
                  <select 
                    value={colorName} 
                    onChange={(e) => handleColorChange(e.target.value)}
                    className="edit-select"
                  >
                    {Object.keys(SWITCH_LITE_COLORS).map(color => (
                      <option key={color} value={color}>{color}</option>
                    ))}
                  </select>
                ) : isXbox ? (
                  <select 
                    value={colorName} 
                    onChange={(e) => handleColorChange(e.target.value)}
                    className="edit-select"
                  >
                    {Object.keys(XBOX_COLORS).map(color => (
                      <option key={color} value={color}>{color}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={colorName}
                    onChange={(e) => setColorName(e.target.value)}
                    className="edit-input"
                    placeholder="Bijv. Gray, Red, etc."
                  />
                )}
              </div>
              {(isJoycon || isProController || isDualsense || isSwitchLite || isXbox) && (
                <div className="detail-row">
                  <span className="label"></span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div 
                      style={{ 
                        width: '30px', 
                        height: '30px', 
                        backgroundColor: colorHex,
                        border: '2px solid #333',
                        borderRadius: '4px'
                      }}
                    />
                    <span style={{ fontSize: '0.9em', color: '#666' }}>{colorHex}</span>
                  </div>
                </div>
              )}

              <div className="detail-row">
                <span className="label">Serienummer:</span>
                <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                  <input
                    type="text"
                    value={serienummer}
                    onChange={(e) => setSerienummer(e.target.value)}
                    className="edit-input"
                    placeholder="bijv. HAC-001"
                    style={{ flex: 1 }}
                  />
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setShowTextScanner(true)
                    }}
                    style={{
                      padding: '0.5rem 0.75rem',
                      backgroundColor: '#667eea',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '1.2rem'
                    }}
                    title="Scan serienummer met camera"
                  >
                    📷
                  </button>
                </div>
              </div>

              <TextScanner
                isOpen={showTextScanner}
                onClose={() => setShowTextScanner(false)}
                onScan={(text) => {
                  setSerienummer(text)
                  console.log('Serial number scanned:', text)
                }}
              />

              <div className="detail-row">
                <span className="label">Opmerkingen:</span>
                <textarea
                  value={opmerkingen}
                  onChange={(e) => setOpmerkingen(e.target.value)}
                  className="edit-input"
                  placeholder="Bijv. drift probleem, scherm defect, etc."
                  rows={4}
                />
              </div>
            </>
          )}

          {currentTab === 'reparatie' && (
            <>
              <div className="detail-row">
                <span className="label">Klant naam:</span>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="edit-input"
                  placeholder="Naam van de klant"
                />
              </div>

              <div className="detail-row">
                <span className="label">Reparatie datum:</span>
                <input
                  type="date"
                  value={repairDate}
                  onChange={(e) => setRepairDate(e.target.value)}
                  className="edit-input"
                />
              </div>

              <div className="detail-row">
                <span className="label">Reparatie prijs (€):</span>
                <input
                  type="number"
                  step="0.01"
                  value={repairPrice}
                  onChange={(e) => setRepairPrice(e.target.value)}
                  className="edit-input"
                  placeholder="0.00"
                />
              </div>

              <div className="detail-row">
                <span className="label">Factuur nummer:</span>
                <input
                  type="text"
                  value={repairInvoice}
                  onChange={(e) => setRepairInvoice(e.target.value)}
                  className="edit-input"
                  placeholder="Bijv. REP-2024-001"
                />
              </div>
            </>
          )}
        </div>

        <div className="item-actions">
          <button type="button" className="btn-cancel" onClick={onClose}>
            Annuleren
          </button>
          <button type="submit" className="btn-save">
            Toevoegen
          </button>
        </div>
      </div>
    </form>
  )
}
