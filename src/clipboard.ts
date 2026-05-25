export async function copyToClipboard(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(value)
      return true
    }
  } catch {
    // Continue to fallback below.
  }

  try {
    const textArea = document.createElement('textarea')
    textArea.value = value
    textArea.setAttribute('readonly', 'true')
    textArea.style.position = 'fixed'
    textArea.style.top = '-1000px'
    textArea.style.left = '-1000px'

    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()

    const success = document.execCommand('copy')
    document.body.removeChild(textArea)
    return success
  } catch {
    return false
  }
}
