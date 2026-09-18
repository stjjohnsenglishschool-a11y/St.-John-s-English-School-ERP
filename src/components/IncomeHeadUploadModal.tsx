import React, { useState } from 'react'
import {
  X,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  ArrowRight,
  RefreshCw,
  Copy,
  Plus,
} from 'lucide-react'
import { saveDocument, resilientUpsert } from '../lib/supabase'

export interface IncomeHeadItem {
  head_id?: string
  head_category: string
  head_name: string
  head_code: string
  default_amount: number
  frequency: string
  description?: string
  is_active: boolean
}

interface IncomeHeadUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (count: number) => void
  existingCount?: number
}

export const OFFICIAL_PRESETS: IncomeHeadItem[] = [
  // Fee Income
  { head_category: 'Fee Income', head_name: 'Examination Fee', head_code: 'INC-FEE-EXAM', default_amount: 500, frequency: 'As Needed', is_active: true, description: 'Term examination & assessment fees' },
  { head_category: 'Fee Income', head_name: 'Computer Fee', head_code: 'INC-FEE-COMP', default_amount: 300, frequency: 'Monthly', is_active: true, description: 'IT lab usage & practicals' },
  { head_category: 'Fee Income', head_name: 'Smart Class Fee', head_code: 'INC-FEE-SMART', default_amount: 250, frequency: 'Monthly', is_active: true, description: 'Interactive smart board fee' },
  { head_category: 'Fee Income', head_name: 'Activity Fee', head_code: 'INC-FEE-ACT', default_amount: 200, frequency: 'Quarterly', is_active: true, description: 'Co-curricular and workshop charges' },
  { head_category: 'Fee Income', head_name: 'Sports Fee', head_code: 'INC-FEE-SPORT', default_amount: 350, frequency: 'Annual', is_active: true, description: 'Annual sports meet and physical education' },
  { head_category: 'Fee Income', head_name: 'Cultural Activity Fee', head_code: 'INC-FEE-CULT', default_amount: 250, frequency: 'Annual', is_active: true, description: 'Festivals, debates & cultural celebrations' },
  { head_category: 'Fee Income', head_name: 'Annual Function Fee', head_code: 'INC-FEE-ANN', default_amount: 600, frequency: 'Annual', is_active: true, description: 'Annual Day celebration & stage programs' },
  { head_category: 'Fee Income', head_name: 'Magazine Fee', head_code: 'INC-FEE-MAG', default_amount: 150, frequency: 'Annual', is_active: true, description: 'School yearbook & magazine publication' },
  { head_category: 'Fee Income', head_name: 'Identity Card Fee', head_code: 'INC-FEE-ID', default_amount: 100, frequency: 'One-time', is_active: true, description: 'RFID / PVC ID card generation' },
  { head_category: 'Fee Income', head_name: 'School Diary Fee', head_code: 'INC-FEE-DIARY', default_amount: 120, frequency: 'Annual', is_active: true, description: 'Student calendar diary & handbook' },
  { head_category: 'Fee Income', head_name: 'Transfer Certificate Fee', head_code: 'INC-FEE-TC', default_amount: 250, frequency: 'One-time', is_active: true, description: 'Official TC issuance fee' },
  { head_category: 'Fee Income', head_name: 'Migration Certificate Fee', head_code: 'INC-FEE-MIG', default_amount: 300, frequency: 'One-time', is_active: true, description: 'State/board migration certificate' },
  { head_category: 'Fee Income', head_name: 'Re-admission Fee', head_code: 'INC-FEE-READM', default_amount: 1000, frequency: 'One-time', is_active: true, description: 'Student re-admission fee' },
  { head_category: 'Fee Income', head_name: 'Late Fee', head_code: 'INC-FEE-LATE', default_amount: 50, frequency: 'As Needed', is_active: true, description: 'Fee payment after due date' },
  { head_category: 'Fee Income', head_name: 'Fine and Penalty', head_code: 'INC-FEE-FINE', default_amount: 100, frequency: 'As Needed', is_active: true, description: 'General penalty or overdue fine' },
  { head_category: 'Fee Income', head_name: 'Miscellaneous Student Charges', head_code: 'INC-FEE-MISC', default_amount: 150, frequency: 'As Needed', is_active: true, description: 'Ad-hoc student charges and certifications' },

  // Uniform and Educational Materials
  { head_category: 'Uniform and Educational Materials', head_name: 'School Uniform Sales', head_code: 'INC-MAT-UNIF', default_amount: 850, frequency: 'As Needed', is_active: true, description: 'Regular school uniform set' },
  { head_category: 'Uniform and Educational Materials', head_name: 'Sports Uniform Sales', head_code: 'INC-MAT-SPUNIF', default_amount: 650, frequency: 'As Needed', is_active: true, description: 'House sports tracksuit / uniform' },
  { head_category: 'Uniform and Educational Materials', head_name: 'Socks Sales', head_code: 'INC-MAT-SOCKS', default_amount: 80, frequency: 'As Needed', is_active: true, description: 'School uniform socks pair' },
  { head_category: 'Uniform and Educational Materials', head_name: 'Books Sales', head_code: 'INC-MAT-BOOKS', default_amount: 1800, frequency: 'Annual', is_active: true, description: 'Annual course syllabus textbooks set' },
  { head_category: 'Uniform and Educational Materials', head_name: 'Notebooks Sales', head_code: 'INC-MAT-NOTES', default_amount: 500, frequency: 'As Needed', is_active: true, description: 'Branded school exercise notebooks' },
  { head_category: 'Uniform and Educational Materials', head_name: 'Stationery Sales', head_code: 'INC-MAT-STAT', default_amount: 250, frequency: 'As Needed', is_active: true, description: 'Geometry box, pens, pencils, erasers' },
  { head_category: 'Uniform and Educational Materials', head_name: 'School Bag Sales', head_code: 'INC-MAT-BAG', default_amount: 450, frequency: 'As Needed', is_active: true, description: 'Official school crest backpack' },
  { head_category: 'Uniform and Educational Materials', head_name: 'Belt', head_code: 'INC-MAT-BELT', default_amount: 90, frequency: 'As Needed', is_active: true, description: 'School uniform buckle belt' },
  { head_category: 'Uniform and Educational Materials', head_name: 'Art and Craft Materials', head_code: 'INC-MAT-CRAFT', default_amount: 300, frequency: 'As Needed', is_active: true, description: 'Drawing book, colors, clay and craft kit' },

  // Extra-Curricular Income
  { head_category: 'Extra-Curricular Income', head_name: 'Coaching Class Fee', head_code: 'INC-EXT-COACH', default_amount: 1200, frequency: 'Monthly', is_active: true, description: 'Remedial & board exam preparation coaching' },
  { head_category: 'Extra-Curricular Income', head_name: 'Music Class Fee', head_code: 'INC-EXT-MUSIC', default_amount: 400, frequency: 'Monthly', is_active: true, description: 'Vocal and instrumental music training' },
  { head_category: 'Extra-Curricular Income', head_name: 'Dance Class Fee', head_code: 'INC-EXT-DANCE', default_amount: 400, frequency: 'Monthly', is_active: true, description: 'Classical and contemporary dance sessions' },
  { head_category: 'Extra-Curricular Income', head_name: 'Drawing Class Fee', head_code: 'INC-EXT-DRAW', default_amount: 350, frequency: 'Monthly', is_active: true, description: 'Fine arts and painting guidance' },
  { head_category: 'Extra-Curricular Income', head_name: 'Computer Training Fee', head_code: 'INC-EXT-COMPTRN', default_amount: 600, frequency: 'Monthly', is_active: true, description: 'Advanced coding & robotics training' },
  { head_category: 'Extra-Curricular Income', head_name: 'Spoken English Fee', head_code: 'INC-EXT-ENG', default_amount: 500, frequency: 'Monthly', is_active: true, description: 'Communication and personality development' },
  { head_category: 'Extra-Curricular Income', head_name: 'Abacus Class Fee', head_code: 'INC-EXT-ABACUS', default_amount: 550, frequency: 'Monthly', is_active: true, description: 'Mental arithmetic and abacus course' },
  { head_category: 'Extra-Curricular Income', head_name: 'Yoga Class Fee', head_code: 'INC-EXT-YOGA', default_amount: 300, frequency: 'Monthly', is_active: true, description: 'Wellness, breathing and yoga sessions' },
  { head_category: 'Extra-Curricular Income', head_name: 'Martial Arts Fee', head_code: 'INC-EXT-MARTIAL', default_amount: 450, frequency: 'Monthly', is_active: true, description: 'Karate & Taekwondo self-defense' },
  { head_category: 'Extra-Curricular Income', head_name: 'Swimming Fee', head_code: 'INC-EXT-SWIM', default_amount: 800, frequency: 'Monthly', is_active: true, description: 'Pool training & lifeguard supervision' },
  { head_category: 'Extra-Curricular Income', head_name: 'Summer Camp Fee', head_code: 'INC-EXT-CAMP', default_amount: 1500, frequency: 'One-time', is_active: true, description: 'Special vacation camp activities' },
  { head_category: 'Extra-Curricular Income', head_name: 'Educational Tour Fee', head_code: 'INC-EXT-TOUR', default_amount: 2000, frequency: 'One-time', is_active: true, description: 'Outstation educational trip' },
  { head_category: 'Extra-Curricular Income', head_name: 'Excursion Fee', head_code: 'INC-EXT-EXCUR', default_amount: 750, frequency: 'One-time', is_active: true, description: 'Day excursion and museum/park visit' },
  { head_category: 'Extra-Curricular Income', head_name: 'Competition Fee', head_code: 'INC-EXT-COMPETE', default_amount: 200, frequency: 'As Needed', is_active: true, description: 'Olympiad & inter-school registration' },
]

