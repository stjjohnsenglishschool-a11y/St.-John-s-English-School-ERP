import React, { RefObject } from 'react'
import { GraduationCap, User, QrCode as QrCodeIcon } from 'lucide-react'
import { Person } from './types'
import { SCHOOL_LOGO } from './constants'
import { formatImageUrl, handleImageError } from '../lib/imageUtils'
import { AuthorisedSignatureSvg } from '../lib/signatureData'

type EscortCardPreviewProps = {
  cardRef: RefObject<HTMLDivElement | null>
  studentFileRef: RefObject<HTMLInputElement | null>
  fatherFileRef: RefObject<HTMLInputElement | null>
  motherFileRef: RefObject<HTMLInputElement | null>
  studentName: string
  selected?: Person
  className: string
  rollNo: string
  fatherName: string
  fatherContact: string
  motherName: string
  motherContact: string
  visibleStudentPhoto: string
  visibleFatherPhoto: string
  visibleMotherPhoto: string
  qr: string
  openVerificationModal: () => void
  expiry: string
  isCustomSignature: boolean
  visibleSignature: string
}

export const EscortCardPreview: React.FC<EscortCardPreviewProps> = ({
  cardRef,
  studentFileRef,
  fatherFileRef,
  motherFileRef,
  studentName,
  selected,
  className,
  rollNo,
  fatherName,
  fatherContact,
  motherName,
  motherContact,
  visibleStudentPhoto,
  visibleFatherPhoto,
  visibleMotherPhoto,
  qr,
  openVerificationModal,
  expiry,
  isCustomSignature,
  visibleSignature,
}) => {
  return (
    <div
      className="id-card id-card-portrait id-card-escort"
      ref={cardRef}
    >
      <header>
        <img src={SCHOOL_LOGO} alt="School Crest" crossOrigin="anonymous" />
        <div>
          <b>ST. JOHN'S ENGLISH SCHOOL</b>
          <span>T.N. Mukherjee Road Dankuni, Hooghly · W.B. 712311</span>
        </div>
      </header>

      <div className="id-type-strip id-type-strip-escort">
        <span>PARENT / GUARDIAN ESCORT CARD</span>
        <small>SESSION 2026-27</small>
      </div>

      <div className="id-body-escort">
        {/* Student Section */}
        <div className="escort-student-box">
          <div
            className="escort-student-photo-wrap"
            onClick={() => studentFileRef.current?.click()}
            style={{ cursor: 'pointer' }}
            title="Click to change or upload Student photo"
          >
            {visibleStudentPhoto ? (
              <img
                src={formatImageUrl(visibleStudentPhoto)}
                alt="Student Photo"
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
                onError={handleImageError}
              />
            ) : (
              <div className="escort-photo-placeholder">
                <GraduationCap size={28} />
                <span>STUDENT</span>
                <span>PHOTO</span>
              </div>
            )}
          </div>

          <div className="escort-student-info">
            <div className="escort-label-row">
              <span className="escort-field-lbl">STUDENT NAME:</span>
              <b className="escort-student-name" title={studentName || selected?.fullName || 'STUDENT NAME'}>
                {studentName || selected?.fullName || 'STUDENT NAME'}
              </b>
            </div>
            <div className="escort-meta-row">
              <div className="escort-meta-col">
                <span className="escort-field-lbl">CLASS:</span>
                <b className="escort-val-highlight">
                  {className || 'PG'}
                </b>
              </div>
              <div className="escort-meta-col">
                <span className="escort-field-lbl">ROLL:</span>
                <b className="escort-val-highlight">
                  {rollNo || selected?.rollNo || '1'}
                </b>
              </div>
            </div>
            {selected?.code && (
              <div className="escort-adm-tag">
                <span>ADM NO: {selected.code}</span>
              </div>
            )}
          </div>
        </div>

        {/* Prominent Authorized Escorts Heading */}
        <div className="escort-section-divider">
          <div className="escort-divider-line" />
          <span className="escort-divider-pill">AUTHORIZED ESCORTS</span>
          <div className="escort-divider-line" />
        </div>

        {/* Parents 2-Column Grid */}
        <div className="escort-parents-grid">
          {/* 1. Father Section */}
          <div className="escort-parent-card">
            <div
              className="escort-parent-photo-wrap"
              onClick={() => fatherFileRef.current?.click()}
              style={{ cursor: 'pointer' }}
              title="Click to upload or change Father photo"
            >
              {visibleFatherPhoto ? (
                <img
                  src={formatImageUrl(visibleFatherPhoto)}
                  alt="Father Photo"
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                  onError={handleImageError}
                />
              ) : (
                <div className="escort-photo-placeholder parent-placeholder">
                  <User size={28} />
                  <span>FATHER</span>
                  <span>PHOTO</span>
                </div>
              )}
              <span className="escort-badge-tag father-badge">
                FATHER
              </span>
            </div>

            <div className="escort-parent-details">
              <div className="escort-detail-item">
                <span className="escort-field-lbl">FATHER NAME:</span>
                <b className="escort-parent-name" title={fatherName}>
                  {fatherName || 'FATHER NAME'}
                </b>
              </div>
              <div className="escort-detail-item">
                <span className="escort-field-lbl">FATHER CONTACT:</span>
                <div className="escort-contact-pill">
                  <b className="escort-parent-contact" title={fatherContact}>
                    {fatherContact || 'NOT PROVIDED'}
                  </b>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Mother Section */}
          <div className="escort-parent-card">
            <div
              className="escort-parent-photo-wrap"
              onClick={() => motherFileRef.current?.click()}
              style={{ cursor: 'pointer' }}
              title="Click to upload or change Mother photo"
            >
              {visibleMotherPhoto ? (
                <img
                  src={formatImageUrl(visibleMotherPhoto)}
                  alt="Mother Photo"
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                  onError={handleImageError}
                />
              ) : (
                <div className="escort-photo-placeholder parent-placeholder">
                  <User size={28} />
                  <span>MOTHER</span>
                  <span>PHOTO</span>
                </div>
              )}
              <span className="escort-badge-tag mother-badge">
                MOTHER
              </span>
            </div>

            <div className="escort-parent-details">
              <div className="escort-detail-item">
                <span className="escort-field-lbl">MOTHER NAME:</span>
                <b className="escort-parent-name" title={motherName}>
                  {motherName || 'MOTHER NAME'}
                </b>
              </div>
              <div className="escort-detail-item">
                <span className="escort-field-lbl">MOTHER CONTACT:</span>
                <div className="escort-contact-pill mother">
                  <b className="escort-parent-contact" title={motherContact}>
                    {motherContact || 'NOT PROVIDED'}
                  </b>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Escort Card Footer */}
      <footer className="id-footer-portrait escort-footer">
        <div className="id-footer-left">
          <div
            className="id-qr-box"
            onClick={openVerificationModal}
            title="Click to test / view live digital QR certificate"
          >
            {qr ? (
              <img
                className="id-qr-img"
                src={qr}
                alt="Card Verification QR"
                crossOrigin="anonymous"
              />
            ) : (
              <div className="id-qr-placeholder">
                <QrCodeIcon size={22} />
              </div>
            )}
            <span className="id-qr-tag">VERIFY</span>
          </div>

          <div className="id-emergency-text">
            <span>Emergency:</span>
            <b>9674368297</b>
            <div
              style={{
                fontSize: '8px',
                fontWeight: 700,
                color: '#475569',
                marginTop: '1px',
              }}
            >
              Valid: {expiry || '31-03-2027'}
            </div>
          </div>
        </div>

        <div className="id-signatory-block">
          <div className="id-signatory-wrap">
            {isCustomSignature ? (
              <img
                src={visibleSignature}
                alt="Authorised Signatory"
                className="id-signature-img"
                crossOrigin="anonymous"
              />
            ) : (
              <AuthorisedSignatureSvg className="id-signature-svg" />
            )}
          </div>
          <div className="id-signatory-line">
            <span className="id-signatory-title">
              AUTHORISED SIGNATORY
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
