import { useState, useMemo, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import './App.css'
import { Header } from './components/Header'
import { InventoryListView } from './components/InventoryListView'
import { AddItemForm } from './components/AddItemForm'
import { ProductActions } from './components/ProductActions'
import { Settings } from './components/Settings'
import { FilterModal, FilterState } from './components/FilterModal'
import { Login } from './components/Login'
import { BleScanner } from './components/BleScanner'
import { supabase } from './lib/supabase'
import type { InventoryItem, ProductType, ActionRecord, Action } from './types'
import { PRODUCT_LABELS, CONDITION_LABELS, STATUS_LABELS, JOYCON_COLORS, DUALSENSE_COLORS, SWITCH_LITE_COLORS, XBOX_COLORS } from './types'

function App() {
  const [user, setUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [items, setItems] = useState<InventoryItem[]>([])
  const [actions, setActions] = useState<ActionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState<'inventory' | 'scanner'>('inventory')
  const [showAddModal, setShowAddModal] = useState(false)
  const [addItemType, setAddItemType] = useState<ProductType>('switch_joycon_left')
  const [showSettings, setShowSettings] = useState(false)
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [selectedItemModal, setSelectedItemModal] = useState<InventoryItem | null>(null)
  const [selectedItemTab, setSelectedItemTab] = useState<'info' | 'aankoop' | 'verkoop' | 'acties' | 'fotos'>('info')
  const [expandedPhotoUrl, setExpandedPhotoUrl] = useState<string | null>(null)
  const [photoZoom, setPhotoZoom] = useState(1)
  const [editingModalId, setEditingModalId] = useState(false)
  const [editModalKleur, setEditModalKleur] = useState('')
  const [editModalSerienummer, setEditModalSerienummer] = useState('')
  const [editModalStaat, setEditModalStaat] = useState<'als_nieuw' | 'licht_gebruikt' | 'gebruikt' | 'beschadigd'>('als_nieuw')
  const [editModalStatus, setEditModalStatus] = useState<'nieuw' | 'getest' | 'defect' | 'verkocht'>('nieuw')
  const [editModalNotes, setEditModalNotes] = useState('')
  const [editModalPurchasePrice, setEditModalPurchasePrice] = useState('')
  const [editModalSellingPrice, setEditModalSellingPrice] = useState('')
  const [editModalPurchaseDate, setEditModalPurchaseDate] = useState('')
  const [editModalPurchaseInvoice, setEditModalPurchaseInvoice] = useState('')
  const [editModalSource, setEditModalSource] = useState('')
  const [editModalSellingDate, setEditModalSellingDate] = useState('')
  const [editModalSellingInvoice, setEditModalSellingInvoice] = useState('')
  const [editModalBuyerName, setEditModalBuyerName] = useState('')
  const [filters, setFilters] = useState<FilterState>({
    types: ['switch_joycon_left', 'switch_joycon_right', 'ps5_dualsense', 'switch_regular', 'switch_oled', 'switch_lite', 'xbox_series'],
    conditions: ['als_nieuw', 'licht_gebruikt', 'gebruikt', 'beschadigd'],
    statuses: ['nieuw', 'getest', 'defect', 'verkocht'],
    skuSearch: '',
    serienummerSearch: ''
  })
  const [skuSearch, setSkuSearch] = useState('')
  const [prefillData, setPrefillData] = useState<{ serialNumber?: string, color?: string } | null>(null)

  // Handle SKU search and open item details if found
  const handleSkuSearchChange = (value: string) => {
    setSkuSearch(value)
    
    // If value is provided (from QR scan), try to find and open the item
    if (value) {
      const foundItem = items.find(item => 
        item.sku.toLowerCase() === value.toLowerCase()
      )
      
      if (foundItem) {
        setSelectedItemModal(foundItem)
        setSelectedItemTab('info')
      }
    }
  }

  // Check authentication on mount
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
    } catch (error) {
      console.error('Error checking auth:', error)
    } finally {
      setAuthLoading(false)
    }
  }

  // Laad items en acties bij startup (alleen als user ingelogd is)
  useEffect(() => {
    if (user) {
      fetchItems()
      fetchActions()
    }
  }, [user])

  const fetchItems = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setItems(data || [])
    } catch (error) {
      console.error('Error fetching items:', error)
      alert('Fout bij laden van items')
    } finally {
      setLoading(false)
    }
  }

  const fetchActions = async () => {
    try {
      const { data, error } = await supabase
        .from('actions')
        .select('*')
        .order('date_added', { ascending: false })

      if (error) throw error
      setActions(data || [])
    } catch (error) {
      console.error('Error fetching actions:', error)
    }
  }

  const addItem = async (item: Omit<InventoryItem, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .insert([item])
        .select('*')

      if (error) throw error
      if (data) {
        setItems([data[0], ...items])
        setShowAddModal(false)
      }
    } catch (error) {
      console.error('Error adding item:', error)
      alert('Fout bij toevoegen van product')
    }
  }

  const deleteItem = async (id: number) => {
    try {
      // Get the item to find its photos
      const itemToDelete = items.find(item => item.id === id)
      
      // Delete photos from Supabase Storage if they exist
      if (itemToDelete?.photo_urls && itemToDelete.photo_urls.length > 0) {
        for (const photoUrl of itemToDelete.photo_urls) {
          try {
            // Extract filename from the full public URL
            let filename = photoUrl
            
            // If it's a full URL, extract just the filename part after the last /
            if (photoUrl.includes('/')) {
              const urlParts = photoUrl.split('/')
              filename = urlParts[urlParts.length - 1]
            }
            
            // Construct the full path as it was stored
            const filePath = `product-photos/${filename}`
            
            console.log('Attempting to delete photo from path:', filePath)
            
            // Delete from storage using the full path
            const { data, error: deleteError } = await supabase.storage
              .from('product-photos')
              .remove([filePath])
            
            if (deleteError) {
              console.error(`Error deleting photo ${filePath}:`, deleteError)
            } else {
              console.log(`Successfully deleted photo: ${filePath}`, data)
            }
          } catch (error) {
            console.error('Error processing photo deletion:', error)
          }
        }
      }
      
      // Delete the item from database
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', id)

      if (error) throw error
      setItems(items.filter(item => item.id !== id))
    } catch (error) {
      console.error('Error deleting item:', error)
      alert('Fout bij verwijderen van product')
    }
  }

  const updateItem = async (id: number, updated: Partial<InventoryItem>) => {
    try {
      const { error } = await supabase
        .from('inventory_items')
        .update(updated)
        .eq('id', id)

      if (error) throw error
      setItems(items.map(item => 
        item.id === id ? { ...item, ...updated } : item
      ))
    } catch (error) {
      console.error('Error updating item:', error)
      alert('Fout bij bijwerken van product')
    }
  }

  const addAction = async (itemId: number, action: Action, otherAction?: string) => {
    try {
      const newAction = {
        item_id: itemId,
        action,
        other_action: otherAction,
        date_added: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('actions')
        .insert([newAction])
        .select('*')

      if (error) throw error
      if (data) {
        setActions([data[0], ...actions])
      }
    } catch (error) {
      console.error('Error adding action:', error)
      alert('Fout bij toevoegen van actie')
    }
  }

  const handleJoyConDetected = (serialNumber: string, color: string) => {
    // Check if this serial number already exists
    const existingItem = items.find(item => item.serienummer === serialNumber)
    
    if (existingItem) {
      // Open the details of the existing item
      setSelectedItemModal(existingItem)
      setSelectedItemTab('info')
      setCurrentPage('inventory')
    } else {
      // Open add form with prefilled data
      setPrefillData({ serialNumber, color })
      setShowAddModal(true)
      setAddItemType('switch_joycon_left') // Default to left, user can change
      setCurrentPage('inventory')
    }
  }

  const deleteAction = async (actionId: number) => {
    try {
      const { error } = await supabase
        .from('actions')
        .delete()
        .eq('id', actionId)

      if (error) throw error
      setActions(actions.filter(a => a.id !== actionId))
    } catch (error) {
      console.error('Error deleting action:', error)
      alert('Fout bij verwijderen van actie')
    }
  }

  const uploadPhoto = async (files: File[], itemId: number) => {
    try {
      const uploadedUrls: string[] = []
      
      for (const file of files) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${itemId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`
        const filePath = `product-photos/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('product-photos')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data } = supabase.storage
          .from('product-photos')
          .getPublicUrl(filePath)

        uploadedUrls.push(data.publicUrl)
      }

      const currentUrls = selectedItemModal?.photo_urls || []
      const allUrls = [...currentUrls, ...uploadedUrls]

      await updateItem(itemId, { photo_urls: allUrls })
      
      if (selectedItemModal?.id === itemId) {
        setSelectedItemModal({
          ...selectedItemModal,
          photo_urls: allUrls
        })
      }

      alert(`${uploadedUrls.length} foto(s) succesvol geüpload`)
    } catch (error) {
      console.error('Error uploading photos:', error)
      alert('Fout bij uploaden van foto\'s')
    }
  }

  const startEditModal = () => {
    if (!selectedItemModal) return
    setEditingModalId(true)
    setEditModalKleur(selectedItemModal.kleur)
    setEditModalSerienummer(selectedItemModal.serienummer)
    setEditModalStaat(selectedItemModal.staat)
    setEditModalStatus(selectedItemModal.status)
    setEditModalNotes(selectedItemModal.defect_notes || '')
    setEditModalPurchasePrice(selectedItemModal.purchase_price?.toString() || '')
    setEditModalSellingPrice(selectedItemModal.selling_price?.toString() || '')
    setEditModalPurchaseDate(selectedItemModal.purchase_date?.split('T')[0] || '')
    setEditModalPurchaseInvoice(selectedItemModal.purchase_invoice || '')
    setEditModalSource(selectedItemModal.source || '')
    setEditModalSellingDate(selectedItemModal.selling_date || '')
    setEditModalSellingInvoice(selectedItemModal.selling_invoice || '')
    setEditModalBuyerName(selectedItemModal.buyer_name || '')
  }

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Check types
      if (!filters.types.includes(item.type)) return false
      
      // Check conditions
      if (!filters.conditions.includes(item.staat)) return false
      
      // Check statuses
      if (!filters.statuses.includes(item.status)) return false
      
      // Check SKU search (now separate from filters)
      if (skuSearch && !item.sku.toLowerCase().includes(skuSearch.toLowerCase())) return false
      
      // Check serienummer search
      if (filters.serienummerSearch && !item.serienummer.toLowerCase().includes(filters.serienummerSearch.toLowerCase())) return false
      
      // Check date range
      if (filters.dateFrom && item.date_added) {
        const itemDate = new Date(item.date_added)
        const fromDate = new Date(filters.dateFrom)
        if (itemDate < fromDate) return false
      }
      
      if (filters.dateTo && item.date_added) {
        const itemDate = new Date(item.date_added)
        const toDate = new Date(filters.dateTo)
        toDate.setHours(23, 59, 59, 999)
        if (itemDate > toDate) return false
      }
      
      return true
    })
  }, [items, filters, skuSearch])

  const saveEditModal = async () => {
    if (!selectedItemModal) return
    try {
      // Bepaal kleur_hex op basis van het producttype
      let kleurHex = selectedItemModal.kleur_hex
      const isJoycon = selectedItemModal.type === 'switch_joycon_left' || selectedItemModal.type === 'switch_joycon_right'
      const isDualsense = selectedItemModal.type === 'ps5_dualsense'
      const isSwitchLite = selectedItemModal.type === 'switch_lite'
      const isXbox = selectedItemModal.type === 'xbox_series'
      
      if (isJoycon && JOYCON_COLORS[editModalKleur]) {
        kleurHex = JOYCON_COLORS[editModalKleur]
      } else if (isDualsense && DUALSENSE_COLORS[editModalKleur]) {
        kleurHex = DUALSENSE_COLORS[editModalKleur]
      } else if (isSwitchLite && SWITCH_LITE_COLORS[editModalKleur]) {
        kleurHex = SWITCH_LITE_COLORS[editModalKleur]
      } else if (isXbox && XBOX_COLORS[editModalKleur]) {
        kleurHex = XBOX_COLORS[editModalKleur]
      }

      await updateItem(selectedItemModal.id, {
        kleur: editModalKleur.trim(),
        serienummer: editModalSerienummer.trim(),
        staat: editModalStaat,
        status: editModalStatus,
        kleur_hex: kleurHex,
        defect_notes: editModalNotes.trim(),
        purchase_price: editModalPurchasePrice ? parseFloat(editModalPurchasePrice) : undefined,
        selling_price: editModalSellingPrice ? parseFloat(editModalSellingPrice) : undefined,
        purchase_date: editModalPurchaseDate || undefined,
        purchase_invoice: editModalPurchaseInvoice.trim() || undefined,
        source: editModalSource.trim() || undefined,
        selling_date: editModalSellingDate || undefined,
        selling_invoice: editModalSellingInvoice.trim() || undefined,
        buyer_name: editModalBuyerName.trim() || undefined
      })
      setSelectedItemModal({
        ...selectedItemModal,
        kleur: editModalKleur.trim(),
        serienummer: editModalSerienummer.trim(),
        staat: editModalStaat,
        status: editModalStatus,
        kleur_hex: kleurHex,
        notes: editModalNotes.trim(),
        purchase_price: editModalPurchasePrice ? parseFloat(editModalPurchasePrice) : undefined,
        selling_price: editModalSellingPrice ? parseFloat(editModalSellingPrice) : undefined,
        purchase_date: editModalPurchaseDate || undefined,
        purchase_invoice: editModalPurchaseInvoice.trim() || undefined,
        source: editModalSource.trim() || undefined,
        selling_date: editModalSellingDate || undefined,
        selling_invoice: editModalSellingInvoice.trim() || undefined,
        buyer_name: editModalBuyerName.trim() || undefined
      })
      setEditingModalId(false)
    } catch (error) {
      console.error('Error saving:', error)
    }
  }

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
    } catch (error) {
      console.error('Error logging out:', error)
      alert('Fout bij uitloggen')
    }
  }

  // Show login if not authenticated or still checking
  if (authLoading || !user) {
    return <Login onLoginSuccess={checkAuth} />
  }

  if (loading) {
    return (
      <div className="app">
        <div className="loading">
          <p>Laden...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <Header onLogout={handleLogout} userEmail={user?.email} />
      <nav className="page-nav">
        <button 
          className={`nav-button ${currentPage === 'inventory' ? 'active' : ''}`}
          onClick={() => setCurrentPage('inventory')}
        >
          📦 Voorraad
        </button>
        <button 
          className={`nav-button ${currentPage === 'scanner' ? 'active' : ''}`}
          onClick={() => setCurrentPage('scanner')}
        >
          📱 Bluetooth Scanner
        </button>
      </nav>
      <main className="container">
        {currentPage === 'inventory' ? (
          <>
            <InventoryListView 
              items={filteredItems} 
              onDelete={deleteItem}
              onUpdate={updateItem}
              onEditCard={(item) => {
                setSelectedItemModal(item)
              }}
              totalItems={items.length}
              onFilterClick={() => setShowFilterModal(true)}
              onAddClick={() => setShowAddModal(true)}
              onSettingsClick={() => setShowSettings(true)}
              skuSearch={skuSearch}
              onSkuSearchChange={handleSkuSearchChange}
            />

        {showAddModal && (
          <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
            <div className="modal-content add-item-modal" onClick={(e) => e.stopPropagation()}>
              <button 
                className="btn-close-modal"
                onClick={() => setShowAddModal(false)}
              >
                ✕
              </button>
              <div style={{ padding: '1rem', paddingBottom: '0.75rem', borderBottom: 'none' }}>
                <label style={{ display: 'block', marginBottom: '0.3rem', color: '#aaa', fontWeight: 500, fontSize: '0.9rem' }}>Product Type</label>
                <select 
                  value={addItemType}
                  onChange={(e) => setAddItemType(e.target.value as ProductType)}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    border: '1px solid #444',
                    borderRadius: '6px',
                    backgroundColor: '#252525',
                    color: '#fff',
                    fontSize: '0.95rem',
                    fontFamily: 'inherit'
                  }}
                >
                  <option value="switch_joycon_left">Switch Joy-Con (Left)</option>
                  <option value="switch_joycon_right">Switch Joy-Con (Right)</option>
                  <option value="ps5_dualsense">PS5 DualSense</option>
                  <option value="switch_regular">Switch Regular</option>
                  <option value="switch_oled">Switch OLED</option>
                  <option value="switch_lite">Switch Lite</option>
                  <option value="xbox_series">Xbox Series X/S Controller</option>
                </select>
              </div>
              <div className="add-item-form-wrapper">
                <AddItemForm 
                  onAdd={addItem}
                  onClose={() => {
                    setShowAddModal(false)
                    setPrefillData(null)
                  }}
                  nextNumber={items.length + 1}
                  initialType={addItemType}
                  prefillData={prefillData}
                />
              </div>
            </div>
          </div>
        )}

        {selectedItemModal && (
          <div className="modal-overlay" onClick={() => setSelectedItemModal(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button 
                className="btn-close-modal"
                onClick={() => setSelectedItemModal(null)}
              >
                ✕
              </button>
              <div className="item-card">
                <div className="item-header">
                  <div>
                    <div className="item-type-label">
                      {PRODUCT_LABELS[selectedItemModal.type]}
                    </div>
                    <div className="modal-tabs">
                      <button 
                        className={`tab-button ${selectedItemTab === 'info' ? 'active' : ''}`}
                        onClick={() => setSelectedItemTab('info')}
                      >
                        Info
                      </button>
                      <button 
                        className={`tab-button ${selectedItemTab === 'aankoop' ? 'active' : ''}`}
                        onClick={() => setSelectedItemTab('aankoop')}
                      >
                        Aankoop
                      </button>
                      <button 
                        className={`tab-button ${selectedItemTab === 'verkoop' ? 'active' : ''}`}
                        onClick={() => setSelectedItemTab('verkoop')}
                      >
                        Verkoop
                      </button>
                      <button 
                        className={`tab-button ${selectedItemTab === 'acties' ? 'active' : ''}`}
                        onClick={() => setSelectedItemTab('acties')}
                      >
                        Acties
                      </button>
                      <button 
                        className={`tab-button ${selectedItemTab === 'fotos' ? 'active' : ''}`}
                        onClick={() => setSelectedItemTab('fotos')}
                      >
                        Fotos
                      </button>
                    </div>
                  </div>
                </div>

                <div className="item-details">
                  {selectedItemTab === 'info' && (
                    <>
                      <div className="detail-row">
                        <span className="label">Kleur:</span>
                        {editingModalId ? (
                          (selectedItemModal.type === 'switch_joycon_left' || selectedItemModal.type === 'switch_joycon_right') ? (
                            <select
                              value={editModalKleur}
                              onChange={(e) => setEditModalKleur(e.target.value)}
                              className="edit-select"
                            >
                              <option value="">Selecteer kleur...</option>
                              {Object.keys(JOYCON_COLORS).map(color => (
                                <option key={color} value={color}>{color}</option>
                              ))}
                            </select>
                          ) : selectedItemModal.type === 'ps5_dualsense' ? (
                            <select
                              value={editModalKleur}
                              onChange={(e) => setEditModalKleur(e.target.value)}
                              className="edit-select"
                            >
                              <option value="">Selecteer kleur...</option>
                              {Object.keys(DUALSENSE_COLORS).map(color => (
                                <option key={color} value={color}>{color}</option>
                              ))}
                            </select>
                          ) : selectedItemModal.type === 'switch_lite' ? (
                            <select
                              value={editModalKleur}
                              onChange={(e) => setEditModalKleur(e.target.value)}
                              className="edit-select"
                            >
                              <option value="">Selecteer kleur...</option>
                              {Object.keys(SWITCH_LITE_COLORS).map(color => (
                                <option key={color} value={color}>{color}</option>
                              ))}
                            </select>
                          ) : selectedItemModal.type === 'xbox_series' ? (
                            <select
                              value={editModalKleur}
                              onChange={(e) => setEditModalKleur(e.target.value)}
                              className="edit-select"
                            >
                              <option value="">Selecteer kleur...</option>
                              {Object.keys(XBOX_COLORS).map(color => (
                                <option key={color} value={color}>{color}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={editModalKleur}
                              onChange={(e) => setEditModalKleur(e.target.value)}
                              className="edit-input"
                            />
                          )
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, justifyContent: 'flex-end' }}>
                            <span className="value" style={{ textAlign: 'right', flex: 'none' }}>{selectedItemModal.kleur}</span>
                            {selectedItemModal.kleur_hex && (
                              <div 
                                style={{
                                  width: '16px',
                                  height: '16px',
                                  backgroundColor: selectedItemModal.kleur_hex,
                                  borderRadius: '3px',
                                  border: '1px solid #999'
                                }}
                                title={selectedItemModal.kleur_hex}
                              />
                            )}
                          </div>
                        )}
                      </div>

                      <div className="detail-row">
                        <span className="label">Serienummer:</span>
                        {editingModalId ? (
                          <input
                            type="text"
                            value={editModalSerienummer}
                            onChange={(e) => setEditModalSerienummer(e.target.value)}
                            className="edit-input"
                          />
                        ) : (
                          <span className="value">{selectedItemModal.serienummer}</span>
                        )}
                      </div>

                      <div className="detail-row">
                        <span className="label">Staat:</span>
                        {editingModalId ? (
                          <select
                            value={editModalStaat}
                            onChange={(e) => setEditModalStaat(e.target.value as any)}
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
                            style={{
                              backgroundColor: selectedItemModal.staat === 'als_nieuw' ? '#10b981' :
                                             selectedItemModal.staat === 'licht_gebruikt' ? '#84cc16' :
                                             selectedItemModal.staat === 'gebruikt' ? '#f59e0b' :
                                             '#ef4444'
                            }}
                          >
                            {CONDITION_LABELS[selectedItemModal.staat]}
                          </span>
                        )}
                      </div>

                      <div className="detail-row">
                        <span className="label">Status:</span>
                        {editingModalId ? (
                          <select
                            value={editModalStatus}
                            onChange={(e) => setEditModalStatus(e.target.value as any)}
                            className="status-select"
                          >
                            <option value="nieuw">Nieuw</option>
                            <option value="getest">Getest</option>
                            <option value="defect">Defect</option>
                            <option value="verkocht">Verkocht</option>
                          </select>
                        ) : (
                          <span className="value">
                            {STATUS_LABELS[selectedItemModal.status]}
                          </span>
                        )}
                      </div>

                      <div className="detail-row">
                        <span className="label">Toegevoegd:</span>
                        <span className="date">
                          {selectedItemModal.created_at 
                            ? new Date(selectedItemModal.created_at).toLocaleDateString('nl-NL')
                            : selectedItemModal.date_added 
                            ? new Date(selectedItemModal.date_added).toLocaleDateString('nl-NL')
                            : '-'
                          }
                        </span>
                      </div>

                      <div className="detail-row barcode-row">
                        <span className="label">SKU QR Code:</span>
                        <div className="barcode-container">
                          <QRCodeSVG 
                            value={selectedItemModal.sku} 
                            size={200}
                            bgColor="#1a1a1a"
                            fgColor="#ffffff"
                            level="H"
                            includeMargin={true}
                          />
                        </div>
                      </div>

                      <div className="detail-row notes-row">
                        <span className="label">Opmerkingen:</span>
                        {editingModalId ? (
                          <textarea
                            value={editModalNotes}
                            onChange={(e) => setEditModalNotes(e.target.value)}
                            className="edit-notes"
                            placeholder="Voeg opmerkingen toe..."
                            rows={4}
                          />
                        ) : (
                          <div className="notes-display">
                            {selectedItemModal.defect_notes ? (
                              <p>{selectedItemModal.defect_notes}</p>
                            ) : (
                              <p className="no-notes">Geen opmerkingen</p>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {selectedItemTab === 'aankoop' && (
                    <>
                      <div className="detail-row">
                        <span className="label">Aankoopprijs:</span>
                        {editingModalId ? (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editModalPurchasePrice}
                            onChange={(e) => setEditModalPurchasePrice(e.target.value)}
                            className="edit-input"
                            placeholder="€"
                          />
                        ) : (
                          <span className="value">
                            {selectedItemModal.purchase_price ? `€ ${selectedItemModal.purchase_price.toFixed(2)}` : '-'}
                          </span>
                        )}
                      </div>

                      <div className="detail-row">
                        <span className="label">Aankoopdatum:</span>
                        {editingModalId ? (
                          <input
                            type="date"
                            value={editModalPurchaseDate}
                            onChange={(e) => setEditModalPurchaseDate(e.target.value)}
                            className="edit-input"
                          />
                        ) : (
                          <span className="value">
                            {selectedItemModal.purchase_date 
                              ? new Date(selectedItemModal.purchase_date).toLocaleDateString('nl-NL')
                              : '-'
                            }
                          </span>
                        )}
                      </div>

                      <div className="detail-row">
                        <span className="label">Factuur:</span>
                        {editingModalId ? (
                          <input
                            type="text"
                            value={editModalPurchaseInvoice}
                            onChange={(e) => setEditModalPurchaseInvoice(e.target.value)}
                            className="edit-input"
                            placeholder="bijv. FAC-2024-001"
                          />
                        ) : (
                          <span className="value">
                            {selectedItemModal.purchase_invoice || '-'}
                          </span>
                        )}
                      </div>

                      <div className="detail-row">
                        <span className="label">Bron:</span>
                        {editingModalId ? (
                          <input
                            type="text"
                            value={editModalSource}
                            onChange={(e) => setEditModalSource(e.target.value)}
                            className="edit-input"
                            placeholder="bijv. Marktplaats, Retail..."
                          />
                        ) : (
                          <span className="value">
                            {selectedItemModal.source || '-'}
                          </span>
                        )}
                      </div>
                    </>
                  )}

                  {selectedItemTab === 'verkoop' && (
                    <>
                      <div className="detail-row">
                        <span className="label">Verkoopprijs:</span>
                        {editingModalId ? (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editModalSellingPrice}
                            onChange={(e) => setEditModalSellingPrice(e.target.value)}
                            className="edit-input"
                            placeholder="€"
                          />
                        ) : (
                          <span className="value">
                            {selectedItemModal.selling_price ? `€ ${selectedItemModal.selling_price.toFixed(2)}` : '-'}
                          </span>
                        )}
                      </div>

                      <div className="detail-row">
                        <span className="label">Verkoopsdatum:</span>
                        {editingModalId ? (
                          <input
                            type="date"
                            value={editModalSellingDate}
                            onChange={(e) => setEditModalSellingDate(e.target.value)}
                            className="edit-input"
                          />
                        ) : (
                          <span className="value">
                            {selectedItemModal.selling_date 
                              ? new Date(selectedItemModal.selling_date).toLocaleDateString('nl-NL')
                              : '-'
                            }
                          </span>
                        )}
                      </div>

                      <div className="detail-row">
                        <span className="label">Factuur:</span>
                        {editingModalId ? (
                          <input
                            type="text"
                            value={editModalSellingInvoice}
                            onChange={(e) => setEditModalSellingInvoice(e.target.value)}
                            className="edit-input"
                            placeholder="bijv. VK-2024-001"
                          />
                        ) : (
                          <span className="value">
                            {selectedItemModal.selling_invoice || '-'}
                          </span>
                        )}
                      </div>

                      <div className="detail-row">
                        <span className="label">Koper:</span>
                        {editingModalId ? (
                          <input
                            type="text"
                            value={editModalBuyerName}
                            onChange={(e) => setEditModalBuyerName(e.target.value)}
                            className="edit-input"
                            placeholder="naam koper"
                          />
                        ) : (
                          <span className="value">
                            {selectedItemModal.buyer_name || '-'}
                          </span>
                        )}
                      </div>
                    </>
                  )}

                  {selectedItemTab === 'acties' && (
                    <ProductActions
                      item={selectedItemModal}
                      actions={actions.filter(a => a.item_id === selectedItemModal.id)}
                      onAddAction={addAction}
                      onDeleteAction={deleteAction}
                    />
                  )}

                  {selectedItemTab === 'fotos' && (
                    <div className="photos-section">
                      {selectedItemModal.photo_urls && selectedItemModal.photo_urls.length > 0 ? (
                        <div className="photos-grid">
                          {selectedItemModal.photo_urls.map((photoUrl, index) => (
                            <div 
                              key={index} 
                              className="photo-item"
                              onDoubleClick={() => {
                                setExpandedPhotoUrl(photoUrl)
                                setPhotoZoom(1)
                              }}
                              title="Dubbelklik om te vergroten"
                            >
                              <img 
                                src={photoUrl} 
                                alt={`Product foto ${index + 1}`} 
                                className="product-photo"
                              />
                              {editingModalId && (
                                <button 
                                  className="btn-remove-photo"
                                  onClick={() => {
                                    const updatedUrls = selectedItemModal.photo_urls?.filter((_, i) => i !== index) || []
                                    setSelectedItemModal({
                                      ...selectedItemModal,
                                      photo_urls: updatedUrls
                                    })
                                    updateItem(selectedItemModal.id, { photo_urls: updatedUrls })
                                  }}
                                >
                                  🗑️
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="no-photo">Geen foto's beschikbaar</p>
                      )}
                      {editingModalId && (
                        <div className="photo-upload">
                          <label className="photo-input-label">
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={(e) => {
                                const files = e.target.files
                                if (files && files.length > 0 && selectedItemModal) {
                                  uploadPhoto(Array.from(files), selectedItemModal.id)
                                }
                              }}
                              className="photo-input"
                              style={{ display: 'none' }}
                            />
                            Klik om foto's te selecteren
                          </label>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="item-actions">
                  {editingModalId ? (
                    <>
                      <button
                        onClick={saveEditModal}
                        className="btn-save"
                      >
                        Opslaan
                      </button>
                      <button
                        onClick={() => setEditingModalId(false)}
                        className="btn-cancel"
                      >
                        Annuleren
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={startEditModal}
                        className="btn-edit"
                      >
                        Bewerken
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Zeker dit product verwijderen?')) {
                            deleteItem(selectedItemModal.id)
                            setSelectedItemModal(null)
                          }
                        }}
                        className="btn-delete"
                      >
                        Verwijderen
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {expandedPhotoUrl && (
          <div className="photo-lightbox" onClick={() => setExpandedPhotoUrl(null)}>
            <div className="photo-lightbox-content" onClick={(e) => e.stopPropagation()}>
              <button 
                className="btn-close-lightbox"
                onClick={() => setExpandedPhotoUrl(null)}
              >
                ✕
              </button>
              <div className="photo-lightbox-controls">
                <button 
                  className="btn-zoom"
                  onClick={() => setPhotoZoom(Math.max(1, photoZoom - 0.2))}
                  disabled={photoZoom <= 1}
                >
                  −
                </button>
                <span className="zoom-level">{Math.round(photoZoom * 100)}%</span>
                <button 
                  className="btn-zoom"
                  onClick={() => setPhotoZoom(Math.min(5, photoZoom + 0.2))}
                >
                  +
                </button>
              </div>
              <div className="photo-lightbox-image">
                <img 
                  src={expandedPhotoUrl} 
                  alt="Expanded foto" 
                  style={{ transform: `scale(${photoZoom})` }}
                />
              </div>
            </div>
          </div>
        )}

        {showSettings && (
          <Settings 
            onClose={() => setShowSettings(false)}
            onSettingsUpdated={() => {
              // Reload items when settings change
              fetchItems()
            }}
          />
        )}

        <FilterModal 
          isOpen={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          onApply={(newFilters) => setFilters(newFilters)}
          currentFilters={filters}
        />
          </>
        ) : (
          <BleScanner onJoyConDetected={handleJoyConDetected} />
        )}
      </main>
    </div>
  )
}

export default App