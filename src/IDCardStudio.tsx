import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  Download,
  Printer,
  Save,
  Upload,
  UserCheck,
  GraduationCap,
  PenTool,
  RefreshCw,
  QrCode as QrCodeIcon,
  ShieldCheck,
  Camera,
  Users,
  User,
  ExternalLink,
  Layers,
  Image as ImageIcon,
  Check,
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
import { formatImageUrl, handleImageError } from './lib/imageUtils'
import {
  DEFAULT_SIGNATORY_SVG,
  AuthorisedSignatureSvg,
} from './lib/signatureData'
import DigitalVerificationModal, {
  VerificationData,
} from './components/DigitalVerificationModal'
import QRScannerModal from './components/QRScannerModal'

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
  fatherName?: string
  fatherContact?: string
  fatherPhotoUrl?: string
  motherName?: string
  motherContact?: string
  motherPhotoUrl?: string
}

const logo =
  'https://res.cloudinary.com/oilisvfi/image/upload/v1786000074/logo_final_frchld.jpg'

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
                  color:
                    escortActiveTab === 'student' ? '#1d4ed8' : '#64748b',
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
                  color:
                    escortActiveTab === 'father' ? '#0284c7' : '#64748b',
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
                  color:
                    escortActiveTab === 'mother' ? '#be185d' : '#64748b',
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
        ) : (
          /* STANDARD STUDENT / EMPLOYEE FORM FIELDS */
          <>
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

            <label className="photo-upload">
              <Upload />
              <span>
                {uploadingTarget === 'student'
                  ? 'Uploading to Cloud Storage...'
                  : 'Upload photograph or portrait'}
              </span>
              <input
                type="file"
                accept="image/*"
                disabled={uploadingTarget !== null}
                onChange={(e) => handlePhotoUploadFor('student', e)}
              />
            </label>
          </>
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
        <div
          style={{
            marginTop: '14px',
            padding: '12px',
            background: '#f8fafc',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
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
                fontSize: '11px',
                fontWeight: 800,
                color: '#334155',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <PenTool size={13} color="var(--blue)" />
              Authorised Signatory Image
            </span>
            {signaturePreview && (
              <button
                type="button"
                onClick={resetSignature}
                style={{
                  height: '24px',
                  padding: '0 8px',
                  fontSize: '10px',
                  background: '#fff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <RefreshCw size={10} /> Reset
              </button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                height: '36px',
                width: '90px',
                background: '#fff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                display: 'grid',
                placeItems: 'center',
                padding: '2px',
                overflow: 'hidden',
              }}
            >
              {isCustomSignature ? (
                <img
                  src={visibleSignature}
                  alt="Signatory preview"
                  style={{
                    maxHeight: '100%',
                    maxWidth: '100%',
                    objectFit: 'contain',
                  }}
                />
              ) : (
                <AuthorisedSignatureSvg className="id-signature-svg" />
              )}
            </div>
            <label style={{ margin: 0, flex: 1, cursor: 'pointer' }}>
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--blue)',
                  fontWeight: 700,
                  textDecoration: 'underline',
                }}
              >
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
          /* =======================================================
             ESCORT IDENTITY CARD (Student, Father & Mother Details)
             ======================================================= */
          <div
            className="id-card id-card-portrait id-card-escort"
            ref={cardRef}
          >
            <header>
              <img src={logo} alt="School Crest" crossOrigin="anonymous" />
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
                      <GraduationCap size={24} />
                      <span>STUDENT</span>
                      <span>PHOTO</span>
                    </div>
                  )}
                </div>

                <div className="escort-student-info">
                  <div className="escort-label-row">
                    <span className="escort-field-lbl">STUDENT NAME:</span>
                    <b className="escort-student-name">
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

              {/* Authorized Escorts / Parents Divider */}
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
                        <User size={20} />
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
                      <b className="escort-parent-contact" title={fatherContact}>
                        {fatherContact || 'NOT PROVIDED'}
                      </b>
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
                        <User size={20} />
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
                      <b className="escort-parent-contact" title={motherContact}>
                        {motherContact || 'NOT PROVIDED'}
                      </b>
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
                      <QrCodeIcon size={20} />
                    </div>
                  )}
                  <span className="id-qr-tag">VERIFY</span>
                </div>

                <div className="id-emergency-text">
                  <span>Emergency:</span>
                  <b>9674368297</b>
                  <div
                    style={{
                      fontSize: '7.5px',
                      color: '#64748b',
                      marginTop: '1px',
                    }}
                  >
                    Valid: {expiry}
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
        ) : (
          /* =======================================================
             STANDARD PORTRAIT STUDENT / STAFF ID CARD
             ======================================================= */
          <div className="id-card id-card-portrait" ref={cardRef}>
            <header>
              <img src={logo} alt="School Crest" crossOrigin="anonymous" />
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
