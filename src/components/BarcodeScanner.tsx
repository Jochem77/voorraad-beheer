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
          console.log('📹 Beschikbare camera\'s:', videoDevices.map(d => ({ id: d.deviceId, label: d.label })))
          setCameras(videoDevices)
          
          // Select last back camera (usually the main camera on phones)
          const backCameras = videoDevices.filter(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('rear') ||
            d.label.toLowerCase().includes('achter')
          )
          // Select last back camera (index -1)
          const selected = backCameras[backCameras.length - 1]?.deviceId || videoDevices[0]?.deviceId || ''
          console.log('🎯 Geselecteerde camera:', videoDevices.find(d => d.deviceId === selected)?.label)
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
      
      // Request camera access with higher resolution for better QR detection
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          width: { ideal: 3840, min: 1280 },
          height: { ideal: 2160, min: 720 },
          aspectRatio: { ideal: 16/9 },
          facingMode: 'environment'
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
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    
    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationRef.current = requestAnimationFrame(scanQRCode)
      return
    }
    
    // Set canvas size to video size
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    console.log('📸 Scanning frame:', canvas.width, 'x', canvas.height)
    
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
      console.log('📍 QR Code location:', code.location)
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
          {cameras.length > 1 && (
            <div style={{ marginBottom: '15px', padding: '0 20px' }}>
              <label htmlFor="camera-select" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Selecteer camera:
              </label>
              <select 
                id="camera-select"
                value={selectedCamera} 
                onChange={(e) => {
                  const newCameraId = e.target.value
                  setSelectedCamera(newCameraId)
                  console.log('🔄 Wisselen naar camera:', cameras.find(c => c.deviceId === newCameraId)?.label)
                  stopScanning()
                  startScanning(newCameraId)
                }}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  fontSize: '14px', 
                  borderRadius: '4px',
                  border: '1px solid #ccc'
                }}
              >
                {cameras.map((camera, index) => (
                  <option key={camera.deviceId} value={camera.deviceId}>
                    {camera.label || `Camera ${index + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div style={{ position: 'relative', width: '100%', maxWidth: '800px', margin: '0 auto' }}>
            <video 
              ref={videoRef}
              style={{ width: '100%', height: 'auto', display: cameraStarted ? 'block' : 'none' }}
              playsInline
              muted
            />
            {cameraStarted && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '70%',
                height: '70%',
                border: '3px solid rgba(0, 255, 0, 0.5)',
                borderRadius: '8px',
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.3)',
                pointerEvents: 'none'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-2px',
                  left: '-2px',
                  width: '30px',
                  height: '30px',
                  borderTop: '4px solid #00ff00',
                  borderLeft: '4px solid #00ff00'
                }} />
                <div style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  width: '30px',
                  height: '30px',
                  borderTop: '4px solid #00ff00',
                  borderRight: '4px solid #00ff00'
                }} />
                <div style={{
                  position: 'absolute',
                  bottom: '-2px',
                  left: '-2px',
                  width: '30px',
                  height: '30px',
                  borderBottom: '4px solid #00ff00',
                  borderLeft: '4px solid #00ff00'
                }} />
                <div style={{
                  position: 'absolute',
                  bottom: '-2px',
                  right: '-2px',
                  width: '30px',
                  height: '30px',
                  borderBottom: '4px solid #00ff00',
                  borderRight: '4px solid #00ff00'
                }} />
              </div>
            )}
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
            {cameraStarted ? 'Plaats de QR code binnen het groene kader' : 'Camera permissie vereist'}
          </p>
        </div>
      </div>
    </div>
  )
}
