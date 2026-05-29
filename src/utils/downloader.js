import { jsPDF } from 'jspdf'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { A4_W, A4_H } from './geometry.js'

export function downloadPNG(canvas, name) {
  canvas.toBlob(b => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(b)
    a.download = name
    a.click()
    URL.revokeObjectURL(a.href)
  })
}

export function downloadPDF(canvas, name, pageW = A4_W, pageH = A4_H) {
  const d = canvas.toDataURL('image/png')
  const pdf = new jsPDF({ unit: 'mm', format: [pageW, pageH] })
  pdf.addImage(d, 'PNG', 0, 0, pageW, pageH)
  pdf.save(name)
}

export async function downloadAllZIP(canvases, prefix, ext, pageW = A4_W, pageH = A4_H) {
  const zip = new JSZip()
  for (let i = 0; i < canvases.length; i++) {
    const c = canvases[i]
    if (ext === 'pdf') {
      const d = c.toDataURL('image/png')
      const pdf = new jsPDF({ unit: 'mm', format: [pageW, pageH] })
      pdf.addImage(d, 'PNG', 0, 0, pageW, pageH)
      zip.file(`${prefix}_p${i + 1}.pdf`, pdf.output('arraybuffer'))
    } else {
      const b = await new Promise(r => c.toBlob(r))
      zip.file(`${prefix}_p${i + 1}.png`, b)
    }
  }
  const blob = await zip.generateAsync({ type: 'blob' })
  saveAs(blob, `${prefix}_all.zip`)
}

export async function downloadMergedPDF(canvases, prefix, pageW = A4_W, pageH = A4_H) {
  const pdf = new jsPDF({ unit: 'mm', format: [pageW, pageH] })
  for (let i = 0; i < canvases.length; i++) {
    if (i > 0) pdf.addPage()
    const d = canvases[i].toDataURL('image/png')
    pdf.addImage(d, 'PNG', 0, 0, pageW, pageH)
  }
  pdf.save(`${prefix}_merged.pdf`)
}
