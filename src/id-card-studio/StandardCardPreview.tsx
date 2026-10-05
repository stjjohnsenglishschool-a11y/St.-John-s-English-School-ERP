import React, { RefObject } from 'react'
import { QrCode as QrCodeIcon } from 'lucide-react'
import { Person } from './types'
import { SCHOOL_LOGO } from './constants'
import { formatImageUrl, handleImageError } from '../lib/imageUtils'
import { AuthorisedSignatureSvg } from '../lib/signatureData'

type StandardCardPreviewProps = {
  cardRef: RefObject<HTMLDivElement | null>
  cardType: 'student' | 'employee'
  selected?: Person
  className: string
  designation: string
  department: string
  visibleStudentPhoto: string
  expiry: string
  qr: string
  openVerificationModal: () => void
  isCustomSignature: boolean
  visibleSignature: string
}

export const StandardCardPreview: React.FC<StandardCardPreviewProps> = ({
  cardRef,
  cardType,
  selected,
  className,
  designation,
  department,
  visibleStudentPhoto,
  expiry,
  qr,
  openVerificationModal,
  isCustomSignature,
  visibleSignature,
}) => {
  return (
    <div className="id-card id-card-portrait" ref={cardRef}>
      <header>
        <img src={SCHOOL_LOGO} alt="School Crest" crossOrigin="anonymous" />
        <div>
          <b>ST. JOHN'S ENGLISH SCHOOL</b>
          <span>T.N. Mukherjee Road Dankuni, Hooghly · W.B. 712311</span>
        </div>
      </header>

      <div className="id-type-strip">
        {cardType === 'student'
          ? 'STUDENT IDENTITY CARD'
          : 'STAFF IDENTITY CARD'}
      </div>

      <div className="id-body-portrait">
        <div className="student-photo-portrait">
          {visibleStudentPhoto ? (
            <img
              src={formatImageUrl(visibleStudentPhoto)}
              alt="Portrait"
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
              onError={handleImageError}
            />
          ) : (
            <span>
              {selected
                ? selected.fullName
                    .split(' ')
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join('')
                : 'PHOTO'}
            </span>
          )}
        </div>

        <h3 className="id-name-portrait">
          {selected?.fullName ||
            (cardType === 'student' ? 'Student Name' : 'Person Name')}
        </h3>

        <div className="id-role-tag">
          {cardType === 'student'
            ? className
              ? `Class: ${className}`
              : selected?.code || 'STUDENT'
            : designation || 'FACULTY / STAFF'}
        </div>

        <div className="id-details-portrait">
          <dl>
            <dt>{cardType === 'student' ? 'Adm No.' : 'Emp Code'}</dt>
            <dd>
              {selected?.code ||
                (cardType === 'student' ? 'ADM-2024-001' : 'EMP-013')}
            </dd>

            {cardType === 'student' ? (
              <>
                <dt>Class</dt>
                <dd>{className || 'Class X - A'}</dd>
                <dt>Roll No.</dt>
                <dd>{selected?.rollNo || '12'}</dd>
                <dt>DOB</dt>
                <dd>{selected?.dateOfBirth || '2010-05-14'}</dd>
              </>
            ) : (
              <>
                <dt>Designation</dt>
                <dd>{designation || 'Senior Faculty'}</dd>
                <dt>Department</dt>
                <dd>{department || 'Academic Affairs'}</dd>
              </>
            )}

            <dt>Mobile</dt>
            <dd>{selected?.mobile || '9876543210'}</dd>
            <dt>Valid Until</dt>
            <dd>{expiry}</dd>
          </dl>
        </div>
      </div>

      {/* Portrait Footer with QR Code, Emergency Contact & Authorised Signatory */}
      <footer className="id-footer-portrait">
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
            <span className="id-qr-tag">SCAN TO VERIFY</span>
          </div>

          <div className="id-emergency-text">
            Emergency:
            <b>9674368297</b>
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
