import { useState } from 'react'
import { CheckCircle2, ShieldCheck, X, Building2, Phone, Calendar, User, ExternalLink, Award } from 'lucide-react'
import { formatImageUrl } from '../lib/imageUtils'

export interface VerificationData {
  code: string
  name: string
  type: string
  role?: string
  department?: string
  className?: string
  validUntil?: string
  school?: string
  verifiedAt?: string
  photoUrl?: string
  dbId?: string
}

const logo =
  'https://res.cloudinary.com/oilisvfi/image/upload/v1786000074/logo_final_frchld.jpg'

export default function DigitalVerificationModal({
  data,
  onClose,
  onScanAgain,
  onSelectInStudio,
}: {
  data: VerificationData
  onClose: () => void
  onScanAgain?: () => void
  onSelectInStudio?: () => void
}) {
  const [imgError, setImgError] = useState(false)

  const verifiedTimestamp = data.verifiedAt || new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  // Generate initials for avatar fallback
  const initials = data.name
    ? data.name
        .trim()
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0].toUpperCase())
        .join('')
    : 'ID'

  const formattedPhoto = data.photoUrl ? formatImageUrl(data.photoUrl) : ''
  const hasValidPhoto = Boolean(formattedPhoto && !imgError)

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(9, 26, 47, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          animation: 'fadeIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #09233f 0%, #154670 100%)',
            padding: '20px 24px',
            color: '#ffffff',
            position: 'relative',
            borderBottom: '3.5px solid #d8a940',
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img
              src={logo}
              alt="School Crest"
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                padding: '2px',
                boxShadow: '0 0 0 2px #d8a940',
              }}
            />
            <div>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  letterSpacing: '1.5px',
                  color: '#93c5fd',
                  textTransform: 'uppercase',
                }}
              >
                OFFICIAL DIGITAL CREDENTIAL
              </span>
              <h2 style={{ margin: '2px 0 0', fontSize: '17px', fontWeight: 800, color: '#ffffff' }}>
                ST. JOHN'S ENGLISH SCHOOL
              </h2>
              <span style={{ fontSize: '11px', color: '#cbd5e1' }}>
                T.N. Mukherjee Road Dankuni, Hooghly · W.B. 712311 · Affiliated Institution
              </span>
            </div>
          </div>
        </div>

        {/* Verification Status Banner */}
        <div
          style={{
            backgroundColor: '#ecfdf5',
            borderBottom: '1px solid #a7f3d0',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#065f46',
          }}
        >
          <CheckCircle2 size={22} color="#059669" />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>AUTHENTIC IDENTITY VERIFIED</span>
              <span
                style={{
                  fontSize: '10px',
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  fontWeight: 700,
                }}
              >
                LIVE
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#047857' }}>
              Scanned from Institutional QR · Verified in ERP Database
            </div>
          </div>
        </div>

        {/* Card Body Details */}
        <div style={{ padding: '20px 24px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '16px',
              padding: '12px 14px',
              backgroundColor: '#f8fafc',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div
              style={{
                width: '68px',
                height: '80px',
                borderRadius: '9px',
                backgroundColor: '#e2e8f0',
                overflow: 'hidden',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                border: '2px solid #cbd5e1',
                boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                position: 'relative',
              }}
            >
              {hasValidPhoto ? (
                <img
                  src={formattedPhoto}
                  alt={data.name || 'Member Photo'}
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(135deg, #1e3a5f 0%, #0d233a 100%)',
                    color: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '2px',
                  }}
                >
                  <span style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '1px', color: '#f8fafc' }}>
                    {initials}
                  </span>
                  <span style={{ fontSize: '8px', fontWeight: 700, color: '#93c5fd', letterSpacing: '0.5px' }}>
                    VERIFIED
                  </span>
                </div>
              )}
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  color: '#2563eb',
                  backgroundColor: '#eff6ff',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  display: 'inline-block',
                  marginBottom: '4px',
                }}
              >
                {data.type === 'student' ? 'Student Identity' : 'Faculty / Staff Member'}
              </span>
              <h3
                style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: 800,
                  color: '#0f172a',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {data.name || 'Verified Member'}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                {data.role || data.className || data.department || 'Active Member'}
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              fontSize: '12px',
              marginBottom: '16px',
            }}
          >
            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b', fontSize: '11px', display: 'block', fontWeight: 600 }}>
                {data.type === 'student' ? 'Admission No.' : 'Employee Code'}
              </span>
              <b style={{ color: '#0f172a', fontSize: '13px' }}>{data.code || '—'}</b>
            </div>

            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b', fontSize: '11px', display: 'block', fontWeight: 600 }}>
                Valid Until
              </span>
              <b style={{ color: '#0f172a', fontSize: '13px' }}>{data.validUntil || '2027-03-31'}</b>
            </div>

            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b', fontSize: '11px', display: 'block', fontWeight: 600 }}>
                Status
              </span>
              <b style={{ color: '#059669', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                ● Active & Authorized
              </b>
            </div>

            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b', fontSize: '11px', display: 'block', fontWeight: 600 }}>
                Emergency Contact
              </span>
              <b style={{ color: '#0f172a', fontSize: '13px' }}>9674368297</b>
            </div>
          </div>

          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#f1f5f9',
              borderRadius: '8px',
              fontSize: '11px',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Verified at: <b>{verifiedTimestamp}</b></span>
            <span style={{ color: '#2563eb', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={14} /> Official Record
            </span>
          </div>
        </div>

        {/* Footer actions */}
        <div
          style={{
            padding: '14px 24px',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            {onScanAgain && (
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onScanAgain()
                }}
                style={{
                  padding: '8px 14px',
                  backgroundColor: '#ffffff',
                  color: '#1e293b',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                Scan Another QR
              </button>
            )}
            {onSelectInStudio && (
              <button
                type="button"
                onClick={() => {
                  onSelectInStudio()
                  onClose()
                }}
                style={{
                  padding: '8px 14px',
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  border: '1px solid #bfdbfe',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Edit in ID Studio
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Close Certificate
          </button>
        </div>
      </div>
    </div>
  )
}
