import { BUILT_IN_FIELD_IDS, SIMPLE_FIELD_IDS } from './types'
import { createDefaultData, LOCAL_STORAGE_KEY } from './defaultData'
import type { AppData, BuiltInFieldId, CustomField, SimpleFieldId } from './types'

const SIMPLE_IDS: SimpleFieldId[] = [...SIMPLE_FIELD_IDS]

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter((item): item is string => typeof item === 'string')
}

function sanitizeCustomFields(value: unknown): CustomField[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null
      }
      const record = item as Record<string, unknown>
      const id = asString(record.id)
      if (!id) {
        return null
      }
      return {
        id,
        label: asString(record.label, 'Без названия'),
        value: asString(record.value),
      }
    })
    .filter((item): item is CustomField => item !== null)
}

function sanitizeAppData(value: unknown): AppData {
  const defaults = createDefaultData()

  if (!value || typeof value !== 'object') {
    return defaults
  }

  const raw = value as Record<string, unknown>
  const simpleFieldsRaw = raw.simpleFields as Record<string, unknown> | undefined
  const customFields = sanitizeCustomFields(raw.customFields)
  const customFieldIds = new Set(customFields.map((field) => `custom:${field.id}`))

  const safeData: AppData = {
    fullName: {
      lastName: asString((raw.fullName as Record<string, unknown> | undefined)?.lastName),
      firstName: asString((raw.fullName as Record<string, unknown> | undefined)?.firstName),
      middleName: asString((raw.fullName as Record<string, unknown> | undefined)?.middleName),
    },
    passport: {
      series: asString((raw.passport as Record<string, unknown> | undefined)?.series),
      number: asString((raw.passport as Record<string, unknown> | undefined)?.number),
    },
    simpleFields: {
      snils: asString(simpleFieldsRaw?.snils),
      inn: asString(simpleFieldsRaw?.inn),
      phone: asString(simpleFieldsRaw?.phone),
      birthDate: asString(simpleFieldsRaw?.birthDate),
      age: asString(simpleFieldsRaw?.age),
      registrationCity: asString(simpleFieldsRaw?.registrationCity),
      email: asString(simpleFieldsRaw?.email),
    },
    customFields,
    fieldOrder: [],
    hiddenFieldIds: [],
  }

  const rawFieldOrder = asStringArray(raw.fieldOrder)
  const validFieldOrder = rawFieldOrder.filter(
    (id) => BUILT_IN_FIELD_IDS.includes(id as BuiltInFieldId) || customFieldIds.has(id),
  )

  for (const builtInId of BUILT_IN_FIELD_IDS) {
    if (!validFieldOrder.includes(builtInId)) {
      validFieldOrder.push(builtInId)
    }
  }

  for (const field of customFields) {
    const customId = `custom:${field.id}`
    if (!validFieldOrder.includes(customId)) {
      validFieldOrder.push(customId)
    }
  }

  safeData.fieldOrder = validFieldOrder

  const hiddenIds = asStringArray(raw.hiddenFieldIds).filter(
    (id) => BUILT_IN_FIELD_IDS.includes(id as BuiltInFieldId) || customFieldIds.has(id),
  )

  safeData.hiddenFieldIds = Array.from(new Set(hiddenIds))

  for (const id of SIMPLE_IDS) {
    if (!safeData.simpleFields[id]) {
      safeData.simpleFields[id] = defaults.simpleFields[id]
    }
  }

  if (!safeData.fullName.lastName && !safeData.fullName.firstName && !safeData.fullName.middleName) {
    safeData.fullName = defaults.fullName
  }

  if (!safeData.passport.series && !safeData.passport.number) {
    safeData.passport = defaults.passport
  }

  return safeData
}

export function loadAppData(): AppData {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!raw) {
      return createDefaultData()
    }
    return sanitizeAppData(JSON.parse(raw))
  } catch {
    return createDefaultData()
  }
}

export function saveAppData(data: AppData): void {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data))
}

export function resetAppData(): AppData {
  const defaults = createDefaultData()
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaults))
  return defaults
}
