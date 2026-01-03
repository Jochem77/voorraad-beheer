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
  const [debugLog, setDebugLog] = useState<string[]>([])

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

  const addLog = (msg: string) => {
    console.log(msg)
    setDebugLog(prev => [...prev, msg])
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
        await addDevice(device)
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
      setDebugLog([])

      addLog('🔍 Starten met scan voor alle apparaten (ZONDER filters)...')
      addLog('📋 Alle gevonden devices worden hieronder gelogged')

      // Probeer eerst zonder optionalServices (kunnen soms problemen veroorzaken)
      const options = {
        acceptAllDevices: true
      } as any

      addLog('📱 Device picker dialoog wordt geopend...')
      const device = await (navigator as any).bluetooth.requestDevice(options)
      if (device) {
        addLog(`✅ Device gekozen: ${device.name}`)
        addLog(`📊 Device ID: ${device.id}`)
        addLog(`📊 Device gatt.connected: ${device.gatt?.connected}`)
        await addDevice(device)
      }
    } catch (err: any) {
      console.error('❌ Bluetooth error:', err.name, err.message)
      if (err.name === 'NotFoundError') {
        if (err.message.includes('cancelled')) {
          addLog('⚠️ Device picker gesloten. Geen Joy-Con in de lijst gevonden!')
          addLog('💡 Probeer de "🎮 WebHID Joy-Con" knop - dit werkt beter voor Joy-Con!')
          setError('⚠️ Joy-Con niet gevonden via Bluetooth Web API. Probeer de "🎮 WebHID Joy-Con" knop!')
        } else {
          addLog('❌ Geen Bluetooth apparaten gevonden.')
          setError('❌ Geen Bluetooth apparaten gevonden.')
        }
      } else if (err.name === 'SecurityError') {
        addLog('⚠️ Bluetooth toegang geweigerd.')
        setError('⚠️ Bluetooth toegang geweigerd.')
      } else if (err.name === 'NotSupportedError') {
        addLog('❌ Bluetooth wordt niet ondersteund.')
        setError('❌ Bluetooth wordt niet ondersteund.')
      } else {
        addLog(`Fout: ${err.message}`)
        setError(`Fout: ${err.message}`)
      }
    } finally {
      setScanning(false)
    }
  }

  const startWebHIDScan = async () => {
    try {
      setError('')
      setScanning(true)
      setDevices([])
      setDebugLog([])

      addLog('🎮 WebHID: Scannen naar Joy-Con HID devices...')
      
      if (!(navigator as any).hid) {
        addLog('❌ WebHID niet beschikbaar in deze browser')
        setError('❌ WebHID niet beschikbaar. Probeer Chrome 89+ of Edge 89+')
        setScanning(false)
        return
      }

      // Joy-Con vendor ID (Nintendo)
      const NINTENDO_VID = 0x057E
      const JOYCON_L_PID = 0x2006
      const JOYCON_R_PID = 0x2007
      const PRO_CONTROLLER_PID = 0x2009

      addLog(`🔍 Zoeken naar Nintendo Joy-Con (VID: 0x${NINTENDO_VID.toString(16)})...`)
      
      const devices = await (navigator as any).hid.requestDevice({
        filters: [
          { vendorId: NINTENDO_VID, productId: JOYCON_L_PID },
          { vendorId: NINTENDO_VID, productId: JOYCON_R_PID },
          { vendorId: NINTENDO_VID, productId: PRO_CONTROLLER_PID }
        ]
      })

      if (devices.length === 0) {
        addLog('❌ Geen Joy-Con HID devices gevonden')
        setError('❌ Geen Joy-Con HID devices gevonden via WebHID')
        setScanning(false)
        return
      }

      addLog(`✅ ${devices.length} Joy-Con device(s) gevonden via WebHID!`)
      
      for (const device of devices) {
        addLog(`✅ Gevonden: ${device.productName} (PID: 0x${device.productId.toString(16)})`)
        
        // Voeg toe aan devices list
        const newDevice: BluetoothDevice = {
          id: `hid-${device.vendorId}-${device.productId}-${Math.random()}`,
          name: device.productName || 'Joy-Con (onbekend)',
          rssi: 0,
          connected: device.opened,
          rawDevice: device,
          services: ['HID Device (WebHID)']
        }
        
        setDevices(prev => [...prev, newDevice])
      }
    } catch (err: any) {
      console.error('❌ WebHID error:', err)
      addLog(`❌ WebHID error: ${err.message}`)
      if (err.message.includes('user gesture')) {
        setError('⚠️ WebHID moet direct van een knop klik worden aangeroepen. Probeer opnieuw!')
      } else {
        setError('❌ Joy-Con kon niet via WebHID worden gevonden.')
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
          await hidDevice.open()
          addLog(`✅ WebHID device geopend: ${device.name}`)
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
      addLog(`❌ Verbindingsfout: ${err.message}`)
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
      addLog(`📖 Luisteren naar Joy-Con: ${device.name}...`)
      
      // Probeer serienummer op te halen
      const serialNumber = await getJoyConSerialNumber(hidDevice)
      if (serialNumber) {
        addLog(`🔑 Serienummer: ${serialNumber}`)
        setDevices(prev => prev.map(d => 
          d.id === device.id ? { ...d, serialNumber } : d
        ))
      } else {
        addLog(`💡 Kan serienummer niet uitlezen (niet kritisch)`)
      }
      
      let reportCount = 0
      let lastLogTime = Date.now()
      
      hidDevice.addEventListener('inputreport', () => {
        reportCount++
        
        // Log every 30 reports to show data flow
        const now = Date.now()
        if (now - lastLogTime > 3000) {
          addLog(`✅ Actief - ${reportCount} reports in 3 sec`)
          reportCount = 0
          lastLogTime = now
        }
      })
      
      // Keep device open for receiving reports
      addLog(`✅ Verbonden en ontvangt data`)
    } catch (err: any) {
      addLog(`⚠️ Data lezen fout: ${err.message}`)
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
          addLog(`✅ WebHID device gesloten: ${device.name}`)
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
      addLog(`❌ Verbreekfout: ${err.message}`)
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
            onClick={startWebHIDScan}
            disabled={scanning}
            title="Zoek Joy-Con via WebHID (betere Joy-Con ondersteuning)"
            style={{ backgroundColor: '#10b981' }}
          >
            {scanning ? 'Scannen...' : '🎮 WebHID Joy-Con'}
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

      {debugLog.length > 0 && (
        <div style={{ 
          background: '#1f2937', 
          border: '1px solid #374151', 
          borderRadius: '8px', 
          padding: '1rem', 
          marginBottom: '1rem',
          maxHeight: '200px',
          overflowY: 'auto',
          fontFamily: 'monospace',
          fontSize: '0.85em',
          color: '#10b981'
        }}>
          <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold', color: '#fff' }}>📋 Debug Log:</p>
          {debugLog.map((log, i) => (
            <div key={i} style={{ margin: '0.25rem 0' }}>{log}</div>
          ))}
        </div>
      )}

      <div className="scanner-info">
        <p>💡 <strong>🎮 Joy-Con Verbinding (WebHID Methode - AANGERADEN!):</strong></p>
        <ol style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
          <li><strong>Zet je Joy-Con in PAIRING MODE</strong> (SYNC knop ingedrukt tot LEDs knipperen)</li>
          <li><strong>Koppel in Windows Bluetooth instellingen</strong> (Settings → Devices → Bluetooth)</li>
          <li>Kom terug naar deze app</li>
          <li>Klik op <strong>"🎮 WebHID Joy-Con"</strong> (groene knop)</li>
          <li>Selecteer je Joy-Con in de dialoog (verschijnt als "Wireless Gamepad")</li>
          <li>Klik "Verbinden" om data van de controller te ontvangen</li>
        </ol>
        <p style={{ fontSize: '0.9em', marginTop: '1rem', backgroundColor: '#d1fae5', color: '#065f46', padding: '0.75rem', borderRadius: '6px', borderLeft: '3px solid #10b981' }}>
          <strong>✅ BELANGRIJK:</strong> Joy-Con moet EERST in Windows worden gekoppeld voordat deze in de app kan worden gevonden! Daarna vind je het via de "🎮 WebHID Joy-Con" knop.
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
