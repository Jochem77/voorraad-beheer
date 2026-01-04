import React, { useState, useEffect } from 'react'
import type { InventoryItem, ProductType, Condition, Status } from '../types'
import { JOYCON_COLORS, DUALSENSE_COLORS, SWITCH_LITE_COLORS, XBOX_COLORS } from '../types'
import { TextScanner } from './TextScanner'
import './AddItemForm.css'

interface AddItemFormProps {
  onAdd: (item: Omit<InventoryItem, 'id'>) => void
  onClose?: () => void
  nextNumber?: number
  initialType?: ProductType
  onTypeChange?: (type: ProductType) => void
  prefillData?: { serialNumber?: string, color?: string } | null
}

export function AddItemForm({ onAdd, onClose, nextNumber = 1, initialType = 'switch_joycon_left', prefillData }: AddItemFormProps) {
  const [currentTab, setCurrentTab] = useState<'info' | 'aankoop' | 'verkoop' | 'acties' | 'fotos'>('info')
  const [type, setType] = useState<ProductType>(initialType)
  const [kleur, setKleur] = useState('Black')
  const [kleurHex, setKleurHex] = useState(JOYCON_COLORS['Black'])
  const [serienummer, setSerienummer] = useState('')
  const [staat, setStaat] = useState<Condition>('als_nieuw')
  const [status, setStatus] = useState<Status>('nieuw')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [purchaseInvoice, setPurchaseInvoice] = useState('')
  const [source, setSource] = useState('')
  const [sellingPrice, setSellingPrice] = useState('')
  const [sellingDate, setSellingDate] = useState('')
  const [sellingInvoice, setSellingInvoice] = useState('')
  const [buyerName, setBuyerName] = useState('')
  const [notes, setNotes] = useState('')
  const [showTextScanner, setShowTextScanner] = useState(false)

  // Update type when initialType changes
  useEffect(() => {
    setType(initialType)
    // Reset color based on new type (but only if there's no prefill data)
    if (!prefillData?.color) {
      if (initialType === 'switch_joycon_left' || initialType === 'switch_joycon_right') {
        setKleur('Black')
        setKleurHex(JOYCON_COLORS['Black'])
      } else if (initialType === 'ps5_dualsense') {
        setKleur('White')
        setKleurHex(DUALSENSE_COLORS['White'])
      } else if (initialType === 'switch_lite') {
        setKleur('Gray')
        setKleurHex(SWITCH_LITE_COLORS['Gray'])
      } else if (initialType === 'xbox_series') {
        setKleur('White')
        setKleurHex(XBOX_COLORS['White'])
      }
    }
  }, [initialType, prefillData])

  // Prefill data when provided (from Joy-Con scanner)
  useEffect(() => {
    if (prefillData) {
      if (prefillData.serialNumber) {
        setSerienummer(prefillData.serialNumber)
      }
      if (prefillData.color) {
        console.log('Prefill color:', prefillData.color)
        
        // Use setTimeout to ensure this runs after the type effect
        setTimeout(() => {
          // First check if it's a hex color
          const colorEntry = Object.entries(JOYCON_COLORS).find(([_, hex]) => 
            hex.toLowerCase() === prefillData.color?.toLowerCase()
          )
          if (colorEntry) {
            console.log('Found hex match:', colorEntry[0])
            setKleur(colorEntry[0])
            setKleurHex(colorEntry[1])
          } else {
            // Check if it matches a color name in JOYCON_COLORS
            const colorNameEntry = Object.entries(JOYCON_COLORS).find(([name, _]) => 
              name.toLowerCase() === prefillData.color?.toLowerCase()
            )
            if (colorNameEntry) {
              console.log('Found name match in JOYCON_COLORS:', colorNameEntry[0])
              setKleur(colorNameEntry[0])
              setKleurHex(colorNameEntry[1])
            } else {
              // For DualSense and other controllers: use the color name directly
              console.log('Using custom color name:', prefillData.color)
              if (prefillData.color) {
                setKleur(prefillData.color)
              }
              // Try to set a generic hex based on common color names
              const colorToHex: { [key: string]: string } = {
                'wit': '#FFFFFF',
                'white': '#FFFFFF',
                'zwart': '#000000',
                'midnight black': '#1a1a2e',
                'rood': '#DC143C',
                'cosmic red': '#DC143C',
                'roze': '#FF69B4',
                'nova pink': '#FF69B4',
                'paars': '#9932CC',
                'galactic purple': '#9932CC',
                'blauw': '#0066CC',
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
              const lowerColor = (prefillData.color || '').toLowerCase()
              const hexColor = colorToHex[lowerColor] || '#808080'
              console.log('Setting hex color:', hexColor, 'for', lowerColor)
              setKleurHex(hexColor)
            }
          }
        }, 0)
      }
    }
  }, [prefillData])

  const isJoycon = type === 'switch_joycon_left' || type === 'switch_joycon_right'
  const isDualsense = type === 'ps5_dualsense'
  const isSwitchLite = type === 'switch_lite'
  const isXbox = type === 'xbox_series'

  const generateSKU = () => {
    return `SKU-${String(nextNumber).padStart(4, '0')}`
  }

  const handleKleurChange = (newKleur: string) => {
    setKleur(newKleur)
    if (isJoycon && JOYCON_COLORS[newKleur]) {
      setKleurHex(JOYCON_COLORS[newKleur])
    } else if (isDualsense && DUALSENSE_COLORS[newKleur]) {
      setKleurHex(DUALSENSE_COLORS[newKleur])
    } else if (isSwitchLite && SWITCH_LITE_COLORS[newKleur]) {
      setKleurHex(SWITCH_LITE_COLORS[newKleur])
    } else if (isXbox && XBOX_COLORS[newKleur]) {
      setKleurHex(XBOX_COLORS[newKleur])
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!kleur.trim()) {
      alert('Voer een kleur in')
      return
    }

    if (!serienummer.trim()) {
      alert('Voer een serienummer in')
      return
    }

    onAdd({
      sku: generateSKU(),
      type,
      kleur: kleur.trim(),
      kleur_hex: (isJoycon || isDualsense || isSwitchLite || isXbox) ? kleurHex : undefined,
      serienummer: serienummer.trim(),
      staat,
      status,
      purchase_price: purchasePrice ? parseFloat(purchasePrice) : undefined,
      selling_price: sellingPrice ? parseFloat(sellingPrice) : undefined,
      purchase_date: purchaseDate || undefined,
      purchase_invoice: purchaseInvoice.trim() || undefined,
      source: source.trim() || undefined,
      selling_date: sellingDate || undefined,
      selling_invoice: sellingInvoice.trim() || undefined,
      buyer_name: buyerName.trim() || undefined,
      defect_notes: notes.trim() || undefined,
      date_added: new Date().toISOString()
    })
  }

  const getColorOptions = () => {
    if (isJoycon) return Object.keys(JOYCON_COLORS)
    if (isDualsense) return Object.keys(DUALSENSE_COLORS)
    if (isSwitchLite) return Object.keys(SWITCH_LITE_COLORS)
    if (isXbox) return Object.keys(XBOX_COLORS)
    return []
  }

  return (
    <form className="add-item-form" onSubmit={handleSubmit}>
      <div className="form-header">
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
            className={`tab-button ${currentTab === 'aankoop' ? 'active' : ''}`}
            onClick={() => setCurrentTab('aankoop')}
          >
            Aankoop
          </button>
          <button 
            type="button"
            className={`tab-button ${currentTab === 'verkoop' ? 'active' : ''}`}
            onClick={() => setCurrentTab('verkoop')}
          >
            Verkoop
          </button>
          <button 
            type="button"
            className={`tab-button ${currentTab === 'acties' ? 'active' : ''}`}
            onClick={() => setCurrentTab('acties')}
          >
            Acties
          </button>
          <button 
            type="button"
            className={`tab-button ${currentTab === 'fotos' ? 'active' : ''}`}
            onClick={() => setCurrentTab('fotos')}
          >
            Fotos
          </button>
        </div>
      </div>

      <div className="item-details">
        {currentTab === 'info' && (
          <>
            <div className="detail-row">
              <span className="label">Kleur:</span>
              <select
                className="edit-select"
                value={kleur}
                onChange={(e) => handleKleurChange(e.target.value)}
              >
                {getColorOptions().map((colorName) => (
                  <option key={colorName} value={colorName}>
                    {colorName}
                  </option>
                ))}
              </select>
            </div>

            <div className="detail-row">
              <span className="label">Serienummer:</span>
              <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                <input
                  type="text"
                  value={serienummer}
                  onChange={(e) => setSerienummer(e.target.value)}
                  placeholder="bijv. HAC-001"
                  className="edit-input"
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
              <span className="label">Staat:</span>
              <select
                value={staat}
                onChange={(e) => setStaat(e.target.value as Condition)}
                className="edit-select"
              >
                <option value="als_nieuw">Als nieuw</option>
                <option value="licht_gebruikt">Licht gebruikt</option>
                <option value="gebruikt">Gebruikt</option>
                <option value="beschadigd">Beschadigd</option>
              </select>
            </div>

            <div className="detail-row">
              <span className="label">Status:</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Status)}
                className="edit-select"
              >
                <option value="nieuw">Nieuw</option>
                <option value="getest">Getest</option>
                <option value="defect">Defect</option>
                <option value="verkocht">Verkocht</option>
              </select>
            </div>

            <div className="detail-row notes-row">
              <span className="label">Opmerkingen:</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Eventuele notities..."
                rows={3}
                className="edit-notes"
              />
            </div>
          </>
        )}

        {currentTab === 'aankoop' && (
          <>
            <div className="detail-row">
              <span className="label">Aankoopprijs:</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="€"
                className="edit-input"
              />
            </div>

            <div className="detail-row">
              <span className="label">Aankoopdatum:</span>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="edit-input"
              />
            </div>

            <div className="detail-row">
              <span className="label">Factuur:</span>
              <input
                type="text"
                value={purchaseInvoice}
                onChange={(e) => setPurchaseInvoice(e.target.value)}
                placeholder="bijv. FAC-2024-001"
                className="edit-input"
              />
            </div>

            <div className="detail-row">
              <span className="label">Bron:</span>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="bijv. Marktplaats, Retail, etc."
                className="edit-input"
              />
            </div>
          </>
        )}

        {currentTab === 'verkoop' && (
          <>
            <div className="detail-row">
              <span className="label">Verkoopprijs:</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="€"
                className="edit-input"
              />
            </div>

            <div className="detail-row">
              <span className="label">Verkoopsdatum:</span>
              <input
                type="date"
                value={sellingDate}
                onChange={(e) => setSellingDate(e.target.value)}
                className="edit-input"
              />
            </div>

            <div className="detail-row">
              <span className="label">Factuur:</span>
              <input
                type="text"
                value={sellingInvoice}
                onChange={(e) => setSellingInvoice(e.target.value)}
                placeholder="bijv. VK-2024-001"
                className="edit-input"
              />
            </div>

            <div className="detail-row">
              <span className="label">Koper:</span>
              <input
                type="text"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Naam koper"
                className="edit-input"
              />
            </div>
          </>
        )}

        {currentTab === 'fotos' && (
          <div style={{ padding: '1rem', color: '#aaa' }}>
            Foto's kunnen na het toevoegen van het product worden geüpload.
          </div>
        )}

        {currentTab === 'acties' && (
          <div style={{ padding: '1rem', color: '#aaa' }}>
            Acties kunnen na het toevoegen van het product worden toegevoegd.
          </div>
        )}
      </div>

      <div className="form-actions">
        <button type="submit" className="btn-add">
          Toevoegen
        </button>
        {onClose && (
          <button type="button" className="btn-cancel" onClick={onClose}>
            Annuleren
          </button>
        )}
      </div>
    </form>
  )
}
