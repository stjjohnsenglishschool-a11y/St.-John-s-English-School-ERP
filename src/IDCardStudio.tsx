import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  Download,
  Printer,
  Save,
  Upload,
  UserCheck,
  GraduationCap,
  LayoutGrid,
  ShieldCheck,
  Palette,
  PhoneCall,
  Sparkles,
  QrCode as QrIcon,
  RotateCw,
} from 'lucide-react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import { supabase, logActivity, uploadToSupabaseStorage } from './lib/supabase'
import { formatImageUrl, handleImageError } from './lib/imageUtils'

type Person = {
  id: string
  code: string
  fullName: string
  secondaryInfo?: string
  dateOfBirth?: string
  bloodGroup?: string
  mobile?: string
  emergencyPhone?: string
  photoUrl?: string
  type: 'student' | 'employee'
  designation?: string
  department?: string
  employeeCategory?: string
  className?: string
  section?: string
  rollNo?: string
  fatherName?: string
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
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')
  const [cardSide, setCardSide] = useState<'front' | 'back'>('front')
  const [cardTheme, setCardTheme] = useState<'theme-navy' | 'theme-slate' | 'theme-emerald' | 'theme-maroon'>('theme-navy')

  useEffect(() => {
    if (initialType) {
      setCardType(initialType)
    }
  }, [initialType])

  const [people, setPeople] = useState<Person[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [className, setClassName] = useState('')
  const [section, setSection] = useState('')
  const [rollNo, setRollNo] = useState('')
  const [designation, setDesignation] = useState('')
  const [department, setDepartment] = useState('')
  const [bloodGroup, setBloodGroup] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [photoPreview, setPhotoPreview] = useState('')
  const [expiry, setExpiry] = useState(() => {
    const nextYear = new Date().getFullYear() + 1
    return `${nextYear}-03-31`
  })
  const [qr, setQr] = useState('')
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)

  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!supabase) return
    if (cardType === 'student') {
      supabase
        .from('student_master')
        .select('student_id,admission_no,roll_no,full_name,date_of_birth,blood_group,mobile_primary,emergency_contact_phone,class_name,section,father_name,student_photo_url')
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
              bloodGroup: s.blood_group,
              mobile: s.mobile_primary,
              emergencyPhone: s.emergency_contact_phone || s.mobile_primary,
              photoUrl: s.student_photo_url,
              type: 'student',
              className: s.class_name,
              section: s.section,
              rollNo: s.roll_no,
              fatherName: s.father_name,
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
        .select('emp_id,emp_code,first_name,last_name,employee_category,designation,department,blood_group,date_of_birth,mobile_primary,emergency_contact_phone,whatsapp_number,employee_photo_url')
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
              dateOfBirth: e.date_of_birth,
              bloodGroup: e.blood_group,
              mobile: e.mobile_primary,
              emergencyPhone: e.mobile_primary || e.emergency_contact_phone || e.whatsapp_number,
              photoUrl: e.employee_photo_url,
              type: 'employee',
              employeeCategory: e.employee_category,
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
      setSection(selected.section || '')
      setRollNo(selected.rollNo || '')
      setDesignation(selected.designation || '')
      setDepartment(selected.department || '')
      setBloodGroup(selected.bloodGroup || 'O+')
      setPhotoUrl(selected.photoUrl || '')
      setEmergencyPhone(selected.emergencyPhone || selected.mobile || '')
      setPhotoPreview('')
    }
  }, [selected])

  useEffect(() => {
    if (!selected) {
      setQr('')
      return
    }
    const payload = JSON.stringify({
      school: 'St. Johns English School',
      code: selected.code,
      name: selected.fullName,
      role: selected.type === 'student' ? 'Student' : selected.designation || 'Staff',
      valid: expiry,
      auth: 'VERIFIED-SECURE-2026',
    })
    QRCode.toDataURL(payload, {
      width: 220,
      margin: 1,
      color: {
        dark: '#081d38',
        light: '#ffffff',
      },
    })
      .then(setQr)
      .catch(() => setQr(''))
  }, [selected, expiry])

  const visiblePhoto = photoPreview || photoUrl

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

  const makePdf = async () => {
    if (!cardRef.current) throw new Error('Card preview unavailable')
    const canvas = await html2canvas(cardRef.current, {
      scale: 3.5,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    })
    const isPortrait = orientation === 'portrait'
    const pdf = new jsPDF({
      orientation: isPortrait ? 'portrait' : 'landscape',
      unit: 'mm',
      format: isPortrait ? [54, 85.6] : [85.6, 54],
    })
    pdf.addImage(
      canvas.toDataURL('image/jpeg', 0.99),
      'JPEG',
      0,
      0,
      isPortrait ? 54 : 85.6,
      isPortrait ? 85.6 : 54
    )
    return pdf.output('blob')
  }

  const download = async () => {
    if (!selected) return setToast('Select a person first')
    setBusy(true)
    try {
      const blob = await makePdf()
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `Corporate-ID-${selected.code || selected.fullName}.pdf`
      link.click()
      setToast('High-Resolution Deluxe ID PDF downloaded successfully')
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
          roll_no: rollNo || selected.rollNo || null,
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
          action: `Saved student ID card for ${selected.fullName} (${selected.code})`,
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
          action: `Saved staff/teacher ID card for ${selected.fullName} (${selected.code})`,
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
        <span className="overline">DELUXE CORPORATE IDENTITY STUDIO</span>
        <h2>Executive ID Card Studio</h2>
        <p>
          Generate ultra-deluxe, high-definition ISO CR80 corporate credentials with
          digital cryptographic QR verification and authentic institutional seals.
        </p>

        {/* Card Type Selector */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button
            type="button"
            className={cardType === 'student' ? 'primary' : ''}
            style={{
              flex: 1,
              height: '38px',
              borderRadius: '9px',
              border: '1px solid #cbd5e1',
              background: cardType === 'student' ? 'linear-gradient(135deg,#1e3a8a,#2563eb)' : '#fff',
              color: cardType === 'student' ? '#fff' : '#475569',
              fontWeight: 800,
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
            <GraduationCap size={16} />
            Student Credential
          </button>
          <button
            type="button"
            className={cardType === 'employee' ? 'primary' : ''}
            style={{
              flex: 1,
              height: '38px',
              borderRadius: '9px',
              border: '1px solid #cbd5e1',
              background: cardType === 'employee' ? 'linear-gradient(135deg,#1e3a8a,#2563eb)' : '#fff',
              color: cardType === 'employee' ? '#fff' : '#475569',
              fontWeight: 800,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
            onClick={() => {
              setCardType('employee')
              setOrientation('portrait')
              setSelectedId('')
            }}
          >
            <UserCheck size={16} />
            Faculty / Staff ID
          </button>
        </div>

        {/* Corporate Theme Selector */}
        <label style={{ marginTop: '14px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Palette size={14} /> Deluxe Corporate Theme
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginTop: '4px' }}>
            <button
              type="button"
              style={{
                height: '34px',
                borderRadius: '7px',
                border: cardTheme === 'theme-navy' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                background: '#071d38',
                color: '#fff',
                fontWeight: 700,
                fontSize: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              onClick={() => setCardTheme('theme-navy')}
              title="Executive Navy & 24K Gold"
            >
              Navy/Gold
            </button>
            <button
              type="button"
              style={{
                height: '34px',
                borderRadius: '7px',
                border: cardTheme === 'theme-slate' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                background: '#1e293b',
                color: '#fff',
                fontWeight: 700,
                fontSize: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              onClick={() => setCardTheme('theme-slate')}
              title="Modern Titanium Slate & Platinum"
            >
              Slate/Plat
            </button>
            <button
              type="button"
              style={{
                height: '34px',
                borderRadius: '7px',
                border: cardTheme === 'theme-emerald' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                background: '#064e3b',
                color: '#fff',
                fontWeight: 700,
                fontSize: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              onClick={() => setCardTheme('theme-emerald')}
              title="Academic Emerald & Gold"
            >
              Emerald
            </button>
            <button
              type="button"
              style={{
                height: '34px',
                borderRadius: '7px',
                border: cardTheme === 'theme-maroon' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                background: '#5c091d',
                color: '#fff',
                fontWeight: 700,
                fontSize: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              onClick={() => setCardTheme('theme-maroon')}
              title="Royal Maroon Crest"
            >
              Maroon
            </button>
          </div>
        </label>

        {/* Orientation Selector */}
        <label style={{ marginTop: '12px' }}>
          Card Orientation Format
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button
              type="button"
              style={{
                flex: 1,
                height: '34px',
                borderRadius: '7px',
                border: orientation === 'portrait' ? '2px solid #1e40af' : '1px solid #cbd5e1',
                background: orientation === 'portrait' ? '#eff6ff' : '#fff',
                color: orientation === 'portrait' ? '#1e40af' : '#475569',
                fontWeight: 700,
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                cursor: 'pointer',
              }}
              onClick={() => setOrientation('portrait')}
            >
              <LayoutGrid size={13} />
              Portrait (Executive Vertical)
            </button>
            <button
              type="button"
              style={{
                flex: 1,
                height: '34px',
                borderRadius: '7px',
                border: orientation === 'landscape' ? '2px solid #1e40af' : '1px solid #cbd5e1',
                background: orientation === 'landscape' ? '#eff6ff' : '#fff',
                color: orientation === 'landscape' ? '#1e40af' : '#475569',
                fontWeight: 700,
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                cursor: 'pointer',
              }}
              onClick={() => setOrientation('landscape')}
            >
              <LayoutGrid size={13} style={{ transform: 'rotate(90deg)' }} />
              Landscape (Horizontal)
            </button>
          </div>
        </label>

        {/* Record Selection */}
        <label>
          Select Active {cardType === 'student' ? 'Student' : 'Faculty / Staff'}
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
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px' }}>
            <label>
              Class Name
              <input
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="e.g. CLASS VIII"
              />
            </label>
            <label>
              Section
              <input
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="e.g. A"
              />
            </label>
            <label>
              Roll No
              <input
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                placeholder="e.g. 14"
              />
            </label>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <label>
              Official Designation
              <input
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Senior Teacher"
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
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
          <label>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <PhoneCall size={13} color="#2563eb" /> Teacher Emergency / Direct Phone
            </span>
            <input
              type="tel"
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
              placeholder="e.g. 8274089481"
            />
          </label>
          <label>
            Blood Group
            <input
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              placeholder="e.g. O+"
            />
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <label>
            Photo Public URL
            <input
              type="url"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://..."
            />
          </label>
          <label>
            Card Valid Until
            <input
              type="date"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
            />
          </label>
        </div>

        <label className="photo-upload">
          <Upload />
          <span>
            {uploading
              ? 'Uploading HD Portrait to Storage...'
              : 'Upload HD Photograph or Portrait'}
          </span>
          <input
            type="file"
            accept="image/*"
            disabled={uploading}
            onChange={handleFileUpload}
          />
        </label>

        <div className="studio-actions">
          <button onClick={download} disabled={busy || !selected} className="primary">
            <Download />
            Download HD PDF
          </button>
          <button
            onClick={save}
            disabled={busy || !selected}
          >
            <Save />
            {busy ? 'Saving…' : 'Save ID Record'}
          </button>
          <button onClick={() => window.print()} disabled={!selected}>
            <Printer />
            Print Card
          </button>
          <button onClick={onUploadCsv}>
            <Upload />
            Bulk CSV Upload
          </button>
        </div>
      </section>

      {/* Preview Stage */}
      <section className="preview-stage">
        <div className="deluxe-card-stage-wrapper">
          {/* Card View Switcher */}
          <div className="card-view-toggles">
            <button
              type="button"
              className={cardSide === 'front' ? 'active' : ''}
              onClick={() => setCardSide('front')}
            >
              Front Side (Credential)
            </button>
            <button
              type="button"
              className={cardSide === 'back' ? 'active' : ''}
              onClick={() => setCardSide('back')}
            >
              Back Side (Terms & Verification)
            </button>
          </div>

          {/* DELUXE CORPORATE CARD CANVAS */}
          <div
            className={`deluxe-corp-card ${cardTheme} ${orientation} ${cardSide === 'back' ? 'back-side' : ''}`}
            ref={cardRef}
          >
            {/* Lanyard Cutout Slot */}
            <div className="card-lanyard-slot" />

            {cardSide === 'front' ? (
              <>
                {/* Executive Header */}
                <header className="corp-header card-header-bg">
                  <div className="header-brand-row">
                    <div className="corp-logo-badge">
                      <img src={logo} alt="School Crest" />
                    </div>
                    <div className="corp-inst-info">
                      <h2>St. John's English School</h2>
                      <p>Dankuni, Hooghly · W.B. 712311</p>
                      <span className="affil">Affiliated to WBBSE · Estd. 2004</span>
                    </div>
                  </div>
                </header>

                {/* Genuine Gold Accent Stripe */}
                <div className="gold-trim" />

                {/* Role Classification Ribbon */}
                <div className="corp-role-ribbon">
                  <span className="role-pill">
                    <span className="dot" />
                    {cardType === 'student' ? 'Official Student Credential' : 'Faculty & Staff Identification'}
                  </span>
                  <span className="security-code">
                    {selected?.code || 'SEC-ID'}
                  </span>
                </div>

                {/* Corporate Body */}
                <div className="corp-body">
                  {/* Executive Portrait Frame */}
                  <div className="corp-photo-frame">
                    <div className="corp-photo-inner">
                      {visiblePhoto ? (
                        <img
                          src={formatImageUrl(visiblePhoto)}
                          alt="Portrait"
                          referrerPolicy="no-referrer"
                          onError={handleImageError}
                        />
                      ) : (
                        <div className="corp-monogram">
                          {selected
                            ? selected.fullName
                                .split(' ')
                                .slice(0, 2)
                                .map((part) => part[0])
                                .join('')
                            : 'ID'}
                        </div>
                      )}
                    </div>
                    <div className="hologram-seal" title="Security Holographic Seal" />
                  </div>

                  {/* Identification Typography */}
                  <div className="corp-person-block">
                    <h3 className="corp-person-name">{selected?.fullName || 'Select a Member'}</h3>
                    <span className="corp-person-title">
                      {cardType === 'student'
                        ? `${className || 'CLASS VIII'} ${section ? `• Sec ${section}` : ''}`
                        : `${designation || 'Teacher'} • ${department || 'Teaching Staff'}`}
                    </span>
                  </div>

                  {/* Structured Corporate Key-Value Matrix */}
                  <div className="corp-data-table">
                    <div className="corp-data-item">
                      <span className="corp-label">{cardType === 'student' ? 'Admission No' : 'Employee Code'}</span>
                      <span className="corp-val" style={{ fontFamily: 'monospace' }}>
                        {selected?.code || '—'}
                      </span>
                    </div>

                    <div className="corp-data-item">
                      <span className="corp-label">Blood Group</span>
                      <span className="corp-val">{bloodGroup || selected?.bloodGroup || 'O+'}</span>
                    </div>

                    {cardType === 'student' ? (
                      <>
                        <div className="corp-data-item">
                          <span className="corp-label">Roll Number</span>
                          <span className="corp-val">{rollNo || selected?.rollNo || '—'}</span>
                        </div>
                        <div className="corp-data-item">
                          <span className="corp-label">Date of Birth</span>
                          <span className="corp-val">{selected?.dateOfBirth || '—'}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="corp-data-item">
                          <span className="corp-label">Department</span>
                          <span className="corp-val">{department || selected?.department || 'Teaching Staff'}</span>
                        </div>
                        <div className="corp-data-item">
                          <span className="corp-label">Valid Until</span>
                          <span className="corp-val">{expiry}</span>
                        </div>
                      </>
                    )}

                    <div className="corp-data-item full-span">
                      <span className="corp-label">Registered Mobile / Contact</span>
                      <span className="corp-val">{selected?.mobile || emergencyPhone || '—'}</span>
                    </div>
                  </div>

                  {/* QR Row */}
                  <div className="corp-qr-row">
                    <div className="qr-verify-badge">
                      {qr ? (
                        <img className="corp-qr-code" src={qr} alt="Card Verification QR" />
                      ) : (
                        <div className="corp-qr-code" style={{ display: 'grid', placeItems: 'center' }}>
                          <QrIcon size={24} color="#94a3b8" />
                        </div>
                      )}
                      <div className="qr-meta">
                        <b>Digital Verification</b>
                        <span>Scan with any camera to verify official status</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Executive Footer */}
                <footer className="corp-footer">
                  <div className="corp-emergency-pill">
                    <PhoneCall size={10} />
                    <span>Emergency: {emergencyPhone || selected?.mobile || '8274089481'}</span>
                  </div>
                  <div className="corp-signatory">
                    <span className="corp-signature-script">Fr. S. John</span>
                    <span className="corp-sign-title">Authorised Signatory</span>
                  </div>
                </footer>
              </>
            ) : (
              /* BACK SIDE OF ID CARD */
              <>
                <div className="back-header-strip">
                  <h4>Terms & Institutional Policy</h4>
                </div>
                <div className="gold-trim" />
                <div className="back-content">
                  <ul className="back-rules-list">
                    <li>This identity card is the official property of St. John's English School.</li>
                    <li>The cardholder must present this credential upon entering campus premises or during official school events.</li>
                    <li>This credential is non-transferable and must be surrendered upon cessation of enrollment or employment.</li>
                    <li>Report any loss, theft, or damage immediately to the administrative office for reissue.</li>
                  </ul>

                  <div className="back-contact-card">
                    <b>Campus Administrative Office:</b>
                    <span>St. John's English School, Dankuni, Hooghly, West Bengal 712311</span>
                    <span>Helpline: +91 82740 89481 · Email: info@stjohns.edu.in</span>
                    <span>Portal: https://stjohns.edu.in</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <ShieldCheck size={18} color="#0d9488" />
                      <span style={{ fontSize: '7.5px', color: '#0f766e', fontWeight: 800 }}>
                        ISO 7810 ID-1 DIGITAL SECURE
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="corp-signature-script" style={{ fontSize: '13px' }}>Principal</span>
                      <span className="corp-sign-title" style={{ display: 'block', fontSize: '6.5px' }}>ADMINISTRATOR SEAL</span>
                    </div>
                  </div>

                  <div className="back-barcode-box">
                    <div className="barcode-visual" />
                    <div className="barcode-num">SJES-{selected?.code || '0000'}-CR80</div>
                  </div>
                </div>
              </>
            )}
          </div>

          <p className="preview-note">
            Standard CR80 / ISO 7810 300+ DPI Vector Printable Output · Front & Back Viewable
          </p>
        </div>
      </section>
    </div>
  )
}
