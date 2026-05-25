import type { AppData } from './types'

export const LOCAL_STORAGE_KEY = 'personal-data-copy-page:v1'

export const DEFAULT_DATA: AppData = {
  fullName: {
    lastName: 'Иванов',
    firstName: 'Иван',
    middleName: 'Иванович',
  },
  passport: {
    series: '1111',
    number: '123456',
  },
  simpleFields: {
    snils: '111-111-111 11',
    inn: '123456789012',
    phone: '+7 999 123-45-67',
    birthDate: '01.01.1990',
    age: '35',
    registrationCity: 'Москва',
    email: 'ivanov@example.com',
  },
  customFields: [],
  fieldOrder: [
    'fullName',
    'passport',
    'snils',
    'inn',
    'phone',
    'birthDate',
    'age',
    'registrationCity',
    'email',
  ],
  hiddenFieldIds: [],
}

export function createDefaultData(): AppData {
  return JSON.parse(JSON.stringify(DEFAULT_DATA)) as AppData
}
