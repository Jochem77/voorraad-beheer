import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeScannerState, CameraDevice } from 'html5-qrcode'
import './BarcodeScanner.css'

interface BarcodeScannerProps {
  isOpen: boolean
  onClose: () => void
  onScan: (code: string) => void
}

export function BarcodeScanner({ isOpen, onClose, onScan }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cameraStarted, setCameraStarted] = useState(false)
  const [cameras, setCameras] = useState<CameraDevice[]>([])
  const [selectedCamera, setSelectedCamera] = useState<string>('')

  useEffect(() => {
    if (isOpen && cameras.length === 0) {
      // Get available cameras when modal opens
      Html5Qrcode.getCameras().then(devices => {
        if (devices && devices.length > 0) {
          console.log('Available cameras:', devices)
          setCameras(devices)
          // Try to select back camera by default
          const backCamera = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear'))
          setSelectedCamera(backCamera?.id || devices[devices.length - 1].id)
        } else {
          setError('Geen camera\'s gevonden op dit apparaat')
        }
      }).catch(err => {
        console.error('Error getting cameras:', err)
        setError('Kan camera lijst niet ophalen: ' + err.message)
      })
    }
  }, [isOpen])

  const startScanning = async () => {
    try {
      setError(null)
      
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('barcode-reader')
      }

      const scanner = scannerRef.current
      const cameraId = selectedCamera || cameras[0]?.id
      
      if (!cameraId) {
        setError('Geen camera geselecteerd')
        return
      }

      console.log('Starting camera with ID:', cameraId)
      
      // Get the video element and apply constraints after starting
      await scanner.start(
        cameraId,
        {
          fps: 5, // Lower FPS for better focus and exposure
          qrbox: { width: 300, height: 180 }, // Larger scan area
          aspectRatio: 1.777778,
          disableFlip: false
        },
        (decodedText) => {
          console.log('Barcode scanned:', decodedText)
          onScan(decodedText)
          stopScanning()
          onClose()
        },
        (errorMessage) => {
          // Ignore continuous scanning errors
          if (!errorMessage.includes('NotFoundException') && !errorMessage.includes('No MultiFormat Readers')) {
            console.debug('Scan error:', errorMessage)
          }
        }
      )
      
      // Apply advanced camera settings after starting
      setTimeout(async () => {
        try {
          const videoElement = document.querySelector('#barcode-reader video') as HTMLVideoElement
          if (videoElement && videoElement.srcObject) {
            const stream = videoElement.srcObject as MediaStream
            const track = stream.getVideoTracks()[0]
            
            const capabilities = track.getCapabilities()
            console.log('Camera capabilities:', capabilities)
            
            const constraints: any = {}
            
            // Enable autofocus if supported
            if ('focusMode' in capabilities) {
              constraints.focusMode = 'continuous'
            }
            
            // Adjust exposure if supported
            if ('exposureMode' in capabilities) {
              constraints.exposureMode = 'continuous'
            }
            
            // Reduce brightness if supported
            if ('brightness' in capabilities) {
              constraints.brightness = (capabilities as any).brightness.min + ((capabilities as any).brightness.max - (capabilities as any).brightness.min) * 0.4
            }
            
            // Apply torch if available (helps with focus and exposure)
            if ((capabilities as any).torch) {
              constraints.torch = false // Start with torch off
            }
            
            if (Object.keys(constraints).length > 0) {
              await track.applyConstraints({ advanced: [constraints] })
              console.log('Applied camera constraints:', constraints)
            }
          }
        } catch (err) {
          console.log('Could not apply advanced camera settings:', err)
        }
      }, 500)
      
      setCameraStarted(true)
      setIsScanning(true)
      console.log('Camera started successfully')
      
    } catch (err: any) {
      console.error('Failed to start camera:', err)
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera toegang geweigerd. Sta camera toegang toe in je browser instellingen.')
      } else if (err.name === 'NotFoundError') {
        setError('Geen camera gevonden op dit apparaat.')
      } else if (err.name === 'OverconstrainedError') {
        setError('Camera ondersteunt de gevraagde instellingen niet.')
      } else {
        setError('Kan camera niet starten: ' + (err.message || err.toString()))
      }
    }
  }

  const stopScanning = async () => {
    try {
      if (scannerRef.current && scannerRef.current.getState() === Html5QrcodeScannerState.SCANNING) {
        await scannerRef.current.stop()
        console.log('Camera stopped')
      }
    } catch (err) {
      console.error('Error stopping scanner:', err)
    }
    setCameraStarted(false)
    setIsScanning(false)
  }

  useEffect(() => {
    if (!isOpen) {
      // Cleanup scanner when modal closes
      stopScanning()
      if (scannerRef.current) {
        scannerRef.current.clear()
        scannerRef.current = null
      }
      setError(null)
      setCameras([])
      setSelectedCamera('')
      return
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="barcode-scanner-overlay" onClick={onClose}>
      <div className="barcode-scanner-modal" onClick={(e) => e.stopPropagation()}>
        <div className="barcode-scanner-header">
          <h3>Scan SKU Barcode</h3>
          <button className="btn-close-scanner" onClick={onClose}>✕</button>
        </div>
        <div className="barcode-scanner-content">
          <div id="barcode-reader"></div>
          {!cameraStarted && !error && cameras.length > 0 && (
            <div className="scanner-loading">
              {cameras.length > 1 && (
                <div style={{ marginBottom: '1rem', width: '100%' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#aaa' }}>
                    Selecteer camera:
                  </label>
                  <select 
                    value={selectedCamera} 
                    onChange={(e) => setSelectedCamera(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      background: '#252525',
                      border: '1px solid #444',
                      borderRadius: '6px',
                      color: '#fff'
                    }}
                  >
                    {cameras.map(camera => (
                      <option key={camera.id} value={camera.id}>
                        {camera.label || `Camera ${camera.id}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <p>Klik op de knop om de camera te starten</p>
              <button 
                onClick={startScanning}
                className="btn-start-camera"
                disabled={isScanning || !selectedCamera}
              >
                📷 Start Camera
              </button>
            </div>
          )}
          {!cameraStarted && !error && cameras.length === 0 && (
            <div className="scanner-loading">
              <p>Camera's worden geladen...</p>
            </div>
          )}
          {error && (
            <div className="scanner-error">
              <p>{error}</p>
              <button 
                onClick={startScanning}
                className="btn-start-camera"
                disabled={!selectedCamera}
              >
                🔄 Probeer Opnieuw
              </button>
            </div>
          )}
        </div>
        <div className="barcode-scanner-footer">
          <p className="scanner-hint">
            {cameraStarted ? 'Houd de barcode in het vierkant' : 'Camera permissie vereist'}
          </p>
        </div>
      </div>
    </div>
  )
}
