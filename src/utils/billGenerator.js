import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { formatCurrency, formatDateShort } from './formatters.js'

const COLORS = {
  purple: '#2D1B6B',
  mediumPurple: '#7C3AED',
  lightPurple: '#EDE9FE',
  border: '#E5E3DE',
  text: '#111827',
  body: '#374151',
  muted: '#6B7280',
}

const BILL_WIDTH = 794
const A4_RATIO = 297 / 210

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function getOrderItems(order, orderItems) {
  return orderItems ?? order.order_items ?? []
}

function getItemPrice(item) {
  const meters = parseFloat(item.fabric_meters) || 0
  const fabricPrice = parseFloat(item.fabric_price ?? item.fabric_price_per_meter) || 0
  const stitchingPrice = parseFloat(item.stitching_price) || 0
  const fabricCost = item.fabric_source === 'customer' ? 0 : meters * fabricPrice
  const amount = parseFloat(item.total_price) || fabricCost + stitchingPrice

  return { meters, fabricPrice, stitchingPrice, fabricCost, amount }
}

function createBillMarkup(order, customer, shopProfile, items) {
  const shopName = shopProfile.shop_name || 'TailorBook'
  const orderNumber = order.bill_number ?? order.id?.slice(0, 6).toUpperCase() ?? '—'
  const date = formatDateShort(order.created_at || new Date())
  const itemRows = items.map((item, index) => {
    const { meters, fabricPrice, stitchingPrice, amount } = getItemPrice(item)
    const fabricName = item.fabrics?.fabric_name || item.customer_fabric_name || item.fabric_name || ''
    const fabricDescription = item.fabric_source === 'customer'
      ? `Customer's Fabric${fabricName ? ` · ${fabricName}` : ''} · ${meters}m`
      : `${fabricName || 'Fabric'} · ${meters}m × ${formatCurrency(fabricPrice)}/m`

    return `
      <tr>
        <td class="number-cell">${index + 1}</td>
        <td class="item-cell">${escapeHtml(item.item_type || 'Item')}</td>
        <td class="fabric-cell">${escapeHtml(fabricDescription)}</td>
        <td class="money-cell">${escapeHtml(formatCurrency(stitchingPrice))}</td>
        <td class="money-cell amount-cell">${escapeHtml(formatCurrency(amount))}</td>
      </tr>
    `
  }).join('')

  const subtotal = items.reduce((sum, item) => sum + getItemPrice(item).amount, 0)
  const urgentCharge = order.is_urgent ? (parseFloat(order.urgent_charge) || 0) : 0
  const advance = parseFloat(order.advance_paid) || 0
  const balance = Math.max(0, subtotal + urgentCharge - advance)
  const address = shopProfile.address
    ? `<div class="footer-address">${escapeHtml(shopProfile.address)}</div>`
    : ''
  const phone = customer.phone || customer.whatsapp || ''
  const customerPhone = phone
    ? `
      <div class="customer-phone">
        <svg width="15" height="15" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path d="M5 2.5 7.3 2 9 5.3 7.5 7l3.7 3.7 1.7-1.5 3.1 1.7-.5 2.3c-.2 1-1.1 1.6-2.1 1.4C8.3 13.5 4.5 9.7 3.4 4.6 3.2 3.6 4 2.7 5 2.5Z" stroke="${COLORS.mediumPurple}" stroke-width="1.3" stroke-linejoin="round"/>
        </svg>
        ${escapeHtml(phone)}
      </div>
    `
    : ''
  const deliveryDate = order.delivery_date
    ? `<div class="customer-delivery">Delivery: ${escapeHtml(formatDateShort(order.delivery_date))}</div>`
    : ''
  const urgentRow = urgentCharge
    ? `<div class="summary-row"><span>Urgent Charge</span><strong>${escapeHtml(formatCurrency(urgentCharge))}</strong></div>`
    : ''
  const notes = order.notes
    ? `
      <section class="notes-section">
        <div class="notes-label"><span class="info-icon">i</span>Notes</div>
        <div class="notes-text">${escapeHtml(order.notes).replace(/\r?\n/g, '<br>')}</div>
      </section>
    `
    : ''

  return `
    <style>
      #tailorbook-bill, #tailorbook-bill * { box-sizing: border-box; }
      #tailorbook-bill {
        width: ${BILL_WIDTH}px;
        min-height: 1123px;
        padding: 48px;
        background: #fff;
        color: ${COLORS.text};
        font-family: Inter, Arial, sans-serif;
        position: fixed;
        top: 0;
        left: -10000px;
        z-index: 9999;
        overflow: hidden;
      }
      #tailorbook-bill .corner {
        position: absolute;
        width: 0; height: 0;
        border-top: 42px solid ${COLORS.purple};
        border-right: 42px solid transparent;
        top: 0; left: 0;
      }
      #tailorbook-bill .corner::after {
        content: "";
        position: absolute;
        top: -42px; left: 0;
        width: 0; height: 0;
        border-top: 26px solid ${COLORS.mediumPurple};
        border-right: 26px solid transparent;
      }
      #tailorbook-bill .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 20px;
        min-height: 112px;
        padding-top: 3px;
      }
      #tailorbook-bill .header-left { display: flex; align-items: center; gap: 17px; min-width: 0; }
      #tailorbook-bill .logo-circle {
        width: 72px; height: 72px; flex: 0 0 72px;
        border: 3px solid ${COLORS.purple}; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        color: ${COLORS.purple}; font: 700 36px Georgia, serif;
      }
      #tailorbook-bill .divider-v { width: 2px; height: 64px; flex: 0 0 2px; background: ${COLORS.purple}; }
      #tailorbook-bill .shop-heading { min-width: 0; }
      #tailorbook-bill .shop-name {
        font: 700 30px/1.1 Georgia, serif; color: ${COLORS.purple};
        overflow-wrap: anywhere;
      }
      #tailorbook-bill .tagline {
        margin-top: 7px; color: ${COLORS.mediumPurple};
        font-size: 10px; letter-spacing: 2px; text-transform: uppercase;
      }
      #tailorbook-bill .header-right { width: 118px; flex: 0 0 118px; text-align: center; }
      #tailorbook-bill .tailored-text { color: ${COLORS.purple}; font: italic 14px Georgia, serif; white-space: nowrap; }
      #tailorbook-bill .sewing-icon { width: 70px; height: 50px; margin: 8px auto 0; }
      #tailorbook-bill .divider-h { height: 2px; background: ${COLORS.purple}; margin: 15px 0 23px; }
      #tailorbook-bill .info-section { display: flex; min-height: 132px; margin-bottom: 24px; }
      #tailorbook-bill .customer-col { flex: 1; min-width: 0; padding-right: 26px; }
      #tailorbook-bill .section-label {
        display: flex; align-items: center; gap: 8px; margin-bottom: 13px;
        color: ${COLORS.purple}; font-size: 11px; font-weight: 700;
        letter-spacing: 1.2px; text-transform: uppercase;
      }
      #tailorbook-bill .label-dot { width: 8px; height: 8px; border-radius: 50%; background: ${COLORS.mediumPurple}; }
      #tailorbook-bill .customer-name-row { display: flex; align-items: center; gap: 12px; }
      #tailorbook-bill .customer-icon {
        width: 40px; height: 40px; flex: 0 0 40px; border-radius: 50%;
        background: ${COLORS.lightPurple}; display: flex; align-items: center; justify-content: center;
      }
      #tailorbook-bill .customer-name { color: ${COLORS.text}; font-size: 19px; font-weight: 700; overflow-wrap: anywhere; }
      #tailorbook-bill .customer-phone { display: flex; align-items: center; gap: 8px; margin: 10px 0 0 52px; color: ${COLORS.body}; font-size: 13px; }
      #tailorbook-bill .customer-delivery { margin: 6px 0 0 52px; color: ${COLORS.muted}; font-size: 11px; }
      #tailorbook-bill .bill-col {
        width: 300px; flex: 0 0 300px; border-left: 1px solid ${COLORS.border};
        padding-left: 24px; display: flex; align-items: center; justify-content: space-around;
      }
      #tailorbook-bill .bill-info-box { display: flex; flex-direction: column; align-items: center; min-width: 104px; }
      #tailorbook-bill .mini-icon { width: 18px; height: 18px; margin-bottom: 7px; }
      #tailorbook-bill .bill-info-label { color: ${COLORS.muted}; font-size: 10px; margin-bottom: 5px; }
      #tailorbook-bill .bill-info-value { color: ${COLORS.purple}; font-size: 19px; font-weight: 700; }
      #tailorbook-bill .bill-info-value.date { font-size: 14px; }
      #tailorbook-bill .meta-divider { width: 1px; height: 45px; background: ${COLORS.border}; }
      #tailorbook-bill .items-table {
        width: 100%; border: 1px solid ${COLORS.purple}; border-collapse: collapse;
        table-layout: fixed; margin: 0 0 22px;
      }
      #tailorbook-bill .items-table col:nth-child(1) { width: 7%; }
      #tailorbook-bill .items-table col:nth-child(2) { width: 15%; }
      #tailorbook-bill .items-table col:nth-child(3) { width: 42%; }
      #tailorbook-bill .items-table col:nth-child(4) { width: 17%; }
      #tailorbook-bill .items-table col:nth-child(5) { width: 19%; }
      #tailorbook-bill .items-table thead { background: ${COLORS.purple}; color: #fff; }
      #tailorbook-bill .items-table th {
        padding: 12px 9px; text-align: left; font-size: 11px;
        font-weight: 700; line-height: 1.3;
      }
      #tailorbook-bill .items-table th:nth-child(n+4),
      #tailorbook-bill .items-table td:nth-child(n+4) { text-align: right; }
      #tailorbook-bill .items-table td {
        padding: 13px 9px; border-bottom: 1px solid ${COLORS.lightPurple};
        color: ${COLORS.text}; font-size: 12px; line-height: 1.45;
        vertical-align: top; overflow-wrap: anywhere;
      }
      #tailorbook-bill .items-table tbody tr:last-child td { border-bottom: 0; }
      #tailorbook-bill .number-cell { color: ${COLORS.muted} !important; font-weight: 700; }
      #tailorbook-bill .item-cell, #tailorbook-bill .amount-cell { font-weight: 700; }
      #tailorbook-bill .fabric-cell { color: ${COLORS.body} !important; }
      #tailorbook-bill .summary-wrap { display: flex; justify-content: flex-end; margin-bottom: 25px; }
      #tailorbook-bill .summary-box { width: 60%; }
      #tailorbook-bill .summary-row, #tailorbook-bill .summary-row-total {
        display: flex; justify-content: space-between; align-items: center; gap: 12px;
        padding: 12px 15px;
      }
      #tailorbook-bill .summary-row { margin-bottom: 2px; background: ${COLORS.lightPurple}; color: ${COLORS.body}; font-size: 13px; }
      #tailorbook-bill .summary-row strong { color: ${COLORS.text}; }
      #tailorbook-bill .summary-row-total { margin-top: 4px; background: ${COLORS.purple}; color: #fff; font-size: 15px; font-weight: 700; }
      #tailorbook-bill .summary-row-total strong { color: #fff; font-size: 19px; }
      #tailorbook-bill .notes-section { margin: 4px 0 22px; }
      #tailorbook-bill .notes-label { display: flex; align-items: center; gap: 8px; margin-bottom: 7px; color: ${COLORS.purple}; font-size: 12px; font-weight: 700; }
      #tailorbook-bill .info-icon { width: 17px; height: 17px; border-radius: 50%; background: ${COLORS.purple}; color: #fff; font: 700 11px Georgia, serif; display: inline-flex; align-items: center; justify-content: center; }
      #tailorbook-bill .notes-text { color: ${COLORS.body}; font-size: 11px; font-style: italic; line-height: 1.6; overflow-wrap: anywhere; }
      #tailorbook-bill .thank-you { color: ${COLORS.muted}; font-size: 11px; font-style: italic; margin: 10px 0 20px; }
      #tailorbook-bill .footer {
        border-top: 2px solid ${COLORS.purple}; padding-top: 17px; margin-top: 8px;
        display: flex; justify-content: space-between; align-items: center; gap: 18px;
      }
      #tailorbook-bill .footer-left { display: flex; align-items: flex-start; gap: 10px; min-width: 0; }
      #tailorbook-bill .pin-icon { flex: 0 0 18px; margin-top: 2px; }
      #tailorbook-bill .footer-shop { color: ${COLORS.purple}; font-size: 13px; font-weight: 700; }
      #tailorbook-bill .footer-address { max-width: 330px; margin-top: 3px; color: ${COLORS.muted}; font-size: 10px; font-style: italic; overflow-wrap: anywhere; }
      #tailorbook-bill .footer-tagline { color: ${COLORS.purple}; font-size: 10px; font-weight: 700; letter-spacing: 1.3px; text-align: right; white-space: nowrap; }
      @media print { #tailorbook-bill { margin: 0; } }
    </style>

    <div class="corner"></div>
    <header class="header">
      <div class="header-left">
        <div class="logo-circle">${escapeHtml(Array.from(shopName.trim())[0]?.toUpperCase() || 'T')}</div>
        <div class="divider-v"></div>
        <div class="shop-heading">
          <div class="shop-name">${escapeHtml(shopName)}</div>
          <div class="tagline">— Stitching With Style —</div>
        </div>
      </div>
      <div class="header-right">
        <div class="tailored-text">Tailored for You</div>
        <svg class="sewing-icon" viewBox="0 0 80 54" aria-hidden="true">
          <path d="M13 28h54v18H13zM44 28V12h17v16M48 12V6h9v6" fill="${COLORS.lightPurple}" stroke="${COLORS.purple}" stroke-width="2"/>
          <circle cx="25" cy="37" r="7" fill="${COLORS.lightPurple}" stroke="${COLORS.purple}" stroke-width="2"/>
          <path d="M53 28v18m-4-1h8M61 46h8" fill="none" stroke="${COLORS.purple}" stroke-width="2"/>
        </svg>
      </div>
    </header>

    <div class="divider-h"></div>

    <section class="info-section">
      <div class="customer-col">
        <div class="section-label"><span class="label-dot"></span>Customer Details</div>
        <div class="customer-name-row">
          <div class="customer-icon">
            <svg width="23" height="23" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="8" r="3.3" stroke="${COLORS.purple}" stroke-width="1.8"/>
              <path d="M5.5 20c.5-3.5 2.7-5.3 6.5-5.3s6 1.8 6.5 5.3" stroke="${COLORS.purple}" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="customer-name">${escapeHtml(customer.name || 'Customer')}</div>
        </div>
        ${customerPhone}
        ${deliveryDate}
      </div>

      <div class="bill-col">
        <div class="bill-info-box">
          <svg class="mini-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <rect x="3" y="2" width="14" height="16" stroke="${COLORS.mediumPurple}" stroke-width="1.5"/>
            <path d="M6 7h8M6 10h8M6 13h5" stroke="${COLORS.mediumPurple}" stroke-width="1.3"/>
          </svg>
          <div class="bill-info-label">Bill No.</div>
          <div class="bill-info-value">#${escapeHtml(orderNumber)}</div>
        </div>
        <div class="meta-divider"></div>
        <div class="bill-info-box">
          <svg class="mini-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <rect x="2.5" y="4" width="15" height="13" stroke="${COLORS.mediumPurple}" stroke-width="1.5"/>
            <path d="M2.5 8h15M6 2v4M14 2v4" stroke="${COLORS.mediumPurple}" stroke-width="1.5"/>
          </svg>
          <div class="bill-info-label">Date</div>
          <div class="bill-info-value date">${escapeHtml(date)}</div>
        </div>
      </div>
    </section>

    <table class="items-table">
      <colgroup><col><col><col><col><col></colgroup>
      <thead><tr><th>#</th><th>Item</th><th>Fabric</th><th>Stitching</th><th>Amount</th></tr></thead>
      <tbody>${itemRows || '<tr><td colspan="5">No items recorded</td></tr>'}</tbody>
    </table>

    <section class="summary-wrap">
      <div class="summary-box">
        <div class="summary-row"><span>Subtotal</span><strong>${escapeHtml(formatCurrency(subtotal))}</strong></div>
        ${urgentRow}
        <div class="summary-row"><span>Advance Paid</span><strong>${escapeHtml(formatCurrency(advance))}</strong></div>
        <div class="summary-row-total"><span>Balance Due</span><strong>${escapeHtml(formatCurrency(balance))}</strong></div>
      </div>
    </section>

    ${notes}
    <div class="thank-you">Thank you for choosing ${escapeHtml(shopName)}!</div>

    <footer class="footer">
      <div class="footer-left">
        <svg class="pin-icon" width="18" height="23" viewBox="0 0 18 23" fill="none" aria-hidden="true">
          <path d="M9 21s6.5-7.2 6.5-12A6.5 6.5 0 1 0 2.5 9C2.5 13.8 9 21 9 21Z" fill="${COLORS.lightPurple}" stroke="${COLORS.purple}" stroke-width="1.5"/>
          <circle cx="9" cy="9" r="2" fill="${COLORS.purple}"/>
        </svg>
        <div>
          <div class="footer-shop">${escapeHtml(shopName)}</div>
          ${address}
        </div>
      </div>
      <div class="footer-tagline">Fashion · Quality · Trust</div>
    </footer>
  `
}

