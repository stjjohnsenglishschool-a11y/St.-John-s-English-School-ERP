import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Download, Printer, Save, Upload, UserCheck, GraduationCap } from 'lucide-react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import { supabase, logActivity, uploadToSupabaseStorage } from './lib/supabase'

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

  useEffect(() => {
    if (!selected) {
      setQr('')
      return
    }
    const payload = JSON.stringify({
      school: 'SJES',
      type: selected.type,
      code: selected.code,
      name: selected.fullName,
      id: selected.id,
    })
    QRCode.toDataURL(payload, { width: 180, margin: 1 })
      .then(setQr)
      .catch(() => setQr(''))
  }, [selected])

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
      scale: 3,
      useCORS: true,
      backgroundColor: '#fff',
    })
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [85.6, 54],
    })
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.98), 'JPEG', 0, 0, 85.6, 54)
    return pdf.output('blob')
  }

  const download = async () => {
    if (!selected) return setToast('Select a person first')
    setBusy(true)
    try {
      const blob = await makePdf()
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `ID-${selected.code || selected.fullName}.pdf`
      link.click()
      setToast('ID card PDF downloaded successfully')
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
          action: `Saved teacher/staff ID card for ${selected.fullName} (${selected.code})`,
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
        <h2>Digital Identity Studio</h2>
        <p>
          Generate and print standardized identity cards directly from real
          Supabase student and employee records.
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
                placeholder="e.g. Senior Secondary Teacher"
              />
            </label>
            <label>
              Department
              <input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Science & Mathematics"
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
        <div className="id-card" ref={cardRef}>
          <header>
            <img src={logo} alt="School Crest" />
            <div>
              <b>ST. JOHN'S ENGLISH SCHOOL</b>
              <span>Dankuni, Hooghly · W.B. 712311</span>
            </div>
          </header>

          <div className="id-body">
            <div className="student-photo">
              {visiblePhoto ? (
                <img src={visiblePhoto} alt="Portrait" />
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

            <div className="id-details">
              <small>
                {cardType === 'student'
                  ? 'STUDENT IDENTITY CARD'
                  : 'STAFF IDENTITY CARD'}
              </small>
              <h3>{selected?.fullName || 'Select a person'}</h3>
              <dl>
                <dt>{cardType === 'student' ? 'Adm No.' : 'Emp Code'}</dt>
                <dd>{selected?.code || '—'}</dd>

                {cardType === 'student' ? (
                  <>
                    <dt>Class</dt>
                    <dd>{className || '—'}</dd>
                    <dt>Roll No.</dt>
                    <dd>{selected?.rollNo || '—'}</dd>
                    <dt>DOB</dt>
                    <dd>{selected?.dateOfBirth || '—'}</dd>
                  </>
                ) : (
                  <>
                    <dt>Designation</dt>
                    <dd>{designation || '—'}</dd>
                    <dt>Department</dt>
                    <dd>{department || '—'}</dd>
                  </>
                )}

                <dt>Mobile</dt>
                <dd>{selected?.mobile || '—'}</dd>
                <dt>Valid Until</dt>
                <dd>{expiry}</dd>
              </dl>
            </div>

            {qr && <img className="id-qr" src={qr} alt="Card Verification QR" />}
          </div>

          <footer>
            <span>Emergency: 9674368297</span>
            <b>AUTHORISED SIGNATORY</b>
          </footer>
        </div>
        <p className="preview-note">
          Live ISO/IEC 7810 ID-1 standard layout · Vector printable output
        </p>
      </section>
    </div>
  )
}