export default function IncomeHeadUploadModal({
  isOpen,
  onClose,
  onSuccess,
  existingCount = 0,
}: IncomeHeadUploadModalProps) {
  const [activeTab, setActiveTab] = useState<'presets' | 'paste' | 'file'>('presets')
  const [pastedText, setPastedText] = useState('')
  const [parsedItems, setParsedItems] = useState<IncomeHeadItem[]>(OFFICIAL_PRESETS)
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successCount, setSuccessCount] = useState<number | null>(null)

  if (!isOpen) return null

  // Smart Parser for user-supplied indented text or raw lines
  const handleParsePastedText = () => {
    setErrorMsg(null)
    const lines = pastedText.split('\n')
    let currentCategory = 'Fee Income'
    const items: IncomeHeadItem[] = []

    for (let rawLine of lines) {
      const trimmed = rawLine.trim()
      if (!trimmed) continue

      // Check if this line is a Category Header
      const cleanCategoryName = trimmed
        .replace(/^\d+[\.\)]\s*/, '') // Remove "1. " or "2) "
        .trim()

      if (
        cleanCategoryName.toLowerCase().includes('fee income') ||
        cleanCategoryName.toLowerCase().includes('uniform') ||
        cleanCategoryName.toLowerCase().includes('extra-curricular') ||
        cleanCategoryName.toLowerCase().includes('extra curricular') ||
        cleanCategoryName.toLowerCase().includes('grant') ||
        cleanCategoryName.toLowerCase().includes('donation') ||
        cleanCategoryName.toLowerCase().includes('material') ||
        cleanCategoryName.toLowerCase().includes('sales') ||
        cleanCategoryName.toLowerCase().includes('miscellaneous') ||
        (!rawLine.startsWith(' ') && !rawLine.startsWith('\t') && trimmed.length < 35 && !trimmed.toLowerCase().includes('fee'))
      ) {
        if (cleanCategoryName.toLowerCase().includes('uniform')) {
          currentCategory = 'Uniform and Educational Materials'
        } else if (cleanCategoryName.toLowerCase().includes('extra')) {
          currentCategory = 'Extra-Curricular Income'
        } else if (cleanCategoryName.toLowerCase().includes('fee')) {
          currentCategory = 'Fee Income'
        } else {
          currentCategory = cleanCategoryName
        }
        continue
      }

      // It's a head name
      const name = trimmed
      const codePart = name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 6)
      const prefix = currentCategory.includes('Uniform') ? 'INC-MAT' : currentCategory.includes('Extra') ? 'INC-EXT' : 'INC-FEE'

      items.push({
        head_category: currentCategory,
        head_name: name,
        head_code: `${prefix}-${codePart}`,
        default_amount: 0,
        frequency: currentCategory.includes('Uniform') ? 'As Needed' : 'Monthly',
        description: `${name} under ${currentCategory}`,
        is_active: true,
      })
    }

    if (items.length === 0) {
      setErrorMsg('Could not detect any valid income head names. Please check the text format.')
      return
    }

    setParsedItems(items)
  }

  // File Upload parser (CSV or TXT)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setErrorMsg(null)

    try {
      const text = await file.text()
      setPastedText(text)

      // If CSV format
      if (file.name.endsWith('.csv') || text.includes(',')) {
        const rows = text.split('\n').map((r) => r.trim()).filter(Boolean)
        const csvItems: IncomeHeadItem[] = []
        for (let i = 1; i < rows.length; i++) {
          const cols = rows[i].split(',').map((c) => c.replace(/^["']|["']$/g, '').trim())
          if (cols.length >= 2) {
            csvItems.push({
              head_category: cols[0] || 'Fee Income',
              head_name: cols[1],
              head_code: cols[2] || `INC-${cols[1].slice(0, 4).toUpperCase()}`,
              default_amount: Number(cols[3]) || 0,
              frequency: cols[4] || 'As Needed',
              description: cols[5] || '',
              is_active: true,
            })
          }
        }
        if (csvItems.length > 0) {
          setParsedItems(csvItems)
          return
        }
      }

      // Plain text fallback
      const lines = text.split('\n')
      let currentCategory = 'Fee Income'
      const items: IncomeHeadItem[] = []
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue
        if (trimmed.toLowerCase().includes('uniform')) currentCategory = 'Uniform and Educational Materials'
        else if (trimmed.toLowerCase().includes('extra')) currentCategory = 'Extra-Curricular Income'
        else if (trimmed.toLowerCase().includes('fee income')) currentCategory = 'Fee Income'
        else {
          items.push({
            head_category: currentCategory,
            head_name: trimmed,
            head_code: `INC-${trimmed.slice(0, 4).toUpperCase().replace(/[^A-Z]/g, '')}`,
            default_amount: 0,
            frequency: 'As Needed',
            is_active: true,
          })
        }
      }
      if (items.length > 0) {
        setParsedItems(items)
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to read file')
    }
  }

  // Execute Batch Save into Master Setup
  const handleSaveAll = async () => {
    setIsProcessing(true)
    setErrorMsg(null)
    try {
      let savedCount = 0

      for (const item of parsedItems) {
        const payload = {
          head_category: item.head_category,
          head_name: item.head_name,
          head_code: item.head_code,
          default_amount: Number(item.default_amount) || 0,
          frequency: item.frequency || 'As Needed',
          description: item.description || `${item.head_name} (${item.head_category})`,
          is_active: true,
        }

        const res = await saveDocument('income_head_master', 'head_id', payload)
        if (res.success) {
          savedCount++
        }
      }

      setSuccessCount(savedCount)
      onSuccess(savedCount)
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed while uploading income heads')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          width: '100%',
          maxWidth: '1050px',
          height: '92vh',
          maxHeight: '900px',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            padding: '16px 24px',
            background: 'linear-gradient(135deg, #0f3661 0%, #1e4976 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Layers style={{ width: '22px', height: '22px', color: '#60a5fa' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
                Income Heads & Types Master Setup
              </h2>
              <p style={{ fontSize: '13px', margin: 0, color: '#93c5fd', opacity: 0.9 }}>
                Upload or preset import all fee, uniform sales, and extra-curricular income categories
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: '#ffffff',
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            padding: '0 24px',
          }}
        >
          <button
            onClick={() => {
              setActiveTab('presets')
              setParsedItems(OFFICIAL_PRESETS)
              setErrorMsg(null)
            }}
            style={{
              padding: '12px 18px',
              fontSize: '14px',
              fontWeight: 600,
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'presets' ? '3px solid #0f3661' : '3px solid transparent',
              color: activeTab === 'presets' ? '#0f3661' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Sparkles style={{ width: '16px', height: '16px', color: '#2563eb' }} />
            Official Preset List ({OFFICIAL_PRESETS.length} Heads)
          </button>

          <button
            onClick={() => {
              setActiveTab('paste')
              setErrorMsg(null)
            }}
            style={{
              padding: '12px 18px',
              fontSize: '14px',
              fontWeight: 600,
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'paste' ? '3px solid #0f3661' : '3px solid transparent',
              color: activeTab === 'paste' ? '#0f3661' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Copy style={{ width: '16px', height: '16px', color: '#16a34a' }} />
            Paste Text List
          </button>

          <button
            onClick={() => {
              setActiveTab('file')
              setErrorMsg(null)
            }}
            style={{
              padding: '12px 18px',
              fontSize: '14px',
              fontWeight: 600,
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'file' ? '3px solid #0f3661' : '3px solid transparent',
              color: activeTab === 'file' ? '#0f3661' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Upload style={{ width: '16px', height: '16px', color: '#ea580c' }} />
            Upload File (.csv / .txt)
          </button>
        </div>

        {/* Modal Body - Full Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Notification Messages */}
          {errorMsg && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                color: '#b91c1c',
                fontSize: '13px',
              }}
            >
              <AlertCircle style={{ width: '18px', height: '18px', flexShrink: 0 }} />
              <div>{errorMsg}</div>
            </div>
          )}

          {successCount !== null && (
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #86efac',
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                color: '#166534',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              <CheckCircle2 style={{ width: '20px', height: '20px', flexShrink: 0 }} />
              <div>Successfully imported {successCount} Income Heads into Master Setup!</div>
            </div>
          )}

          {/* Tab 1: Presets View */}
          {activeTab === 'presets' && (
            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px 18px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                  St. John's Standard Income Heads List
                </span>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                  Includes all 39 heads across Fee Income (16), Uniform & Materials (9), and Extra-Curriculars (14).
                </p>
              </div>
              <span style={{ background: '#dbeafe', color: '#1e40af', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>
                {OFFICIAL_PRESETS.length} Items Ready
              </span>
            </div>
          )}

          {/* Tab 2: Paste View */}
          {activeTab === 'paste' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                  Paste Income Categories & Head Names (indented or listed):
                </label>
                <button
                  type="button"
                  onClick={handleParsePastedText}
                  style={{
                    background: '#0f3661',
                    color: '#ffffff',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <RefreshCw style={{ width: '13px', height: '13px' }} />
                  Parse & Preview List
                </button>
              </div>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Fee Income&#10;  Examination Fee&#10;  Computer Fee&#10;2. Uniform and Educational Materials&#10;  School Uniform Sales&#10;5. Extra-Curricular Income&#10;  Coaching Class Fee"
                rows={6}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  lineHeight: 1.5,
                  resize: 'vertical',
                }}
              />
            </div>
          )}

          {/* Tab 3: File Upload View */}
          {activeTab === 'file' && (
            <div
              style={{
                border: '2px dashed #cbd5e1',
                borderRadius: '12px',
                padding: '24px',
                textAlign: 'center',
                background: '#f8fafc',
                cursor: 'pointer',
              }}
              onClick={() => document.getElementById('income-head-file-input')?.click()}
            >
              <input
                id="income-head-file-input"
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <FileText style={{ width: '36px', height: '36px', color: '#64748b', margin: '0 auto 8px' }} />
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                Click or drag & drop CSV / TXT file here
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Supports standard comma-separated format: Category, Head Name, Code, Default Amount, Frequency
              </div>
            </div>
          )}

          {/* Parsed / Selected Items Table (Full Width & Responsive) */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '300px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                Preview Items to Import ({parsedItems.length})
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['Fee Income', 'Uniform and Educational Materials', 'Extra-Curricular Income'].map((cat) => {
                  const count = parsedItems.filter((x) => x.head_category.includes(cat.split(' ')[0])).length
                  return (
                    <span
                      key={cat}
                      style={{
                        fontSize: '11px',
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: '4px',
                        padding: '2px 8px',
                        color: '#475569',
                        fontWeight: 600,
                      }}
                    >
                      {cat.split(' ')[0]}: {count}
                    </span>
                  )
                })}
              </div>
            </div>

            <div
              style={{
                flex: 1,
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                overflowY: 'auto',
                background: '#ffffff',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', borderBottom: '1px solid #e2e8f0', zIndex: 2 }}>
                  <tr>
                    <th style={{ padding: '8px 12px', color: '#475569', fontWeight: 600 }}>#</th>
                    <th style={{ padding: '8px 12px', color: '#475569', fontWeight: 600 }}>Category / Group</th>
                    <th style={{ padding: '8px 12px', color: '#475569', fontWeight: 600 }}>Income Head / Name</th>
                    <th style={{ padding: '8px 12px', color: '#475569', fontWeight: 600 }}>Code</th>
                    <th style={{ padding: '8px 12px', color: '#475569', fontWeight: 600 }}>Default Fee (₹)</th>
                    <th style={{ padding: '8px 12px', color: '#475569', fontWeight: 600 }}>Frequency</th>
                    <th style={{ padding: '8px 12px', color: '#475569', fontWeight: 600 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedItems.map((item, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                      }}
                    >
                      <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{idx + 1}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span
                          style={{
                            background: item.head_category.includes('Fee')
                              ? '#dbeafe'
                              : item.head_category.includes('Uniform')
                              ? '#fef3c7'
                              : '#dcfce7',
                            color: item.head_category.includes('Fee')
                              ? '#1e40af'
                              : item.head_category.includes('Uniform')
                              ? '#92400e'
                              : '#166534',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                          }}
                        >
                          {item.head_category}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0f172a' }}>{item.head_name}</td>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#64748b' }}>{item.head_code}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0f3661' }}>
                        ₹{Number(item.default_amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '8px 12px', color: '#64748b' }}>{item.frequency}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ color: '#16a34a', fontWeight: 600, fontSize: '11px' }}>● Active</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '16px 24px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: '13px', color: '#64748b' }}>
            {existingCount > 0 && (
              <span>
                Existing heads in database: <strong>{existingCount}</strong>.
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                padding: '10px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              Close
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isProcessing || parsedItems.length === 0}
              style={{
                background: 'linear-gradient(135deg, #0f3661 0%, #1e4976 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '10px 24px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 6px -1px rgba(15, 54, 97, 0.2)',
              }}
            >
              {isProcessing ? (
                <>
                  <RefreshCw style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                  Importing Heads...
                </>
              ) : (
                <>
                  <Upload style={{ width: '16px', height: '16px' }} />
                  Import {parsedItems.length} Income Heads to Master Setup
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
