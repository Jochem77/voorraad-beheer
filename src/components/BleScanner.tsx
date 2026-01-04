import { useState, useEffect, useRef } from 'react'
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

interface BleScannerProps {
  onJoyConDetected?: (serialNumber: string, color: string, controllerType?: string) => void
}

export function BleScanner({ onJoyConDetected }: BleScannerProps) {
  const [devices, setDevices] = useState<BluetoothDevice[]>([])
  const [scanning, setScanning] = useState(false)
  const [connectingDevices, setConnectingDevices] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')
  const processedDevicesRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    // Cleanup function to close all open HID devices
    // BUT only if they're not currently being read from
    return () => {
      devices.forEach(device => {
        // Don't close devices that are currently connecting
        if (device.id.startsWith('hid-') && device.connected && !connectingDevices.has(device.id)) {
          const hidDevice = device.rawDevice as any
          if (hidDevice?.opened) {
            hidDevice.close().catch(() => {/* ignore errors on cleanup */})
          }
        }
      })
    }
  }, [devices, connectingDevices])

  useEffect(() => {
    // Don't auto-load anything - user must manually scan
    // This prevents showing ghost devices and Joy-Cons in sleep mode
  }, [])

  const scanForJoyCons = async () => {
    try {
      setError('')
      setScanning(true)
      setDevices([])

      if (!(navigator as any).hid) {
        setError('❌ WebHID niet beschikbaar. Probeer Chrome 89+ of Edge 89+')
        setScanning(false)
        return
      }

      // Controller vendor/product IDs
      const NINTENDO_VID = 0x057E
      const JOYCON_L_PID = 0x2006
      const JOYCON_R_PID = 0x2007
      const PRO_CONTROLLER_PID = 0x2009
      
      const SONY_VID = 0x054C
      const DUALSENSE_PID = 0x0CE6  // DualSense (PS5)
      
      const MICROSOFT_VID = 0x045E
      // Multiple Xbox controller variants

      console.log('Requesting WebHID controller device...')
      const devices = await (navigator as any).hid.requestDevice({
        filters: [
          { vendorId: NINTENDO_VID, productId: JOYCON_L_PID },
          { vendorId: NINTENDO_VID, productId: JOYCON_R_PID },
          { vendorId: NINTENDO_VID, productId: PRO_CONTROLLER_PID },
          { vendorId: SONY_VID, productId: DUALSENSE_PID },
          { vendorId: MICROSOFT_VID }  // Allow all Microsoft devices (Xbox controllers)
        ]
      })

      console.log('Selected devices:', devices)

      if (!devices || devices.length === 0) {
        setError('❌ Geen controller geselecteerd')
        setScanning(false)
        return
      }

      // Process selected devices
      for (const device of devices) {
        // Determine device name based on vendor/product ID
        let deviceName = device.productName || 'Controller'
        if (device.vendorId === MICROSOFT_VID) {
          deviceName = getXboxModelFromPID(device.productId)
        }
        
        const newDevice: BluetoothDevice = {
          id: `hid-${device.vendorId.toString(16).padStart(4, '0')}-${device.productId.toString(16).padStart(4, '0')}`,
          name: deviceName,
          rssi: 0,
          connected: device.opened,
          rawDevice: device,
          services: ['HID Device (WebHID)']
        }
        
        setDevices(prev => {
          const updated = [...prev, newDevice]
          // Auto-connect after device is ready (only once, prevent React Strict Mode double-mount)
          const existingDevice = prev.find(d => d.id === newDevice.id)
          const alreadyProcessed = processedDevicesRef.current.has(newDevice.id)
          
          if (!connectingDevices.has(newDevice.id) && !existingDevice && !alreadyProcessed) {
            processedDevicesRef.current.add(newDevice.id)
            setConnectingDevices(prev => new Set(prev).add(newDevice.id))
            setTimeout(() => connectDevice(newDevice), 800)
          }
          return updated
        })
      }
    } catch (err: any) {
      console.error('❌ WebHID error:', err)
      if (err.name === 'NotFoundError' || err.message.includes('cancelled')) {
        setError('❌ Selectie geannuleerd')
      } else {
        setError(`❌ ${err.message || 'Joy-Con kon niet worden gevonden'}`)
      }
    } finally {
      setScanning(false)
    }
  }

  const connectDevice = async (device: BluetoothDevice) => {
    try {
      setError('')
      
      // Check if already connecting or connected
      if (device.connected || connectingDevices.has(device.id)) {
        return
      }
      
      setConnectingDevices(prev => new Set(prev).add(device.id))
      
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
        
        // Wait longer to ensure device is ready for write commands
        setTimeout(() => {
          readWebHIDData(hidDevice, device).finally(() => {
            setConnectingDevices(prev => {
              const updated = new Set(prev)
              updated.delete(device.id)
              return updated
            })
          })
        }, 800)  // Back to 800ms
        return
      }
    } catch (err: any) {
      setError(`Verbindingsfout: ${err.message}`)
    }
  }

  const getDeviceInfo = async (hidDevice: any): Promise<{ mac: string | null, type: number | null } | null> => {
    try {
      console.log('[DeviceInfo] Requesting device info (subcommand 0x02)')
      
      const infoPromise = new Promise<{ mac: string | null, type: number | null } | null>(async (resolve) => {
        let resolved = false
        const timeout = setTimeout(() => {
          if (resolved) return
          resolved = true
          console.log('[DeviceInfo] Timeout waiting for device info response')
          hidDevice.removeEventListener('inputreport', inputHandler)
          resolve(null)
        }, 5000)
        
        const inputHandler = (event: any) => {
          if (resolved) return
          try {
            const data = event.data
            console.log('[DeviceInfo] Received input report, length:', data.byteLength)
            
            // Log first 30 bytes to see the response structure
            const responseBytes = []
            for (let i = 0; i < Math.min(data.byteLength, 30); i++) {
              responseBytes.push(data.getUint8(i).toString(16).toUpperCase().padStart(2, '0'))
            }
            console.log('[DeviceInfo] Response bytes:', responseBytes.join(' '))
            
            if (data.byteLength >= 0x18) {
              // Check for subcommand 0x02 reply
              // For Pro Controller via WebHID, we get 0xA3 reports
              // ACK is at 0x0C (0x82), subcommand echo at 0x0D (0x02)
              const byte0C = data.getUint8(0x0C)
              const byte0D = data.getUint8(0x0D)
              console.log('[DeviceInfo] Checking - byte0C:', byte0C.toString(16), 'byte0D:', byte0D.toString(16))
              
              // Check if this is subcommand 0x02 reply
              if (byte0C === 0x82 && byte0D === 0x02) {
                console.log('[DeviceInfo] MATCH! Processing device info...')
                resolved = true
                clearTimeout(timeout)
                hidDevice.removeEventListener('inputreport', inputHandler)
                
                console.log('[DeviceInfo] Device info response received')
                
                // MAC address is at bytes 0x12-0x17 (Big-Endian)
                // Data structure: 0x0E-0x0F: firmware, 0x10: device type, 0x11: unknown, 0x12-0x17: MAC
                const macBytes = []
                for (let i = 0; i < 6; i++) {
                  macBytes.push(data.getUint8(0x12 + i).toString(16).toUpperCase().padStart(2, '0'))
                }
                const macAddress = macBytes.join(':')
                
                // Device type at byte 0x10: 1=Left Joy-Con, 2=Right Joy-Con, 3=Pro Controller
                const deviceType = data.getUint8(0x10)
                
                console.log('[DeviceInfo] MAC Address:', macAddress)
                console.log('[DeviceInfo] Device Type:', deviceType)
                
                resolve({ mac: macAddress, type: deviceType })
              }
            }
          } catch (err) {
            console.error('[DeviceInfo] Error processing input report:', err)
          }
        }
        
        // Add listener BEFORE sending command
        hidDevice.addEventListener('inputreport', inputHandler)
        console.log('[DeviceInfo] Added inputreport listener')
        
        // Delay to ensure listener is registered and device is ready
        await new Promise(r => setTimeout(r, 200))
        
        // Send subcommand 0x02: Request device info
        try {
          const buf = new Uint8Array(48)
          buf[0] = 0x01   // Output report ID
          buf[1] = 0x00   // Packet counter
          buf[9] = 0x02   // Subcommand 0x02: Request device info (position 9, not 10!)
          
          console.log('[DeviceInfo] Sending device info request (subcommand 0x02)')
          await hidDevice.sendReport(0x01, buf)
          console.log('[DeviceInfo] Command sent successfully')
        } catch (err: any) {
          resolved = true
          clearTimeout(timeout)
          hidDevice.removeEventListener('inputreport', inputHandler)
          console.error('[DeviceInfo] Error sending device info request:', err.message || err)
          resolve(null)
        }
      })
      
      return await infoPromise
    } catch (err: any) {
      console.error('[DeviceInfo] getDeviceInfo error:', err)
      return null
    }
  }

  const getJoyConSerialNumber = async (hidDevice: any): Promise<string | null> => {
    try {
      console.log('[Serial] Starting serial number read for device:', `0x${hidDevice.productId.toString(16).toUpperCase().padStart(4, '0')}`)
      
      // Use promise to wait for response from input report
      const serialPromise = new Promise<string | null>(async (resolve) => {
        const timeout = setTimeout(() => {
          console.log('[Serial] Timeout waiting for serial response')
          hidDevice.removeEventListener('inputreport', inputHandler)
          resolve(null)
        }, 2000)
        
        const inputHandler = (event: any) => {
          try {
            const data = event.data
            console.log('[Serial] Received input report, length:', data.byteLength)
            
            if (data.byteLength >= 0x14 + 8) {
              const byte0D = data.getUint8(0xD)
              const byte0E = data.getUint8(0xE)
              
              console.log('[Serial] Checking SPI response - byte0D:', byte0D.toString(16), 'byte0E:', byte0E.toString(16))
              
              // Check for SPI read response
              if (byte0D === 0x10 || (byte0D | (byte0E << 8)) === 0x1090) {
                clearTimeout(timeout)
                hidDevice.removeEventListener('inputreport', inputHandler)
                
                console.log('[Serial] SPI read response detected, extracting serial...')
                
                // Log the full response for debugging
                const responseBytes = []
                for (let i = 0; i < Math.min(data.byteLength, 50); i++) {
                  responseBytes.push(data.getUint8(i).toString(16).padStart(2, '0'))
                }
                console.log('[Serial] Response bytes:', responseBytes.join(' '))
                
                let serialNumber = ''
                // Serial number starts at offset 0x13 (19 decimal)
                // Try multiple offsets to find the serial
                const offsets = [0x13, 0x14, 0x15, 0x16]
                
                for (const startOffset of offsets) {
                  let testSerial = ''
                  for (let i = 0; i < 16; i++) {
                    const byte = data.getUint8(startOffset + i)
                    if (byte >= 32 && byte <= 126) {
                      testSerial += String.fromCharCode(byte)
                    } else if (byte === 0) {
                      break
                    }
                  }
                  
                  if (testSerial.trim().length >= 8) {
                    serialNumber = testSerial
                    console.log(`[Serial] Found serial at offset 0x${startOffset.toString(16)}: ${serialNumber}`)
                    break
                  }
                }
                
                if (serialNumber.trim().length > 0) {
                  console.log('[Serial] Serial number found:', serialNumber.trim())
                  resolve(serialNumber.trim())
                } else {
                  console.log('[Serial] Serial number empty after parsing')
                  resolve(null)
                }
              }
            }
          } catch (err) {
            console.error('[Serial] Error processing input report:', err)
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
          
          console.log('[Serial] Sending SPI read command for serial number (0x6002, 16 bytes)')
          await hidDevice.sendReport(0x01, buf)
        } catch (err: any) {
          console.error('[Serial] Error sending SPI read command:', err.message || err)
          clearTimeout(timeout)
          hidDevice.removeEventListener('inputreport', inputHandler)
          resolve(null)
        }
      })
      
      const result = await serialPromise
      console.log('[Serial] Final result:', result)
      return result
    } catch (err: any) {
      console.error('[Serial] getJoyConSerialNumber error:', err)
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
      
      // Wait between reads to prevent "NotAllowedError"
      await new Promise(r => setTimeout(r, 200))
      
      // Read buttons color: 0x6053 - 0x6055 (3 bytes RGB)
      console.log('[Color] Reading buttons color from 0x6053...')
      const buttonsColor = await readSPIColor(hidDevice, 0x6053, 0x03)
      if (buttonsColor) {
        colors.buttons = buttonsColor
        console.log('[Color] Buttons color:', buttonsColor)
      }
      
      // Wait between reads to prevent "NotAllowedError"
      await new Promise(r => setTimeout(r, 200))
      
      // Read left grip color: 0x6056 - 0x6058 (3 bytes RGB, Pro only)
      console.log('[Color] Reading left grip color from 0x6056...')
      const leftGripColor = await readSPIColor(hidDevice, 0x6056, 0x03)
      if (leftGripColor) {
        colors.leftGrip = leftGripColor
        console.log('[Color] Left grip color:', leftGripColor)
      }
      
      // Wait between reads to prevent "NotAllowedError"
      await new Promise(r => setTimeout(r, 200))
      
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
    return new Promise<string | null>(async (resolve) => {
      let resolved = false
      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true
          hidDevice.removeEventListener('inputreport', inputHandler)
          console.log(`[SPI] Timeout reading from 0x${offset.toString(16).toUpperCase().padStart(4, '0')}`)
          resolve(null)
        }
      }, 2500)
      
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
        await hidDevice.sendReport(0x01, buf)
      } catch (err: any) {
        resolved = true
        clearTimeout(timeoutId)
        hidDevice.removeEventListener('inputreport', inputHandler)
        console.error(`[SPI] Error sending read command:`, err.message || err)
        resolve(null)
      }
    })
  }

  const readWebHIDData = async (hidDevice: any, device: BluetoothDevice) => {
    try {
      // Verify device is open before proceeding
      if (!hidDevice.opened) {
        console.log('[Device] Device not open yet, attempting to open...')
        try {
          await hidDevice.open()
        } catch (err: any) {
          console.error('[Device] Failed to open device:', err.message)
          return
        }
      }
      
      // Wait for device to be fully ready for commands
      await new Promise(r => setTimeout(r, 500))
      
      console.log('[Device] Device is open, proceeding with data read')
      
      // Check controller type
      const isDualSense = hidDevice.vendorId === 0x054C && hidDevice.productId === 0x0CE6
      const isXbox = hidDevice.vendorId === 0x045E && (hidDevice.productId === 0x0B13 || hidDevice.productId === 0x0B12)
      
      if (isDualSense) {
        // Get PS5 DualSense serial number
        const serialNumber = await getDualSenseSerialNumber(hidDevice)
        if (serialNumber) {
          const color = getDualSenseColor(serialNumber)
          setDevices(prev => prev.map(d => 
            d.id === device.id ? { ...d, serialNumber, bodyColor: color } : d
          ))
        }
      } else if (isXbox) {
        // Xbox controllers - detect model from product ID
        const xboxModel = getXboxModelFromPID(hidDevice.productId)
        setDevices(prev => prev.map(d => 
          d.id === device.id ? { 
            ...d, 
            name: xboxModel,
            bodyColor: 'Unknown' 
          } : d
        ))
      } else {
        // Nintendo controllers (Joy-Con and Pro Controller)
        const isProController = hidDevice.productId === 0x2009
        
        console.log('[Device] Controller type:', isProController ? 'Pro Controller' : 'Joy-Con')
        
        // Get serial number
        if (isProController) {
          // Pro Controllers: use device info to get MAC address
          console.log('[Device] Reading device info for Pro Controller...')
          await new Promise(r => setTimeout(r, 200))
          const deviceInfo = await getDeviceInfo(hidDevice)
          console.log('[Device] Device info result:', deviceInfo)
          console.log('[Device] MAC from deviceInfo:', deviceInfo?.mac)
          if (deviceInfo?.mac) {
            console.log('[Device] Setting MAC address:', deviceInfo.mac)
            console.log('[Device] Looking for device with id:', device.id)
            setDevices(prev => {
              console.log('[Device] Current devices before update:', prev.map(d => ({ id: d.id, name: d.name })))
              const updated = prev.map(d => 
                d.id === device.id ? { ...d, serialNumber: deviceInfo.mac || undefined, connected: true } : d
              )
              console.log('[Device] Updated devices:', updated.map(d => ({ id: d.id, name: d.name, serialNumber: d.serialNumber })))
              return updated
            })
          } else {
            // Fallback: use device ID as identifier
            console.log('[Device] Using device ID as fallback serial')
            setDevices(prev => prev.map(d => 
              d.id === device.id ? { ...d, serialNumber: `PRO-${device.id}` } : d
            ))
          }
        } else {
          // Joy-Cons: use actual serial from 0x6002
          console.log('[Device] Reading Joy-Con serial number...')
          const serialNumber = await getJoyConSerialNumber(hidDevice)
          console.log('[Device] Serial number result:', serialNumber)
          if (serialNumber) {
            setDevices(prev => prev.map(d => 
              d.id === device.id ? { ...d, serialNumber, connected: true } : d
            ))
          }
          
          // Wait between reads to prevent "NotAllowedError"
          await new Promise(r => setTimeout(r, 300))
          
          // Get colors
          console.log('[Device] Reading Joy-Con colors...')
          const colors = await getJoyConColor(hidDevice)
          console.log('[Device] Colors result:', colors)
          console.log('[Device] Body color:', colors.body, 'Buttons:', colors.buttons)
          if (colors.body || colors.buttons || colors.leftGrip || colors.rightGrip) {
            console.log('[Device] Updating device with colors...')
            setDevices(prev => prev.map(d => 
              d.id === device.id ? { 
                ...d, 
                bodyColor: colors.body,
                buttonColor: colors.buttons,
                leftGripColor: colors.leftGrip,
                rightGripColor: colors.rightGrip,
                connected: true
              } : d
            ))
          } else {
            console.log('[Device] No colors found, skipping color update')
          }
        }
      }
      
      // Keep device open for receiving reports - maar voeg geen extra listener toe
      // De specifieke listeners in de functies hierboven doen al het werk
    } catch (err: any) {
      // Silent error handling
    }
  }

  const getXboxModelFromPID = (productId: number): string => {
    // Xbox controller model detection based on product ID
    const modelMap: { [key: number]: string } = {
      // Xbox One Family
      0x02DD: 'Xbox One',
      0x02E0: 'Xbox One S',
      0x02EA: 'Xbox One S',
      0x02FD: 'Xbox One S',
      0x0B00: 'Xbox Elite Series 2',
      0x0B05: 'Xbox Elite Series 2',
      // Xbox Series Family
      0x0B12: 'Xbox Series X|S',
      0x0B13: 'Xbox Series X|S',
      0x0B20: 'Xbox Series X|S',
      // Adaptive
      0x0B0A: 'Xbox Adaptive',
      0x0B0C: 'Xbox Adaptive'
    }
    
    return modelMap[productId] || 'Xbox Controller'
  }

  const getDualSenseColor = (serialNumber: string): string => {
    // DualSense color detection based on serial number pattern (characters 5 and 6)
    const colorCode = serialNumber.substring(4, 6).toUpperCase()
    
    const colorMap: { [key: string]: string } = {
      '00': 'White',
      '01': 'Midnight Black',
      '02': 'Cosmic Red',
      '03': 'Nova Pink',
      '04': 'Galactic Purple',
      '05': 'Starlight Blue',
      '06': 'Gray Camouflage',
      '07': 'Volcanic Red',
      '08': 'Sterling Silver',
      '09': 'Cobalt Blue',
      '10': 'Chroma Teal',
      '11': 'Chroma Indigo',
      '12': 'Chroma Pearl',
      '30': '30th Anniversary',
      'Z1': 'God of War Ragnarok',
      'Z2': 'Spider-Man 2',
      'Z3': 'Astro Bot',
      'Z4': 'Fortnite',
      'Z6': 'The Last of Us'
    }
    
    return colorMap[colorCode] || 'Onbekend'
  }

  const getDualSenseSerialNumber = async (hidDevice: any): Promise<string | null> => {
    try {
      // Based on dualshock-tools: getSystemInfo(1, 19, 17)
      // This sends feature report 0x80 with [1, 19] and reads response from 0x81
      
      // Create the request buffer (report ID is NOT included in the data)
      const requestData = new Uint8Array(64)
      requestData[0] = 1   // base
      requestData[1] = 19  // num (serial number location)
      
      // Send the feature report
      await hidDevice.sendFeatureReport(0x80, requestData)
      
      // Wait a bit for controller to process
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Read the response
      const response = await hidDevice.receiveFeatureReport(0x81)
      
      // Validate response: byte[0] should be 0x81, byte[1] should be 1, byte[2] should be 19, byte[3] should be 2
      const cmd = response.getUint8(0)
      const base = response.getUint8(1)
      const num = response.getUint8(2)
      const status = response.getUint8(3)
      
      if (cmd !== 0x81 || base !== 1 || num !== 19 || status !== 2) {
        return null
      }
      
      // Serial number starts at byte 4 and is 17 bytes long
      const serialNumber = new TextDecoder().decode(response.buffer.slice(4, 4 + 17)).replace(/\0/g, '').trim()
      
      if (serialNumber.length >= 8) {
        return serialNumber
      }
      
      return null
    } catch (err: any) {
      return null
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
        <h2>🎮 Controller Pairing</h2>
        <div className="scanner-buttons" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button 
            className="btn-scan" 
            onClick={scanForJoyCons}
            disabled={scanning}
            title="Scan voor controllers via WebHID (Windows pairing vereist)"
            style={{ backgroundColor: '#06b6d4', flex: 1 }}
          >
            {scanning ? 'Scannen...' : '🎮 Scan'}
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Pairing Instructions */}
      {!scanning && devices.length === 0 && (
        <div style={{ 
          backgroundColor: '#f0f9ff', 
          border: '2px solid #10b981', 
          borderRadius: '8px', 
          padding: '1rem',
          margin: '1rem 0',
          lineHeight: '1.6',
          color: '#1f2937'
        }}>
          <h3 style={{ marginTop: 0, color: '#10b981' }}>🎮 Joy-Con Verbinden (WebHID):</h3>
          <p style={{ margin: '0.5rem 0' }}>Om Joy-Con te gebruiken, moet deze eerst gekoppeld zijn met Windows Bluetooth:</p>
          <ol style={{ marginBottom: 0, color: '#1f2937' }}>
            <li><strong>Windows Instellingen</strong> → Bluetooth → "Apparaat toevoegen" → "Bluetooth"</li>
            <li><strong>Joy-Con in pairing mode:</strong>
              <ul style={{ marginTop: '0.25rem' }}>
                <li>Joy-Con L/R: Beide SL + SR knoppen ingedrukt (tot LEDs knipperen)</li>
                <li>Pro Controller: Pairing button achterop ingedrukt houden</li>
              </ul>
            </li>
            <li>Selecteer je Joy-Con in het Windows dialoog en koppel</li>
            <li>Klik op <strong>"🎮 Scan Joy-Con"</strong> om de gekoppelde Joy-Con te selecteren</li>
          </ol>
        </div>
      )}

      {devices.length === 0 && !scanning && (
        <div className="no-devices">
          Volg de stappen hierboven en klik op "🎮 Joy-Con Koppelen".
        </div>
      )}

      <div className="devices-list">
        {devices.map(device => {
          const isLikelyJoyCon = device.name.toLowerCase().includes('joy') || 
                                device.name.toLowerCase().includes('jc-')
          const isProController = device.name.toLowerCase().includes('pro controller')
          const isDualSense = device.name.toLowerCase().includes('dualsense')
          const isXbox = device.name.toLowerCase().includes('xbox')
          
          return (
            <div key={device.id} className={`device-card ${device.connected ? 'connected' : ''}`}>
              <div className="device-info">
                <div className="device-name">
                  {device.name}
                  {isLikelyJoyCon && <span style={{ marginLeft: '0.5rem', color: '#10b981', fontWeight: 'bold' }}>🎮 Joy-Con</span>}
                  {isProController && <span style={{ marginLeft: '0.5rem', color: '#10b981', fontWeight: 'bold' }}>🎮 Pro Controller</span>}
                  {isDualSense && <span style={{ marginLeft: '0.5rem', color: '#667eea', fontWeight: 'bold' }}>🎮 DualSense</span>}
                  {isXbox && <span style={{ marginLeft: '0.5rem', color: '#107C10', fontWeight: 'bold' }}>🎮 Xbox</span>}
                </div>
                {device.serialNumber && (
                  <div className="device-id" style={{ color: '#10b981', fontWeight: 'bold' }}>
                    🔑 Serienummer: {device.serialNumber}
                  </div>
                )}
                {isDualSense && device.bodyColor && (
                  <div className="device-id" style={{ color: '#667eea', fontWeight: 'bold' }}>
                    🎨 Kleur: {device.bodyColor}
                  </div>
                )}
                <div className="device-id" style={{ fontSize: '0.85em', wordBreak: 'break-all' }}>
                  ID: {device.id}
                </div>
                {device.services && device.services.length > 0 && (
                  <div className="device-services" style={{ fontSize: '0.85em', color: '#888', marginTop: '0.5rem' }}>
                    Services: {device.services.join(', ')}
                  </div>
                )}
                
                {/* Add to Inventory Button */}
                {device.connected && device.serialNumber && (
                  <button
                    onClick={() => {
                      let controllerType = undefined
                      let color = device.bodyColor || 'Onbekend'
                      if (isDualSense) controllerType = 'ps5_dualsense'
                      else if (isProController) {
                        controllerType = 'switch_pro'
                        color = 'Black'  // Pro Controller is altijd zwart
                      }
                      onJoyConDetected?.(device.serialNumber!, color, controllerType)
                    }}
                    style={{
                      marginTop: '0.75rem',
                      padding: '0.5rem 1rem',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '0.9em'
                    }}
                  >
                    ➕ Toevoegen aan Voorraad
                  </button>
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