function drawPdfPages(doc, canvas) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const maxSourceHeight = Math.floor(canvas.width * (pageHeight / pageWidth))
  const pageCount = canvas.height <= maxSourceHeight + 4
    ? 1
    : Math.ceil(canvas.height / maxSourceHeight)

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
    if (pageIndex > 0) doc.addPage()

    const sourceY = pageIndex * maxSourceHeight
    const sourceHeight = Math.min(maxSourceHeight, canvas.height - sourceY)
    const pageCanvas = document.createElement('canvas')
    pageCanvas.width = canvas.width
    pageCanvas.height = sourceHeight

    const context = pageCanvas.getContext('2d')
    if (!context) throw new Error('Unable to prepare bill PDF canvas.')
    context.fillStyle = '#FFFFFF'
    context.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
    context.drawImage(
      canvas,
      0,
      sourceY,
      canvas.width,
      sourceHeight,
      0,
      0,
      canvas.width,
      sourceHeight
    )

    const renderedHeight = Math.min(pageHeight, sourceHeight * (pageWidth / canvas.width))
    doc.addImage(pageCanvas.toDataURL('image/jpeg', 0.96), 'JPEG', 0, 0, pageWidth, renderedHeight)
  }
}

/**
 * Render the printable bill template to an A4 PDF blob.
 * Supports the current positional arguments and legacy options-object callers.
 */
export async function generateBillPDF(orderOrOptions, customerArg, shopProfileArg, orderItemsArg) {
  const isOptionsObject = Boolean(orderOrOptions?.order)
  const order = isOptionsObject ? orderOrOptions.order : orderOrOptions || {}
  const customer = isOptionsObject ? orderOrOptions.customer || {} : customerArg || {}
  const shopProfile = isOptionsObject ? orderOrOptions.shopProfile || {} : shopProfileArg || {}
  const items = getOrderItems(order, orderItemsArg)

  const billElement = document.createElement('div')
  billElement.id = 'tailorbook-bill'
  billElement.innerHTML = createBillMarkup(order, customer, shopProfile, items)
  document.body.appendChild(billElement)

  try {
    if (document.fonts?.ready) await document.fonts.ready

    const canvas = await html2canvas(billElement, {
      backgroundColor: '#FFFFFF',
      scale: 2,
      useCORS: true,
      logging: false,
      width: BILL_WIDTH,
      windowWidth: BILL_WIDTH,
      scrollX: 0,
      scrollY: 0,
    })

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    drawPdfPages(pdf, canvas)
    return pdf.output('blob')
  } finally {
    billElement.remove()
  }
}
