import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Download, Printer, Save, Upload, UserCheck, GraduationCap, PenTool, RefreshCw, QrCode as QrCodeIcon, ShieldCheck, PhoneCall, CheckCircle2 } from 'lucide-react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import { supabase, logActivity, uploadToSupabaseStorage } from './lib/supabase'
import { formatImageUrl, handleImageError } from './lib/imageUtils'
import { DEFAULT_SIGNATORY_SVG } from './lib/signatureData'
import DigitalVerificationModal, { VerificationData } from './components/DigitalVerificationModal'

type Person = {
  id: string
  code: string
  fullName: string
  secondaryInfo?: string
  dateOfBirth?: string
  mobile?: string
  photoUrl?: string
  type: 'student' | 'employee'
  designation?: string
  department?: string
  className?: string
  rollNo?: string
}

const logo = 'https://res.cloudinary.com/oilisvfi/image/upload/v1786000074/logo_final_frchld.jpg'

export default function IDCardStudio({
  setToast,
  onUploadCsv,
  initialType,
}: {
  setToast: (message: string) => void
  onUploadCsv: () => void
  initialType?: 'student' | 'employee'
}) {
  const [cardType, setCardType] = useState<'student' | 'employee'>(initialType || 'student')

  useEffect(() => {
    if (initialType) {
      setCardType(initialType)
    }
  }, [initialType])

  const [people, setPeople] = useState<Person[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [className, setClassName] = useState('')
  const [designation, setDesignation] = useState('')
  const [department, setDepartment] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [photoPreview, setPhotoPreview] = useState('')
  const [signatureUrl, setSignatureUrl] = useState<string>(DEFAULT_SIGNATORY_SVG)
  const [signaturePreview, setSignaturePreview] = useState('')
  const [expiry, setExpiry] = useState(() => {
    const nextYear = new Date().getFullYear() + 1
    return `${nextYear}-03-31`
  })
  const [qr, setQr] = useState('')
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [verificationModalData, setVerificationModalData] = useState<VerificationData | null>(null)

  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!supabase) return
    if (cardType === 'student') {
      supabase
        .from('student_master')
        .select('student_id,admission_no,roll_no,full_name,date_of_birth,mobile_primary,class_name,student_photo_url')
        .eq('is_active', true)
        .order('full_name')
        .then(({ data, error }) => {
          if (error) {
            setToast(error.message)
          } else {
            const list: Person[] = (data || []).map((s) => ({
              id: s.student_id,
              code: s.admission_no,
              fullName: s.full_name,
              secondaryInfo: s.class_name ? `Class ${s.class_name}` : undefined,
              dateOfBirth: s.date_of_birth,
              mobile: s.mobile_primary,
              photoUrl: s.student_photo_url,
              type: 'student',
              className: s.class_name,
              rollNo: s.roll_no,
            }))
            setPeople(list)
            if (list.length > 0 && !selectedId) {
              setSelectedId(list[0].id)
            }
          }
        })
    } else {
      supabase
        .from('employee_master')
        .select('emp_id,emp_code,first_name,last_name,designation,department,mobile_primary,employee_photo_url')
        .eq('is_active', true)
        .order('first_name')
        .then(({ data, error }) => {
          if (error) {
            setToast(error.message)
          } else {
            const list: Person[] = (data || []).map((e) => ({
              id: e.emp_id,
              code: e.emp_code,
              fullName: `${e.first_name || ''} ${e.last_name || ''}`.trim(),
              secondaryInfo: e.designation || e.department,
              mobile: e.mobile_primary,
              photoUrl: e.employee_photo_url,
              type: 'employee',
              designation: e.designation,
              department: e.department,
            }))
            setPeople(list)
            if (list.length > 0 && !selectedId) {
              setSelectedId(list[0].id)
            }
          }
        })
    }
  }, [cardType, setToast])

  const selected = useMemo(
    () => people.find((p) => p.id === selectedId),
    [people, selectedId]
  )

  useEffect(() => {
    if (selected) {
      setClassName(selected.className || '')
      setDesignation(selected.designation || '')
      setDepartment(selected.department || '')
      setPhotoUrl(selected.photoUrl || '')
      setPhotoPreview('')
    }
  }, [selected])

  const visiblePhoto = photoPreview || photoUrl
  const visibleSignature = signaturePreview || signatureUrl || DEFAULT_SIGNATORY_SVG

  useEffect(() => {
    const code = selected?.code || (cardType === 'student' ? 'ADM-001' : 'EMP-013')
    const name = selected?.fullName || (cardType === 'student' ? 'Student Name' : 'Ananya Manna')
    const type = cardType
    const role = cardType === 'student' ? (className ? `Class: ${className}` : 'Student') : (designation || 'Teacher')
    const dept = department || 'Teaching Staff'
    
    // Generate a web-verifiable URL compatible with standard smartphone cameras and QR scanners
    const baseOrigin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://stjohns-school.edu'
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/'
    const queryParamsObj: Record<string, string> = {
      verify: code,
      name: name,
      type: type,
      role: role,
      dept: dept,
      valid: expiry,
      school: "St. John's English School",
    }
    if (visiblePhoto && !visiblePhoto.startsWith('blob:')) {
      queryParamsObj.photo = visiblePhoto
    }

    const queryParams = new URLSearchParams(queryParamsObj).toString()
    const verificationUrl = `${baseOrigin}${pathname}?${queryParams}`

    QRCode.toDataURL(verificationUrl, {
      width: 220,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#09233f',
        light: '#ffffff',
      },
    })
      .then(setQr)
      .catch(() => setQr(''))
  }, [selected, cardType, className, designation, department, expiry, visiblePhoto])

  const openVerificationModal = () => {
    const code = selected?.code || (cardType === 'student' ? 'ADM-001' : 'EMP-013')
    const name = selected?.fullName || (cardType === 'student' ? 'Student Name' : 'Ananya Manna')
    const role = cardType === 'student' ? (className ? `Class: ${className}` : 'Student') : (designation || 'Teacher')
    
    setVerificationModalData({
      code,
      name,
      type: cardType,
      role,
      department: department || 'Teaching Staff',
      className: className || undefined,
      validUntil: expiry,
      school: "St. John's English School",
      photoUrl: visiblePhoto || selected?.photoUrl || undefined,
      verifiedAt: new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    })
  }

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setPhotoPreview(URL.createObjectURL(file))
    setUploading(true)
    try {
      const publicUrl = await uploadToSupabaseStorage(
        file,
        'school-documents',
        cardType === 'student' ? 'students' : 'staff'
      )
      setPhotoUrl(publicUrl)
      setToast('Photo uploaded successfully')
    } catch {
      setToast('Photo preview loaded')
    } finally {
      setUploading(false)
    }
  }

  const handleSignatureUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const objectUrl = URL.createObjectURL(file)
    setSignaturePreview(objectUrl)
    setSignatureUrl(objectUrl)
    setToast('Custom signature loaded for Authorised Signatory')
  }

  const resetSignature = () => {
    setSignaturePreview('')
    setSignatureUrl(DEFAULT_SIGNATORY_SVG)
    setToast('Reset to default Authorised Signatory')
  }

  const makePdf = async () => {
    if (!cardRef.current) throw new Error('Card preview unavailable')
    const canvas = await html2canvas(cardRef.current, {
      scale: 3,
      useCORS: true,
      backgroundColor: '#ffffff',
    })
    // ISO/IEC 7810 ID-1 standard portrait format: 54mm width x 85.6mm height
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [54, 85.6],
    })
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.98), 'JPEG', 0, 0, 54, 85.6)
    return pdf.output('blob')
  }

  const download = async () => {
    if (!selected) return setToast('Select a person first')
    setBusy(true)
    try {
      const blob = await makePdf()
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `ID-${selected.code || selected.fullName}-Portrait.pdf`
      link.click()
      setToast('Portrait ID card PDF downloaded successfully')
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'PDF generation failed')
    } finally {
      setBusy(false)
    }
  }

  const save = async () => {
    if (!selected || !supabase) return setToast('Select a person first')
    setBusy(true)
    try {
      const todayIso = new Date().toISOString().slice(0, 10)
      if (cardType === 'student') {
        const record = {
          student_id: selected.id,
          student_name: selected.fullName,
          class_name: className,
          roll_no: selected.rollNo || null,
          mobile: selected.mobile || null,
          photo_url: photoUrl || null,
          issue_date: todayIso,
          valid_until: expiry,
          is_active: true,
        }

        const existing = await supabase
          .from('student_idcard')
          .select('card_id')
          .eq('student_id', selected.id)
          .limit(1)
          .maybeSingle()

        if (existing.error) throw existing.error

        const result = existing.data?.card_id
          ? await supabase
              .from('student_idcard')
              .update(record)
              .eq('card_id', existing.data.card_id)
          : await supabase.from('student_idcard').insert(record)

        if (result.error) throw result.error

        await logActivity({
          action: `Saved portrait student ID card for ${selected.fullName} (${selected.code})`,
          module: 'student_idcard',
        })

        setToast('Student ID card record saved to database')
      } else {
        const record = {
          emp_id: selected.id,
          employee_name: selected.fullName,
          designation: designation || null,
          department: department || null,
          mobile: selected.mobile || null,
          photo_url: photoUrl || null,
          issue_date: todayIso,
          valid_until: expiry,
          is_active: true,
        }

        const existing = await supabase
          .from('teacher_idcard')
          .select('card_id')
          .eq('emp_id', selected.id)
          .limit(1)
          .maybeSingle()

        if (existing.error) throw existing.error

        const result = existing.data?.card_id
          ? await supabase
              .from('teacher_idcard')
              .update(record)
              .eq('card_id', existing.data.card_id)
          : await supabase.from('teacher_idcard').insert(record)

        if (result.error) throw result.error

        await logActivity({
          action: `Saved portrait teacher/staff ID card for ${selected.fullName} (${selected.code})`,
          module: 'teacher_idcard',
        })

        setToast('Teacher/Staff ID card record saved to database')
      }
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="studio">
      <section className="studio-panel">
        <span className="overline">ID CARD GENERATOR & STUDIO</span>
        <h2>Portrait Identity Studio</h2>
        <p>
          Generate and print standardized portrait identity cards with official authorised signatory.
        </p>

        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button
            type="button"
            className={cardType === 'student' ? 'primary' : ''}
            style={{
              flex: 1,
              height: '38px',
              borderRadius: '8px',
              border: '1px solid #d8e1eb',
              background: cardType === 'student' ? 'var(--blue)' : '#fff',
              color: cardType === 'student' ? '#fff' : '#4f6277',
              fontWeight: 700,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
            onClick={() => {
              setCardType('student')
              setSelectedId('')
            }}
          >
            <GraduationCap size={15} />
            Student ID Card
          </button>
          <button
            type="button"
            className={cardType === 'employee' ? 'primary' : ''}
            style={{
              flex: 1,
              height: '38px',
              borderRadius: '8px',
              border: '1px solid #d8e1eb',
              background: cardType === 'employee' ? 'var(--blue)' : '#fff',
              color: cardType === 'employee' ? '#fff' : '#4f6277',
              fontWeight: 700,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
            onClick={() => {
              setCardType('employee')
              setSelectedId('')
            }}
          >
            <UserCheck size={15} />
            Staff / Teacher ID
          </button>
        </div>

        <label>
          Select {cardType === 'student' ? 'Student' : 'Staff / Teacher'}
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            <option value="">
              -- Choose from {people.length} active records --
            </option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName} · {p.code}{' '}
                {p.secondaryInfo ? `(${p.secondaryInfo})` : ''}
              </option>
            ))}
          </select>
        </label>

        {cardType === 'student' ? (
          <label>
            Class Name / Grade
            <input
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="e.g. CLASS VIII"
            />
          </label>
        ) : (
          <>
            <label>
              Designation
              <input
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Teacher"
              />
            </label>
            <label>
              Department
              <input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Teaching Staff"
              />
            </label>
          </>
        )}

        <label>
          Photo URL
          <input
            type="url"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="https://..."
          />
        </label>

        <label>
          Valid Until
          <input
            type="date"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
          />
        </label>

        <label className="photo-upload">
          <Upload />
          <span>
            {uploading
              ? 'Uploading to Supabase Storage...'
              : 'Upload photograph or portrait'}
          </span>
          <input
            type="file"
            accept="image/*"
            disabled={uploading}
            onChange={handleFileUpload}
          />
        </label>

        {/* Authorised Signatory customizer */}
        <div style={{ marginTop: '14px', padding: '12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <PenTool size={13} color="var(--blue)" />
              Authorised Signatory Image
            </span>
            {signaturePreview && (
              <button
                type="button"
                onClick={resetSignature}
                style={{ height: '24px', padding: '0 8px', fontSize: '10px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <RefreshCw size={10} /> Reset
              </button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ height: '36px', width: '90px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', display: 'grid', placeItems: 'center', padding: '2px' }}>
              <img src={visibleSignature} alt="Signatory preview" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
            </div>
            <label style={{ margin: 0, flex: 1, cursor: 'pointer' }}>
              <span style={{ fontSize: '11px', color: 'var(--blue)', fontWeight: 700, textDecoration: 'underline' }}>
                Replace Signature
              </span>
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleSignatureUpload}
              />
            </label>
          </div>
        </div>

        <div className="studio-actions">
          <button onClick={download} disabled={busy || !selected}>
            <Download />
            Download PDF
          </button>
          <button
            className="primary"
            onClick={save}
            disabled={busy || !selected}
          >
            <Save />
            {busy ? 'Saving…' : 'Save card record'}
          </button>
          <button
            type="button"
            onClick={openVerificationModal}
            style={{ borderColor: '#2563eb', color: '#1d4ed8', background: '#eff6ff', fontWeight: 800 }}
            title="Preview what a phone camera sees when scanning this QR"
          >
            <ShieldCheck size={14} />
            Test QR Scan
          </button>
          <button onClick={() => window.print()} disabled={!selected}>
            <Printer />
            Print
          </button>
          <button onClick={onUploadCsv}>
            <Upload />
            Upload CSV
          </button>
        </div>
      </section>

      <section className="preview-stage">
        {/* PORTRAIT ID CARD */}
        <div className="id-card id-card-portrait" ref={cardRef}>
          <header>
            <img src={logo} alt="School Crest" />
            <div>
              <b>ST. JOHN'S ENGLISH SCHOOL</b>
              <span>Dankuni, Hooghly · W.B. 712311</span>
            </div>
          </header>

          <div className="id-type-strip">
            {cardType === 'student' ? 'STUDENT IDENTITY CARD' : 'STAFF IDENTITY CARD'}
          </div>

          <div className="id-body-portrait">
            <div className="student-photo-portrait">
              {visiblePhoto ? (
                <img
                  src={formatImageUrl(visiblePhoto)}
                  alt="Portrait"
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

            <h3 className="id-name-portrait">{selected?.fullName || (cardType === 'student' ? 'Student Name' : 'Person Name')}</h3>
            
            <div className="id-role-tag">
              {cardType === 'student'
                ? (className ? `Class: ${className}` : selected?.code || 'STUDENT')
                : (designation || 'FACULTY / STAFF')}
            </div>

            <div className="id-details-portrait">
              <dl>
                <dt>{cardType === 'student' ? 'Adm No.' : 'Emp Code'}</dt>
                <dd>{selected?.code || (cardType === 'student' ? 'ADM-2024-001' : 'EMP-013')}</dd>

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

          {/* Portrait Footer with QR Code, Helpline & Authorised Signatory */}
          <footer className="id-footer-portrait">
            <div className="id-footer-left">
              <div
                className="id-qr-box"
                onClick={openVerificationModal}
                title="Click to test / view live digital QR certificate"
              >
                {qr ? (
                  <img className="id-qr-img" src={qr} alt="Card Verification QR" />
                ) : (
                  <div className="id-qr-placeholder">
                    <QrCodeIcon size={22} />
                  </div>
                )}
                <span className="id-qr-tag">SCAN TO VERIFY</span>
              </div>

              <div className="id-emergency-pill">
                <div className="id-emergency-badge">
                  <PhoneCall size={9} />
                  <span>24×7 HELPLINE</span>
                </div>
                <b className="id-emergency-num">9674368297</b>
              </div>
            </div>

            <div className="id-signatory-block">
              <div className="id-signatory-wrap">
                <img
                  src={visibleSignature}
                  alt="Authorised Signatory"
                  className="id-signature-img"
                />
              </div>
              <div className="id-signatory-line">
                <span className="id-signatory-title">AUTHORISED SIGNATORY</span>
              </div>
            </div>
          </footer>
        </div>

        <p className="preview-note">
          Live ISO/IEC 7810 ID-1 portrait standard (54mm × 85.6mm) · Tap QR code or click 'Test QR Scan' to preview live verification
        </p>
      </section>

      {/* Digital Identity Verification Certificate Modal */}
      {verificationModalData && (
        <DigitalVerificationModal
          data={verificationModalData}
          onClose={() => setVerificationModalData(null)}
        />
      )}
    </div>
  )
}

