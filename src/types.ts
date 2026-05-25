export type BuiltInFieldId =
  | 'fullName'
  | 'passport'
  | 'snils'
  | 'inn'
  | 'phone'
  | 'birthDate'
  | 'age'
  | 'registrationCity'
  | 'email'

export type CustomField = {
  id: string
  label: string
  value: string
}

export type AppData = {
  fullName: {
    lastName: string
    firstName: string
    middleName: string
  }
  passport: {
    series: string
    number: string
  }
  simpleFields: {
    snils: string
    inn: string
    phone: string
    birthDate: string
    age: string
    registrationCity: string
    email: string
  }
  customFields: CustomField[]
  fieldOrder: string[]
  hiddenFieldIds: string[]
}

export const BUILT_IN_FIELD_IDS: BuiltInFieldId[] = [
  'fullName',
  'passport',
  'snils',
  'inn',
  'phone',
  'birthDate',
  'age',
  'registrationCity',
  'email',
]

export const SIMPLE_FIELD_IDS = [
  'snils',
  'inn',
  'phone',
  'birthDate',
  'age',
  'registrationCity',
  'email',
] as const

export type SimpleFieldId = (typeof SIMPLE_FIELD_IDS)[number]
