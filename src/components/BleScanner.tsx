import { useState, useEffect } from 'react'
import './BleScanner.css'

interface BluetoothDevice {
  id: string
  name: string
  rssi: number
  connected: boolean
  rawDevice?: any
  services?: string[]
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
      setError('')
      
      if (!(navigator as any).bluetooth) {
        console.log('❌ Bluetooth Web API niet beschikbaar')
        setError('⚠️ Bluetooth Web API niet beschikbaar')
        return
      }

      console.log('💡 Tip: Klik "📱 Alle Apparaten" om gekoppelde apparaten te selecteren')
      setError('💡 Klik op "📱 Alle Apparaten" om je gekoppelde Joy-Con te selecteren')
    } catch (err: any) {
      console.error('❌ Fout:', err.message)
      setError(`Fout: ${err.message}`)
    }
  }

  const identifyDevice = async (device: any): Promise<string[]> => {
    const services: string[] = []
    try {
      if (device.gatt?.connected) {
        const server = await device.gatt.getPrimaryServices()
        server.forEach((service: any) => {
          // Voeg UUID toe
          const uuid = service.uuid
          // Voeg bekende namen toe
          if (uuid.includes('180a')) services.push('Device Information Service')
          if (uuid.includes('180f')) services.push('Battery Service')
          if (uuid.includes('1812')) services.push('HID Service')
          if (uuid.includes('000000d1')) services.push('Joy-Con Proprietary Service')
          if (!services.length) services.push(`Service: ${uuid.substring(0, 8)}...`)
        })
      }
    } catch (err) {
      console.log('Kon services niet lezen:', err)
    }
    return services
  }

  const addDevice = async (device: any) => {
    console.log('✅ Device toevoegen:', device.name)
    
    // Probeer services te identificeren
    let services: string[] = []
    if (device.gatt?.connected) {
      services = await identifyDevice(device)
    }

    const newDevice: BluetoothDevice = {
      id: device.id,
      name: device.name || 'Onbekend apparaat',
      rssi: 0,
      connected: device.gatt?.connected || false,
      rawDevice: device,
      services: services
    }

    // Herkenningstips
    const isJoyCon = (name: string) => {
      return name.toLowerCase().includes('joy') || 
             name.toLowerCase().includes('jc-') ||
             name.toLowerCase().includes('pro controller')
    }

    console.log('🏷️ Device type hint:', isJoyCon(newDevice.name) ? 'Lijkt op Joy-Con' : 'Ander type')

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
      console.log('📋 Log alle gevonden devices in de browser console (F12)')

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
        console.log('📊 Device details:', {
          name: device.name,
          id: device.id,
          gatt: device.gatt,
          connected: device.gatt?.connected
        })
        await addDevice(device)
      }
    } catch (err: any) {
      console.error('❌ Bluetooth error:', err.name, err.message)
      if (err.name === 'NotFoundError') {
        setError('❌ Geen Bluetooth apparaten gevonden. Zet je Joy-Con in PAIRING MODE (houd de SYNC knop ingedrukt tot LEDs knipperen) en probeer opnieuw!')
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
        <p>💡 <strong>Hoe je Joy-Con in PAIRING MODE te zetten (belangrijk!):</strong></p>
        <ol style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
          <li><strong>Houd de SYNC knop ingedrukt</strong> (aan de zijkant van Joy-Con) totdat de LEDs <strong>snel knipperen</strong></li>
          <li>Kom terug naar deze app (zorg dat je Joy-Con in pairing mode blijft!)</li>
          <li>Klik op <strong>"📱 Alle Apparaten"</strong></li>
          <li>Je Joy-Con zou nu in de device selector moeten verschijnen</li>
          <li>Selecteer het apparaat dat lijkt op "Joy-Con L", "Joy-Con R", "JC-" of "Pro Controller"</li>
          <li>Je Joy-Con verschijnt nu in de app lijst!</li>
        </ol>
        <p style={{ fontSize: '0.9em', marginTop: '1rem', backgroundColor: '#fef3c7', color: '#92400e', padding: '0.75rem', borderRadius: '6px', borderLeft: '3px solid #f59e0b' }}>
          <strong>⚠️ BELANGRIJK:</strong> Joy-Con moet actief in PAIRING MODE zijn (LEDs knipperen), niet alleen gekoppeld in Windows!
        </p>
      </div>

      {devices.length === 0 && !scanning && (
        <div className="no-devices">
          Geen apparaten gevonden. Klik op een van de knoppen hierboven om te scannen.
        </div>
      )}

      <div className="devices-list">
        {devices.map(device => {
          const isLikelyJoyCon = device.name.toLowerCase().includes('joy') || 
                                device.name.toLowerCase().includes('jc-') ||
                                device.name.toLowerCase().includes('pro controller')
          return (
            <div key={device.id} className={`device-card ${device.connected ? 'connected' : ''}`}>
              <div className="device-info">
                <div className="device-name">
                  {device.name}
                  {isLikelyJoyCon && <span style={{ marginLeft: '0.5rem', color: '#10b981', fontWeight: 'bold' }}>🎮 Joy-Con</span>}
                </div>
                <div className="device-id">ID: {device.id.substring(0, 20)}...</div>
                {device.services && device.services.length > 0 && (
                  <div className="device-services" style={{ fontSize: '0.85em', color: '#888', marginTop: '0.5rem' }}>
                    Services: {device.services.join(', ')}
                  </div>
                )}
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
          )
        })}
      </div>
    </div>
  )
}
