import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeScannerState, CameraDevice, Html5QrcodeSupportedFormats } from 'html5-qrcode'
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
          // Always use camera 0
          setSelectedCamera(devices[0].id)
          // Automatically start scanning with camera 0
          setTimeout(() => {
            startScanning()
          }, 100)
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
      
      // Configure scanner for QR code only
      const config: any = {
        fps: 5,
        qrbox: { width: 280, height: 200 },
        aspectRatio: 1.777778,
        disableFlip: false,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE
        ],
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      }
      
      console.log('Scanner config:', config)
      
      await scanner.start(
        cameraId,
        config,
        (decodedText) => {
          console.log('✅ Barcode successfully scanned:', decodedText)
          console.log('Calling onScan callback...')
          
          // Call the callback first
          onScan(decodedText)
          
          // Then stop and close
          setTimeout(() => {
            stopScanning()
            onClose()
          }, 100)
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
              <p>Camera wordt gestart...</p>
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
