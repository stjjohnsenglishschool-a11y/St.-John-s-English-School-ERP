import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  Download,
  Printer,
  Save,
  Upload,
  UserCheck,
  GraduationCap,
  ShieldCheck,
  Camera,
  Users,
} from 'lucide-react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import {
  supabase,
  logActivity,
  uploadToSupabaseStorage,
  resilientUpsert,
} from './lib/supabase'
import {
  DEFAULT_SIGNATORY_SVG,
} from './lib/signatureData'
import DigitalVerificationModal, {
  VerificationData,
} from './components/DigitalVerificationModal'
import QRScannerModal from './components/QRScannerModal'

import { Person } from './id-card-studio/types'
import { EscortFormFields } from './id-card-studio/EscortFormFields'
import { StandardFormFields } from './id-card-studio/StandardFormFields'
import { SignatoryCustomizer } from './id-card-studio/SignatoryCustomizer'
import { EscortCardPreview } from './id-card-studio/EscortCardPreview'
import { StandardCardPreview } from './id-card-studio/StandardCardPreview'

export type { Person }

export default function IDCardStudio({
  setToast,
  onUploadCsv,
  initialType,
}: {
  setToast: (message: string) => void
  onUploadCsv: () => void
  initialType?: 'student' | 'employee' | 'escort'
}) {
  const [cardType, setCardType] = useState<'student' | 'employee' | 'escort'>(
    initialType || 'student'
  )

  useEffect(() => {
    if (initialType) {
      setCardType(initialType)
    }
  }, [initialType])

  const [escortActiveTab, setEscortActiveTab] = useState<
    'all' | 'student' | 'father' | 'mother'
  >('all')

  const [people, setPeople] = useState<Person[]>([])
  const [selectedId, setSelectedId] = useState('')

  // Student / General fields
  const [studentName, setStudentName] = useState('')
  const [className, setClassName] = useState('')
  const [rollNo, setRollNo] = useState('')
  const [designation, setDesignation] = useState('')
  const [department, setDepartment] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [photoPreview, setPhotoPreview] = useState('')

  // Parent / Escort fields
  const [fatherName, setFatherName] = useState('')
  const [fatherContact, setFatherContact] = useState('')
  const [fatherPhotoUrl, setFatherPhotoUrl] = useState('')
  const [fatherPhotoPreview, setFatherPhotoPreview] = useState('')

  const [motherName, setMotherName] = useState('')
  const [motherContact, setMotherContact] = useState('')
  const [motherPhotoUrl, setMotherPhotoUrl] = useState('')
  const [motherPhotoPreview, setMotherPhotoPreview] = useState('')

  // Signatory & Validation
  const [signatureUrl, setSignatureUrl] = useState<string>(
    DEFAULT_SIGNATORY_SVG
  )
  const [signaturePreview, setSignaturePreview] = useState('')
  const [expiry, setExpiry] = useState(() => {
    const nextYear = new Date().getFullYear() + 1
    return `${nextYear}-03-31`
  })
  const [qr, setQr] = useState('')
  const [busy, setBusy] = useState(false)
  const [uploadingTarget, setUploadingTarget] = useState<
    'student' | 'father' | 'mother' | null
  >(null)
  const [verificationModalData, setVerificationModalData] =
    useState<VerificationData | null>(null)
  const [isScannerOpen, setIsScannerOpen] = useState(false)

  const cardRef = useRef<HTMLDivElement>(null)
  const studentFileRef = useRef<HTMLInputElement>(null)
  const fatherFileRef = useRef<HTMLInputElement>(null)
  const motherFileRef = useRef<HTMLInputElement>(null)

  // Load records from Supabase, Escort Card table, and Local Storage
  useEffect(() => {
    if (!supabase) return

    if (cardType === 'student' || cardType === 'escort') {
      Promise.all([
        supabase
          .from('student_master')
          .select(
            'student_id,admission_no,roll_no,full_name,date_of_birth,mobile_primary,class_name,student_photo_url,father_name,father_mobile,father_whatsapp,mother_name,mother_mobile,mother_whatsapp,emergency_contact_name,emergency_contact_phone,document_url'
          )
          .eq('is_active', true)
          .order('full_name'),
        supabase.from('escort_card').select('*'),
      ]).then(([studentsRes, escortRes]) => {
        if (studentsRes.error) {
          setToast(studentsRes.error.message)
          return
        }

        const escortRows = escortRes.data || []

        // Load local extra cache
        let allExtra: Record<string, any> = {}
        try {
          allExtra = JSON.parse(
            localStorage.getItem('sjes_escort_cards_extra') || '{}'
          )
        } catch {}

        // Load local student master cache if present
        let localMasterList: any[] = []
        try {
          const cached =
            localStorage.getItem('sjes_table_student_master') ||
            localStorage.getItem('sjes_table_students')
          if (cached) localMasterList = JSON.parse(cached)
        } catch {}

        const list: Person[] = (studentsRes.data || []).map((s) => {
          const extra =
            allExtra[s.student_id] || allExtra[s.admission_no] || allExtra[s.full_name] || {}

          // Find local master match
          const localMatch = localMasterList.find(
            (lm: any) =>
              lm.admission_no === s.admission_no ||
              lm.student_id === s.student_id ||
              lm.full_name === s.full_name
          )

          // Find escort_card match from Supabase
          const fatherEscort = escortRows.find(
            (er: any) =>
              (er.student_name === s.full_name ||
                er.student_name?.toLowerCase() === s.full_name?.toLowerCase()) &&
              (er.relation === 'Father' || er.relation?.toLowerCase() === 'father')
          )
          const motherEscort = escortRows.find(
            (er: any) =>
              (er.student_name === s.full_name ||
                er.student_name?.toLowerCase() === s.full_name?.toLowerCase()) &&
              (er.relation === 'Mother' || er.relation?.toLowerCase() === 'mother')
          )

          // Document URL JSON fallback
          let docParsed: any = {}
          if (s.document_url && typeof s.document_url === 'string' && s.document_url.startsWith('{')) {
            try {
              docParsed = JSON.parse(s.document_url)
            } catch {}
          }

          const resolvedFatherPhoto =
            extra.fatherPhotoUrl ||
            extra.father_photo_url ||
            fatherEscort?.photo_url ||
            docParsed.father_photo_url ||
            docParsed.fatherPhotoUrl ||
            localMatch?.father_photo_url ||
            localMatch?.father_photo ||
            ''

          const resolvedMotherPhoto =
            extra.motherPhotoUrl ||
            extra.mother_photo_url ||
            motherEscort?.photo_url ||
            docParsed.mother_photo_url ||
            docParsed.motherPhotoUrl ||
            localMatch?.mother_photo_url ||
            localMatch?.mother_photo ||
            ''

          const resolvedFatherName =
            extra.fatherName ||
            s.father_name ||
            fatherEscort?.escort_name ||
            localMatch?.father_name ||
            ''

          const resolvedFatherContact =
            extra.fatherContact ||
            s.father_mobile ||
            s.father_whatsapp ||
            fatherEscort?.mobile ||
            localMatch?.father_mobile ||
            ''

          const resolvedMotherName =
            extra.motherName ||
            s.mother_name ||
            motherEscort?.escort_name ||
            localMatch?.mother_name ||
            ''

          const resolvedMotherContact =
            extra.motherContact ||
            s.mother_mobile ||
            s.mother_whatsapp ||
            motherEscort?.mobile ||
            localMatch?.mother_mobile ||
            ''

          return {
            id: s.student_id,
            code: s.admission_no,
            fullName: s.full_name,
            secondaryInfo: s.class_name ? `Class ${s.class_name}` : undefined,
            dateOfBirth: s.date_of_birth,
            mobile: s.mobile_primary,
            photoUrl:
              extra.studentPhotoUrl ||
              s.student_photo_url ||
              localMatch?.student_photo_url ||
              '',
            type: 'student',
            className: s.class_name,
            rollNo: s.roll_no,
            fatherName: resolvedFatherName,
            fatherContact: resolvedFatherContact,
            fatherPhotoUrl: resolvedFatherPhoto,
            motherName: resolvedMotherName,
            motherContact: resolvedMotherContact,
            motherPhotoUrl: resolvedMotherPhoto,
          }
        })

        setPeople(list)
        if (list.length > 0 && !selectedId) {
          setSelectedId(list[0].id)
        }
      })
    } else {
      supabase
        .from('employee_master')
        .select(
          'emp_id,emp_code,first_name,last_name,designation,department,mobile_primary,employee_photo_url,employment_status'
        )
        .eq('is_active', true)
        .neq('employment_status', 'Inactive')
        .neq('employment_status', 'Resigned')
        .neq('employment_status', 'Retired')
        .neq('employment_status', 'Left')
        .neq('employment_status', 'Suspended')
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
      setStudentName(selected.fullName || '')
      setClassName(selected.className || '')
      setRollNo(selected.rollNo || '')
      setDesignation(selected.designation || '')
      setDepartment(selected.department || '')
      setPhotoUrl(selected.photoUrl || '')
      setPhotoPreview('')

      // Load extra cached details if present
      let extra: any = null
      try {
        const allExtra = JSON.parse(
          localStorage.getItem('sjes_escort_cards_extra') || '{}'
        )
        extra =
          allExtra[selected.id] ||
          allExtra[selected.code] ||
          allExtra[selected.fullName] ||
          {}
      } catch {}

      setFatherName(extra?.fatherName || selected.fatherName || '')
      setFatherContact(extra?.fatherContact || selected.fatherContact || '')
      setFatherPhotoUrl(
        extra?.fatherPhotoUrl ||
          extra?.father_photo_url ||
          selected.fatherPhotoUrl ||
          ''
      )
      setFatherPhotoPreview('')

      setMotherName(extra?.motherName || selected.motherName || '')
      setMotherContact(extra?.motherContact || selected.motherContact || '')
      setMotherPhotoUrl(
        extra?.motherPhotoUrl ||
          extra?.mother_photo_url ||
          selected.motherPhotoUrl ||
          ''
      )
      setMotherPhotoPreview('')
    }
  }, [selected])

  const visibleStudentPhoto = photoPreview || photoUrl
  const visibleFatherPhoto = fatherPhotoPreview || fatherPhotoUrl
  const visibleMotherPhoto = motherPhotoPreview || motherPhotoUrl

  const isCustomSignature = Boolean(
    signaturePreview ||
      (signatureUrl &&
        signatureUrl !== DEFAULT_SIGNATORY_SVG &&
        !signatureUrl.startsWith('data:image/svg+xml'))
  )
  const visibleSignature =
    signaturePreview || signatureUrl || DEFAULT_SIGNATORY_SVG

  // Generate Web Verification QR Code
  useEffect(() => {
    const code =
      selected?.code || (cardType === 'employee' ? 'EMP-013' : 'ADM-001')
    const name =
      selected?.fullName ||
      (cardType === 'employee' ? 'Ananya Manna' : 'Student Name')
    const type = cardType
    const role =
      cardType === 'escort'
        ? `Escort Pass · Class ${className || ''} (Roll ${rollNo || ''})`
        : cardType === 'student'
          ? className
            ? `Class: ${className}`
            : 'Student'
          : designation || 'Teacher'
    const dept = department || 'Teaching Staff'

    const baseOrigin =
      typeof window !== 'undefined' && window.location.origin
        ? window.location.origin
        : 'https://stjohns-school.edu'
    const pathname =
      typeof window !== 'undefined' ? window.location.pathname : '/'
    const queryParamsObj: Record<string, string> = {
      verify: code,
      name: name,
      type: type,
      role: role,
      dept: dept,
      valid: expiry,
      school: "St. John's English School",
    }

    if (cardType === 'escort') {
      if (fatherName)
        queryParamsObj.father = `${fatherName} (${fatherContact || 'N/A'})`
      if (motherName)
        queryParamsObj.mother = `${motherName} (${motherContact || 'N/A'})`
    }

    if (visibleStudentPhoto && !visibleStudentPhoto.startsWith('blob:')) {
      queryParamsObj.photo = visibleStudentPhoto
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
  }, [
    selected,
    cardType,
    className,
    rollNo,
    designation,
    department,
    expiry,
    visibleStudentPhoto,
    fatherName,
    fatherContact,
    motherName,
    motherContact,
  ])

  const openVerificationModal = () => {
    const code =
      selected?.code || (cardType === 'employee' ? 'EMP-013' : 'ADM-001')
    const name =
      selected?.fullName ||
      (cardType === 'employee' ? 'Ananya Manna' : 'Student Name')
    const role =
      cardType === 'escort'
        ? `Escort Pass · Class ${className || ''} (Roll ${rollNo || ''})`
        : cardType === 'student'
          ? className
            ? `Class: ${className}`
            : 'Student'
          : designation || 'Teacher'

    setVerificationModalData({
      code,
      name,
      type: cardType,
      role,
      department:
        department ||
        (cardType === 'employee' ? 'Teaching Staff' : undefined),
      className: className || undefined,
      section: (selected as any)?.section || 'A',
      rollNo: rollNo || selected?.rollNo || '1',
      validUntil: expiry,
      school: "St. John's English School",
      photoUrl: visibleStudentPhoto || selected?.photoUrl || undefined,
      verifiedAt: new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
      dbId: selected?.id,
      bloodGroup:
        (selected as any)?.blood_group ||
        (selected as any)?.bloodGroup ||
        'B+',
      dob:
        selected?.dateOfBirth ||
        (cardType === 'student' ? '2010-05-14' : '1988-04-12'),
      gender:
        (selected as any)?.gender || (cardType === 'student' ? 'Male' : 'Female'),
      mobile:
        selected?.mobile ||
        fatherContact ||
        motherContact ||
        '9876543210',
      email:
        (selected as any)?.email ||
        (selected as any)?.student_email ||
        'contact@stjohnsschool.edu.in',
      fatherName: fatherName || selected?.fatherName || 'Subhashis Ghosh',
      motherName: motherName || selected?.motherName || 'Soma Ghosh',
      address:
        (selected as any)?.address ||
        'T.N. Mukherjee Road, Dankuni, Hooghly · W.B. 712311',
      academicYear:
        (selected as any)?.academic_year ||
        (selected as any)?.academicYear ||
        '2026-2027',
      status: 'Active & Authorized Escort Pass',
      emergencyContact: '9674368297',
    })
  }

  const handleScanVerified = (data: VerificationData) => {
    setVerificationModalData(data)
  }

  const handleSelectPersonFromScan = (
    type: 'student' | 'employee',
    id: string
  ) => {
    if (type !== cardType && (cardType !== 'escort' || type !== 'student')) {
      setCardType(type)
    }
    setSelectedId(id)
    setToast(`Loaded profile for ${type === 'student' ? 'Student' : 'Staff'}`)
  }

  // Upload handler supporting student, father, or mother photos
  const handlePhotoUploadFor = async (
    target: 'student' | 'father' | 'mother',
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    const objectUrl = URL.createObjectURL(file)
    if (target === 'student') setPhotoPreview(objectUrl)
    else if (target === 'father') setFatherPhotoPreview(objectUrl)
    else if (target === 'mother') setMotherPhotoPreview(objectUrl)

    setUploadingTarget(target)
    try {
      const publicUrl = await uploadToSupabaseStorage(
        file,
        'school-documents',
        target === 'student' ? 'students' : 'parents'
      )
      if (target === 'student') {
        setPhotoUrl(publicUrl)
        setToast('Student photo uploaded successfully')
      } else if (target === 'father') {
        setFatherPhotoUrl(publicUrl)
        setToast('Father photo uploaded successfully')
      } else if (target === 'mother') {
        setMotherPhotoUrl(publicUrl)
        setToast('Mother photo uploaded successfully')
      }
    } catch {
      setToast(
        `${
          target === 'student'
            ? 'Student'
            : target === 'father'
              ? 'Father'
              : 'Mother'
        } photo preview loaded`
      )
    } finally {
      setUploadingTarget(null)
    }
  }

  const handleSignatureUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = (e.target?.result as string) || ''
      setSignaturePreview(dataUrl)
      setSignatureUrl(dataUrl)
      setToast('Custom signature loaded for Authorised Signatory')
    }
    reader.readAsDataURL(file)
  }

  const resetSignature = () => {
    setSignaturePreview('')
    setSignatureUrl(DEFAULT_SIGNATORY_SVG)
    setToast('Reset to default Authorised Signatory')
  }

  const makePdf = async () => {
    if (!cardRef.current) throw new Error('Card preview unavailable')
    const canvas = await html2canvas(cardRef.current, {
      scale: 3.5,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      imageTimeout: 10000,
    })
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
      link.download =
        cardType === 'escort'
          ? `Escort-Card-${selected.code || studentName || 'Student'}.pdf`
          : `ID-${selected.code || selected.fullName}-Portrait.pdf`
      link.click()
      setToast(
        cardType === 'escort'
          ? 'Escort Card PDF downloaded successfully'
          : 'Portrait ID card PDF downloaded successfully'
      )
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

      if (cardType === 'escort') {
        // 1. Save Father Escort Record in Supabase escort_card table
        if (fatherName || visibleFatherPhoto) {
          const fatherRecord = {
            student_name: studentName,
            class_name: className,
            escort_name: fatherName || 'Father',
            relation: 'Father',
            mobile: fatherContact || null,
            photo_url: visibleFatherPhoto || null,
            issue_date: todayIso,
            valid_until: expiry,
            is_active: true,
          }
          await resilientUpsert('escort_card', [fatherRecord])
        }

        // 2. Save Mother Escort Record in Supabase escort_card table
        if (motherName || visibleMotherPhoto) {
          const motherRecord = {
            student_name: studentName,
            class_name: className,
            escort_name: motherName || 'Mother',
            relation: 'Mother',
            mobile: motherContact || null,
            photo_url: visibleMotherPhoto || null,
            issue_date: todayIso,
            valid_until: expiry,
            is_active: true,
          }
          await resilientUpsert('escort_card', [motherRecord])
        }

        // 3. Update student_master parent info & document_url (JSON metadata) in Supabase
        if (selected?.id) {
          const docData = JSON.stringify({
            father_photo_url: visibleFatherPhoto || '',
            mother_photo_url: visibleMotherPhoto || '',
            father_name: fatherName,
            father_mobile: fatherContact,
            mother_name: motherName,
            mother_mobile: motherContact,
            updated_at: new Date().toISOString(),
          })

          await supabase
            .from('student_master')
            .update({
              father_name: fatherName || null,
              father_mobile: fatherContact || null,
              mother_name: motherName || null,
              mother_mobile: motherContact || null,
              student_photo_url: visibleStudentPhoto || null,
              document_url: docData,
            })
            .eq('student_id', selected.id)
        }

        // 4. Update memory state for this person
        setPeople((prev) =>
          prev.map((p) =>
            p.id === selected.id
              ? {
                  ...p,
                  fullName: studentName,
                  className,
                  rollNo,
                  photoUrl: visibleStudentPhoto,
                  fatherName,
                  fatherContact,
                  fatherPhotoUrl: visibleFatherPhoto,
                  motherName,
                  motherContact,
                  motherPhotoUrl: visibleMotherPhoto,
                }
              : p
          )
        )

        // 5. Save to local storage caches so all photos and contact details are permanently retained
        try {
          const allExtra = JSON.parse(
            localStorage.getItem('sjes_escort_cards_extra') || '{}'
          )
          const key = selected.id || selected.code || studentName
          allExtra[key] = {
            studentName,
            className,
            rollNo,
            studentPhotoUrl: visibleStudentPhoto,
            fatherName,
            fatherContact,
            fatherPhotoUrl: visibleFatherPhoto,
            motherName,
            motherContact,
            motherPhotoUrl: visibleMotherPhoto,
            expiry,
            updatedAt: new Date().toISOString(),
          }
          localStorage.setItem(
            'sjes_escort_cards_extra',
            JSON.stringify(allExtra)
          )

          // Also update sjes_table_student_master cache
          const localMasterStr = localStorage.getItem('sjes_table_student_master')
          if (localMasterStr) {
            const localMaster = JSON.parse(localMasterStr)
            if (Array.isArray(localMaster)) {
              const updatedMaster = localMaster.map((sm: any) =>
                sm.admission_no === selected.code || sm.student_id === selected.id
                  ? {
                      ...sm,
                      full_name: studentName,
                      class_name: className,
                      roll_no: rollNo,
                      student_photo_url: visibleStudentPhoto,
                      father_name: fatherName,
                      father_mobile: fatherContact,
                      father_photo_url: visibleFatherPhoto,
                      mother_name: motherName,
                      mother_mobile: motherContact,
                      mother_photo_url: visibleMotherPhoto,
                    }
                  : sm
              )
              localStorage.setItem('sjes_table_student_master', JSON.stringify(updatedMaster))
              localStorage.setItem('sjes_table_students', JSON.stringify(updatedMaster))
            }
          }
        } catch (e) {
          console.error('Failed to save escort extra cache:', e)
        }

        await logActivity({
          action: `Saved Escort Identity Card for ${studentName} (${selected.code}) with Father & Mother details`,
          module: 'escort_card',
        })

        setToast('✓ Escort Card & Parent Photo records saved successfully!')
      } else if (cardType === 'student') {
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
      <section
        className="studio-panel"
        style={{
          maxHeight: 'calc(100vh - 110px)',
          overflowY: 'auto',
          paddingRight: '12px',
        }}
      >
        <span className="overline">ID CARD GENERATOR & STUDIO</span>
        <h2>
          {cardType === 'escort'
            ? 'Parent & Guardian Escort Card Studio'
            : 'Portrait Identity Studio'}
        </h2>
        <p>
          {cardType === 'escort'
            ? 'Generate and print official student escort cards with student, father, and mother photos and contact details for safe school gate dismissal.'
            : 'Generate and print standardized portrait identity cards with official authorised signatory.'}
        </p>

        {/* Studio Type Selector Tabs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '6px',
            marginTop: '16px',
          }}
        >
          <button
            type="button"
            className={cardType === 'student' ? 'primary' : ''}
            style={{
              height: '38px',
              borderRadius: '8px',
              border: '1px solid #d8e1eb',
              background: cardType === 'student' ? 'var(--blue)' : '#fff',
              color: cardType === 'student' ? '#fff' : '#4f6277',
              fontWeight: 700,
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '0 4px',
            }}
            onClick={() => setCardType('student')}
          >
            <GraduationCap size={14} />
            Student ID
          </button>
          <button
            type="button"
            className={cardType === 'employee' ? 'primary' : ''}
            style={{
              height: '38px',
              borderRadius: '8px',
              border: '1px solid #d8e1eb',
              background: cardType === 'employee' ? 'var(--blue)' : '#fff',
              color: cardType === 'employee' ? '#fff' : '#4f6277',
              fontWeight: 700,
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '0 4px',
            }}
            onClick={() => setCardType('employee')}
          >
            <UserCheck size={14} />
            Staff ID
          </button>
          <button
            type="button"
            className={cardType === 'escort' ? 'primary' : ''}
            style={{
              height: '38px',
              borderRadius: '8px',
              border: '1px solid #d8e1eb',
              background: cardType === 'escort' ? 'var(--blue)' : '#fff',
              color: cardType === 'escort' ? '#fff' : '#4f6277',
              fontWeight: 700,
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '0 4px',
            }}
            onClick={() => setCardType('escort')}
          >
            <Users size={14} />
            Escort Card
          </button>
        </div>

        <label style={{ marginTop: '14px' }}>
          Select {cardType === 'employee' ? 'Staff / Teacher' : 'Student'}
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

        {/* ESCORT CARD FORM FIELDS */}
        {cardType === 'escort' ? (
          <EscortFormFields
            escortActiveTab={escortActiveTab}
            setEscortActiveTab={setEscortActiveTab}
            studentName={studentName}
            setStudentName={setStudentName}
            className={className}
            setClassName={setClassName}
            rollNo={rollNo}
            setRollNo={setRollNo}
            photoUrl={photoUrl}
            setPhotoUrl={setPhotoUrl}
            visibleStudentPhoto={visibleStudentPhoto}
            fatherName={fatherName}
            setFatherName={setFatherName}
            fatherContact={fatherContact}
            setFatherContact={setFatherContact}
            fatherPhotoUrl={fatherPhotoUrl}
            setFatherPhotoUrl={setFatherPhotoUrl}
            visibleFatherPhoto={visibleFatherPhoto}
            motherName={motherName}
            setMotherName={setMotherName}
            motherContact={motherContact}
            setMotherContact={setMotherContact}
            motherPhotoUrl={motherPhotoUrl}
            setMotherPhotoUrl={setMotherPhotoUrl}
            visibleMotherPhoto={visibleMotherPhoto}
            uploadingTarget={uploadingTarget}
            studentFileRef={studentFileRef}
            fatherFileRef={fatherFileRef}
            motherFileRef={motherFileRef}
            handlePhotoUploadFor={handlePhotoUploadFor}
          />
        ) : (
          /* STANDARD STUDENT / EMPLOYEE FORM FIELDS */
          <StandardFormFields
            cardType={cardType}
            className={className}
            setClassName={setClassName}
            designation={designation}
            setDesignation={setDesignation}
            department={department}
            setDepartment={setDepartment}
            photoUrl={photoUrl}
            setPhotoUrl={setPhotoUrl}
            uploadingTarget={uploadingTarget}
            handlePhotoUploadFor={handlePhotoUploadFor}
          />
        )}

        <label style={{ marginTop: '12px' }}>
          Valid Until
          <input
            type="date"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
          />
        </label>

        {/* Authorised Signatory customizer */}
        <SignatoryCustomizer
          signaturePreview={signaturePreview}
          visibleSignature={visibleSignature}
          isCustomSignature={isCustomSignature}
          handleSignatureUpload={handleSignatureUpload}
          resetSignature={resetSignature}
        />

        <div className="studio-actions">
          <button
            type="button"
            className="primary"
            onClick={() => setIsScannerOpen(true)}
            style={{
              backgroundColor: '#0284c7',
              borderColor: '#0284c7',
              color: '#ffffff',
            }}
            title="Scan physical ID cards or digital QR codes using browser camera"
          >
            <Camera size={15} />
            Scan QR Code
          </button>
          <button onClick={download} disabled={busy || !selected}>
            <Download />
            Download PDF
          </button>
          <button onClick={save} disabled={busy || !selected}>
            <Save />
            {busy ? 'Saving…' : 'Save card record'}
          </button>
          <button
            type="button"
            onClick={openVerificationModal}
            style={{
              borderColor: '#2563eb',
              color: '#1d4ed8',
              background: '#eff6ff',
              fontWeight: 800,
            }}
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
        {cardType === 'escort' ? (
          /* ESCORT IDENTITY CARD PREVIEW */
          <EscortCardPreview
            cardRef={cardRef}
            studentFileRef={studentFileRef}
            fatherFileRef={fatherFileRef}
            motherFileRef={motherFileRef}
            studentName={studentName}
            selected={selected}
            className={className}
            rollNo={rollNo}
            fatherName={fatherName}
            fatherContact={fatherContact}
            motherName={motherName}
            motherContact={motherContact}
            visibleStudentPhoto={visibleStudentPhoto}
            visibleFatherPhoto={visibleFatherPhoto}
            visibleMotherPhoto={visibleMotherPhoto}
            qr={qr}
            openVerificationModal={openVerificationModal}
            expiry={expiry}
            isCustomSignature={isCustomSignature}
            visibleSignature={visibleSignature}
          />
        ) : (
          /* STANDARD PORTRAIT STUDENT / STAFF ID CARD PREVIEW */
          <StandardCardPreview
            cardRef={cardRef}
            cardType={cardType}
            selected={selected}
            className={className}
            designation={designation}
            department={department}
            visibleStudentPhoto={visibleStudentPhoto}
            expiry={expiry}
            qr={qr}
            openVerificationModal={openVerificationModal}
            isCustomSignature={isCustomSignature}
            visibleSignature={visibleSignature}
          />
        )}

        <p className="preview-note">
          Live ISO/IEC 7810 ID-1 portrait standard (54mm × 85.6mm) · Tap QR code
          or click 'Test QR Scan' to preview live verification
        </p>
      </section>

      {/* Digital Identity Verification Certificate Modal */}
      {verificationModalData && (
        <DigitalVerificationModal
          data={verificationModalData}
          onClose={() => setVerificationModalData(null)}
          onScanAgain={() => setIsScannerOpen(true)}
          onSelectInStudio={
            verificationModalData.dbId
              ? () =>
                  handleSelectPersonFromScan(
                    (verificationModalData.type as 'student' | 'employee') ||
                      'student',
                    verificationModalData.dbId!
                  )
              : undefined
          }
        />
      )}

      {/* Real-time Camera QR Code Scanner */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onVerified={handleScanVerified}
        onSelectPerson={handleSelectPersonFromScan}
      />
    </div>
  )
}
