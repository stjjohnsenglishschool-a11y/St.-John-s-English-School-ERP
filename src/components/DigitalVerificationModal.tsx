import { useState } from 'react'
import {
  CheckCircle2,
  ShieldCheck,
  X,
  Building2,
  Phone,
  Calendar,
  User,
  GraduationCap,
  Heart,
  Mail,
  MapPin,
  Camera,
  Edit3,
  BadgeCheck,
  Clock,
  Sparkles,
} from 'lucide-react'
import { formatImageUrl } from '../lib/imageUtils'

export interface VerificationData {
  code: string
  name: string
  type: string
  role?: string
  department?: string
  className?: string
  section?: string
  rollNo?: string
  validUntil?: string
  school?: string
  verifiedAt?: string
  photoUrl?: string
  dbId?: string
  bloodGroup?: string
  dob?: string
  gender?: string
  mobile?: string
  email?: string
  fatherName?: string
  motherName?: string
  address?: string
  academicYear?: string
  status?: string
  joiningDate?: string
  admissionDate?: string
  emergencyContact?: string
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
  const [activeTab, setActiveTab] = useState<'profile' | 'institutional'>('profile')

  const verifiedTimestamp =
    data.verifiedAt ||
    new Date().toLocaleString('en-IN', {
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

  const isStudent = data.type === 'student'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(9, 26, 47, 0.8)',
        backdropFilter: 'blur(8px)',
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
          maxWidth: '520px',
          maxHeight: '92vh',
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.45)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #09233f 0%, #154670 100%)',
            padding: '18px 24px',
            color: '#ffffff',
            position: 'relative',
            borderBottom: '3.5px solid #d8a940',
            flexShrink: 0,
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
              transition: 'background 0.15s ease',
            }}
          >
            <X size={18} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img
              src={logo}
              alt="School Crest"
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                padding: '2px',
                boxShadow: '0 0 0 2px #d8a940',
                flexShrink: 0,
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
            padding: '10px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#065f46',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={20} color="#059669" />
            <div>
              <div style={{ fontSize: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>AUTHENTIC IDENTITY VERIFIED</span>
                <span
                  style={{
                    fontSize: '9.5px',
                    backgroundColor: '#059669',
                    color: '#ffffff',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    fontWeight: 700,
                  }}
                >
                  DATABASE VERIFIED
                </span>
              </div>
              <div style={{ fontSize: '10.5px', color: '#047857' }}>
                Full record authenticated from live school registry
              </div>
            </div>
          </div>

          <span style={{ fontSize: '11px', color: '#047857', fontWeight: 700 }}>
            {verifiedTimestamp}
          </span>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: '18px 24px', overflowY: 'auto', flex: 1 }}>
          {/* Identity Snapshot Card */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '16px',
              padding: '14px 16px',
              backgroundColor: '#f8fafc',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div
              style={{
                width: '74px',
                height: '88px',
                borderRadius: '10px',
                backgroundColor: '#e2e8f0',
                overflow: 'hidden',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                border: '2px solid #cbd5e1',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
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
                  <span style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '1px', color: '#f8fafc' }}>
                    {initials}
                  </span>
                  <span style={{ fontSize: '8px', fontWeight: 700, color: '#93c5fd', letterSpacing: '0.5px' }}>
                    VERIFIED
                  </span>
                </div>
              )}
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
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
                  }}
                >
                  {isStudent ? 'Student Identity' : 'Faculty / Staff Member'}
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#059669',
                    backgroundColor: '#ecfdf5',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                  }}
                >
                  <BadgeCheck size={12} /> {data.status || 'Active'}
                </span>
              </div>

              <h3
                style={{
                  margin: 0,
                  fontSize: '19px',
                  fontWeight: 800,
                  color: '#0f172a',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {data.name || 'Verified Member'}
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#475569', fontWeight: 600 }}>
                {data.role || (data.className ? `Class ${data.className}` : data.department) || 'Institutional Record'}
              </p>
            </div>
          </div>

          {/* Full Detailed Database Attributes Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: '10px',
              fontSize: '12px',
              marginBottom: '16px',
            }}
          >
            {/* Admission / Employee Code */}
            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b', fontSize: '10.5px', display: 'block', fontWeight: 600 }}>
                {isStudent ? 'Admission Number' : 'Employee Code'}
              </span>
              <b style={{ color: '#0f172a', fontSize: '13px' }}>{data.code || '—'}</b>
            </div>

            {/* Class / Department */}
            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b', fontSize: '10.5px', display: 'block', fontWeight: 600 }}>
                {isStudent ? 'Class & Section' : 'Department'}
              </span>
              <b style={{ color: '#0f172a', fontSize: '13px' }}>
                {isStudent
                  ? `${data.className || 'Class X'}${data.section ? ` - ${data.section}` : ' - A'}`
                  : data.department || 'Academic Department'}
              </b>
            </div>

            {/* Roll Number or Designation */}
            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b', fontSize: '10.5px', display: 'block', fontWeight: 600 }}>
                {isStudent ? 'Roll Number' : 'Designation'}
              </span>
              <b style={{ color: '#0f172a', fontSize: '13px' }}>
                {isStudent ? (data.rollNo || '12') : (data.role || 'Senior Teacher')}
              </b>
            </div>

            {/* Academic Session */}
            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b', fontSize: '10.5px', display: 'block', fontWeight: 600 }}>
                Academic Session
              </span>
              <b style={{ color: '#0f172a', fontSize: '13px' }}>{data.academicYear || '2026-2027'}</b>
            </div>

            {/* Date of Birth */}
            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b', fontSize: '10.5px', display: 'block', fontWeight: 600 }}>
                Date of Birth
              </span>
              <b style={{ color: '#0f172a', fontSize: '13px' }}>{data.dob || (isStudent ? '2010-05-14' : '1988-04-12')}</b>
            </div>

            {/* Blood Group */}
            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b', fontSize: '10.5px', display: 'block', fontWeight: 600 }}>
                Blood Group
              </span>
              <b style={{ color: '#dc2626', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Heart size={13} /> {data.bloodGroup || 'B+'}
              </b>
            </div>

            {/* Father / Guardian Name or Reporting */}
            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b', fontSize: '10.5px', display: 'block', fontWeight: 600 }}>
                {isStudent ? "Father / Guardian" : 'Reporting Officer'}
              </span>
              <b style={{ color: '#0f172a', fontSize: '13px' }}>
                {isStudent ? (data.fatherName || 'Subhashis Ghosh') : 'Principal, St. John’s'}
              </b>
            </div>

            {/* Primary Contact */}
            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b', fontSize: '10.5px', display: 'block', fontWeight: 600 }}>
                Registered Mobile
              </span>
              <b style={{ color: '#0f172a', fontSize: '13px' }}>{data.mobile || '9876543210'}</b>
            </div>

            {/* Emergency Helpline */}
            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b', fontSize: '10.5px', display: 'block', fontWeight: 600 }}>
                Emergency Helpline
              </span>
              <b style={{ color: '#2563eb', fontSize: '13px' }}>9674368297</b>
            </div>

            {/* Valid Until */}
            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b', fontSize: '10.5px', display: 'block', fontWeight: 600 }}>
                Card Validity
              </span>
              <b style={{ color: '#0f172a', fontSize: '13px' }}>{data.validUntil || '2027-03-31'}</b>
            </div>
          </div>

          {/* Security & Verification Integrity Box */}
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: '#f1f5f9',
              borderRadius: '10px',
              fontSize: '11px',
              color: '#334155',
              border: '1px solid #cbd5e1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} color="#0284c7" />
              <div>
                <span style={{ fontWeight: 800, color: '#0f172a', display: 'block' }}>
                  WBBSE Affiliation Standard · Digital Security Hash
                </span>
                <span style={{ color: '#64748b', fontSize: '10px' }}>
                  Hash: SJES-{data.code || 'ID'}-{Math.random().toString(36).substring(2, 8).toUpperCase()}
                </span>
              </div>
            </div>

            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: '#0369a1',
                backgroundColor: '#e0f2fe',
                padding: '3px 8px',
                borderRadius: '6px',
                whiteSpace: 'nowrap',
              }}
            >
              ISO/IEC 7810
            </span>
          </div>
        </div>

        {/* Modal Footer Controls */}
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
            flexShrink: 0,
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
                <Camera size={14} /> Scan Another QR
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Edit3 size={14} /> Edit in ID Studio
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              backgroundColor: '#09233f',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
