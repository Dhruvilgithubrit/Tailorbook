/**
 * whatsapp.js
 * Helpers for sharing a bill PDF via WhatsApp.
 * Uses the Web Share API (mobile) with a desktop fallback.
 */

/**
 * Share a generated PDF blob via WhatsApp.
 * @param {Blob} pdfBlob - The generated PDF file
 * @param {string} fileName - e.g. "bill-123.pdf"
 * @param {string} customerName - Customer's display name
 * @param {string} shopName - Tailor's shop name
 * @param {string} [whatsappNumber] - Customer WhatsApp number (desktop fallback)
 */
export async function shareOnWhatsApp({ pdfBlob, fileName, customerName, shopName, whatsappNumber }) {
  const message =
    `Hello ${customerName} 👋\n` +
    `Your order is ready for pickup!\n` +
    `Please find your bill attached.\n` +
    `— ${shopName}`

  const file = new File([pdfBlob], fileName, { type: 'application/pdf' })

  // Mobile: Web Share API with file support
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: `Bill from ${shopName}`,
        text: message,
        files: [file],
      })
      return { success: true, method: 'share-api' }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Web Share API error:', err)
      }
      return { success: false, error: err.message }
    }
  }

  // Desktop fallback: download PDF + open WhatsApp Web with pre-filled message
  const url = URL.createObjectURL(pdfBlob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)

  const encodedMsg = encodeURIComponent(message)
  const phone = whatsappNumber ? whatsappNumber.replace(/\D/g, '') : ''
  const waUrl = phone
    ? `https://wa.me/${phone}?text=${encodedMsg}`
    : `https://web.whatsapp.com/?text=${encodedMsg}`

  window.open(waUrl, '_blank')
  return { success: true, method: 'desktop-fallback' }
}

