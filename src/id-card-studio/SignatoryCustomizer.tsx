import React, { ChangeEvent } from 'react'
import { PenTool, RefreshCw } from 'lucide-react'
import { AuthorisedSignatureSvg } from '../lib/signatureData'

type SignatoryCustomizerProps = {
  signaturePreview: string
  visibleSignature: string
  isCustomSignature: boolean
  handleSignatureUpload: (event: ChangeEvent<HTMLInputElement>) => void
  resetSignature: () => void
}

export const SignatoryCustomizer: React.FC<SignatoryCustomizerProps> = ({
  signaturePreview,
  visibleSignature,
  isCustomSignature,
  handleSignatureUpload,
  resetSignature,
}) => {
  return (
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
  )
}
