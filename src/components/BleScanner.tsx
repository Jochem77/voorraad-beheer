import { useState, useEffect } from 'react'
import './BleScanner.css'

interface BluetoothDevice {
  id: string
  name: string
  rssi: number
  connected: boolean
}

export function BleScanner() {
  const [devices, setDevices] = useState<BluetoothDevice[]>([])
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')

  // Bij laden: toon al gekoppelde apparaten
  useEffect(() => {
    loadPairedDevices()
  }, [])

  const loadPairedDevices = async () => {
    try {
      console.log('📱 Laden van al gekoppelde apparaten...')
      if (!(navigator as any).bluetooth) {
        console.log('❌ Bluetooth Web API niet beschikbaar')
        return
      }

      // Haal alle eerder verbonden apparaten op
      const devices = await (navigator as any).bluetooth.getDevices()
      console.log(`✅ ${devices.length} eerder verbonden apparaten gevonden:`)
      devices.forEach((device: any) => {
        console.log(`  - ${device.name} (${device.id})`)
        addDevice(device)
      })
    } catch (err: any) {
      console.error('Fout bij laden gekoppelde apparaten:', err)
    }
  }

  const addDevice = (device: any) => {
    console.log('✅ Device toevoegen:', device.name)
    const newDevice: BluetoothDevice = {
      id: device.id,
      name: device.name || 'Onbekend apparaat',
      rssi: 0,
      connected: device.gatt?.connected || false
    }
    setDevices(prev => {
      const existing = prev.find(d => d.id === newDevice.id)
      if (existing) {
        return prev.map(d => d.id === newDevice.id ? newDevice : d)
      }
      return [...prev, newDevice]
    })
  }

  const startScan = async () => {
    try {
      setError('')
      setScanning(true)

      console.log('🔍 Starten met Joy-Con scan...')
      
      const options = {
        filters: [
          { namePrefix: 'Joy-Con' },
          { namePrefix: 'JC-' },
          { namePrefix: 'Pro Controller' }
        ],
        optionalServices: [
          'generic_access',
          '0000180a-0000-1000-8000-00805f9b34fb',
          '0000180f-0000-1000-8000-00805f9b34fb',
          '000000d1-0000-1000-8000-00805f9b34fb'
        ]
      } as any

      console.log('📱 Device picker dialoog wordt geopend...')
      const device = await (navigator as any).bluetooth.requestDevice(options)
      
      if (device) {
        console.log('✅ Device gevonden:', device.name)
        addDevice(device)
      }
    } catch (err: any) {
      console.error('❌ Bluetooth error:', err.name, err.message)
      if (err.name === 'NotFoundError') {
        setError('❌ Joy-Con niet gevonden. Zorg dat deze in pairing mode staat en dicht bij de computer is.')
      } else if (err.name === 'SecurityError') {
        setError('⚠️ Bluetooth toegang geweigerd. Zorg dat je HTTPS gebruikt en browser toestemming hebt gegeven.')
      } else if (err.name !== 'NotFoundError') {
        setError(`Fout: ${err.message || 'Kon Joy-Con niet scannen'}`)
      }
    } finally {
      setScanning(false)
    }
  }

  const startScanAll = async () => {
    try {
      setError('')
      setScanning(true)
      setDevices([])

      console.log('🔍 Starten met scan voor alle apparaten...')

      const options = {
        acceptAllDevices: true,
        optionalServices: [
          'generic_access',
          '0000180a-0000-1000-8000-00805f9b34fb',
          '0000180f-0000-1000-8000-00805f9b34fb',
          '000000d1-0000-1000-8000-00805f9b34fb'
        ]
      } as any

      const device = await (navigator as any).bluetooth.requestDevice(options)
      if (device) {
        console.log('✅ Device gekozen:', device.name)
        addDevice(device)
      }
    } catch (err: any) {
      console.error('❌ Bluetooth error:', err.name, err.message)
      if (err.name === 'NotFoundError') {
        setError('❌ Geen Bluetooth apparaten gevonden.')
      } else if (err.name === 'SecurityError') {
        setError('⚠️ Bluetooth toegang geweigerd.')
      } else if (err.name !== 'NotFoundError') {
        setError(`Fout: ${err.message}`)
      }
    } finally {
      setScanning(false)
    }
  }

  const connectDevice = async (device: BluetoothDevice) => {
    try {
      setError('')
      const bleDevice = await (navigator as any).bluetooth.getDevice(device.id)
      if (!bleDevice.gatt.connected) {
        await bleDevice.gatt.connect()
      }
      setDevices(prev => prev.map(d => 
        d.id === device.id ? { ...d, connected: true } : d
      ))
    } catch (err: any) {
      setError(`Verbindingsfout: ${err.message}`)
    }
  }

  const disconnectDevice = async (deviceId: string) => {
    try {
      const bleDevice = await (navigator as any).bluetooth.getDevice(deviceId)
      if (bleDevice.gatt.connected) {
        bleDevice.gatt.disconnect()
      }
      setDevices(prev => prev.map(d => 
        d.id === deviceId ? { ...d, connected: false } : d
      ))
    } catch (err: any) {
      setError(`Verbreekfout: ${err.message}`)
    }
  }

  const isBleSupported = () => {
    return !!(navigator as any).bluetooth
  }

  if (!isBleSupported()) {
    return (
      <div className="ble-scanner">
        <div className="error-message">
          ⚠️ Bluetooth Web API wordt niet ondersteund door deze browser.
          <br />
          Gebruik Chrome, Edge of een andere moderne browser.
        </div>
      </div>
    )
  }

  return (
    <div className="ble-scanner">
      <div className="scanner-header">
        <h2>Bluetooth Apparaat Scanner</h2>
        <div className="scanner-buttons">
          <button 
            className="btn-scan" 
            onClick={startScan}
            disabled={scanning}
            title="Zoek Joy-Con en controllers"
          >
            {scanning ? 'Scannen...' : '🎮 Joy-Con Zoeken'}
          </button>
          <button 
            className="btn-scan secondary" 
            onClick={startScanAll}
            disabled={scanning}
            title="Zoek alle Bluetooth apparaten"
          >
            {scanning ? 'Scannen...' : '📱 Alle Apparaten'}
          </button>
          <button 
            className="btn-scan secondary" 
            onClick={loadPairedDevices}
            disabled={scanning}
            title="Vernieuw gekoppelde apparaten"
          >
            🔄 Vernieuwen
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="scanner-info">
        <p>💡 <strong>Tips:</strong></p>
        <ul>
          <li><strong>Beste manier:</strong> Koppel je Joy-Con eerst in Windows Bluetooth instellingen</li>
          <li>Klik dan hier op <strong>"🔄 Vernieuwen"</strong> om gekoppelde apparaten te zien</li>
          <li>Je Joy-Con verschijnt dan in de lijst hieronder</li>
          <li>Als dat niet werkt, probeer <strong>"🎮 Joy-Con Zoeken"</strong> (nieuwe scan)</li>
          <li>Of selecteer handmatig via <strong>"📱 Alle Apparaten"</strong></li>
          <li>Open Browser Console (F12 → Console) om debug informatie te zien</li>
        </ul>
      </div>

      {devices.length === 0 && !scanning && (
        <div className="no-devices">
          Geen apparaten gevonden. Klik op een van de knoppen hierboven om te scannen.
        </div>
      )}

      <div className="devices-list">
        {devices.map(device => (
          <div key={device.id} className={`device-card ${device.connected ? 'connected' : ''}`}>
            <div className="device-info">
              <div className="device-name">{device.name}</div>
              <div className="device-id">ID: {device.id.substring(0, 20)}...</div>
              <div className="device-status">
                {device.connected ? '✓ Verbonden' : 'Niet verbonden'}
              </div>
            </div>
            <div className="device-actions">
              {!device.connected ? (
                <button 
                  className="btn-connect"
                  onClick={() => connectDevice(device)}
                >
                  Verbinden
                </button>
              ) : (
                <button 
                  className="btn-disconnect"
                  onClick={() => disconnectDevice(device.id)}
                >
                  Verbreken
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
