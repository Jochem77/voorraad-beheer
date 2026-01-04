import { useEffect, useRef, useState } from 'react'
import { createWorker } from 'tesseract.js'
import './BarcodeScanner.css'

interface TextScannerProps {
  isOpen: boolean
  onClose: () => void
  onScan: (text: string) => void
}

export function TextScanner({ isOpen, onClose, onScan }: TextScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const ocrWorkerRef = useRef<any>(null)
  const scanIntervalRef = useRef<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cameraStarted, setCameraStarted] = useState(false)
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
  const [selectedCamera, setSelectedCamera] = useState<string>('')
  const [scanStatus, setScanStatus] = useState<string>('Initialiseren...')
  const [isScanning, setIsScanning] = useState(false)
  const [detectedText, setDetectedText] = useState<string>('')

  // Initialize Tesseract worker
  useEffect(() => {
    const initWorker = async () => {
      if (!ocrWorkerRef.current && isOpen) {
        try {
          setScanStatus('OCR initialiseren...')
          const worker = await createWorker('eng')
          await worker.setParameters({
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-',
          })
          ocrWorkerRef.current = worker
          setScanStatus('Klaar om te scannen')
          console.log('✅ Tesseract worker initialized')
        } catch (err) {
          console.error('Failed to initialize Tesseract:', err)
          setError('OCR kon niet gestart worden')
        }
      }
    }
    initWorker()

    return () => {
      if (ocrWorkerRef.current) {
        ocrWorkerRef.current.terminate()
        ocrWorkerRef.current = null
      }
    }
  }, [isOpen])

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
          const selected = backCamera?.deviceId || videoDevices[0]?.deviceId || ''
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
        setScanStatus('Houd tekst stil voor de camera')
        
        // Start periodic OCR scanning
        startOCRScanning()
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

  const startOCRScanning = () => {
    // Scan every 2 seconds to avoid performance issues
    scanIntervalRef.current = window.setInterval(() => {
      performOCR()
    }, 2000)
  }

  const performOCR = async () => {
    if (!videoRef.current || !canvasRef.current || !ocrWorkerRef.current || isScanning) return
    
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return
    
    setIsScanning(true)
    setScanStatus('Tekst herkennen...')
    
    try {
      // Set canvas size to video size
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      
      // Define scan area (center 60% width, 30% height)
      const scanWidth = Math.floor(canvas.width * 0.6)
      const scanHeight = Math.floor(canvas.height * 0.3)
      const scanX = Math.floor((canvas.width - scanWidth) / 2)
      const scanY = Math.floor((canvas.height - scanHeight) / 2)
      
      console.log('🔍 Scan gebied:', { scanX, scanY, scanWidth, scanHeight })
      
      // Create a temporary canvas for the cropped area
      const cropCanvas = document.createElement('canvas')
      cropCanvas.width = scanWidth
      cropCanvas.height = scanHeight
      const cropCtx = cropCanvas.getContext('2d')
      
      if (!cropCtx) return
      
      // Draw only the scan area to the crop canvas
      cropCtx.drawImage(canvas, scanX, scanY, scanWidth, scanHeight, 0, 0, scanWidth, scanHeight)
      
      // Perform OCR on the cropped canvas
      const { data: { text } } = await ocrWorkerRef.current.recognize(cropCanvas)
      
      console.log('📝 Ruwe OCR output:', text)
      
      // Clean up OCR result: remove whitespace and newlines
      const cleanText = text.replace(/\s+/g, '').trim()
      
      if (cleanText.length >= 3) {
        console.log('✅ Text detected via OCR:', cleanText)
        setDetectedText(cleanText)
        setScanStatus(`Gevonden: ${cleanText}`)
      } else {
        console.log('⚠️ Tekst te kort:', cleanText.length, 'karakters')
        setScanStatus('Houd tekst stil voor de camera')
      }
    } catch (err) {
      console.error('OCR error:', err)
      setScanStatus('Houd tekst stil voor de camera')
    } finally {
      setIsScanning(false)
    }
  }

  const stopScanning = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    
    setCameraStarted(false)
    setDetectedText('')
    console.log('Camera stopped')
  }

  const acceptDetectedText = () => {
    if (detectedText) {
      onScan(detectedText)
      stopScanning()
      onClose()
    }
  }

  useEffect(() => {
    if (!isOpen) {
      stopScanning()
      setError(null)
      setCameras([])
      setSelectedCamera('')
      setScanStatus('Initialiseren...')
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
          <h3>Scan Tekst</h3>
          <button className="btn-close-scanner" onClick={onClose}>✕</button>
        </div>
        <div className="barcode-scanner-content">
          {cameras.length > 1 && (
            <div style={{ padding: '1rem', marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#aaa', fontWeight: 500 }}>Selecteer camera:</label>
              <select 
                value={selectedCamera} 
                onChange={(e) => {
                  const newCameraId = e.target.value
                  setSelectedCamera(newCameraId)
                  console.log('🔄 Wisselen naar camera:', cameras.find(c => c.deviceId === newCameraId)?.label)
                  if (cameraStarted) {
                    stopScanning()
                    startScanning(newCameraId)
                  }
                }}
                style={{
                  width: '100%',
                  padding: '0.6rem',
                  border: '1px solid #444',
                  borderRadius: '6px',
                  backgroundColor: '#252525',
                  color: '#fff',
                  fontSize: '0.95rem'
                }}
              >
                {cameras.map(camera => (
                  <option key={camera.deviceId} value={camera.deviceId}>
                    {camera.label || `Camera ${cameras.indexOf(camera) + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div style={{ position: 'relative', width: '100%', maxWidth: '500px', margin: '0 auto' }}>
            <video 
              ref={videoRef}
              style={{ width: '100%', height: 'auto', display: cameraStarted ? 'block' : 'none' }}
              playsInline
              muted
            />
            {cameraStarted && (
              <div style={{  
                position: 'absolute',
                top: '35%',
                left: '20%',
                width: '60%',
                height: '30%',
                border: '3px solid #10b981',
                borderRadius: '8px',
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                pointerEvents: 'none',
                zIndex: 5
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-30px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: '#10b981',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap'
                }}>
                  Plaats serienummer hier
                </div>
              </div>
            )}
            {detectedText && (
              <div style={{
                position: 'absolute',
                top: '10px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(102, 126, 234, 0.95)',
                color: 'white',
                padding: '12px 20px',
                borderRadius: '8px',
                fontSize: '18px',
                fontWeight: 'bold',
                boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                zIndex: 10,
                maxWidth: '90%',
                wordBreak: 'break-all'
              }}>
                {detectedText}
              </div>
            )}
            <canvas 
              ref={canvasRef}
              style={{ display: 'none' }}
            />
            {!cameraStarted && !error && (
              <div className="scanner-loading">
                <p>{scanStatus}</p>
              </div>
            )}
          </div>
          {detectedText && (
            <div style={{ marginTop: '15px', textAlign: 'center', padding: '0 20px' }}>
              <button 
                onClick={acceptDetectedText}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginBottom: '10px'
                }}
              >
                ✓ Accepteer "{detectedText}"
              </button>
              <button 
                onClick={() => {
                  setDetectedText('')
                  setScanStatus('Houd tekst stil voor de camera')
                }}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Opnieuw scannen
              </button>
            </div>
          )}
          {error && (
            <div className="scanner-error">
              <p>{error}</p>
            </div>
          )}
        </div>
        <div className="barcode-scanner-footer">
          <p className="scanner-hint">
            {cameraStarted ? scanStatus : 'Camera permissie vereist'}
          </p>
        </div>
      </div>
    </div>
  )
}
