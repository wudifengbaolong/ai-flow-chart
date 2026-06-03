import { toPng, toSvg } from 'html-to-image'
import jsPDF from 'jspdf'

export async function exportPng(element: HTMLElement, filename: string = 'flowchart.png') {
  const dataUrl = await toPng(element, {
    backgroundColor: '#ffffff',
    pixelRatio: 2,
  })

  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  link.click()
}

export async function exportSvg(element: HTMLElement, filename: string = 'flowchart.svg') {
  const dataUrl = await toSvg(element, {
    backgroundColor: '#ffffff',
  })

  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  link.click()
}

export async function exportPdf(element: HTMLElement, filename: string = 'flowchart.pdf') {
  const dataUrl = await toPng(element, {
    backgroundColor: '#ffffff',
    pixelRatio: 2,
  })

  const img = new Image()
  img.src = dataUrl

  await new Promise((resolve) => {
    img.onload = resolve
  })

  const pdf = new jsPDF({
    orientation: img.width > img.height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [img.width / 2, img.height / 2],
  })

  pdf.addImage(dataUrl, 'PNG', 0, 0, img.width / 2, img.height / 2)
  pdf.save(filename)
}
