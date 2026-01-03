import { useEffect, useRef, useState } from 'react'
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode'
import './BarcodeScanner.css'

interface BarcodeScannerProps {
  isOpen: boolean
  onClose: () => void
  onScan: (code: string) => void
}

export function BarcodeScanner({ isOpen, onClose, onScan }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsPermission, setNeedsPermission] = useState(false)

  const requestCameraPermission = async () => {
    try {
      setError(null)
      setNeedsPermission(false)
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      // Stop the stream immediately, we just needed permission
      stream.getTracks().forEach(track => track.stop())
      console.log('Camera permission granted')
      // Trigger scanner initialization
      window.location.reload()
    } catch (err) {
      console.error('Camera permission denied:', err)
      setError('Camera toegang geweigerd. Sta camera toegang toe in je browser instellingen.')
    }
  }

  useEffect(() => {
    if (!isOpen) {
      // Cleanup scanner when modal closes
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error)
        scannerRef.current = null
      }
      setIsScanning(false)
      setError(null)
      setNeedsPermission(false)
      return
    }

    // Check camera permission first
    const checkAndInitScanner = async () => {
      try {
        // Check if we have camera permissions
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          // Try to get permission
          console.log('Checking camera permissions...')
          
          const scanner = new Html5QrcodeScanner(
            'barcode-reader',
            {
              fps: 10,
              qrbox: { width: 250, height: 150 },
              supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
              rememberLastUsedCamera: true,
              showTorchButtonIfSupported: true,
              formatsToSupport: [
                0, // QR_CODE
                8, // CODE_128
                13, // CODE_39
                5, // EAN_13
                4, // EAN_8
                11, // UPC_A
                12  // UPC_E
              ],
              aspectRatio: 1.777778,
              disableFlip: false
            },
            true // verbose logging
          )

          scanner.render(
            (decodedText) => {
              // Success callback
              console.log('Barcode scanned:', decodedText)
              onScan(decodedText)
              scanner.clear().catch(console.error)
              scannerRef.current = null
              setIsScanning(false)
              onClose()
            },
            (errorMessage) => {
              // Error callback - ignore continuous scanning errors
              if (!errorMessage.includes('NotFoundException') && !errorMessage.includes('No MultiFormat Readers')) {
                console.log('Scan error:', errorMessage)
                if (errorMessage.includes('Permission') || errorMessage.includes('NotAllowedError')) {
                  setNeedsPermission(true)
                  setError('Camera toegang vereist. Klik hieronder om toegang te geven.')
                }
              }
            }
          )

          scannerRef.current = scanner
          setIsScanning(true)
        } else {
          setError('Je browser ondersteunt geen camera toegang.')
        }
      } catch (err: any) {
        console.error('Scanner initialization error:', err)
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setNeedsPermission(true)
          setError('Camera toegang vereist. Klik hieronder om toegang te geven.')
        } else {
          setError('Kan scanner niet starten: ' + (err.message || 'Onbekende fout'))
        }
      }
    }

    if (!scannerRef.current) {
      setError(null)
      setNeedsPermission(false)
      checkAndInitScanner()
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error)
        scannerRef.current = null
      }
    }
  }, [isOpen, onScan, onClose])

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
          {!isScanning && !error && (
            <div className="scanner-loading">
              <p>Camera wordt geïnitialiseerd...</p>
              <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', color: '#aaa' }}>
                De browser zal om camera toegang vragen
              </p>
            </div>
          )}
          {error && (
            <div className="scanner-error">
              <p>{error}</p>
              {needsPermission && (
                <button 
                  onClick={requestCameraPermission}
                  className="btn-grant-permission"
                >
                  📷 Camera Toegang Toestaan
                </button>
              )}
              <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', color: '#aaa' }}>
                {window.location.protocol === 'https:' 
                  ? 'Zorg ervoor dat je camera toegang hebt toegestaan in de browser.'
                  : 'Deze app vereist HTTPS voor camera toegang. Test op de gepubliceerde GitHub Pages URL.'}
              </p>
            </div>
          )}
        </div>
        <div className="barcode-scanner-footer">
          <p className="scanner-hint">Houd de barcode in het vierkant</p>
        </div>
      </div>
    </div>
  )
}
