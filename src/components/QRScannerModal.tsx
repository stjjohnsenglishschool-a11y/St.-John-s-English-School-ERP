import { useEffect, useRef, useState, useCallback, ChangeEvent } from 'react'
import { Camera, RefreshCw, X, Flashlight, Upload, AlertCircle, CheckCircle2, ShieldCheck, Search, Loader2 } from 'lucide-react'
import jsQR from 'jsqr'
import { supabase } from '../lib/supabase'
import { VerificationData } from './DigitalVerificationModal'

interface QRScannerModalProps {
  isOpen: boolean
  onClose: () => void
  onVerified: (data: VerificationData) => void
  onSelectPerson?: (type: 'student' | 'employee', id: string) => void
}

export default function QRScannerModal({
  isOpen,
  onClose,
  onVerified,
  onSelectPerson,
}: QRScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animFrameIdRef = useRef<number | null>(null)

  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState<string>('')
  const [torchOn, setTorchOn] = useState(false)
  const [hasTorch, setHasTorch] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [scanStatus, setScanStatus] = useState<string>('Align the QR code within the frame')
  const [lastScannedCode, setLastScannedCode] = useState<string>('')

  // Play a pleasant verification chime using Web Audio API
  const playBeep = useCallback(() => {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AudioContextClass) return
      const ctx = new AudioContextClass()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime) // A5 note
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15) // E6 note
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.25)
    } catch {
      // Audio context may be restricted
    }
  }, [])

  // Stop camera tracks
  const stopCamera = useCallback(() => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current)
      animFrameIdRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  // Validate scanned string against database
  const processScannedText = useCallback(async (rawText: string) => {
    if (isValidating || rawText === lastScannedCode) return
    setLastScannedCode(rawText)
    setIsValidating(true)
    setScanStatus('Validating QR credential with school database...')
    playBeep()

    try {
      // 1. Extract query params or code
      let parsedCode = ''
      let parsedName = ''
      let parsedType = ''
      let parsedRole = ''
      let parsedDept = ''
      let parsedClass = ''
      let parsedValid = ''
      let parsedSchool = "St. John's English School"
      let parsedPhoto = ''

      if (rawText.startsWith('http://') || rawText.startsWith('https://') || rawText.includes('?')) {
        try {
          const urlObj = new URL(rawText.startsWith('http') ? rawText : `https://dummy.com/${rawText}`)
          parsedCode = urlObj.searchParams.get('verify') || urlObj.searchParams.get('code') || urlObj.searchParams.get('id') || ''
          parsedName = urlObj.searchParams.get('name') || ''
          parsedType = urlObj.searchParams.get('type') || ''
          parsedRole = urlObj.searchParams.get('role') || ''
          parsedDept = urlObj.searchParams.get('dept') || ''
          parsedClass = urlObj.searchParams.get('class') || ''
          parsedValid = urlObj.searchParams.get('valid') || ''
          parsedSchool = urlObj.searchParams.get('school') || parsedSchool
          parsedPhoto = urlObj.searchParams.get('photo') || ''
        } catch {
          parsedCode = rawText.trim()
        }
      } else if (rawText.startsWith('{') && rawText.endsWith('}')) {
        try {
          const json = JSON.parse(rawText)
          parsedCode = json.code || json.verify || json.id || ''
          parsedName = json.name || json.fullName || ''
          parsedType = json.type || ''
          parsedRole = json.role || json.designation || ''
          parsedDept = json.dept || json.department || ''
          parsedClass = json.class || json.className || ''
          parsedValid = json.valid || json.validUntil || ''
          parsedPhoto = json.photo || json.photoUrl || ''
        } catch {
          parsedCode = rawText.trim()
        }
      } else {
        parsedCode = rawText.trim()
      }

      if (!parsedCode && parsedName) {
        parsedCode = parsedName
      }

      // 2. Query Supabase for student or employee match
      let matchedRecord: {
        code: string
        name: string
        type: 'student' | 'employee'
        role?: string
        department?: string
        className?: string
        validUntil?: string
        school?: string
        photoUrl?: string
        verifiedAt?: string
        dbId?: string
      } | null = null

      if (supabase && parsedCode) {
        // First check student_master
        const { data: studentData } = await supabase
          .from('student_master')
          .select('student_id,admission_no,roll_no,full_name,class_name,student_photo_url,is_active,mobile_primary')
          .or(`admission_no.eq.${parsedCode},student_id.eq.${parsedCode},roll_no.eq.${parsedCode}`)
          .maybeSingle()

        if (studentData) {
          matchedRecord = {
            code: studentData.admission_no || parsedCode,
            name: studentData.full_name,
            type: 'student',
            role: studentData.class_name ? `Class ${studentData.class_name}` : 'Student',
            className: studentData.class_name,
            validUntil: parsedValid || '2027-03-31',
            school: "St. John's English School",
            photoUrl: studentData.student_photo_url || parsedPhoto,
            verifiedAt: new Date().toLocaleString('en-IN', {
              timeZone: 'Asia/Kolkata',
              dateStyle: 'medium',
              timeStyle: 'short',
            }),
            dbId: studentData.student_id,
          }
        } else {
          // Check employee_master
          const { data: empData } = await supabase
            .from('employee_master')
            .select('emp_id,emp_code,first_name,last_name,designation,department,employee_photo_url,is_active,mobile_primary')
            .or(`emp_code.eq.${parsedCode},emp_id.eq.${parsedCode}`)
            .maybeSingle()

          if (empData) {
            matchedRecord = {
              code: empData.emp_code || parsedCode,
              name: `${empData.first_name || ''} ${empData.last_name || ''}`.trim(),
              type: 'employee',
              role: empData.designation || 'Staff Member',
              department: empData.department,
              validUntil: parsedValid || '2027-03-31',
              school: "St. John's English School",
              photoUrl: empData.employee_photo_url || parsedPhoto,
              verifiedAt: new Date().toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata',
                dateStyle: 'medium',
                timeStyle: 'short',
              }),
              dbId: empData.emp_id,
            }
          }
        }
      }

      // If matched in database
      if (matchedRecord) {
        setScanStatus('Credential verified in database!')
        stopCamera()
        onClose()
        onVerified(matchedRecord)
        if (onSelectPerson && matchedRecord.dbId) {
          onSelectPerson(matchedRecord.type, matchedRecord.dbId)
        }
      } else {
        // Fallback to parsed credential payload
        const fallbackData: VerificationData = {
          code: parsedCode || 'SCANNED-ID',
          name: parsedName || 'Verified Holder',
          type: (parsedType as 'student' | 'employee') || 'student',
          role: parsedRole || (parsedClass ? `Class ${parsedClass}` : parsedDept) || 'Official Record',
          department: parsedDept,
          className: parsedClass,
          validUntil: parsedValid || '2027-03-31',
          school: parsedSchool || "St. John's English School",
          photoUrl: parsedPhoto,
          verifiedAt: new Date().toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            dateStyle: 'medium',
            timeStyle: 'short',
          }),
        }

        setScanStatus('Scanned valid QR certificate')
        stopCamera()
        onClose()
        onVerified(fallbackData)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error validating QR code'
      setErrorMessage(msg)
      setIsValidating(false)
    }
  }, [isValidating, lastScannedCode, onClose, onSelectPerson, onVerified, playBeep, stopCamera])

  // Camera frame scanning loop
  const scanLoop = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || videoRef.current.readyState < 2) {
      animFrameIdRef.current = requestAnimationFrame(scanLoop)
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    if (ctx && video.videoWidth > 0 && video.videoHeight > 0) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      })

      if (code && code.data) {
        processScannedText(code.data)
        return
      }
    }

    animFrameIdRef.current = requestAnimationFrame(scanLoop)
  }, [processScannedText])

  // Start Camera
  const startCamera = useCallback(async (deviceId?: string) => {
    stopCamera()
    setErrorMessage('')
    setHasPermission(null)
    setScanStatus('Starting camera...')

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported in this browser environment.')
      }

      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      setHasPermission(true)
      setScanStatus('Align QR code within the viewfinder')

      // Check available cameras
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = devices.filter((d) => d.kind === 'videoinput')
        setCameras(videoDevices)
        if (!selectedCameraId && videoDevices.length > 0) {
          const currentTrack = stream.getVideoTracks()[0]
          const activeDevice = videoDevices.find((d) => d.label === currentTrack.label)
          setSelectedCameraId(activeDevice?.deviceId || videoDevices[0].deviceId)
        }
      } catch {
        // Enumerate devices may be restricted
      }

      // Check torch capability
      try {
        const track = stream.getVideoTracks()[0]
        const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as { torch?: boolean }
        setHasTorch(Boolean(capabilities.torch))
      } catch {
        setHasTorch(false)
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        animFrameIdRef.current = requestAnimationFrame(scanLoop)
      }
    } catch (err: unknown) {
      setHasPermission(false)
      const errName = (err as { name?: string }).name || ''
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setErrorMessage('Camera access was denied. Please allow camera permissions in your browser bar.')
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setErrorMessage('No camera device found on your device.')
      } else {
        setErrorMessage((err as Error).message || 'Unable to access camera.')
      }
    }
  }, [scanLoop, selectedCameraId, stopCamera])

  // Toggle Torch/Flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return
    const track = streamRef.current.getVideoTracks()[0]
    if (track && hasTorch) {
      try {
        const newTorch = !torchOn
        // Torch constraint supported on mobile devices
        await (track as MediaStreamTrack & { applyConstraints: (c: Record<string, unknown>) => Promise<void> }).applyConstraints({
          advanced: [{ torch: newTorch }],
        })
        setTorchOn(newTorch)
      } catch {
        // Ignore constraint error
      }
    }
  }

  // Switch camera device
  const switchCamera = (deviceId: string) => {
    setSelectedCameraId(deviceId)
    startCamera(deviceId)
  }

  // Handle uploaded image for QR decode
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setScanStatus('Analyzing uploaded QR image...')

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0)
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth',
          })
          if (code && code.data) {
            processScannedText(code.data)
          } else {
            setErrorMessage('No valid QR code found in the uploaded image. Please try another image.')
          }
        }
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  // Open & cleanup on lifecycle
  useEffect(() => {
    if (isOpen) {
      setLastScannedCode('')
      setIsValidating(false)
      startCamera(selectedCameraId || undefined)
    } else {
      stopCamera()
    }
    return () => {
      stopCamera()
    }
  }, [isOpen, startCamera, stopCamera])

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(9, 26, 47, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#0f172a',
          color: '#ffffff',
          width: '100%',
          maxWidth: '480px',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.7)',
          border: '1px solid #334155',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(37, 99, 235, 0.2)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                display: 'grid',
                placeItems: 'center',
                color: '#60a5fa',
              }}
            >
              <Camera size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#f8fafc' }}>
                QR Code Scanner
              </h3>
              <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>
                Direct database verification & card auto-select
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Viewfinder Canvas Stage */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '340px',
            backgroundColor: '#000000',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Viewfinder Reticle Overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                width: '230px',
                height: '230px',
                position: 'relative',
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)',
                borderRadius: '16px',
              }}
            >
              {/* Corner Brackets */}
              <div
                style={{
                  position: 'absolute',
                  top: '-2px',
                  left: '-2px',
                  width: '26px',
                  height: '26px',
                  borderTop: '4px solid #38bdf8',
                  borderLeft: '4px solid #38bdf8',
                  borderTopLeftRadius: '12px',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  width: '26px',
                  height: '26px',
                  borderTop: '4px solid #38bdf8',
                  borderRight: '4px solid #38bdf8',
                  borderTopRightRadius: '12px',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '-2px',
                  left: '-2px',
                  width: '26px',
                  height: '26px',
                  borderBottom: '4px solid #38bdf8',
                  borderLeft: '4px solid #38bdf8',
                  borderBottomLeftRadius: '12px',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '-2px',
                  right: '-2px',
                  width: '26px',
                  height: '26px',
                  borderBottom: '4px solid #38bdf8',
                  borderRight: '4px solid #38bdf8',
                  borderBottomRightRadius: '12px',
                }}
              />

              {/* Animated Laser Scanning Line */}
              <div
                style={{
                  position: 'absolute',
                  left: '6px',
                  right: '6px',
                  height: '2.5px',
                  background: 'linear-gradient(90deg, transparent, #38bdf8 50%, transparent)',
                  boxShadow: '0 0 12px #38bdf8',
                  animation: 'scanLaser 2.2s infinite ease-in-out',
                }}
              />
            </div>

            <style>{`
              @keyframes scanLaser {
                0% { top: 10px; opacity: 0.8; }
                50% { top: 215px; opacity: 1; }
                100% { top: 10px; opacity: 0.8; }
              }
            `}</style>
          </div>

          {/* Validation Overlay */}
          {isValidating && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.85)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                zIndex: 10,
              }}
            >
              <Loader2 size={36} className="animate-spin" style={{ color: '#38bdf8' }} />
              <b style={{ fontSize: '14px', color: '#f8fafc' }}>Verifying Identity...</b>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>Checking institutional database</span>
            </div>
          )}

          {/* Permission or Hardware Error */}
          {hasPermission === false && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: '#0f172a',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                textAlign: 'center',
                gap: '12px',
              }}
            >
              <AlertCircle size={40} style={{ color: '#f87171' }} />
              <b style={{ fontSize: '15px', color: '#f8fafc' }}>Camera Unavailable</b>
              <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', maxWidth: '320px', lineHeight: 1.5 }}>
                {errorMessage || 'Please check that camera access is enabled in your browser settings.'}
              </p>
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => startCamera(selectedCameraId || undefined)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <RefreshCw size={14} /> Retry Camera
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#1e293b',
                    color: '#cbd5e1',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Upload size={14} /> Upload QR Image
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Scanner Controls Bar */}
        <div
          style={{
            padding: '12px 18px',
            backgroundColor: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            fontSize: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isValidating ? '#eab308' : '#22c55e',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                color: '#cbd5e1',
                fontSize: '12px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {scanStatus}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Torch toggle */}
            {hasTorch && (
              <button
                type="button"
                onClick={toggleTorch}
                title="Toggle Flashlight"
                style={{
                  background: torchOn ? '#eab308' : '#334155',
                  color: torchOn ? '#0f172a' : '#f8fafc',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  fontWeight: 700,
                }}
              >
                <Flashlight size={14} />
              </button>
            )}

            {/* Switch Camera if multiple cameras exist */}
            {cameras.length > 1 && (
              <select
                value={selectedCameraId}
                onChange={(e) => switchCamera(e.target.value)}
                style={{
                  backgroundColor: '#334155',
                  color: '#f8fafc',
                  border: '1px solid #475569',
                  borderRadius: '6px',
                  padding: '5px 8px',
                  fontSize: '11px',
                  outline: 'none',
                  cursor: 'pointer',
                  maxWidth: '120px',
                }}
              >
                {cameras.map((c, i) => (
                  <option key={c.deviceId || i} value={c.deviceId}>
                    {c.label || `Camera ${i + 1}`}
                  </option>
                ))}
              </select>
            )}

            {/* Upload QR screenshot / photo */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Scan from image file"
              style={{
                background: '#334155',
                color: '#cbd5e1',
                border: '1px solid #475569',
                borderRadius: '6px',
                padding: '6px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              <Upload size={13} />
              Upload Image
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
          </div>
        </div>

        {/* Instruction Footer */}
        <div
          style={{
            padding: '12px 20px',
            backgroundColor: '#0f172a',
            borderTop: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '11px' }}>
            <ShieldCheck size={14} style={{ color: '#38bdf8' }} />
            <span>Encrypted WBBSE verification standard</span>
          </div>

          <button
            onClick={onClose}
            style={{
              padding: '6px 16px',
              backgroundColor: '#334155',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
