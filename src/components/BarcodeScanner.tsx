import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode'
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

  const startScanning = async () => {
    try {
      setError(null)
      
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('barcode-reader')
      }

      const scanner = scannerRef.current
      
      console.log('Starting camera...')
      
      // Start the camera with back camera preference and autofocus
      await scanner.start(
        { 
          facingMode: 'environment',
          advanced: [
            { focusMode: 'continuous' as any },
            { focusMode: 'auto' as any }
          ]
        } as any,
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.777778
        },
        (decodedText) => {
          // Success callback
          console.log('Barcode scanned:', decodedText)
          onScan(decodedText)
          stopScanning()
          onClose()
        },
        (errorMessage) => {
          // Error callback - ignore continuous scanning errors
          if (!errorMessage.includes('NotFoundException') && !errorMessage.includes('No MultiFormat Readers')) {
            console.debug('Scan error:', errorMessage)
          }
        }
      )
      
      setCameraStarted(true)
      setIsScanning(true)
      console.log('Camera started successfully')
      
    } catch (err: any) {
      console.error('Failed to start camera:', err)
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera toegang geweigerd. Sta camera toegang toe in je browser instellingen.')
      } else if (err.name === 'NotFoundError') {
        setError('Geen camera gevonden op dit apparaat.')
      } else {
        setError('Kan camera niet starten: ' + (err.message || 'Onbekende fout'))
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
          {!cameraStarted && !error && (
            <div className="scanner-loading">
              <p>Klik op de knop om de camera te starten</p>
              <button 
                onClick={startScanning}
                className="btn-start-camera"
                disabled={isScanning}
              >
                📷 Start Camera
              </button>
            </div>
          )}
          {error && (
            <div className="scanner-error">
              <p>{error}</p>
              <button 
                onClick={startScanning}
                className="btn-start-camera"
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
