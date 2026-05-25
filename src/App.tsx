import { useEffect, useMemo, useState } from 'react'
import { copyToClipboard } from './clipboard'
import { createDefaultData } from './defaultData'
import { loadAppData, resetAppData, saveAppData } from './storage'
import {
  BUILT_IN_FIELD_IDS,
  SIMPLE_FIELD_IDS,
  type AppData,
  type BuiltInFieldId,
  type SimpleFieldId,
} from './types'
import './styles.css'

type Mode = 'edit' | 'combat'

type ToastState = {
  message: string
  kind: 'success' | 'error'
}

const FIELD_LABELS: Record<BuiltInFieldId, string> = {
  fullName: 'ФИО',
  passport: 'Паспортные данные',
  snils: 'СНИЛС',
  inn: 'ИНН',
  phone: 'Номер телефона',
  birthDate: 'Дата рождения',
  age: 'Возраст',
  registrationCity: 'Город по прописке',
  email: 'Почта',
}

function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function composeFullName(data: AppData): string {
  const { lastName, firstName, middleName } = data.fullName
  return normalizeSpaces(`${lastName} ${firstName} ${middleName}`)
}

function composePassport(data: AppData): string {
  return normalizeSpaces(`${data.passport.series} ${data.passport.number}`)
}

function isBuiltInId(fieldId: string): fieldId is BuiltInFieldId {
  return BUILT_IN_FIELD_IDS.includes(fieldId as BuiltInFieldId)
}

function isSimpleFieldId(fieldId: string): fieldId is SimpleFieldId {
  return SIMPLE_FIELD_IDS.includes(fieldId as SimpleFieldId)
}

function createCustomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.floor(Math.random() * 100000)}`
}

function App() {
  const [mode, setMode] = useState<Mode>('edit')
  const [data, setData] = useState<AppData>(() => {
    if (typeof window === 'undefined') {
      return createDefaultData()
    }
    return loadAppData()
  })
  const [toast, setToast] = useState<ToastState | null>(null)
  const [newCustomLabel, setNewCustomLabel] = useState('')
  const [newCustomValue, setNewCustomValue] = useState('')

  useEffect(() => {
    saveAppData(data)
  }, [data])

  useEffect(() => {
    if (!toast) {
      return
    }

    const timer = window.setTimeout(() => {
      setToast(null)
    }, 1800)

    return () => {
      window.clearTimeout(timer)
    }
  }, [toast])

  const hiddenIds = useMemo(() => new Set(data.hiddenFieldIds), [data.hiddenFieldIds])
  const customById = useMemo(() => {
    return new Map(data.customFields.map((field) => [field.id, field]))
  }, [data.customFields])

  const visibleFieldOrder = useMemo(() => {
    return data.fieldOrder.filter((fieldId) => !hiddenIds.has(fieldId))
  }, [data.fieldOrder, hiddenIds])

  const notifyCopyResult = (ok: boolean, label: string) => {
    if (ok) {
      setToast({ message: `Скопировано: ${label}`, kind: 'success' })
      return
    }
    setToast({ message: 'Не удалось скопировать', kind: 'error' })
  }

  const handleCopy = async (value: string, label: string) => {
    const ok = await copyToClipboard(value)
    notifyCopyResult(ok, label)
  }

  const moveField = (index: number, direction: 'up' | 'down') => {
    setData((prev) => {
      const next = [...prev.fieldOrder]
      const targetIndex = direction === 'up' ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= next.length) {
        return prev
      }

      const temp = next[index]
      next[index] = next[targetIndex]
      next[targetIndex] = temp

      return { ...prev, fieldOrder: next }
    })
  }

  const toggleHidden = (fieldId: string) => {
    setData((prev) => {
      const isHidden = prev.hiddenFieldIds.includes(fieldId)
      if (isHidden) {
        return {
          ...prev,
          hiddenFieldIds: prev.hiddenFieldIds.filter((id) => id !== fieldId),
        }
      }

      return {
        ...prev,
        hiddenFieldIds: [...prev.hiddenFieldIds, fieldId],
      }
    })
  }

  const removeCustomField = (customId: string) => {
    const fieldId = `custom:${customId}`

    setData((prev) => ({
      ...prev,
      customFields: prev.customFields.filter((field) => field.id !== customId),
      fieldOrder: prev.fieldOrder.filter((id) => id !== fieldId),
      hiddenFieldIds: prev.hiddenFieldIds.filter((id) => id !== fieldId),
    }))
  }

  const addCustomField = () => {
    const label = newCustomLabel.trim()
    const value = newCustomValue.trim()
    if (!label) {
      return
    }

    const id = createCustomId()
    const fieldId = `custom:${id}`

    setData((prev) => ({
      ...prev,
      customFields: [...prev.customFields, { id, label, value }],
      fieldOrder: [...prev.fieldOrder, fieldId],
    }))

    setNewCustomLabel('')
    setNewCustomValue('')
  }

  const resetToSyntheticDefaults = () => {
    const confirmed = window.confirm('Сбросить все данные к синтетическим значениям по умолчанию?')
    if (!confirmed) {
      return
    }

    setData(resetAppData())
    setMode('edit')
    setToast({ message: 'Данные сброшены к синтетическим значениям', kind: 'success' })
  }

  const renderCopyButton = (value: string, label: string) => (
    <button
      type="button"
      className="copy-value"
      title={`Скопировать ${label}`}
      aria-label={`Скопировать ${label}`}
      onClick={() => {
        void handleCopy(value, label)
      }}
    >
      {value || 'Пусто'}
    </button>
  )

  const renderSimpleFieldCard = (id: SimpleFieldId) => {
    const label = FIELD_LABELS[id]
    const value = data.simpleFields[id]

    return (
      <article className="field-card" key={id}>
        <h2>{label}</h2>
        {mode === 'edit' ? (
          <input
            value={value}
            onChange={(event) => {
              const nextValue = event.target.value
              setData((prev) => ({
                ...prev,
                simpleFields: {
                  ...prev.simpleFields,
                  [id]: nextValue,
                },
              }))
            }}
            aria-label={label}
          />
        ) : (
          renderCopyButton(value, label)
        )}
      </article>
    )
  }

  const renderFieldCard = (fieldId: string) => {
    if (isBuiltInId(fieldId)) {
      if (fieldId === 'fullName') {
        const fullName = composeFullName(data)
        return (
          <article className="field-card" key={fieldId}>
            <h2>ФИО</h2>
            <div className="subsection">
              <p className="sub-label">Общий формат</p>
              {mode === 'edit' ? (
                <input value={fullName} readOnly aria-label="ФИО (объединенное)" />
              ) : (
                renderCopyButton(fullName, 'ФИО')
              )}
            </div>

            <div className="subsection">
              <p className="sub-label">Отдельные части</p>
              <div className="grid-3">
                <div>
                  <label htmlFor="lastName">Фамилия</label>
                  {mode === 'edit' ? (
                    <input
                      id="lastName"
                      value={data.fullName.lastName}
                      onChange={(event) => {
                        const nextValue = event.target.value
                        setData((prev) => ({
                          ...prev,
                          fullName: { ...prev.fullName, lastName: nextValue },
                        }))
                      }}
                    />
                  ) : (
                    renderCopyButton(data.fullName.lastName, 'Фамилия')
                  )}
                </div>
                <div>
                  <label htmlFor="firstName">Имя</label>
                  {mode === 'edit' ? (
                    <input
                      id="firstName"
                      value={data.fullName.firstName}
                      onChange={(event) => {
                        const nextValue = event.target.value
                        setData((prev) => ({
                          ...prev,
                          fullName: { ...prev.fullName, firstName: nextValue },
                        }))
                      }}
                    />
                  ) : (
                    renderCopyButton(data.fullName.firstName, 'Имя')
                  )}
                </div>
                <div>
                  <label htmlFor="middleName">Отчество</label>
                  {mode === 'edit' ? (
                    <input
                      id="middleName"
                      value={data.fullName.middleName}
                      onChange={(event) => {
                        const nextValue = event.target.value
                        setData((prev) => ({
                          ...prev,
                          fullName: { ...prev.fullName, middleName: nextValue },
                        }))
                      }}
                    />
                  ) : (
                    renderCopyButton(data.fullName.middleName, 'Отчество')
                  )}
                </div>
              </div>
            </div>
          </article>
        )
      }

      if (fieldId === 'passport') {
        const passportValue = composePassport(data)

        return (
          <article className="field-card" key={fieldId}>
            <h2>Паспортные данные</h2>
            <div className="subsection">
              <p className="sub-label">Общий формат</p>
              {mode === 'edit' ? (
                <input value={passportValue} readOnly aria-label="Паспорт (объединенный)" />
              ) : (
                renderCopyButton(passportValue, 'Паспортные данные')
              )}
            </div>

            <div className="subsection">
              <p className="sub-label">Отдельные части</p>
              <div className="grid-2">
                <div>
                  <label htmlFor="passportSeries">Серия</label>
                  {mode === 'edit' ? (
                    <input
                      id="passportSeries"
                      value={data.passport.series}
                      onChange={(event) => {
                        const nextValue = event.target.value
                        setData((prev) => ({
                          ...prev,
                          passport: { ...prev.passport, series: nextValue },
                        }))
                      }}
                    />
                  ) : (
                    renderCopyButton(data.passport.series, 'Серия')
                  )}
                </div>
                <div>
                  <label htmlFor="passportNumber">Номер</label>
                  {mode === 'edit' ? (
                    <input
                      id="passportNumber"
                      value={data.passport.number}
                      onChange={(event) => {
                        const nextValue = event.target.value
                        setData((prev) => ({
                          ...prev,
                          passport: { ...prev.passport, number: nextValue },
                        }))
                      }}
                    />
                  ) : (
                    renderCopyButton(data.passport.number, 'Номер')
                  )}
                </div>
              </div>
            </div>
          </article>
        )
      }

      if (isSimpleFieldId(fieldId)) {
        return renderSimpleFieldCard(fieldId)
      }

      return null
    }

    if (fieldId.startsWith('custom:')) {
      const customId = fieldId.replace('custom:', '')
      const field = customById.get(customId)
      if (!field) {
        return null
      }

      return (
        <article className="field-card" key={fieldId}>
          <h2>{field.label || 'Пользовательское поле'}</h2>
          {mode === 'edit' ? (
            <div className="custom-edit-grid">
              <div>
                <label htmlFor={`custom-label-${field.id}`}>Название</label>
                <input
                  id={`custom-label-${field.id}`}
                  value={field.label}
                  onChange={(event) => {
                    const nextLabel = event.target.value
                    setData((prev) => ({
                      ...prev,
                      customFields: prev.customFields.map((item) =>
                        item.id === field.id ? { ...item, label: nextLabel } : item,
                      ),
                    }))
                  }}
                />
              </div>
              <div>
                <label htmlFor={`custom-value-${field.id}`}>Значение</label>
                <input
                  id={`custom-value-${field.id}`}
                  value={field.value}
                  onChange={(event) => {
                    const nextValue = event.target.value
                    setData((prev) => ({
                      ...prev,
                      customFields: prev.customFields.map((item) =>
                        item.id === field.id ? { ...item, value: nextValue } : item,
                      ),
                    }))
                  }}
                />
              </div>
            </div>
          ) : (
            renderCopyButton(field.value, field.label || 'Пользовательское поле')
          )}
        </article>
      )
    }

    return null
  }

  return (
    <div className={`app ${mode === 'combat' ? 'combat-mode' : ''}`}>
      <header className="app-header">
        <h1>Быстрое копирование данных</h1>
        <div className="mode-switch" role="group" aria-label="Режим работы">
          <button
            type="button"
            className={mode === 'edit' ? 'active' : ''}
            onClick={() => setMode('edit')}
          >
            Редактирование
          </button>
          <button
            type="button"
            className={mode === 'combat' ? 'active' : ''}
            onClick={() => setMode('combat')}
          >
            Боевой режим
          </button>
        </div>
        <p className="mode-hint">
          {mode === 'edit' ? 'Измените значения полей.' : 'Нажмите на значение, чтобы скопировать его.'}
        </p>
      </header>

      <main className="field-list">{visibleFieldOrder.map((fieldId) => renderFieldCard(fieldId))}</main>

      {mode === 'edit' && (
        <section className="settings" aria-label="Настройки полей">
          <h2>Настройки полей</h2>

          <div className="settings-list">
            {data.fieldOrder.map((fieldId, index) => {
              let label = ''
              const isHidden = hiddenIds.has(fieldId)
              let canDelete = false

              if (isBuiltInId(fieldId)) {
                label = FIELD_LABELS[fieldId]
              } else if (fieldId.startsWith('custom:')) {
                const customId = fieldId.replace('custom:', '')
                const customField = customById.get(customId)
                if (!customField) {
                  return null
                }
                label = customField.label || 'Пользовательское поле'
                canDelete = true
              } else {
                return null
              }

              return (
                <div className="settings-row" key={fieldId}>
                  <span className={isHidden ? 'muted' : ''}>{label}</span>
                  <div className="settings-actions">
                    <button
                      type="button"
                      onClick={() => moveField(index, 'up')}
                      disabled={index === 0}
                      aria-label={`Поднять поле ${label}`}
                    >
                      Вверх
                    </button>
                    <button
                      type="button"
                      onClick={() => moveField(index, 'down')}
                      disabled={index === data.fieldOrder.length - 1}
                      aria-label={`Опустить поле ${label}`}
                    >
                      Вниз
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleHidden(fieldId)}
                      aria-label={`${isHidden ? 'Показать' : 'Скрыть'} поле ${label}`}
                    >
                      {isHidden ? 'Показать' : 'Скрыть'}
                    </button>
                    {canDelete && (
                      <button
                        type="button"
                        className="danger"
                        onClick={() => removeCustomField(fieldId.replace('custom:', ''))}
                        aria-label={`Удалить поле ${label}`}
                      >
                        Удалить
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="add-custom">
            <h3>Добавить пользовательское поле</h3>
            <div className="custom-edit-grid">
              <div>
                <label htmlFor="new-custom-label">Название поля</label>
                <input
                  id="new-custom-label"
                  value={newCustomLabel}
                  onChange={(event) => setNewCustomLabel(event.target.value)}
                  placeholder="Например: Номер полиса"
                />
              </div>
              <div>
                <label htmlFor="new-custom-value">Значение</label>
                <input
                  id="new-custom-value"
                  value={newCustomValue}
                  onChange={(event) => setNewCustomValue(event.target.value)}
                  placeholder="Например: 123456789"
                />
              </div>
            </div>
            <button type="button" onClick={addCustomField}>
              Добавить поле
            </button>
          </div>

          <button type="button" className="danger" onClick={resetToSyntheticDefaults}>
            Сбросить к синтетическим данным
          </button>
        </section>
      )}

      {toast && (
        <div className={`toast ${toast.kind === 'error' ? 'toast-error' : 'toast-success'}`} role="status">
          {toast.message}
        </div>
      )}
    </div>
  )
}

export default App
