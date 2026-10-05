import React, { ChangeEvent } from 'react'
import { Upload } from 'lucide-react'

type StandardFormFieldsProps = {
  cardType: 'student' | 'employee'
  className: string
  setClassName: (val: string) => void
  designation: string
  setDesignation: (val: string) => void
  department: string
  setDepartment: (val: string) => void
  photoUrl: string
  setPhotoUrl: (val: string) => void
  uploadingTarget: 'student' | 'father' | 'mother' | null
  handlePhotoUploadFor: (
    target: 'student' | 'father' | 'mother',
    event: ChangeEvent<HTMLInputElement>
  ) => void
}

export const StandardFormFields: React.FC<StandardFormFieldsProps> = ({
  cardType,
  className,
  setClassName,
  designation,
  setDesignation,
  department,
  setDepartment,
  photoUrl,
  setPhotoUrl,
  uploadingTarget,
  handlePhotoUploadFor,
}) => {
  return (
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
  )
}
