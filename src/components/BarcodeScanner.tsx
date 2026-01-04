import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library'
import './BarcodeScanner.css'

interface BarcodeScannerProps {
  isOpen: boolean
  onClose: () => void
  onScan: (code: string) => void
}

export function BarcodeScanner({ isOpen, onClose, onScan }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cameraStarted, setCameraStarted] = useState(false)
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
  const [selectedCamera, setSelectedCamera] = useState<string>('')

  // Get available cameras when modal opens
  useEffect(() => {
    if (isOpen && cameras.length === 0) {
      navigator.mediaDevices.enumerateDevices()
        .then(devices => {
          const videoDevices = devices.filter(device => device.kind === 'videoinput')
          console.log('Available cameras:', videoDevices)
          setCameras(videoDevices)
          
          // Try to select back camera by default
          const backCamera = videoDevices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('rear') ||
            d.label.toLowerCase().includes('achter')
          )
          setSelectedCamera(backCamera?.deviceId || videoDevices[0]?.deviceId || '')
        })
        .catch(err => {
          console.error('Error getting cameras:', err)
          setError('Kan camera lijst niet ophalen')
        })
    }
  }, [isOpen])

  const startScanning = async (cameraId?: string) => {
    try {
      setError(null)
      console.log('⏳ Starting camera...')
      
      const deviceId = cameraId || selectedCamera
      
      if (!deviceId) {
        setError('Geen camera geselecteerd')
        return
      }
      
      // Initialize ZXing reader with format hints
      if (!readerRef.current) {
        const hints = new Map()
        const formats = [
          BarcodeFormat.QR_CODE,        // QR codes
          BarcodeFormat.EAN_13,         // Retail products
          BarcodeFormat.EAN_8,          // Smaller retail products
          BarcodeFormat.CODE_128,       // Logistics/shipping
          BarcodeFormat.CODE_39,        // Industrial
          BarcodeFormat.UPC_A,          // North American products
          BarcodeFormat.UPC_E,          // Smaller UPC
          BarcodeFormat.ITF,            // Cartons/cases
          BarcodeFormat.CODABAR         // Libraries, blood banks
        ]
        hints.set(DecodeHintType.POSSIBLE_FORMATS, formats)
        hints.set(DecodeHintType.TRY_HARDER, true)
        
        readerRef.current = new BrowserMultiFormatReader(hints)
      }
      
      setCameraStarted(true)
      console.log('✅ Starting ZXing scanner...')
      
      // Start continuous decode from video device
      await readerRef.current.decodeFromVideoDevice(
        deviceId,
        videoRef.current!,
        (result) => {
          if (result) {
            const code = result.getText()
            console.log('✅ Barcode scanned:', code, 'Format:', result.getBarcodeFormat())
            onScan(code)
            stopScanning()
            onClose()
          }
          // Silently continue on decode errors (no code in frame)
        }
      )
    } catch (err: any) {
      console.error('Failed to start camera:', err)
      setCameraStarted(false)
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera toegang geweigerd. Sta camera toegang toe in je browser instellingen.')
      } else if (err.name === 'NotFoundError') {
        setError('Geen camera gevonden op dit apparaat.')
      } else {
        setError('Kan camera niet starten: ' + (err.message || err.toString()))
      }
    }
  }

  const stopScanning = () => {
    if (readerRef.current) {
      readerRef.current.reset()
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    
    setCameraStarted(false)
    console.log('Camera stopped')
  }

  useEffect(() => {
    if (!isOpen) {
      stopScanning()
      setError(null)
      setCameras([])
      setSelectedCamera('')
    }
    
    return () => {
      stopScanning()
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="barcode-scanner-overlay" onClick={onClose}>
      <div className="barcode-scanner-modal" onClick={(e) => e.stopPropagation()}>
        <div className="barcode-scanner-header">
          <h3>Scan Barcode</h3>
          <button className="btn-close-scanner" onClick={onClose}>✕</button>
        </div>
        <div className="barcode-scanner-content">
          {!cameraStarted && cameras.length > 0 && (
            <div style={{ padding: '1rem', marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#aaa', fontWeight: 500 }}>Selecteer camera:</label>
              <select 
                value={selectedCamera} 
                onChange={(e) => setSelectedCamera(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem',
                  border: '1px solid #444',
                  borderRadius: '6px',
                  backgroundColor: '#252525',
                  color: '#fff',
                  fontSize: '0.95rem',
                  marginBottom: '1rem'
                }}
              >
                {cameras.map(camera => (
                  <option key={camera.deviceId} value={camera.deviceId}>
                    {camera.label || `Camera ${cameras.indexOf(camera) + 1}`}
                  </option>
                ))}
              </select>
              <button 
                onClick={() => startScanning(selectedCamera)}
                style={{
                  width: '100%',
                  padding: '0.8rem',
                  backgroundColor: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                📷 Start Camera
              </button>
            </div>
          )}
          <div style={{ position: 'relative', width: '100%', maxWidth: '500px', margin: '0 auto' }}>
            <video 
              ref={videoRef}
              style={{ width: '100%', height: 'auto', display: cameraStarted ? 'block' : 'none' }}
              playsInline
              muted
            />

            {!cameraStarted && !error && (
              <div className="scanner-loading">
                <p>Camera wordt gestart...</p>
              </div>
            )}
          </div>
          {error && (
            <div className="scanner-error">
              <p>{error}</p>
            </div>
          )}
        </div>
        <div className="barcode-scanner-footer">
          <p className="scanner-hint">
            {cameraStarted ? 'Houd de barcode of QR code voor de camera' : 'Camera permissie vereist'}
          </p>
        </div>
      </div>
    </div>
  )
}
