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
      setDevices([])

      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['generic_access']
      })

      if (device) {
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
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        setError(`Fout: ${err.message || 'Kon apparaten niet scannen'}`)
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
        <button 
          className="btn-scan" 
          onClick={startScan}
          disabled={scanning}
        >
          {scanning ? 'Scannen...' : 'Apparaat toevoegen'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

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
