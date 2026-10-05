import React, { ChangeEvent, RefObject } from 'react'
import {
  GraduationCap,
  User,
  Check,
  Upload,
} from 'lucide-react'
import { formatImageUrl, handleImageError } from '../lib/imageUtils'

type EscortFormFieldsProps = {
  escortActiveTab: 'all' | 'student' | 'father' | 'mother'
  setEscortActiveTab: (tab: 'all' | 'student' | 'father' | 'mother') => void
  studentName: string
  setStudentName: (val: string) => void
  className: string
  setClassName: (val: string) => void
  rollNo: string
  setRollNo: (val: string) => void
  photoUrl: string
  setPhotoUrl: (val: string) => void
  visibleStudentPhoto: string
  fatherName: string
  setFatherName: (val: string) => void
  fatherContact: string
  setFatherContact: (val: string) => void
  fatherPhotoUrl: string
  setFatherPhotoUrl: (val: string) => void
  visibleFatherPhoto: string
  motherName: string
  setMotherName: (val: string) => void
  motherContact: string
  setMotherContact: (val: string) => void
  motherPhotoUrl: string
  setMotherPhotoUrl: (val: string) => void
  visibleMotherPhoto: string
  uploadingTarget: 'student' | 'father' | 'mother' | null
  studentFileRef: RefObject<HTMLInputElement | null>
  fatherFileRef: RefObject<HTMLInputElement | null>
  motherFileRef: RefObject<HTMLInputElement | null>
  handlePhotoUploadFor: (
    target: 'student' | 'father' | 'mother',
    event: ChangeEvent<HTMLInputElement>
  ) => void
}

