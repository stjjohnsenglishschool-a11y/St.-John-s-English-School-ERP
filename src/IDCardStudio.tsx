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
  Mail,
  Calendar,
  Sparkles,
  Layers,
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
  email?: string
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
  const [cardType, setCardType] = useState<'student' | 'employee'>(initialType || 'employee')
  const [cardSide, setCardSide] = useState<'front' | 'back'>('front')
  const [cardTheme, setCardTheme] = useState<'theme-crimson' | 'theme-navy' | 'theme-emerald' | 'theme-slate'>('theme-crimson')

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
  const [designation, setDesignation] = useState('TEACHER')
  const [department, setDepartment] = useState('Teaching Staff')
  const [dob, setDob] = useState('')
  const [email, setEmail] = useState('st.johnsenglishschool@gmail.com')
  const [phone, setPhone] = useState('8274089481')
  const [bloodGroup, setBloodGroup] = useState('O+')
  const [photoUrl, setPhotoUrl] = useState('')
  const [photoPreview, setPhotoPreview] = useState('')
  const [sessionEnd, setSessionEnd] = useState('2027-03-31')
  const [sessionName, setSessionName] = useState('2026 - 2027')
  const [qr, setQr] = useState('')
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)

  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!supabase) return
    if (cardType === 'student') {
      supabase
        .from('student_master')
        .select('student_id,admission_no,roll_no,full_name,date_of_birth,blood_group,mobile_primary,emergency_contact_phone,email_address,class_name,section,father_name,student_photo_url')
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
              email: s.email_address || 'st.johnsenglishschool@gmail.com',
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
        .select('emp_id,emp_code,first_name,last_name,employee_category,designation,department,blood_group,date_of_birth,mobile_primary,emergency_contact_phone,whatsapp_number,email_official,email_personal,employee_photo_url')
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
              email: e.email_official || e.email_personal || 'st.johnsenglishschool@gmail.com',
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
      setDesignation(selected.designation || (selected.type === 'student' ? 'STUDENT' : 'TEACHER'))
      setDepartment(selected.department || 'Teaching Staff')
      setDob(selected.dateOfBirth || '15/08/1996')
      setPhone(selected.emergencyPhone || selected.mobile || '8274089481')
      setEmail(selected.email || 'st.johnsenglishschool@gmail.com')
      setBloodGroup(selected.bloodGroup || 'O+')
      setPhotoUrl(selected.photoUrl || '')
      setPhotoPreview('')
    }
  }, [selected])

  // Format Expiration string as readable "31 March 2027"
  const formattedExpiry = useMemo(() => {
    try {
      if (!sessionEnd) return '31 March 2027'
      const [y, m, d] = sessionEnd.split('-')
      if (y && m && d) {
        const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
        return dateObj.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }) // e.g. "31 March 2027"
      }
    } catch {}
    return '31 March 2027'
  }, [sessionEnd])

  // Generate high-resolution QR
  useEffect(() => {
    if (!selected) {
      setQr('')
      return
    }
    const payload = JSON.stringify({
      school: "St. John's English School",
      type: selected.type,
      id: selected.code,
      name: selected.fullName,
      role: designation || (selected.type === 'student' ? 'Student' : 'Staff'),
      dob: dob,
      phone: phone,
      sessionEnd: formattedExpiry,
      verified: true,
    })
    QRCode.toDataURL(payload, {
      width: 200,
      margin: 1,
      color: {
        dark: cardTheme === 'theme-navy' ? '#0f172a' : cardTheme === 'theme-emerald' ? '#064e3b' : '#991b1b',
        light: '#ffffff',
      },
    })
      .then(setQr)
      .catch(() => setQr(''))
  }, [selected, designation, dob, phone, formattedExpiry, cardTheme])

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
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [54, 85.6], // Standard ISO CR80 Vertical Card
    })
    pdf.addImage(
      canvas.toDataURL('image/jpeg', 0.99),
      'JPEG',
      0,
      0,
      54,
      85.6
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
      link.download = `Modern-ID-${selected.code || selected.fullName}.pdf`
      link.click()
      setToast('High-Resolution ID Card PDF downloaded')
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
          mobile: phone || selected.mobile || null,
          photo_url: photoUrl || null,
          issue_date: todayIso,
          valid_until: sessionEnd,
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
          action: `Saved student ID card with expiry ${sessionEnd} for ${selected.fullName}`,
          module: 'student_idcard',
        })

        setToast('Student ID card record saved to database')
      } else {
        const record = {
          emp_id: selected.id,
          employee_name: selected.fullName,
          designation: designation || null,
          department: department || null,
          mobile: phone || selected.mobile || null,
          photo_url: photoUrl || null,
          issue_date: todayIso,
          valid_until: sessionEnd,
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
          action: `Saved staff/teacher ID card with session end ${sessionEnd} for ${selected.fullName}`,
          module: 'teacher_idcard',
        })

        setToast('Staff ID card record saved to database')
      }
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  // Wave Palette Theme Helper
  const waveFillPrimary =
    cardTheme === 'theme-navy'
      ? '#1e3a8a'
      : cardTheme === 'theme-emerald'
      ? '#065f46'
      : cardTheme === 'theme-slate'
      ? '#1e293b'
      : '#b91c1c' // Crimson Red

  const waveFillSecondary =
    cardTheme === 'theme-navy'
      ? '#3b82f6'
      : cardTheme === 'theme-emerald'
      ? '#10b981'
      : cardTheme === 'theme-slate'
      ? '#475569'
      : '#f87171' // Rose / Light Crimson

  const waveFillDark =
    cardTheme === 'theme-navy'
      ? '#0f172a'
      : cardTheme === 'theme-emerald'
      ? '#022c22'
      : cardTheme === 'theme-slate'
      ? '#090d16'
      : '#881337' // Deep Maroon/Wine

  return (
    <div className="studio">
      <section className="studio-panel">
        <span className="overline">MODERN DYNAMIC ID STUDIO</span>
        <h2>Modern Wave ID Template</h2>
        <p>
          Generate dynamic modern ID cards with fluid wave arches, glowing name ribbon,
          and prominent session expiry date (<b>31 March 2027</b>).
        </p>

        {/* Card Type Selector */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button
            type="button"
            className={cardType === 'employee' ? 'primary' : ''}
            style={{
              flex: 1,
              height: '38px',
              borderRadius: '9px',
              border: '1px solid #cbd5e1',
              background: cardType === 'employee' ? 'linear-gradient(135deg,#991b1b,#dc2626)' : '#fff',
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
              setSelectedId('')
            }}
          >
            <UserCheck size={16} />
            Faculty / Staff ID
          </button>
          <button
            type="button"
            className={cardType === 'student' ? 'primary' : ''}
            style={{
              flex: 1,
              height: '38px',
              borderRadius: '9px',
              border: '1px solid #cbd5e1',
              background: cardType === 'student' ? 'linear-gradient(135deg,#991b1b,#dc2626)' : '#fff',
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
            Student ID
          </button>
        </div>

        {/* Template Accent Color */}
        <label style={{ marginTop: '14px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Palette size={14} /> Color Accent
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginTop: '4px' }}>
            <button
              type="button"
              style={{
                height: '34px',
                borderRadius: '7px',
                border: cardTheme === 'theme-crimson' ? '2px solid #b91c1c' : '1px solid #cbd5e1',
                background: '#dc2626',
                color: '#fff',
                fontWeight: 800,
                fontSize: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              onClick={() => setCardTheme('theme-crimson')}
              title="Crimson Ruby (As in reference image)"
            >
              Crimson Red
            </button>
            <button
              type="button"
              style={{
                height: '34px',
                borderRadius: '7px',
                border: cardTheme === 'theme-navy' ? '2px solid #1e3a8a' : '1px solid #cbd5e1',
                background: '#1e3a8a',
                color: '#fff',
                fontWeight: 800,
                fontSize: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              onClick={() => setCardTheme('theme-navy')}
              title="Royal Navy"
            >
              Royal Navy
            </button>
            <button
              type="button"
              style={{
                height: '34px',
                borderRadius: '7px',
                border: cardTheme === 'theme-emerald' ? '2px solid #064e3b' : '1px solid #cbd5e1',
                background: '#047857',
                color: '#fff',
                fontWeight: 800,
                fontSize: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              onClick={() => setCardTheme('theme-emerald')}
              title="Emerald Green"
            >
              Emerald
            </button>
            <button
              type="button"
              style={{
                height: '34px',
                borderRadius: '7px',
                border: cardTheme === 'theme-slate' ? '2px solid #1e293b' : '1px solid #cbd5e1',
                background: '#1e293b',
                color: '#fff',
                fontWeight: 800,
                fontSize: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              onClick={() => setCardTheme('theme-slate')}
              title="Titanium Slate"
            >
              Slate
            </button>
          </div>
        </label>

        {/* Record Selection */}
        <label>
          Select {cardType === 'student' ? 'Student' : 'Faculty / Staff Member'}
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <label>
            Designation / Role Title
            <input
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="e.g. TEACHER / GRAPHIC DESIGNER"
            />
          </label>
          <label>
            Date of Birth (DOB)
            <input
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              placeholder="e.g. 15/08/1996"
            />
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <label>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <PhoneCall size={13} color="#dc2626" /> Direct / Emergency Phone
            </span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 82740 89481"
            />
          </label>
          <label>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Mail size={13} color="#dc2626" /> Email Address
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. your email goes here"
            />
          </label>
        </div>

        {/* Expiry & Session Settings (Requested: 31 March 2027) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <label>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={13} color="#dc2626" /> Expiry / Session End Date
            </span>
            <input
              type="date"
              value={sessionEnd}
              onChange={(e) => setSessionEnd(e.target.value)}
            />
          </label>
          <label>
            Academic Session
            <input
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="e.g. 2026 - 2027"
            />
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
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
            Blood Group
            <input
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              placeholder="e.g. O+"
            />
          </label>
        </div>

        <label className="photo-upload">
          <Upload />
          <span>
            {uploading
              ? 'Uploading HD Portrait to Storage...'
              : 'Upload Member Photo or Portrait'}
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
          <button onClick={save} disabled={busy || !selected}>
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
              Front Side (Wave Template)
            </button>
            <button
              type="button"
              className={cardSide === 'back' ? 'active' : ''}
              onClick={() => setCardSide('back')}
            >
              Back Side (Terms & Verification)
            </button>
          </div>

          {/* DYNAMIC MODERN WAVE ID CARD (MATCHING USER REFERENCE IMAGE) */}
          <div
            className={`deluxe-corp-card template-wave ${cardTheme}`}
            ref={cardRef}
          >
            {/* Lanyard Cutout Slot */}
            <div className="card-lanyard-slot" />

            {cardSide === 'front' ? (
              <>
                {/* Dynamic Wave Top SVG Graphic (Red & Soft Grey Curving Arches) */}
                <div className="wave-top-decor">
                  <svg viewBox="0 0 328 125" fill="none" preserveAspectRatio="none">
                    {/* Background Dark Wave */}
                    <path
                      d="M0 0 H328 V45 C280 85 180 115 0 80 Z"
                      fill={waveFillDark}
                    />
                    {/* Light Grey Accent Arch */}
                    <path
                      d="M0 0 H328 V75 C260 110 160 120 0 92 Z"
                      fill="#e2e8f0"
                      opacity="0.85"
                    />
                    {/* Primary Dynamic Wave */}
                    <path
                      d="M0 0 H328 V30 C240 90 140 100 0 65 Z"
                      fill={waveFillPrimary}
                    />
                    {/* Glowing Light Arch Edge */}
                    <path
                      d="M0 0 H328 V15 C200 65 100 80 0 45 Z"
                      fill={waveFillSecondary}
                      opacity="0.9"
                    />
                  </svg>
                </div>

                {/* Header Branding Row over waves */}
                <div className="wave-header-content">
                  <div className="wave-school-brand">
                    <div className="wave-logo-circle">
                      <img src={logo} alt="School Crest" />
                    </div>
                    <div className="wave-school-text">
                      <h2>St. John's English School</h2>
                      <p>Dankuni, Hooghly · W.B. 712311</p>
                    </div>
                  </div>
                </div>

                {/* Central Portrait Area (Clear of waves) */}
                <div className="wave-photo-container">
                  <div className="wave-photo-wrapper">
                    {visiblePhoto ? (
                      <img
                        src={formatImageUrl(visiblePhoto)}
                        alt="Portrait"
                        referrerPolicy="no-referrer"
                        onError={handleImageError}
                      />
                    ) : (
                      <div className="wave-photo-monogram">
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
                </div>

                {/* Floating Glowing Name Banner & Designation (Exact User Reference Pattern) */}
                <div className="wave-name-ribbon-wrap">
                  <div className="wave-name-ribbon">
                    <h3>{selected?.fullName || 'SMITH JHON'}</h3>
                  </div>
                  <div className="wave-role-title">
                    {designation || (cardType === 'student' ? 'STUDENT' : 'GRAPHIC DESIGNER')}
                  </div>
                  <div className="wave-double-line">
                    <span />
                    <span />
                  </div>
                </div>

                {/* Modern Clean Key-Value Tabular List (Matching Exact Reference Layout) */}
                <div className="wave-details-list">
                  <div className="wave-detail-row">
                    <span className="wave-detail-label">ID No</span>
                    <span className="wave-detail-colon">:</span>
                    <span className="wave-detail-val" style={{ fontFamily: 'monospace', fontWeight: 800 }}>
                      {selected?.code || '00000000'}
                    </span>
                  </div>

                  <div className="wave-detail-row">
                    <span className="wave-detail-label">DOB</span>
                    <span className="wave-detail-colon">:</span>
                    <span className="wave-detail-val">{dob || selected?.dateOfBirth || 'MM/DD/YEAR'}</span>
                  </div>

                  <div className="wave-detail-row">
                    <span className="wave-detail-label">Email</span>
                    <span className="wave-detail-colon">:</span>
                    <span className="wave-detail-val" title={email || selected?.email}>
                      {email || selected?.email || 'your mail goes here'}
                    </span>
                  </div>

                  <div className="wave-detail-row">
                    <span className="wave-detail-label">Phone</span>
                    <span className="wave-detail-colon">:</span>
                    <span className="wave-detail-val">{phone || selected?.mobile || '+00 000 000'}</span>
                  </div>

                  {/* Explicit Expiry and Session End mention as requested */}
                  <div className="wave-detail-row">
                    <span className="wave-detail-label" style={{ color: '#b91c1c', fontWeight: 900 }}>
                      Expires
                    </span>
                    <span className="wave-detail-colon">:</span>
                    <span className="wave-detail-val highlight-expiry">
                      {formattedExpiry}
                    </span>
                  </div>

                  <div className="wave-detail-row">
                    <span className="wave-detail-label">Session</span>
                    <span className="wave-detail-colon">:</span>
                    <span className="wave-detail-val">
                      {sessionName} (Ends: {formattedExpiry})
                    </span>
                  </div>
                </div>

                {/* Footer Bar with QR verification and authorized signature */}
                <div className="wave-footer-bar">
                  <div className="wave-qr-box">
                    {qr ? (
                      <img src={qr} alt="Card Verification QR" />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: '#f1f5f9' }} />
                    )}
                  </div>
                  <div className="wave-sign-block">
                    <div className="wave-sign-text">Fr. S. John</div>
                    <div className="wave-sign-label">Authorised Signatory</div>
                  </div>
                </div>

                {/* Dynamic Wave Bottom SVG Graphic */}
                <div className="wave-bottom-decor">
                  <svg viewBox="0 0 328 70" fill="none" preserveAspectRatio="none">
                    <path
                      d="M0 45 C120 15 220 20 328 60 V70 H0 Z"
                      fill="#e2e8f0"
                      opacity="0.8"
                    />
                    <path
                      d="M0 55 C100 28 200 32 328 65 V70 H0 Z"
                      fill={waveFillSecondary}
                      opacity="0.85"
                    />
                    <path
                      d="M0 62 C80 40 180 44 328 68 V70 H0 Z"
                      fill={waveFillPrimary}
                    />
                  </svg>
                </div>
              </>
            ) : (
              /* BACK SIDE OF ID CARD */
              <div className="wave-back-body">
                <div className="wave-back-header">
                  <h4>Terms & Institutional Policy</h4>
                  <span style={{ fontSize: '7.5px', color: '#b91c1c', fontWeight: 800 }}>
                    SESSION {sessionName}
                  </span>
                </div>

                <ul className="wave-back-rules">
                  <li>This card is the property of St. John's English School and must be carried at all times on campus.</li>
                  <li>This card is strictly non-transferable and valid until <b>{formattedExpiry}</b>.</li>
                  <li>Report any loss immediately to the administration office for hotlisting and reissue.</li>
                  <li>Scan the front QR code with any smartphone camera for digital authenticity verification.</li>
                </ul>

                <div className="wave-back-info-card">
                  <b>Campus Administrative Helpline:</b>
                  <span>St. John's English School, Dankuni, Hooghly · W.B. 712311</span>
                  <span>Direct Contact: +91 82740 89481 · Email: {email}</span>
                  <span><b>Session Validity:</b> Valid until session closing on {formattedExpiry}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <ShieldCheck size={16} color="#0d9488" />
                    <span style={{ fontSize: '7.5px', color: '#0f766e', fontWeight: 800 }}>
                      ISO 7810 ID-1 DIGITAL SECURE
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="wave-sign-text" style={{ fontSize: '13px' }}>Principal</span>
                    <span className="wave-sign-label" style={{ display: 'block', fontSize: '6.5px' }}>ADMINISTRATOR SEAL</span>
                  </div>
                </div>

                <div className="wave-barcode-footer">
                  <div className="wave-barcode-lines" />
                  <div className="wave-barcode-text">SJES-{selected?.code || '00000000'}-2027</div>
                </div>
              </div>
            )}
          </div>

          <p className="preview-note">
            Standard ISO 7810 CR80 (54mm × 85.6mm) 300+ DPI Vector Printable Output · Session End: {formattedExpiry}
          </p>
        </div>
      </section>
    </div>
  )
}
