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

  useEffect(() => {
    if (!isOpen) {
      // Cleanup scanner when modal closes
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error)
        scannerRef.current = null
      }
      setIsScanning(false)
      return
    }

    // Initialize scanner when modal opens
    if (!scannerRef.current) {
      const scanner = new Html5QrcodeScanner(
        'barcode-reader',
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          rememberLastUsedCamera: true,
          showTorchButtonIfSupported: true
        },
        false
      )

      scanner.render(
        (decodedText) => {
          // Success callback
          onScan(decodedText)
          scanner.clear().catch(console.error)
          scannerRef.current = null
          setIsScanning(false)
          onClose()
        },
        (errorMessage) => {
          // Error callback - ignore continuous scanning errors
          console.debug('Scan error:', errorMessage)
        }
      )

      scannerRef.current = scanner
      setIsScanning(true)
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
          {!isScanning && (
            <div className="scanner-loading">
              <p>Camera wordt geïnitialiseerd...</p>
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
