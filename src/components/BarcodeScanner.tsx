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

  useEffect(() => {
    if (!isOpen) {
      // Cleanup scanner when modal closes
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error)
        scannerRef.current = null
      }
      setIsScanning(false)
      setError(null)
      return
    }

    // Initialize scanner when modal opens
    if (!scannerRef.current) {
      setError(null)
      
      try {
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
            ]
          },
          false
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
            if (!errorMessage.includes('NotFoundException')) {
              console.debug('Scan error:', errorMessage)
            }
          }
        )

        scannerRef.current = scanner
        setIsScanning(true)
      } catch (err) {
        console.error('Scanner initialization error:', err)
        setError('Kan scanner niet starten. Controleer camera permissies.')
      }
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
            </div>
          )}
          {error && (
            <div className="scanner-error">
              <p>{error}</p>
              <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', color: '#aaa' }}>
                Deze app vereist HTTPS voor camera toegang. 
                Test op een mobiel apparaat via de gepubliceerde GitHub Pages URL.
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