export const EscortFormFields: React.FC<EscortFormFieldsProps> = ({
  escortActiveTab,
  setEscortActiveTab,
  studentName,
  setStudentName,
  className,
  setClassName,
  rollNo,
  setRollNo,
  photoUrl,
  setPhotoUrl,
  visibleStudentPhoto,
  fatherName,
  setFatherName,
  fatherContact,
  setFatherContact,
  fatherPhotoUrl,
  setFatherPhotoUrl,
  visibleFatherPhoto,
  motherName,
  setMotherName,
  motherContact,
  setMotherContact,
  motherPhotoUrl,
  setMotherPhotoUrl,
  visibleMotherPhoto,
  uploadingTarget,
  studentFileRef,
  fatherFileRef,
  motherFileRef,
  handlePhotoUploadFor,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginTop: '10px',
      }}
    >
      {/* Quick Section Switcher Pills */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          background: '#f1f5f9',
          padding: '3px',
          borderRadius: '8px',
        }}
      >
        <button
          type="button"
          onClick={() => setEscortActiveTab('all')}
          style={{
            flex: 1,
            height: '28px',
            border: 'none',
            borderRadius: '6px',
            fontSize: '10px',
            fontWeight: 800,
            cursor: 'pointer',
            background: escortActiveTab === 'all' ? '#fff' : 'transparent',
            color: escortActiveTab === 'all' ? '#0f172a' : '#64748b',
            boxShadow:
              escortActiveTab === 'all'
                ? '0 1px 3px rgba(0,0,0,0.1)'
                : 'none',
          }}
        >
          All (3)
        </button>
        <button
          type="button"
          onClick={() => setEscortActiveTab('student')}
          style={{
            flex: 1,
            height: '28px',
            border: 'none',
            borderRadius: '6px',
            fontSize: '10px',
            fontWeight: 800,
            cursor: 'pointer',
            background:
              escortActiveTab === 'student' ? '#fff' : 'transparent',
            color: escortActiveTab === 'student' ? '#1d4ed8' : '#64748b',
            boxShadow:
              escortActiveTab === 'student'
                ? '0 1px 3px rgba(0,0,0,0.1)'
                : 'none',
          }}
        >
          🎓 Student
        </button>
        <button
          type="button"
          onClick={() => setEscortActiveTab('father')}
          style={{
            flex: 1,
            height: '28px',
            border: 'none',
            borderRadius: '6px',
            fontSize: '10px',
            fontWeight: 800,
            cursor: 'pointer',
            background:
              escortActiveTab === 'father' ? '#fff' : 'transparent',
            color: escortActiveTab === 'father' ? '#0284c7' : '#64748b',
            boxShadow:
              escortActiveTab === 'father'
                ? '0 1px 3px rgba(0,0,0,0.1)'
                : 'none',
          }}
        >
          👨 Father
        </button>
        <button
          type="button"
          onClick={() => setEscortActiveTab('mother')}
          style={{
            flex: 1,
            height: '28px',
            border: 'none',
            borderRadius: '6px',
            fontSize: '10px',
            fontWeight: 800,
            cursor: 'pointer',
            background:
              escortActiveTab === 'mother' ? '#fff' : 'transparent',
            color: escortActiveTab === 'mother' ? '#be185d' : '#64748b',
            boxShadow:
              escortActiveTab === 'mother'
                ? '0 1px 3px rgba(0,0,0,0.1)'
                : 'none',
          }}
        >
          👩 Mother
        </button>
      </div>

      {/* 1. STUDENT DETAILS GROUP */}
      {(escortActiveTab === 'all' || escortActiveTab === 'student') && (
        <div
          style={{
            background: '#f8fafc',
            border: '1.5px solid #dbeafe',
            borderRadius: '10px',
            padding: '12px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
            }}
          >
            <span
              style={{
                fontSize: '11.5px',
                fontWeight: 800,
                color: '#1e3a8a',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <GraduationCap size={15} color="#2563eb" />
              STUDENT DETAILS
            </span>
            {visibleStudentPhoto && (
              <span
                style={{
                  fontSize: '9.5px',
                  color: '#16a34a',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                <Check size={12} /> Photo Loaded
              </span>
            )}
          </div>

          <label style={{ marginTop: '2px' }}>
            STUDENT NAME:
            <input
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="e.g. AADITRI DAS"
            />
          </label>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              marginTop: '6px',
            }}
          >
            <label style={{ margin: 0 }}>
              CLASS:
              <input
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="e.g. PG or Class I"
              />
            </label>
            <label style={{ margin: 0 }}>
              ROLL:
              <input
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                placeholder="e.g. 4"
              />
            </label>
          </div>

          {/* Student Photo URL and Uploader */}
          <div
            style={{
              marginTop: '8px',
              padding: '8px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
            }}
          >
            <label style={{ margin: 0, fontWeight: 700, fontSize: '11px' }}>
              Student Photo URL / Google Drive Link:
              <input
                type="url"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="https://drive.google.com/... or https://..."
                style={{ fontSize: '12px' }}
              />
            </label>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '6px',
              }}
            >
              {/* Thumbnail preview */}
              <div
                style={{
                  width: '38px',
                  height: '44px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  overflow: 'hidden',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                {visibleStudentPhoto ? (
                  <img
                    src={formatImageUrl(visibleStudentPhoto)}
                    alt="Student thumb"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                    onError={handleImageError}
                  />
                ) : (
                  <GraduationCap size={16} color="#94a3b8" />
                )}
              </div>

              <button
                type="button"
                onClick={() => studentFileRef.current?.click()}
                disabled={uploadingTarget !== null}
                style={{
                  flex: 1,
                  height: '34px',
                  borderRadius: '6px',
                  border: '1px dashed #2563eb',
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Upload size={13} />
                {uploadingTarget === 'student'
                  ? 'Uploading...'
                  : 'Upload Student Photo'}
              </button>
              <input
                ref={studentFileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => handlePhotoUploadFor('student', e)}
              />
            </div>
          </div>
        </div>
      )}

      {/* 2. FATHER DETAILS GROUP */}
      {(escortActiveTab === 'all' || escortActiveTab === 'father') && (
        <div
          style={{
            background: '#f8fafc',
            border: '1.5px solid #bae6fd',
            borderRadius: '10px',
            padding: '12px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
            }}
          >
            <span
              style={{
                fontSize: '11.5px',
                fontWeight: 800,
                color: '#0369a1',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <User size={15} color="#0284c7" />
              FATHER DETAILS
            </span>
            {visibleFatherPhoto ? (
              <span
                style={{
                  fontSize: '9.5px',
                  color: '#16a34a',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                <Check size={12} /> Photo Loaded
              </span>
            ) : (
              <span
                style={{
                  fontSize: '9.5px',
                  color: '#d97706',
                  fontWeight: 700,
                }}
              >
                Photo Needed
              </span>
            )}
          </div>

          <label style={{ marginTop: '2px' }}>
            FATHER NAME:
            <input
              value={fatherName}
              onChange={(e) => setFatherName(e.target.value)}
              placeholder="e.g. ANIBRATA DAS"
            />
          </label>

          <label style={{ marginTop: '6px' }}>
            FATHER CONTACT:
            <input
              value={fatherContact}
              onChange={(e) => setFatherContact(e.target.value)}
              placeholder="e.g. 9614296337"
            />
          </label>

          {/* Father Photo URL and Uploader */}
          <div
            style={{
              marginTop: '8px',
              padding: '8px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
            }}
          >
            <label style={{ margin: 0, fontWeight: 700, fontSize: '11px' }}>
              Father Photo URL / Google Drive Link:
              <input
                type="url"
                value={fatherPhotoUrl}
                onChange={(e) => setFatherPhotoUrl(e.target.value)}
                placeholder="Paste Father photo Drive URL or image link..."
                style={{ fontSize: '12px' }}
              />
            </label>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '6px',
              }}
            >
              {/* Thumbnail preview */}
              <div
                style={{
                  width: '38px',
                  height: '44px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  overflow: 'hidden',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                {visibleFatherPhoto ? (
                  <img
                    src={formatImageUrl(visibleFatherPhoto)}
                    alt="Father thumb"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                    onError={handleImageError}
                  />
                ) : (
                  <User size={16} color="#94a3b8" />
                )}
              </div>

              <button
                type="button"
                onClick={() => fatherFileRef.current?.click()}
                disabled={uploadingTarget !== null}
                style={{
                  flex: 1,
                  height: '34px',
                  borderRadius: '6px',
                  border: '1px dashed #0284c7',
                  background: '#f0f9ff',
                  color: '#0369a1',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Upload size={13} />
                {uploadingTarget === 'father'
                  ? 'Uploading...'
                  : 'Upload Father Photo'}
              </button>
              <input
                ref={fatherFileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => handlePhotoUploadFor('father', e)}
              />
            </div>
          </div>
        </div>
      )}

      {/* 3. MOTHER DETAILS GROUP */}
      {(escortActiveTab === 'all' || escortActiveTab === 'mother') && (
        <div
          style={{
            background: '#f8fafc',
            border: '1.5px solid #fbcfe8',
            borderRadius: '10px',
            padding: '12px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
            }}
          >
            <span
              style={{
                fontSize: '11.5px',
                fontWeight: 800,
                color: '#9d174d',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <User size={15} color="#be185d" />
              MOTHER DETAILS
            </span>
            {visibleMotherPhoto ? (
              <span
                style={{
                  fontSize: '9.5px',
                  color: '#16a34a',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                <Check size={12} /> Photo Loaded
              </span>
            ) : (
              <span
                style={{
                  fontSize: '9.5px',
                  color: '#d97706',
                  fontWeight: 700,
                }}
              >
                Photo Needed
              </span>
            )}
          </div>

          <label style={{ marginTop: '2px' }}>
            MOTHER NAME:
            <input
              value={motherName}
              onChange={(e) => setMotherName(e.target.value)}
              placeholder="e.g. SOMA DAS"
            />
          </label>

          <label style={{ marginTop: '6px' }}>
            MOTHER CONTACT:
            <input
              value={motherContact}
              onChange={(e) => setMotherContact(e.target.value)}
              placeholder="e.g. 9876543211"
            />
          </label>

          {/* Mother Photo URL and Uploader */}
          <div
            style={{
              marginTop: '8px',
              padding: '8px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
            }}
          >
            <label style={{ margin: 0, fontWeight: 700, fontSize: '11px' }}>
              Mother Photo URL / Google Drive Link:
              <input
                type="url"
                value={motherPhotoUrl}
                onChange={(e) => setMotherPhotoUrl(e.target.value)}
                placeholder="Paste Mother photo Drive URL or image link..."
                style={{ fontSize: '12px' }}
              />
            </label>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '6px',
              }}
            >
              {/* Thumbnail preview */}
              <div
                style={{
                  width: '38px',
                  height: '44px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  overflow: 'hidden',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                {visibleMotherPhoto ? (
                  <img
                    src={formatImageUrl(visibleMotherPhoto)}
                    alt="Mother thumb"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                    onError={handleImageError}
                  />
                ) : (
                  <User size={16} color="#94a3b8" />
                )}
              </div>

              <button
                type="button"
                onClick={() => motherFileRef.current?.click()}
                disabled={uploadingTarget !== null}
                style={{
                  flex: 1,
                  height: '34px',
                  borderRadius: '6px',
                  border: '1px dashed #be185d',
                  background: '#fdf2f8',
                  color: '#9d174d',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Upload size={13} />
                {uploadingTarget === 'mother'
                  ? 'Uploading...'
                  : 'Upload Mother Photo'}
              </button>
              <input
                ref={motherFileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => handlePhotoUploadFor('mother', e)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
