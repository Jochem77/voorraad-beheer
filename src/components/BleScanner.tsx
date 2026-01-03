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
  bodyColor?: string
  buttonColor?: string
  leftGripColor?: string
  rightGripColor?: string
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
      
      // Check if already connected
      if (device.connected) {
        return
      }
      
      // Check if this is a WebHID device
      if (device.id.startsWith('hid-')) {
        const hidDevice = device.rawDevice as any
        if (!hidDevice.opened) {
          try {
            await hidDevice.open()
          } catch (openErr: any) {
            // If device is already open, that's fine
            if (openErr.message.includes('already open') || openErr.message.includes('already')) {
              // Device is already open, continue
            } else if (openErr.message.includes('operation') || openErr.message.includes('in progress')) {
              // If device is busy, retry after a short delay
              await new Promise(r => setTimeout(r, 300))
              try {
                await hidDevice.open()
              } catch (retryErr: any) {
                // If still fails with "already open", that's ok
                if (!retryErr.message.includes('already')) {
                  throw retryErr
                }
              }
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

  const getJoyConColor = async (hidDevice: any): Promise<{ body?: string, buttons?: string, leftGrip?: string, rightGrip?: string }> => {
    try {
      const colors: any = {}
      
      // Read body color: 0x6050 - 0x6052 (3 bytes RGB)
      console.log('[Color] Reading body color from 0x6050...')
      const bodyColor = await readSPIColor(hidDevice, 0x6050, 0x03)
      if (bodyColor) {
        colors.body = bodyColor
        console.log('[Color] Body color:', bodyColor)
      }
      
      // Read buttons color: 0x6053 - 0x6055 (3 bytes RGB)
      console.log('[Color] Reading buttons color from 0x6053...')
      const buttonsColor = await readSPIColor(hidDevice, 0x6053, 0x03)
      if (buttonsColor) {
        colors.buttons = buttonsColor
        console.log('[Color] Buttons color:', buttonsColor)
      }
      
      // Read left grip color: 0x6056 - 0x6058 (3 bytes RGB, Pro only)
      console.log('[Color] Reading left grip color from 0x6056...')
      const leftGripColor = await readSPIColor(hidDevice, 0x6056, 0x03)
      if (leftGripColor) {
        colors.leftGrip = leftGripColor
        console.log('[Color] Left grip color:', leftGripColor)
      }
      
      // Read right grip color: 0x6059 - 0x605B (3 bytes RGB, Pro only)
      console.log('[Color] Reading right grip color from 0x6059...')
      const rightGripColor = await readSPIColor(hidDevice, 0x6059, 0x03)
      if (rightGripColor) {
        colors.rightGrip = rightGripColor
        console.log('[Color] Right grip color:', rightGripColor)
      }
      
      return colors
    } catch (err: any) {
      console.error('[Color] Error reading colors:', err)
      return {}
    }
  }

  const readSPIColor = async (hidDevice: any, offset: number, size: number): Promise<string | null> => {
    return new Promise<string | null>((resolve) => {
      let resolved = false
      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true
          hidDevice.removeEventListener('inputreport', inputHandler)
          console.log(`[SPI] Timeout reading from 0x${offset.toString(16).toUpperCase().padStart(4, '0')}`)
          resolve(null)
        }
      }, 1500)
      
      const inputHandler = (event: any) => {
        if (resolved) return
        
        try {
          const data = event.data
          
          if (data.byteLength >= 0x15 + size) {
            const byte0D = data.getUint8(0xD)
            const byte0E = data.getUint8(0xE)
            const byte0F = data.getUint8(0xF)
            
            // Response format: byte0E-0xF contains offset in little-endian
            // byte0D = 0x10 (subcmd response indicator)
            const offsetLow = byte0E
            const offsetHigh = byte0F
            const responseOffset = offsetLow | (offsetHigh << 8)
            
            if (byte0D === 0x10 && responseOffset === offset) {
              resolved = true
              clearTimeout(timeoutId)
              hidDevice.removeEventListener('inputreport', inputHandler)
              
              // Extract RGB bytes - they start at 0x13 (not 0x14!)
              const bytes: number[] = []
              for (let i = 0; i < size; i++) {
                bytes.push(data.getUint8(0x13 + i))
              }
              
              console.log(`[SPI] ✓ Matched! Read from 0x${offset.toString(16).toUpperCase().padStart(4, '0')}: ${bytes.map(b => '0x' + b.toString(16).toUpperCase().padStart(2, '0')).join(' ')}`)
              
              // Format as #RRGGBB (bytes are in RGB order)
              if (bytes.length >= 3) {
                const r = bytes[0]
                const g = bytes[1]
                const b = bytes[2]
                
                // Accept any valid RGB color
                const color = `#${r.toString(16).toUpperCase().padStart(2, '0')}${g.toString(16).toUpperCase().padStart(2, '0')}${b.toString(16).toUpperCase().padStart(2, '0')}`
                console.log(`[SPI] ✓ Color: ${color} (RGB ${r}, ${g}, ${b})`)
                resolve(color)
              } else {
                console.log(`[SPI] Insufficient bytes read`)
                resolve(null)
              }
            }
          }
        } catch (err) {
          console.log(`[SPI] Error processing input report:`, err)
        }
      }
      
      hidDevice.addEventListener('inputreport', inputHandler)
      console.log(`[SPI] Added input report listener for offset 0x${offset.toString(16).toUpperCase().padStart(4, '0')}`)
      
      // Send the SPI read command
      try {
        const buf = new Uint8Array(48)
        buf[0] = 0x01                          // cmd: output report
        buf[1] = 0x00                          // timer
        buf[9] = 0x10                          // subcmd: read SPI
        buf[10] = offset & 0xFF                // offset low byte (little-endian)
        buf[11] = (offset >> 8) & 0xFF         // offset high byte
        buf[12] = (offset >> 16) & 0xFF        // offset byte 3
        buf[13] = (offset >> 24) & 0xFF        // offset byte 4
        buf[14] = size & 0xFF                  // size low byte
        buf[15] = (size >> 8) & 0xFF           // size high byte
        
        console.log(`[SPI] Sending read command for offset 0x${offset.toString(16).toUpperCase().padStart(4, '0')}, size ${size}`)
        hidDevice.sendReport(0x01, buf)
      } catch (err: any) {
        resolved = true
        clearTimeout(timeoutId)
        hidDevice.removeEventListener('inputreport', inputHandler)
        console.error(`[SPI] Error sending read command:`, err)
        resolve(null)
      }
    })
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
      
      // Get colors
      const colors = await getJoyConColor(hidDevice)
      if (colors.body || colors.buttons || colors.leftGrip || colors.rightGrip) {
        setDevices(prev => prev.map(d => 
          d.id === device.id ? { 
            ...d, 
            bodyColor: colors.body,
            buttonColor: colors.buttons,
            leftGripColor: colors.leftGrip,
            rightGripColor: colors.rightGrip
          } : d
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
                
                {/* Color Display */}
                {(device.bodyColor || device.buttonColor || device.leftGripColor || device.rightGripColor) && (
                  <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {device.bodyColor && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <div 
                          style={{ 
                            width: '20px', 
                            height: '20px', 
                            backgroundColor: device.bodyColor,
                            border: '1px solid #333',
                            borderRadius: '3px'
                          }}
                          title={`Body: ${device.bodyColor}`}
                        />
                        <span style={{ fontSize: '0.75em', color: '#666' }}>Lichaam</span>
                      </div>
                    )}
                    {device.buttonColor && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <div 
                          style={{ 
                            width: '20px', 
                            height: '20px', 
                            backgroundColor: device.buttonColor,
                            border: '1px solid #333',
                            borderRadius: '3px'
                          }}
                          title={`Buttons: ${device.buttonColor}`}
                        />
                        <span style={{ fontSize: '0.75em', color: '#666' }}>Knoppen</span>
                      </div>
                    )}
                    {device.leftGripColor && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <div 
                          style={{ 
                            width: '20px', 
                            height: '20px', 
                            backgroundColor: device.leftGripColor,
                            border: '1px solid #333',
                            borderRadius: '3px'
                          }}
                          title={`Left Grip: ${device.leftGripColor}`}
                        />
                        <span style={{ fontSize: '0.75em', color: '#666' }}>L-Grip</span>
                      </div>
                    )}
                    {device.rightGripColor && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <div 
                          style={{ 
                            width: '20px', 
                            height: '20px', 
                            backgroundColor: device.rightGripColor,
                            border: '1px solid #333',
                            borderRadius: '3px'
                          }}
                          title={`Right Grip: ${device.rightGripColor}`}
                        />
                        <span style={{ fontSize: '0.75em', color: '#666' }}>R-Grip</span>
                      </div>
                    )}
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
