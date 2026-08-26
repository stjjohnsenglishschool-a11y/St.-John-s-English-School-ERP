import React, { useState, useRef } from 'react'
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Table,
} from 'lucide-react'
import { supabase, logActivity } from '../lib/supabase'
import { Module, moduleName } from '../modules'
import {
  parseCsvText,
  mapCsvHeaders,
  sanitizeRecordForTable,
  generateSampleCsv,
} from '../lib/csvUtils'

interface CsvImportModalProps {
  mod: Module
  onClose: () => void
  onSuccess: (count: number) => void
}

export default function CsvImportModal({ mod, onClose, onSuccess }: CsvImportModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [rawRows, setRawRows] = useState<string[][]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [headerMappings, setHeaderMappings] = useState<
    { headerName: string; mappedKey: string | null; isMatched: boolean }[]
  >([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultSummary, setResultSummary] = useState<{
    total: number
    success: number
    failed: number
    errors: string[]
  } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle File Selection
  const handleFileChange = async (selectedFile: File) => {
    if (!selectedFile) return
    setError(null)
    setResultSummary(null)
    setFile(selectedFile)

    try {
      const text = await selectedFile.text()
      const parsed = parseCsvText(text)
      if (parsed.length < 2) {
        throw new Error('The CSV file must contain a header row and at least one record row.')
      }

      const [hdrs, ...dataRows] = parsed
      const mappings = mapCsvHeaders(hdrs, mod)

      const matchedCount = mappings.filter((m) => m.isMatched).length
      if (matchedCount === 0) {
        throw new Error(
          `None of the CSV column headers matched ${moduleName(mod.table)}. Please download our sample CSV template below to see the required format.`
        )
      }

      setHeaders(hdrs)
      setHeaderMappings(mappings)
      setRawRows(dataRows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV file.')
      setFile(null)
      setRawRows([])
    }
  }

  // Download Sample Template
  const handleDownloadTemplate = () => {
    const csvContent = generateSampleCsv(mod)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${mod.table}_template.csv`
    link.click()
  }

  // Execute Import
  const handleExecuteImport = async () => {
    if (!supabase || !rawRows.length || !headerMappings.length) return
    setLoading(true)
    setError(null)
    setResultSummary(null)

    const errors: string[] = []
    let successCount = 0
    let failCount = 0

    try {
      // 1. Prepare sanitized payloads
      const payloads: Record<string, unknown>[] = []
      rawRows.forEach((row, rowIndex) => {
        const rowObj: Record<string, string> = {}
        row.forEach((cellVal, colIndex) => {
          const mapping = headerMappings[colIndex]
          if (mapping && mapping.mappedKey) {
            rowObj[mapping.mappedKey] = cellVal
          }
        })

        if (Object.keys(rowObj).length > 0) {
          const sanitized = sanitizeRecordForTable(rowObj, mod, rowIndex)
          payloads.push(sanitized)
        }
      })

      if (payloads.length === 0) {
        throw new Error('No valid records could be extracted from the CSV.')
      }

      // 2. Try batch insert first
      const { data, error: batchError } = await supabase.from(mod.table).insert(payloads).select()

      if (!batchError) {
        successCount = payloads.length
      } else {
        // Fallback: If batch fails (e.g. one duplicate key or constraint violation), try row by row to import as many as possible
        console.warn('Batch insert error, switching to row-by-row fallback:', batchError.message)
        
        for (let i = 0; i < payloads.length; i++) {
          const item = payloads[i]
          const { error: rowError } = await supabase.from(mod.table).insert([item])
          if (!rowError) {
            successCount++
          } else {
            failCount++
            const rowIdentifier = Object.values(item)[0] || `Row #${i + 2}`
            errors.push(`Row ${i + 2} (${rowIdentifier}): ${rowError.message}`)
          }
        }
      }

      await logActivity({
        action: `CSV Import: ${successCount} inserted, ${failCount} failed in ${mod.table}`,
        module: mod.table,
        status: successCount > 0 ? 'success' : 'failed',
      })

      setResultSummary({
        total: payloads.length,
        success: successCount,
        failed: failCount,
        errors,
      })

      if (successCount > 0) {
        onSuccess(successCount)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  const matchedCols = headerMappings.filter((m) => m.isMatched)
  const unmatchedCols = headerMappings.filter((m) => !m.isMatched)

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>
                Import CSV to {moduleName(mod.table)}
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                Target Supabase table: <code>{mod.table}</code>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              padding: '6px',
              borderRadius: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {/* Step 1: Upload or Template Area */}
          {!file && (
            <div>
              <div
                style={{
                  border: '2px dashed #cbd5e1',
                  borderRadius: '10px',
                  padding: '36px 20px',
                  textAlign: 'center',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  marginBottom: '16px',
                }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  if (e.dataTransfer.files?.[0]) {
                    handleFileChange(e.dataTransfer.files[0])
                  }
                }}
              >
                <Upload style={{ width: 44, height: 44, color: '#3b82f6', margin: '0 auto 12px' }} />
                <h3 style={{ margin: '0 0 6px', fontSize: '16px', color: '#1e293b' }}>
                  Click to select or drag & drop CSV file
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                  Accepts .csv files exported from Excel, Google Sheets, or St. John's database
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  style={{ display: 'none' }}
                  onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                />
              </div>

              <div
                style={{
                  padding: '12px 16px',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <b style={{ fontSize: '13px', color: '#1e40af' }}>Need the exact CSV format?</b>
                  <p style={{ margin: 0, fontSize: '12px', color: '#3b82f6' }}>
                    Download our formatted CSV template with pre-filled columns and sample data.
                  </p>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    background: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Download size={14} /> Download Template
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div
              style={{
                marginTop: '12px',
                padding: '12px 14px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                color: '#b91c1c',
                fontSize: '13px',
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <b>Import Error:</b>
                <p style={{ margin: '4px 0 0' }}>{error}</p>
              </div>
            </div>
          )}

          {/* Result Summary */}
          {resultSummary && (
            <div
              style={{
                marginBottom: '16px',
                padding: '16px',
                background: resultSummary.success > 0 ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${resultSummary.success > 0 ? '#bbf7d0' : '#fecaca'}`,
                borderRadius: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {resultSummary.success > 0 ? (
                  <CheckCircle2 size={20} color="#16a34a" />
                ) : (
                  <AlertCircle size={20} color="#dc2626" />
                )}
                <h4 style={{ margin: 0, fontSize: '15px', color: resultSummary.success > 0 ? '#15803d' : '#b91c1c' }}>
                  {resultSummary.success > 0
                    ? `Imported ${resultSummary.success} of ${resultSummary.total} records successfully!`
                    : 'No records were imported.'}
                </h4>
              </div>

              {resultSummary.errors.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  <p style={{ margin: '0 0 4px', fontSize: '12px', fontWeight: 600, color: '#b91c1c' }}>
                    Errors encountered ({resultSummary.errors.length}):
                  </p>
                  <div
                    style={{
                      maxHeight: '120px',
                      overflowY: 'auto',
                      background: '#fff',
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid #fecaca',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      color: '#7f1d1d',
                    }}
                  >
                    {resultSummary.errors.map((err, idx) => (
                      <div key={idx} style={{ marginBottom: '4px' }}>
                        • {err}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: File Preview & Mapping */}
          {file && (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  marginBottom: '14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileSpreadsheet size={18} color="#2563eb" />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{file.name}</span>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>({rawRows.length} rows found)</span>
                </div>
                <button
                  onClick={() => {
                    setFile(null)
                    setRawRows([])
                    setError(null)
                    setResultSummary(null)
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#dc2626',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Change File
                </button>
              </div>

              {/* Column Mapping Badges */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                  Column Detection ({matchedCols.length} of {headerMappings.length} matched):
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {headerMappings.map((m, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: '11px',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        background: m.isMatched ? '#dcfce7' : '#f1f5f9',
                        color: m.isMatched ? '#166534' : '#64748b',
                        border: `1px solid ${m.isMatched ? '#86efac' : '#cbd5e1'}`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {m.headerName} {m.isMatched ? `→ ${m.mappedKey}` : '(skipped)'}
                    </span>
                  ))}
                </div>
              </div>

              {/* Data Table Preview */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Preview First 5 Rows:
                </div>
                <div
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    overflowX: 'auto',
                    maxHeight: '200px',
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                    <thead style={{ background: '#f1f5f9', position: 'sticky', top: 0 }}>
                      <tr>
                        <th style={{ padding: '6px 10px', borderBottom: '1px solid #cbd5e1' }}>#</th>
                        {headers.map((h, i) => (
                          <th key={i} style={{ padding: '6px 10px', borderBottom: '1px solid #cbd5e1' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rawRows.slice(0, 5).map((row, rIdx) => (
                        <tr key={rIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '6px 10px', color: '#94a3b8' }}>{rIdx + 1}</td>
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                              {cell || <span style={{ color: '#cbd5e1' }}>—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <button
            onClick={handleDownloadTemplate}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'none',
              border: 'none',
              color: '#3b82f6',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Download size={15} /> Download Sample Template
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#fff',
                color: '#334155',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            {file && !resultSummary && (
              <button
                onClick={handleExecuteImport}
                disabled={loading || matchedCols.length === 0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 18px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: loading || matchedCols.length === 0 ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
                }}
              >
                {loading ? (
                  <>
                    <RefreshCw size={14} className="spin" /> Importing to Database...
                  </>
                ) : (
                  <>
                    <Upload size={14} /> Confirm & Import {rawRows.length} Rows
                  </>
                )}
              </button>
            )}
            {resultSummary && (
              <button
                onClick={onClose}
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#16a34a',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
