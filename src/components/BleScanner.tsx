import { useState } from 'react'
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

  const startScan = async () => {
    try {
      setError('')
      setScanning(true)

      // Joy-Con UUID's en karakteristieken
      const joyconServices = {
        filters: [
          { namePrefix: 'Joy-Con' },
          { namePrefix: 'JC-' },
          { namePrefix: 'Pro Controller' },
          { services: ['0000180a-0000-1000-8000-00805f9b34fb'] } // Device Information
        ],
        optionalServices: [
          'generic_access',
          '0000180a-0000-1000-8000-00805f9b34fb', // Device Information
          '0000180f-0000-1000-8000-00805f9b34fb', // Battery Service
          '000000d1-0000-1000-8000-00805f9b34fb'  // Joy-Con service
        ]
      } as any

      // Probeer apparaten te vinden
      let foundDevices: any[] = []
      
      try {
        // Probeer het device picker dialoog
        const device = await (navigator as any).bluetooth.requestDevice(joyconServices)
        if (device) {
          foundDevices.push(device)
        }
      } catch (err: any) {
        if (err.name === 'NotFoundError') {
          setError('❌ Joy-Con niet gevonden. Zorg dat deze in pairing mode staat en dicht bij de computer is.')
        } else if (err.name === 'SecurityError') {
          setError('⚠️ Bluetooth is mogelijk niet ingeschakeld of toegang geweigerd.')
        } else {
          throw err
        }
      }

      // Voeg gevonden apparaten toe
      foundDevices.forEach(device => addDevice(device))

      if (foundDevices.length === 0) {
        setError('Geen Joy-Con gevonden. Probeer "Alle Apparaten" zoeken.')
      }
    } catch (err: any) {
      setError(`Fout: ${err.message || 'Kon Joy-Con niet scannen'}`)
    } finally {
      setScanning(false)
    }
  }

  const addDevice = (device: any) => {
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

  const startScanContinuous = async () => {
    try {
      setError('')
      setScanning(true)
      setDevices([])

      const options = {
        acceptAllDevices: true,
        optionalServices: [
          'generic_access',
          '0000180a-0000-1000-8000-00805f9b34fb',
          '0000180f-0000-1000-8000-00805f9b34fb',
          '000000d1-0000-1000-8000-00805f9b34fb'
        ]
      } as any

      // Probeer apparaat selecteren
      const device = await (navigator as any).bluetooth.requestDevice(options)
      if (device) {
        addDevice(device)
      } else {
        setError('Geen apparaat geselecteerd.')
      }
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        setError('❌ Geen Bluetooth apparaten gevonden.')
      } else if (err.name === 'SecurityError') {
        setError('⚠️ Bluetooth toegang geweigerd. Zorg dat je browser Bluetooth mag gebruiken.')
      } else if (err.name === 'NotSupportedError') {
        setError('⚠️ Je browser of systeem ondersteunt Bluetooth Web API niet.')
      } else {
        setError(`Fout: ${err.message}`)
      }
    } finally {
      setScanning(false)
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
            onClick={startScanContinuous}
            disabled={scanning}
            title="Zoek alle Bluetooth apparaten"
          >
            {scanning ? 'Scannen...' : '📱 Alle Apparaten'}
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="scanner-info">
        <p>💡 <strong>Tips:</strong></p>
        <ul>
          <li>Zorg dat je Joy-Con in <strong>pairing mode</strong> staat (houd de kleine knopje ingedrukt)</li>
          <li>Plaats de Joy-Con dicht bij je computer (max 5 meter)</li>
          <li>Sluit andere Bluetooth apparaten af om interferentie te voorkomen</li>
          <li>Probeer eerst <strong>"🎮 Joy-Con Zoeken"</strong></li>
          <li>Als dat niet werkt, probeer <strong>"📱 Alle Apparaten"</strong></li>
        </ul>
      </div>

      {devices.length === 0 && !scanning && (
        <div className="no-devices">
          Geen apparaten gevonden. Klik op "Apparaat toevoegen" om te scannen.
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
