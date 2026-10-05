export type Person = {
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
