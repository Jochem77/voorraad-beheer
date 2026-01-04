import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import './BarcodeScanner.css'

interface BarcodeScannerProps {
  isOpen: boolean
  onClose: () => void
  onScan: (code: string) => void
}

export function BarcodeScanner({ isOpen, onClose, onScan }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationRef = useRef<number | null>(null)
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
          setCameras(videoDevices)
          
          // Select last back camera (usually the main camera on phones)
          const backCameras = videoDevices.filter(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('rear') ||
            d.label.toLowerCase().includes('achter')
          )
          // Select last back camera (index -1)
          const selected = backCameras[backCameras.length - 1]?.deviceId || videoDevices[0]?.deviceId || ''
          setSelectedCamera(selected)
          
          // Automatically start camera
          if (selected) {
            startScanning(selected)
          }
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
      
      // Request camera access with specific device ID
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })
      
      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setCameraStarted(true)
        console.log('✅ Camera started successfully')
        
        // Start scanning loop
        scanQRCode()
      }
    } catch (err: any) {
      console.error('Failed to start camera:', err)
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera toegang geweigerd. Sta camera toegang toe in je browser instellingen.')
      } else if (err.name === 'NotFoundError') {
        setError('Geen camera gevonden op dit apparaat.')
      } else {
        setError('Kan camera niet starten: ' + (err.message || err.toString()))
      }
    }
  }

  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current) return
    
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationRef.current = requestAnimationFrame(scanQRCode)
      return
    }
    
    // Set canvas size to video size
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    
    // Try to decode QR code with all inversion attempts
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth'
    })
    
    if (code && code.data) {
      console.log('✅ QR Code scanned successfully:', code.data)
      onScan(code.data)
      stopScanning()
      onClose()
      return
    }
    
    // Continue scanning
    animationRef.current = requestAnimationFrame(scanQRCode)
  }

  const stopScanning = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
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
          <h3>Scan QR Code</h3>
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
            <canvas 
              ref={canvasRef}
              style={{ display: 'none' }}
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
            {cameraStarted ? 'Houd de QR code voor de camera' : 'Camera permissie vereist'}
          </p>
        </div>
      </div>
    </div>
  )
}
