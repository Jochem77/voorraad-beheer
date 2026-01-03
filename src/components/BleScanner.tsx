import { useState, useEffect } from 'react'
import './BleScanner.css'

interface BluetoothDevice {
  id: string
  name: string
  rssi: number
  connected: boolean
  rawDevice?: any
  services?: string[]
  serialNumber?: string
}

export function BleScanner() {
  const [devices, setDevices] = useState<BluetoothDevice[]>([])
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // No initialization needed
  }, [])

  const startWebHIDScan = async () => {
    try {
      setError('')
      setScanning(true)
      setDevices([])

      if (!(navigator as any).hid) {
        setError('❌ WebHID niet beschikbaar. Probeer Chrome 89+ of Edge 89+')
        setScanning(false)
        return
      }

      // Joy-Con vendor ID (Nintendo)
      const NINTENDO_VID = 0x057E
      const JOYCON_L_PID = 0x2006
      const JOYCON_R_PID = 0x2007
      const PRO_CONTROLLER_PID = 0x2009

      const devices = await (navigator as any).hid.requestDevice({
        filters: [
          { vendorId: NINTENDO_VID, productId: JOYCON_L_PID },
          { vendorId: NINTENDO_VID, productId: JOYCON_R_PID },
          { vendorId: NINTENDO_VID, productId: PRO_CONTROLLER_PID }
        ]
      })

      if (devices.length === 0) {
        setError('❌ Geen Joy-Con gevonden')
        setScanning(false)
        return
      }

      // Process and auto-connect to all selected devices
      for (const device of devices) {
        const newDevice: BluetoothDevice = {
          id: `hid-${device.vendorId}-${device.productId}-${Math.random()}`,
          name: device.productName || 'Joy-Con',
          rssi: 0,
          connected: device.opened,
          rawDevice: device,
          services: ['HID Device (WebHID)']
        }
        
        setDevices(prev => {
          const updated = [...prev, newDevice]
          // Auto-connect after device is ready
          setTimeout(() => connectDevice(newDevice), 500)
          return updated
        })
      }
    } catch (err: any) {
      console.error('❌ WebHID error:', err)
      if (err.message.includes('user gesture')) {
        setError('⚠️ WebHID moet direct van een knop klik worden aangeroepen')
      } else {
        setError('❌ Joy-Con kon niet worden gevonden')
      }
    } finally {
      setScanning(false)
    }
  }

  const connectDevice = async (device: BluetoothDevice) => {
    try {
      setError('')
      
      // Check if this is a WebHID device
      if (device.id.startsWith('hid-')) {
        const hidDevice = device.rawDevice as any
        if (!hidDevice.opened) {
          try {
            await hidDevice.open()
          } catch (openErr: any) {
            // If device is busy, retry after a short delay
            if (openErr.message.includes('operation') || openErr.message.includes('in progress')) {
              await new Promise(r => setTimeout(r, 300))
              await hidDevice.open()
            } else {
              throw openErr
            }
          }
        }
        setDevices(prev => prev.map(d => 
          d.id === device.id ? { ...d, connected: true } : d
        ))
        
        // Start reading from device
        readWebHIDData(hidDevice, device)
      } else {
        // Bluetooth Web API device
        const bleDevice = await (navigator as any).bluetooth.getDevice(device.id)
        if (!bleDevice.gatt.connected) {
          await bleDevice.gatt.connect()
        }
        setDevices(prev => prev.map(d => 
          d.id === device.id ? { ...d, connected: true } : d
        ))
      }
    } catch (err: any) {
      setError(`Verbindingsfout: ${err.message}`)
    }
  }

  const getJoyConSerialNumber = async (hidDevice: any): Promise<string | null> => {
    try {
      // Use promise to wait for response from input report
      const serialPromise = new Promise<string | null>((resolve) => {
        const timeout = setTimeout(() => {
          hidDevice.removeEventListener('inputreport', inputHandler)
          resolve(null)
        }, 1000)
        
        const inputHandler = (event: any) => {
          try {
            const data = event.data
            
            if (data.byteLength >= 0x14 + 8) {
              const byte0D = data.getUint8(0xD)
              const byte0E = data.getUint8(0xE)
              
              // Check for SPI read response
              if (byte0D === 0x10 || (byte0D | (byte0E << 8)) === 0x1090) {
                clearTimeout(timeout)
                hidDevice.removeEventListener('inputreport', inputHandler)
                
                let serialNumber = ''
                // Serial number starts at offset 0x14
                for (let i = 0; i < 16; i++) {
                  const byte = data.getUint8(0x14 + i)
                  if (byte >= 32 && byte <= 126) {
                    serialNumber += String.fromCharCode(byte)
                  } else if (byte === 0) {
                    break
                  }
                }
                
                if (serialNumber.trim().length > 0) {
                  resolve(serialNumber.trim())
                } else {
                  resolve(null)
                }
              }
            }
          } catch (err) {
            // Ignore other reports
          }
        }
        
        hidDevice.addEventListener('inputreport', inputHandler)
        
        // Send the SPI read command
        try {
          const buf = new Uint8Array(48)
          buf[0] = 0x01   // cmd: output report
          buf[1] = 0x00   // timer
          buf[9] = 0x10   // subcmd: read SPI
          buf[10] = 0x02  // offset 0x6002 (little-endian)
          buf[11] = 0x60
          buf[14] = 0x10  // size 0x0010
          
          hidDevice.sendReport(0x01, buf)
        } catch (err: any) {
          clearTimeout(timeout)
          hidDevice.removeEventListener('inputreport', inputHandler)
          resolve(null)
        }
      })
      
      return await serialPromise
    } catch (err: any) {
      return null
    }
  }

  const readWebHIDData = async (hidDevice: any, device: BluetoothDevice) => {
    try {
      // Get serial number
      const serialNumber = await getJoyConSerialNumber(hidDevice)
      if (serialNumber) {
        setDevices(prev => prev.map(d => 
          d.id === device.id ? { ...d, serialNumber } : d
        ))
      }
      
      // Keep device open for receiving reports
      hidDevice.addEventListener('inputreport', () => {
        // Silent input handling
      })
    } catch (err: any) {
      console.error('Error reading data:', err)
    }
  }

  const disconnectDevice = async (deviceId: string) => {
    try {
      const device = devices.find(d => d.id === deviceId)
      if (!device) return
      
      if (deviceId.startsWith('hid-')) {
        const hidDevice = device.rawDevice as any
        if (hidDevice.opened) {
          await hidDevice.close()
        }
      } else {
        const bleDevice = await (navigator as any).bluetooth.getDevice(deviceId)
        if (bleDevice.gatt.connected) {
          bleDevice.gatt.disconnect()
        }
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
        <h2>🎮 Joy-Con Verbinden</h2>
        <div className="scanner-buttons">
          <button 
            className="btn-scan" 
            onClick={startWebHIDScan}
            disabled={scanning}
            title="Zoek Joy-Con via WebHID"
            style={{ backgroundColor: '#10b981' }}
          >
            {scanning ? 'Scannen...' : '🎮 Joy-Con Zoeken'}
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}


      {devices.length === 0 && !scanning && (
        <div className="no-devices">
          Klik op "🎮 Joy-Con Zoeken" om je Joy-Con te selecteren.
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
                {device.serialNumber && (
                  <div className="device-id" style={{ color: '#10b981', fontWeight: 'bold' }}>
                    🔑 Serienummer: {device.serialNumber}
                  </div>
                )}
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
