const pool = require('../db');
const path = require('path');
const fs = require('fs');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const { start } = require('repl');

const { response } = require('express');    
const { title } = require('process');


const bulan = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const PT = "PT. Mastah Digital Teknologi";
const JabatanPT = "Direktur";
const Direktur = "Rochim Ramadhani Chiefto Irawan, S. Kom";
const NPWP = "1000 0000 0107 3786";
const AlamatKantor = "Tampat Durian No. 13 RT 003 RW 004 \n\nKel. Korong Gadang, Kec.kuranji, \n\nKota Padang 25156"
const AlamatKantor2 = "Tampat Durian No. 13 RT 003 RW 004 Kel. Korong Gadang, Kec.kuranji, Kota Padang 25156"
const sekarang = new Date();

const tanggal = sekarang.getDate().toString().padStart(2, '0'); // 2 digit, misal "03"
const namaBulan = bulan[sekarang.getMonth()]; // index bulan 0-based
const tahun = sekarang.getFullYear()

const tanggalFormatted = `${tanggal} ${namaBulan} ${tahun}`;

function formatTanggalIndonesia(tanggalISO) {
  const bulan = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  const [tahun, bulanStr, hari] = tanggalISO.split("-");
  const namaBulan = bulan[parseInt(bulanStr, 10) - 1];

  return `${parseInt(hari, 10)} ${namaBulan} ${tahun}`;
}

function terbilangManual(n) {
  const angka = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "sebelas"];

  function toWords(x) {
    x = Math.floor(x);
    if (x < 12) return angka[x];
    if (x < 20) return toWords(x - 10) + " belas";
    if (x < 100) return toWords(Math.floor(x / 10)) + " puluh " + toWords(x % 10);
    if (x < 200) return "seratus " + toWords(x - 100);
    if (x < 1000) return toWords(Math.floor(x / 100)) + " ratus " + toWords(x % 100);
    if (x < 2000) return "seribu " + toWords(x - 1000);
    if (x < 1000000) return toWords(Math.floor(x / 1000)) + " ribu " + toWords(x % 1000);
    if (x < 1000000000) return toWords(Math.floor(x / 1000000)) + " juta " + toWords(x % 1000000);
    return "Angka terlalu besar";
  }

  return toWords(n).replace(/\s+/g, ' ').trim() + " rupiah";
}
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatTanggalLisan(tanggalStr) {
  const hariIndo = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const bulanIndo = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const [tahun,bulan,tanggal ] = tanggalStr.split('-').map(Number); // "5/6/2025"
  console.log(tahun+bulan+tanggal);
  const date = new Date(`${tahun}-${bulan.toString().padStart(2, '0')}-${tanggal.toString().padStart(2, '0')}`);
  
  const hari = hariIndo[date.getDay()];
  const namaBulan = bulanIndo[bulan - 1];
  const tanggalTerbilang = terbilangManual(tanggal);

  return `${hari} tanggal ${capitalize(tanggalTerbilang)} bulan ${namaBulan} tahun ${tahun}`;
}

function formatRupiah(num) {
  return Number(num).toLocaleString('id-ID');
}
function wrapText(text, maxWidth, font, fontSize) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = font.widthOfTextAtSize(`${currentLine} ${word}`, fontSize);
    if (width < maxWidth) {
      currentLine += ` ${word}`;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}

// Fungsi gambar tabel dengan summary
function drawTableWithSummary(page, startX, startY, columns, rows, summaryRows, font, fontBold, fontSize) {
  const rowHeight = 20;
  const colWidths = columns.map(c => c.width);
  const tableWidth = colWidths.reduce((a,b) => a + b, 0);
  const totalRows = rows.length + (summaryRows ? summaryRows.length : 0);
  const tableHeight = rowHeight * (totalRows + 1);

  // Header background
  page.drawRectangle({
    x: startX,
    y: startY - rowHeight,
    width: tableWidth,
    height: rowHeight,
    color: rgb(0.9, 0.9, 0.9),
  });

  // Header text center
  columns.forEach((col, i) => {
    const textWidth = font.widthOfTextAtSize(col.header, fontSize);
    const colStartX = startX + colWidths.slice(0,i).reduce((a,b) => a + b, 0);
    const centerX = colStartX + col.width / 2 - textWidth / 2;
    page.drawText(col.header, { x: centerX, y: startY - rowHeight + 5, size: fontSize, font: fontBold, color: rgb(0,0,0) });
  });

  // Rows
  rows.forEach((row, idx) => {
    const y = startY - rowHeight * (idx + 2) + 5;
    columns.forEach((col, i) => {
      let text = row[col.key] ? row[col.key].toString() : '';
      // Rata kanan untuk harga satuan dan jumlah
      const isRightAlign = col.key === 'harga' || col.key === 'jumlah';
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      const colStartX = startX + colWidths.slice(0,i).reduce((a,b) => a + b, 0);
      let x;
      if (isRightAlign) {
        x = colStartX + col.width - textWidth - 5;
      } else {
        x = colStartX + col.width / 2 - textWidth / 2;
      }
      page.drawText(text, { x, y, size: fontSize, font });
    });
  });

  // Summary rows
  if (summaryRows && summaryRows.length > 0) {
    summaryRows.forEach((sumRow, idx) => {
      const y = startY - rowHeight * (rows.length + 2 + idx) + 5;
      const label = sumRow.label;
      const value = sumRow.value.toString();
      const labelFontSize = fontSize;
      const valueFontSize = fontSize;

      // Gabung kolom Nama Barang, Volume, Satuan, Harga Satuan (kolom index 1 sampai 4)
      const labelCols = columns.slice(1, 5);
      const labelAreaWidth = labelCols.reduce((a,b) => a + b.width, 0);
      const labelStartX = startX + columns[0].width; // start setelah kolom No

      // Hitung posisi label supaya rata kanan di area gabungan
      const labelWidth = font.widthOfTextAtSize(label, labelFontSize);
      const labelX = labelStartX + labelAreaWidth - labelWidth - 5;
      page.drawText(label, { x: labelX, y, size: labelFontSize, font: fontBold });

      // Value di kolom jumlah paling kanan
      const lastColStartX = startX + colWidths.slice(0, columns.length).reduce((a,b) => a + b, 0) - columns[columns.length -1].width;
      const valueWidth = font.widthOfTextAtSize(value, valueFontSize);
      const valueX = lastColStartX + columns[columns.length -1].width - valueWidth - 5;
      page.drawText(value, { x: valueX, y, size: valueFontSize, font: fontBold });
    });
  }

  // Garis vertikal
  let lineX = startX;
  for (let i = 0; i <= columns.length; i++) {
    page.drawLine({
      start: { x: lineX, y: startY },
      end: { x: lineX, y: startY - tableHeight },
      thickness: 1,
      color: rgb(0,0,0),
    });
    if (i < columns.length) lineX += colWidths[i];
  }

  // Garis horizontal
  for (let i = 0; i <= totalRows + 1; i++) {
    const y = startY - rowHeight * i;
    page.drawLine({
      start: { x: startX, y },
      end: { x: startX + tableWidth, y },
      thickness: 1,
      color: rgb(0,0,0),
    });
  }

  return startY - tableHeight - 10;
}

// Fungsi untuk gambar satu baris dengan justify (rata kanan kiri)
function drawJustifiedLine(page, text, x, y, maxWidth, font, fontSize) {
  const words = text.split(' ');
  if (words.length === 1) {
    // Kalau cuma satu kata, gambar rata kiri biasa saja
    page.drawText(text, { x, y, size: fontSize, font });
    return;
  }

  // Hitung lebar total kata tanpa spasi
  const wordsWidth = words.reduce((acc, w) => acc + font.widthOfTextAtSize(w, fontSize), 0);

  // Hitung total spasi yang harus dibagi antar kata
  const totalSpace = maxWidth - wordsWidth;
  const spaceBetweenWords = totalSpace / (words.length - 1);

  let cursorX = x;

  words.forEach((word, i) => {
    page.drawText(word, { x: cursorX, y, size: fontSize, font });
    cursorX += font.widthOfTextAtSize(word, fontSize) + spaceBetweenWords;
  });
}

// Fungsi draw paragraph dengan justify dan indentasi paragraf
function drawParagraphJustify(page, text, x, y, maxWidth, lineHeight, font, fontSize, indent = '    ') {

  const words = text.split(' ');

  // Masukkan spasi indentasi sebagai elemen pertama
  words.unshift(indent);

  let line = '';
  let currentY = y;

  for (let i = 0; i < words.length; i++) {
    const testLine = line ? line + ' ' + words[i] : words[i];
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);

    if (testWidth > maxWidth) {
      // Draw justified current line
      drawJustifiedLine(page, line, currentY === y ? x + 0 : x, currentY, maxWidth, font, fontSize);
      line = words[i];
      currentY -= lineHeight;
    } else {
      line = testLine;
    }
  }
  

  // Draw last line (rata kiri biasa)
  if (line) {
    page.drawText(line, { x: currentY === y ? x + 0 : x, y: currentY, size: fontSize, font });
    currentY -= lineHeight;
  }

  return currentY;
}

// Fungsi gambar tabel manual
function drawTable(page, startX, startY, columns, rows, font, fontSize) {
  const rowHeight = 20;
  const colWidths = columns.map(col => col.width);
  const tableWidth = colWidths.reduce((a,b) => a + b, 0);

  // Header background
  page.drawRectangle({
    x: startX,
    y: startY - rowHeight,
    width: tableWidth,
    height: rowHeight,
    color: rgb(0.9, 0.9, 0.9),
  });

  // Header text (centered)
  columns.forEach((col, i) => {
    const textWidth = font.widthOfTextAtSize(col.header, fontSize);
    const colStartX = startX + colWidths.slice(0, i).reduce((a,b) => a + b, 0);
    const centerX = colStartX + (col.width / 2) - (textWidth / 2);
    page.drawText(col.header, { x: centerX, y: startY - rowHeight + 5, size: fontSize, font, color: rgb(0, 0, 0) });
  });

  let rowHeights = []; // untuk simpan tinggi tiap baris
  let currentY = startY - rowHeight * 2 ; // posisi awal setelah header

  rows.forEach((row, rowIndex) => {
    const cellLinesPerRow = [];

    columns.forEach((col, colIndex) => {
      const cellText = row[col.key] ? row[col.key].toString() : '';
      const lines = wrapText(cellText, col.width - 10, font, fontSize);
      cellLinesPerRow.push(lines);
    });

    const maxLines = Math.max(...cellLinesPerRow.map(lines => lines.length));
    const rowHeightAdjusted = maxLines * (fontSize + 4) + 10; // tinggi baris disesuaikan
    rowHeights.push(rowHeightAdjusted); // simpan tinggi baris

    columns.forEach((col, colIndex) => {
      const cellTextLines = cellLinesPerRow[colIndex];
      const colStartX = startX + colWidths.slice(0, colIndex).reduce((a, b) => a + b, 0);

      cellTextLines.forEach((line, lineIdx) => {
        const textWidth = font.widthOfTextAtSize(line, fontSize);
        const centerX = colStartX + (col.width / 2) - (textWidth / 2);
        const textY = currentY - (fontSize + 4) * lineIdx + 5;
        page.drawText(line, { x: centerX, y: textY, size: fontSize, font });
      });
    });

    currentY -= rowHeightAdjusted;
  });

  const tableHeight = rowHeight + rowHeights.reduce((a, b) => a + b, 0);

  // Vertical lines
  let lineX = startX;
  for (let i = 0; i <= columns.length; i++) {
    page.drawLine({
      start: { x: lineX, y: startY },
      end: { x: lineX, y: startY - tableHeight - 5 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    if (i < columns.length) lineX += columns[i].width;
  }

  let yPointer = startY;
  page.drawLine({
    start: { x: startX, y: yPointer },
    end: { x: startX + tableWidth, y: yPointer },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  yPointer = startY - rowHeight;
  page.drawLine({
    start: { x: startX, y: yPointer },
    end: { x: startX + tableWidth, y: yPointer },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  yPointer -= 5;
  for (let i = 0; i < rowHeights.length; i++) {
    yPointer -= rowHeights[i];
    page.drawLine({
      start: { x: startX, y: yPointer },
      end: { x: startX + tableWidth, y: yPointer },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
  }

  return startY - tableHeight - 10;
}

exports.generateBOPSurat = async (req, res) => {
  const { nomor, sifat, lampiran, invoiceId } = req.body;

  try {
    const [invoicerows] = await pool.query('SELECT * FROM Invoice WHERE id = ?', [invoiceId]);
    const invoice = invoicerows[0];
    if (!invoice) return res.status(400).send('Invoice tidak ditemukan');

    const [costumerrows] = await pool.query('SELECT * FROM costumer WHERE id = ?', [invoice.Costumer_id]);
    const costumer = costumerrows[0];
    const [detail_invoicerows] = await pool.query('SELECT * FROM detail_invoice WHERE Invoice_id = ?', [invoiceId]);
    const detail_invoice = detail_invoicerows;

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4

    const templatePath = path.join(__dirname, '..', 'public', costumer.kop_surat);
    if (!fs.existsSync(templatePath)) {
      return res.status(404).send("Template image not found.");
    }
    const templateImageBytes = fs.readFileSync(templatePath);

    // Embed kop_surat image
    const pngImage = await pdfDoc.embedPng(templateImageBytes);
    const scale = 595 / pngImage.width;
    const height = pngImage.height * scale;
    page.drawImage(pngImage, { x: 0, y: 842 - height, width: 595, height });

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontSize = 10;

    // Starting points
    const labelX = 50;
    const colonX = 150;
    const valueX = 160;
    let startX = 75;
    let startY = 842 - height - 40;

    // Header Surat
    page.drawText(`Nomor`, { x: startX, y: startY, size: fontSize, font: fontRegular });
    page.drawText(':', { x: startX + 70, y: startY, size: fontSize, font: fontRegular });
    page.drawText(nomor || '-', { x: startX + 80, y: startY, size: fontSize, font: fontRegular });

    page.drawText(`Sifat`, { x: startX, y: startY -= 15, size: fontSize, font: fontRegular });
    page.drawText(':', { x: startX + 70, y: startY, size: fontSize, font: fontRegular });
    page.drawText(sifat || '-', { x: startX + 80, y: startY, size: fontSize, font: fontRegular });

    page.drawText(`Lampiran`, { x: startX, y: startY -= 15, size: fontSize, font: fontRegular });
    page.drawText(':', { x: startX + 70, y: startY, size: fontSize, font: fontRegular });
    page.drawText(lampiran || '-', { x: startX + 80, y: startY, size: fontSize, font: fontRegular });

    page.drawText(`Hal`, { x: startX, y: startY -= 15, size: fontSize, font: fontRegular });
    page.drawText(':', { x: startX + 70, y: startY, size: fontSize, font: fontRegular });
    page.drawText(`Belanja Barang dan Jasa BOP ${costumer.Sekolah}`, { x: startX + 80, y: startY, size: fontSize, font: fontRegular });
    startY -= 50;

    // Kepada
    page.drawText('Kepada Yth.', { x: startX, y: startY, size: fontSize, font: fontBold });
    startY -= 15;
    page.drawText('PT. Mastah Digital Teknologi', { x: startX , y: startY, size: fontSize, font: fontBold });
    startY -= 15;
    page.drawText('Di Padang', { x: startX, y: startY, size: fontSize, font: fontBold });

    // Paragraf Pembuka
    startY -= 50;
    page.drawText(tanggalFormatted, { x: 425, y: 842 - height - 40, size: fontSize, font: fontRegular });
    yPosition = startY;
    var isi_surat = `Bersama surat ini kami ${costumer.Jabatan} dalam menunjang pengelolaan sekolah di sekolah kami, maka dengan ini kami memohon kepada Bapak/Ibu Direktur ${PT} untuk melakukan Pembelanjaan Barang dan Jasa BOP SMK Negeri 69 Jakarta. 
     \n\n Demikian permohonan ini kami sampaikan agar dapat Bapak/Ibu mengetahuinya dan segera menindaklanjuti, atas kerjasama yang baik kami ucapkan terima kasih. `;
    const paragraphs = isi_surat.split('\n\n'); // pisah paragraf dengan double line break
    paragraphs.forEach(paragraph => {
      yPosition = drawParagraphJustify(page, paragraph.trim(), 100, yPosition, 400, 18, fontRegular, fontSize);
      yPosition -= 18; // spasi antar paragraf
    });

    page.drawText(costumer.Jabatan, { x: 350, y: 170-18, size: fontSize, font: fontBold });

    // Tulisan "Hormat kami" di bawah surat (misal di y=100)
    page.drawText(costumer.Nama, { x: 375, y: 50+ 18, size: fontSize, font: fontBold });
    page.drawText(`NIP : ${costumer.NIP}`, { x: 375, y: 50 , size: fontSize, font: fontBold });

    // PAGE 2
    const page2 = pdfDoc.addPage([595, 842]); // A4
      
    startX = 75;
    startY = 842 - 100;

    page2.drawText(`Lampiran`, { x: startX , y: startY, size: fontSize, font: fontRegular });
    page2.drawText(':', { x: startX  + 70, y: startY, size: fontSize, font: fontRegular });
    page2.drawText(`Surat Pesanan Belanja Barang dan Jasa BOP ${costumer.Sekolah}` || '-', { x: startX  + 80, y: startY, size: fontSize, font: fontRegular });

    page2.drawText(`Nomor`, { x: startX , y: startY -= 15, size: fontSize, font: fontRegular });
    page2.drawText(':', { x: startX  + 70, y: startY, size: fontSize, font: fontRegular });
    page2.drawText(nomor || '-', { x: startX  + 80, y: startY, size: fontSize, font: fontRegular });

    page2.drawText(`Tanggal`, { x: startX , y: startY -= 15, size: fontSize, font: fontRegular });
    page2.drawText(':', { x: startX  + 70, y: startY, size: fontSize, font: fontRegular });
    page2.drawText(tanggalFormatted || '-', { x: startX  + 80, y: startY, size: fontSize, font: fontRegular });

    // Tabel Data Barang
    const columns = [
      { header: 'No', key: 'no', width: 30 },
      { header: 'Kegiatan', key: 'kegiatan', width: 110 },
      { header: 'Nama Barang', key: 'barang', width: 150 },
      { header: 'Spesifikasi', key: 'spesifikasi', width: 80 },
      { header: 'Volume', key: 'volume', width: 60 },
      { header: 'Satuan', key: 'satuan', width: 60 },
    ];

    const rows = detail_invoice.map((item, i) => ({
      no: (i + 1).toString(),
      kegiatan: invoice.Kegiatan,
      barang: item.Nama_Barang || '',
      spesifikasi: '',
      volume: item.Volume.toString() || '',
      satuan: item.Satuan || '',
    }));

    startY = drawTable(page2, startX , startY - 50, columns, rows, fontRegular, fontSize);

    page2.drawText('Pejabat Pelaksana Teknis Kegiatan', { x: 350, y: 170, size: fontSize, font: fontBold });
    page2.drawText(costumer.Jabatan, { x: 350, y: 170-18, size: fontSize, font: fontBold });

    // Tulisan "Hormat kami" di bawah surat (misal di y=100)
    page2.drawText(costumer.Nama, { x: 375, y: 50+ 18, size: fontSize, font: fontBold });
    page2.drawText(`NIP : ${costumer.NIP}`, { x: 375, y: 50 , size: fontSize, font: fontBold });

    // Kirim PDF
    const pdfBytes = await pdfDoc.save();
    const buffer = Buffer.from(pdfBytes);
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="permohonan-bop.pdf"',
      'Content-Length': buffer.length
    });
    res.end(buffer);

  } catch (err) {
    console.error('Gagal generate BOP PDF:', err.message);
    res.status(500).send('Gagal membuat PDF');
  }
};

exports.generateSHP = async (req, res) => {
  const {
    nomor, sifat, lampiran, tujuanBelanja, invoiceId
  } = req.body;

  try {
    const [invoicerows] = await pool.query('SELECT * FROM Invoice WHERE id = ?', [invoiceId]);
    const invoice = invoicerows[0]; 
    if (!invoice) {
      return res.status(400).send('Invoice tidak valid atau belum dipilih');
    }
    const [costumerrows] = await pool.query('SELECT * FROM costumer WHERE id = ?', [invoice.Costumer_id]);
    const costumer = costumerrows[0]; 
    const [detail_invoicerows] = await pool.query('SELECT * FROM detail_invoice WHERE Invoice_id = ?', [invoiceId]);
    const detail_invoice = detail_invoicerows;
    console.log(detail_invoice);
    
    const templatePath = path.join(__dirname, '..', 'public', costumer.kop_surat);
    if (!fs.existsSync(templatePath)) {
      return res.status(404).send("Template image not found.");
    }
    const templateImageBytes = fs.readFileSync(templatePath);

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4

    // Embed kop_surat image
    const pngImage = await pdfDoc.embedPng(templateImageBytes);
    const scale = 595 / pngImage.width;
    const height = pngImage.height * scale;
    page.drawImage(pngImage, { x: 0, y: 842 - height, width: 595, height });

    // Fonts
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontSize = 10;

    // Starting points
    const labelX = 50;
    const colonX = 150;
    const valueX = 160;
    const startX = 50;
    let startY = 842 - height - 40;

    function drawLabelColonValue(label, value, y) {
      page.drawText(label, { x: labelX, y, size: fontSize, font: fontRegular });
      page.drawText(':', { x: colonX, y, size: fontSize, font: fontRegular });
      page.drawText(value, { x: valueX, y, size: fontSize, font: fontRegular });
    }

    // Invoice details
    drawLabelColonValue('Nomor', nomor || '', startY);
    startY -= 15;
    drawLabelColonValue('Sifat', sifat || '', startY);
    startY -= 15;
    drawLabelColonValue('Lampiran', lampiran || '', startY);
    startY -= 15;
    drawLabelColonValue('Hal', "Surat Permintaan Penawaran Harga" || '', startY);
    startY -= 30;
    page.drawText(tanggalFormatted, { x: 425, y: 842 - height - 40, size: fontSize, font: fontRegular });

    // Tulis "Kepada Yth." bold
    page.drawText('Kepada Yth.', { x: startX, y: startY, size: fontSize, font: fontBold });
    startY -= 15;

    page.drawText('PT. Mastah Digital Teknologi', { x: startX , y: startY, size: fontSize, font: fontBold });

    startY -= 15;

    // Tulis "Di tempat" dengan font reguler
    page.drawText('Di Padang', { x: startX, y: startY, size: fontSize, font: fontBold });
    let yPosition = startY - 40; // beri jarak setelah bagian kepada yth
    var isi_surat = "Sehubungan dengan pelaksanaan Operasional "  + costumer.Sekolah +" Tahun Anggaran 2025 untuk Belanja Barang dan Jasa BOS/BOP dari dana BOS/BOP sekolah untuk "+ tujuanBelanja+", kami membutuhkan :";
    const paragraphs = isi_surat.split('\n\n'); // pisah paragraf dengan double line break
    paragraphs.forEach(paragraph => {
      yPosition = drawParagraphJustify(page, paragraph.trim(), 50, yPosition, 495, 18, fontRegular, fontSize);
      yPosition -= 18; // spasi antar paragraf
    });

    startY = yPosition + 8;
    // Draw table title

    // Define columns & rows for tabel
    const columns = [
      { header: 'No', key: 'no', width: 30 },
      { header: 'Nama Barang', key: 'namabarang', width: 200 },
      { header: 'Volume', key: 'volume', width: 60 },
      { header: 'Satuan', key: 'satuan', width: 60 },
      { header: 'Harga Satuan', key: 'harga', width: 80 },
      { header: 'Jumlah', key: 'jumlah', width: 60 },
    ];

    const rows = detail_invoice.map((item, idx) => ({
      no: (idx + 1).toString(),
      namabarang: item.Nama_Barang || '',
      volume: item.Volume ? item.Volume.toString() : '',
      satuan: item.Satuan ? item.Satuan.toString() : '',
      harga: item.Harga_Satuan ? formatRupiah(item.Harga_Satuan) : '',
      jumlah: item.Jumlah ? formatRupiah(item.Jumlah) : '',
    }));  
    
    const summaryRows = [
      { label: 'Jumlah', value: formatRupiah(invoice.Total) },
      { label: 'PPN (11%)', value: formatRupiah(invoice.PPN) },
      { label: 'Total', value: formatRupiah(invoice.Total_Harga) },
    ];
    // Draw table with summary
    startY = drawTableWithSummary(page, startX, startY, columns, rows, summaryRows, fontRegular, fontBold, fontSize);

    const penutup = "Dengan ini kami mengharapkan bantuan saudara agar dapat mengajukan penawaran harga ditunjukan kepada "+ costumer.Jabatan +", atas perhatian saudara saya ucapkan terima kasih.";
    yPosition = startY;
    yPosition = drawParagraphJustify(page, penutup.trim(), 50, yPosition -= 30, 495, 18, fontRegular, fontSize);
    yPosition -= 18; // spasi antar paragraf
 
    page.drawText(costumer.Jabatan, { x: 350, y: 170-18, size: fontSize, font: fontBold });
    // Tulisan "Hormat kami" di bawah surat (misal di y=100)
    page.drawText(costumer.Nama, { x: 375, y: 50, size: fontSize, font: fontBold });

    console.log('Mulai generate PDF');
    const pdfBytes = await pdfDoc.save();
    console.log('PDF selesai generate, size:', pdfBytes.length);
    const buffer = Buffer.from(pdfBytes);
    console.log('Buffer dibuat, size:', buffer.length);

    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="surathargapenawaran.pdf"',
      'Content-Length': buffer.length
    });
    res.end(buffer);
    console.log('Response dikirim');

  } catch (err) {
    res.status(500).send(`Terjadi kesalahan: ${err.message}`);
  }
};

// Generate SPH (Surat Penawaran Harga) - Price Quote Letter FROM PT. Mastah TO Customer
exports.generateSPH = async (req, res) => {
  const {
    nomor,tempat, perihal, invoiceId
  } = req.body;

  try {
    const [invoicerows] = await pool.query('SELECT * FROM Invoice WHERE id = ?', [invoiceId]);
    const invoice = invoicerows[0]; 
    if (!invoice) {
      return res.status(400).send('Invoice tidak valid atau belum dipilih');
    }
    const [costumerrows] = await pool.query('SELECT * FROM costumer WHERE id = ?', [invoice.Costumer_id]);
    const costumer = costumerrows[0]; 
    const [detail_invoicerows] = await pool.query('SELECT * FROM detail_invoice WHERE Invoice_id = ?', [invoiceId]);
    const detail_invoice = detail_invoicerows;

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4

    // Use PT. Mastah letterhead (assuming we have a default one or create simple header)
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontSize = 11;

    // PT. Mastah Header
    let startY = 800;
     // Starting points for letter content
     const startX = 50;
     
     function drawLabelColonValue(label, value, y,x) {
      const labelX = x;
      const colonX = labelX+ 40;
      const valueX = colonX + 10;
      page.drawText(label, { x: labelX, y, size: fontSize, font: fontRegular });
      page.drawText(':', { x: colonX, y, size: fontSize, font: fontRegular });
      page.drawText(value, { x: valueX, y, size: fontSize, font: fontRegular });
    }
    
    const templatePath = path.join(__dirname, '..', 'public', 'template_kop_surat.png');
    if (!fs.existsSync(templatePath)) {
      return res.status(404).send("Template image not found.");
    }
    const templateImageBytes = fs.readFileSync(templatePath);

    // Embed kop_surat image
    const pngImage = await pdfDoc.embedPng(templateImageBytes);
    const scale = 595 / pngImage.width;
    const height = pngImage.height * scale;
    page.drawImage(pngImage, { x: 0, y: 842 - height, width: 595, height });

    // Line separator
    startY -=  height;
    const center = 595 / 2 - 100;
    page.drawText('SURAT PENAWARAN HARGA', { x: center, y: startY, size: fontSize + 4, font: fontBold });
    startY -=  10;

    page.drawLine({
      start: { x: center , y: startY },
      end: { x: center + 210, y: startY },
      thickness: 2,
      color: rgb(0, 0, 0),
    });

    startY -= 12;

    drawLabelColonValue('Nomor', nomor || '', startY,center+30);
    
    // Letter details
    startY -= 20;

    // Recipient
    page.drawText('Kepada Yth.', { x: startX, y: startY, size: fontSize, font: fontRegular });
    startY -= 15;
    page.drawText(costumer.Sekolah, { x: startX, y: startY, size: fontSize, font: fontRegular });
    startY -= 15;
    page.drawText(costumer.Alamat, { x: startX, y: startY, size: fontSize, font: fontRegular });
    startY -= 30;
    drawLabelColonValue('Perihal', perihal || '', startY, startX);
    startY -= 30;

    // Letter content
    let yPosition = startY- 20;
    page.drawText('Dengan hormat,', { x: startX, y: startY, size: fontSize, font: fontRegular });
    const isi_surat = `Kami dari ${PT} bermaksud menanggapi Surat Permintaan Penawaran harga untuk ${invoice.Kegiatan} pada ${costumer.Sekolah}. Berikut kami sampaikan penawaran harga terbaik kami sebesar Rp ${formatRupiah(invoice.Total_Harga)} dengan rincian sebagai berikut :`;
    
    const paragraphs = isi_surat.split('\n\n');
    paragraphs.forEach(paragraph => {
      yPosition = drawParagraphJustify(page, paragraph.trim(), 50, yPosition, 495, 18, fontRegular, fontSize);
      yPosition -= 18;
    });

    // Table
    startY = yPosition + 8;
    const columns = [
      { header: 'No', key: 'no', width: 30 },
      { header: 'Nama Barang', key: 'namabarang', width: 200 },
      { header: 'Volume', key: 'volume', width: 60 },
      { header: 'Satuan', key: 'satuan', width: 60 },
      { header: 'Harga Satuan', key: 'harga', width: 80 },
      { header: 'Jumlah', key: 'jumlah', width: 60 },
    ];

    const rows = detail_invoice.map((item, idx) => ({
      no: (idx + 1).toString(),
      namabarang: item.Nama_Barang || '',
      volume: item.Volume ? item.Volume.toString() : '',
      satuan: item.Satuan ? item.Satuan.toString() : '',
      harga: item.Harga_Satuan ? formatRupiah(item.Harga_Satuan) : '',
      jumlah: item.Jumlah ? formatRupiah(item.Jumlah) : '',
    }));

    const summaryRows = [
      { label: 'Jumlah', value: formatRupiah(invoice.Total) },
      { label: 'PPN (11%)', value: formatRupiah(invoice.PPN) },
      { label: 'Total', value: formatRupiah(invoice.Total_Harga) },
    ];

    startY = drawTableWithSummary(page, startX, startY, columns, rows, summaryRows, fontRegular, fontBold, fontSize);

    // Closing paragraph
    const penutup = `Demikian surat penawaran harga ini kami sampaikan, atas perhatian dan kerjasamanya kami ucapkan terima kasih.`;
    
    yPosition = startY - 30;
    const penutupParagraphs = penutup.split('\n\n');
    penutupParagraphs.forEach(paragraph => {
      yPosition = drawParagraphJustify(page, paragraph.trim(), 50, yPosition, 495, 18, fontRegular, fontSize);
      yPosition -= 18;
    });

    // Signature
    page.drawText(`${tempat}, ${tanggalFormatted}`, { x: startX, y: yPosition - 20, size: fontSize, font: fontRegular });
    page.drawText(`${PT}`, { x: startX, y: yPosition - 40, size: fontSize, font: fontBold });
    page.drawText(`${JabatanPT}`, { x: startX, y: yPosition - 100, size: fontSize, font: fontBold });
    page.drawText(`${DirekturPT}`, { x: startX, y: yPosition - 120, size: fontSize, font: fontBold });

    const pdfBytes = await pdfDoc.save();
    const buffer = Buffer.from(pdfBytes);

    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="SPH.pdf"',
      'Content-Length': buffer.length
    });
    res.end(buffer);

  } catch (err) {
    console.error('Gagal generate SPH PDF:', err.message);
    res.status(500).send(`Terjadi kesalahan: ${err.message}`);
  }
};

// Generate Undangan Negosiasi Harga Penawaran - Negotiation Invitation Letter
// Generate Daftar Hadir - Attendance List
exports.generateDaftarHadir = async (req, res) => {
  const {
    invoiceId, hariTanggal, waktu, tempat, orangtambahan,jabatanorang
  } = req.body;

  try {
    const [invoicerows] = await pool.query('SELECT * FROM Invoice WHERE id = ?', [invoiceId]);
    const invoice = invoicerows[0]; 
    if (!invoice) {
      return res.status(400).send('Invoice tidak valid atau belum dipilih');
    }
    const [costumerrows] = await pool.query('SELECT * FROM costumer WHERE id = ?', [invoice.Costumer_id]);
    const costumer = costumerrows[0]; 

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4

    // Load customer letterhead
    const templatePath = path.join(__dirname, '..', 'public', costumer.kop_surat);
    if (!fs.existsSync(templatePath)) {
      return res.status(404).send("Template image not found.");
    }
    const templateImageBytes = fs.readFileSync(templatePath);

    // Embed kop_surat image
    const pngImage = await pdfDoc.embedPng(templateImageBytes);
    const scale = 595 / pngImage.width;
    const height = pngImage.height * scale;
    page.drawImage(pngImage, { x: 0, y: 842 - height, width: 595, height });

    // Fonts
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontSize = 11;

    // Starting points
    const startX = 50;
    let startY = 842 - height - 40;

    // Title
    const titleText = 'DAFTAR HADIR';
    const titleWidth = fontBold.widthOfTextAtSize(titleText, fontSize + 4);
    const centerX = (595 - titleWidth) / 2;
      function drawMeetingDetailWrapped(label, value, y) {
        const labelX = startX + 20;
        const colonX = startX + 120;
        const valueX = startX + 140;
        const maxWidth = 350; // max lebar teks isi

        page.drawText(label, { x: labelX, y, size: fontSize, font: fontRegular });
        page.drawText(':', { x: colonX, y, size: fontSize, font: fontRegular });

        const lines = wrapText(value, maxWidth, fontRegular, fontSize);
        lines.forEach((line, i) => {
          const lineY = y - i * (fontSize + 4);
          page.drawText(line, { x: valueX, y: lineY, size: fontSize, font: fontRegular });
        });
      };
    page.drawText(titleText, { x: centerX, y: startY, size: fontSize + 4, font: fontBold });
    startY -= 20;

    // Draw line under title
    page.drawLine({
      start: { x: centerX, y: startY },
      end: { x: centerX + titleWidth, y: startY },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    startY -= 30;

    // Meeting details
    function drawMeetingDetail(label, value, y) {
      const labelX = startX;
      const colonX = startX + 100;
      const valueX = startX + 120;
      
      page.drawText(label, { x: labelX, y, size: fontSize, font: fontRegular });
      page.drawText(':', { x: colonX, y, size: fontSize, font: fontRegular });
      page.drawText(value, { x: valueX, y, size: fontSize, font: fontRegular });
      return y - 20;
    }

    drawMeetingDetailWrapped('Acara', `Rapat Negosiasi Harga Penawaran Pekerjaan ${invoice.Kegiatan} pada ${costumer.Sekolah}` || '', startY);
    startY -= 40;
    drawMeetingDetailWrapped('Hari/Tanggal', hariTanggal || '', startY);
    startY -= 30;
    drawMeetingDetailWrapped('Waktu', waktu || '', startY);
    startY -= 30;
     drawMeetingDetailWrapped('Tempat', tempat || '', startY);

    startY -= 30;

    // Attendance table
    const columns = [
      { header: 'No', key: 'no', width: 40 },
      { header: 'Nama', key: 'nama', width: 200 },
      { header: 'Jabatan', key: 'jabatan', width: 150 },
      { header: 'Tanda Tangan', key: 'ttd', width: 100 },
    ];

    // Sample rows for attendance (adjust as needed)
    const rows = [
      { no: '1', nama: costumer.Nama, jabatan: costumer.Jabatan, ttd: '' },
      { no: '2', nama: Direktur, jabatan: JabatanPT, ttd: '' },
      { no: '3', nama: orangtambahan, jabatan: jabatanorang, ttd: '' },
    ];

    startY = drawTable(page, startX, startY, columns, rows, fontRegular, fontSize);

    // Footer
    startY -= 50;
    page.drawText('Mengetahui,', { x: 350, y: startY, size: fontSize, font: fontRegular });
    startY -= 15;
    page.drawText(costumer.Jabatan, { x: 350, y: startY, size: fontSize, font: fontRegular });
    startY -= 60;
    page.drawText(costumer.Nama, { x: 350, y: startY, size: fontSize, font: fontRegular });
    startY -= 15;
    page.drawText(`NIP. ${costumer.NIP}`, { x: 350, y: startY, size: fontSize, font: fontRegular });

    const pdfBytes = await pdfDoc.save();
    const buffer = Buffer.from(pdfBytes);

    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="daftar-hadir.pdf"',
      'Content-Length': buffer.length
    });
    res.end(buffer);

  } catch (err) {
    console.error('Gagal generate Daftar Hadir PDF:', err.message);
    res.status(500).send(`Terjadi kesalahan: ${err.message}`);
  }
};

exports.generatePersetujuanNegosiasi = async (req, res) => {
  const {
    nomor,  invoiceId, daerah
  } = req.body;

  try {

    const [invoicerows] = await pool.query('SELECT * FROM Invoice WHERE id = ?', [invoiceId]);
    const invoice = invoicerows[0]; 
    if (!invoice) {
      return res.status(400).send('Invoice tidak valid atau belum dipilih');
    }
    const [costumerrows] = await pool.query('SELECT * FROM costumer WHERE id = ?', [invoice.Costumer_id]);
    const costumer = costumerrows[0]; 
    const [detail_invoicerows] = await pool.query('SELECT * FROM detail_invoice WHERE Invoice_id = ?', [invoiceId]);
    const detail_invoice = detail_invoicerows;

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4

    // Load customer letterhead
    const templatePath = path.join(__dirname, '..', 'public', costumer.kop_surat);
    if (!fs.existsSync(templatePath)) {
      return res.status(404).send("Template image not found.");
    }
    const templateImageBytes = fs.readFileSync(templatePath);

    // Embed kop_surat image
    const pngImage = await pdfDoc.embedPng(templateImageBytes);
    const scale = 595 / pngImage.width;
    const height = pngImage.height * scale;
    page.drawImage(pngImage, { x: 0, y: 842 - height, width: 595, height });
    // Fonts
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontSize = 11;

    // Starting points
    const startX = 70;
    let startY = 842 - height - 40;

    // Letter header details
    function drawLabelColonValue(label, value, y) {
      page.drawText(label, { x: startX, y, size: fontSize, font: fontRegular });
      page.drawText(':', { x: startX + 70, y, size: fontSize, font: fontRegular });
      page.drawText(value, { x: startX + 90, y, size: fontSize, font: fontRegular });
    }

      function drawMeetingDetailWrapped(label, value, y) {
      const labelX = startX + 20;
      const colonX = startX + 120;
      const valueX = startX + 140;
      const maxWidth = 350;

      page.drawText(label, { x: labelX, y, size: fontSize, font: fontRegular });
      page.drawText(':', { x: colonX, y, size: fontSize, font: fontRegular });

      const lines = wrapText(value, maxWidth, fontRegular, fontSize);
      lines.forEach((line, i) => {
        const lineY = y - i * (fontSize + 4);
        page.drawText(line, { x: valueX, y: lineY, size: fontSize, font: fontRegular });
      });

      return y - lines.length * (fontSize + 4);
    }

    drawLabelColonValue('Nomor', nomor || '', startY);
    startY -= 15;
    // drawLabelColonValue('Sifat', sifat || '', startY);
    // startY -= 15;
    // drawLabelColonValue('Lampiran', lampiran || '', startY);
    // startY -= 15;
    drawLabelColonValue('Perihal', 'Persetujuan Hasil Negosiasi', startY);
    startY -= 15;
    page.drawText('Harga Penawaran', { x: startX + 90, y: startY, size: fontSize, font: fontRegular });

    // Date (top right)
    page.drawText(tanggalFormatted, { x: 425, y: 842 - height - 40, size: fontSize, font: fontRegular });

    startY -= 15;

    // Recipient details
    page.drawText('Kepada Yth.', { x: startX, y: startY, size: fontSize, font: fontRegular });
    startY -= 15;
    page.drawText(`${costumer.Sekolah}`, { x: startX, y: startY, size: fontSize, font: fontRegular });
    startY -= 15;
    page.drawText(`${costumer.Alamat}`, { x: startX, y: startY, size: fontSize, font: fontRegular });
    startY -= 15;
    page.drawText('Di Padang', { x: startX, y: startY, size: fontSize, font: fontRegular });
    
    startY -= 15;
    
    page.drawText('Yang bertandatangan dibawah ini : ', { x: startX, y: startY, size: fontSize, font: fontRegular });
    startY -= 13;
    drawMeetingDetailWrapped('Nama', Direktur || '', startY);
    startY -= 13;
    drawMeetingDetailWrapped('Jabatan', JabatanPT || '', startY);
    startY -= 13;
    drawMeetingDetailWrapped('Alamat', '' || '', startY);
    const paragraphs = AlamatKantor.split('\n\n'); // pisah paragraf dengan double line break
    paragraphs.forEach(paragraph => {
          page.drawText(paragraph, { x: startX + 140, y: startY, size: fontSize, font: fontRegular });
     startY -= 15;
    }); 


    drawMeetingDetailWrapped('No. NPWP', NPWP || '', startY);
    startY -= 13;
   

    // Letter content
    let yPosition = startY -20;
    const isi_surat = `Dengan ini kami menyetujui hasil negosiasi pada tanggal ${tanggalFormatted} perihal ${invoice.Kegiatan} , dengan harga awal penawaran Rp ${invoice.Total_Harga}, menjadi Rp ${invoice.Total_Harga},- dengan rincian sebagai berikut :`;
    yPosition = drawParagraphJustify(page, isi_surat.trim(), startX, yPosition, 450, 18, fontRegular, fontSize);
    yPosition -= 10;

  

    // Table
    const columns = [
      { header: 'No', key: 'no', width: 30 },
      { header: 'Nama Barang Pekerjaan', key: 'namabarang', width: 200 },
      { header: 'Volume', key: 'volume', width: 60 },
      { header: 'Satuan', key: 'satuan', width: 60 },
      { header: 'Harga Satuan', key: 'harga', width: 80 },
      { header: 'Jumlah', key: 'jumlah', width: 60 },
    ];

    const rows = detail_invoice.map((item, idx) => ({
      no: (idx + 1).toString(),
      namabarang: item.Nama_Barang || '',
      volume: item.Volume ? item.Volume.toString() : '',
      satuan: item.Satuan ? item.Satuan.toString() : '',
      harga: item.Harga_Satuan ? formatRupiah(item.Harga_Satuan) : '',
      jumlah: item.Jumlah ? formatRupiah(item.Jumlah) : '',
    }));

    const summaryRows = [
      { label: 'Jumlah', value: formatRupiah(invoice.Total) },
      { label: 'PPN (11%)', value: formatRupiah(invoice.PPN) },
      { label: 'Total', value: formatRupiah(invoice.Total_Harga) },
    ];

    startY = drawTableWithSummary(page, startX, yPosition, columns, rows, summaryRows, fontRegular, fontBold, fontSize);

    // Closing paragraph
    const penutup = `Demikian surat pernyataan ini kami buat dengan sesungguhnya untuk dapat dipergunakan sebagaimana mestinya.`;
    yPosition = startY - 20;
    yPosition = drawParagraphJustify(page, penutup.trim(), startX, yPosition, 450, 18, fontRegular, fontSize);

    // Signatures
    yPosition -= 20;
    
    // Left signature
    page.drawText(`${daerah} ${tanggalFormatted}`, { x: startX, y: yPosition, size: fontSize, font: fontRegular });
    page.drawText(PT, { x: startX, y: yPosition - 15, size: fontSize, font: fontRegular });
    page.drawText(JabatanPT, { x: startX, y: yPosition - 100, size: fontSize, font: fontRegular });
    page.drawText(Direktur, { x: startX, y: yPosition - 115, size: fontSize, font: fontRegular });

   
    const pdfBytes = await pdfDoc.save();
    const buffer = Buffer.from(pdfBytes);

    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="persetujuan-hasil-negosiasi.pdf"',
      'Content-Length': buffer.length
    });
    res.end(buffer);

  } catch (err) {
    console.error('Gagal generate Persetujuan Hasil Negosiasi PDF:', err.message);
    res.status(500).send(`Terjadi kesalahan: ${err.message}`);
  }
};

exports.generateSPK = async (req, res) => {
  const {
    nomorSPK, invoiceId, daerah,tanggalSPK,waktupelaksana,waktupenyelesaian
  } = req.body;

  try {
    const [invoicerows] = await pool.query('SELECT * FROM Invoice WHERE id = ?', [invoiceId]);
    const invoice = invoicerows[0]; 
    if (!invoice) {
      return res.status(400).send('Invoice tidak valid atau belum dipilih');
    }
    const [costumerrows] = await pool.query('SELECT * FROM costumer WHERE id = ?', [invoice.Costumer_id]);
    const costumer = costumerrows[0]; 
    const [detail_invoicerows] = await pool.query('SELECT * FROM detail_invoice WHERE Invoice_id = ?', [invoiceId]);
    const detail_invoice = detail_invoicerows;

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4

    // Load customer letterhead
    const templatePath = path.join(__dirname, '..', 'public', costumer.kop_surat);
    if (!fs.existsSync(templatePath)) {
      return res.status(404).send("Template image not found.");
    }
    const templateImageBytes = fs.readFileSync(templatePath);

    // Embed kop_surat image
    const pngImage = await pdfDoc.embedPng(templateImageBytes);
    const scale = 595 / pngImage.width;
    const height = pngImage.height * scale;
    page.drawImage(pngImage, { x: 0, y: 842 - height, width: 595, height });

    // Fonts
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontSize = 11;

    // Starting points
    let startX = 70;
    let startY = 842 - height - 40;

    // // Title
    // const titleText = 'SURAT PERINTAH KERJA (SPK)';
    // const titleWidth = fontBold.widthOfTextAtSize(titleText, fontSize + 4);
    // const centerX = (595 - titleWidth) / 2;
    
    // page.drawText(titleText, { x: centerX, y: startY, size: fontSize + 4, font: fontBold });
    // startY -= 20;

    // // Draw line under title
    // page.drawLine({
    //   start: { x: centerX, y: startY },
    //   end: { x: centerX + titleWidth, y: startY },
    //   thickness: 1,
    //   color: rgb(0, 0, 0),
    // });

    // startY -= 30;
 // Contractor details
   function drawDetailLine(label, value, y, customX = startX,costomcolon = 150) {
  const labelX = customX;
  const colonX = labelX + costomcolon;
  const valueX = colonX + 10;

  page.drawText(label, { x: labelX, y, size: fontSize, font: fontRegular });
  page.drawText(':', { x: colonX, y, size: fontSize, font: fontRegular });
  page.drawText(value || '-', { x: valueX, y, size: fontSize, font: fontRegular });
}

    // Document number
    page.drawText(`SURAT PERINTAH KERJA (SPK)`, { x: startX, y: startY, size: fontSize, font: fontRegular });
    drawDetailLine('Nama Satuan Pendidikan', costumer.Sekolah, startY, startX + 180);
    startY -= 15;
    drawDetailLine('Nomor SPK', nomorSPK, startY, startX + 180);
    startY -= 15;
    drawDetailLine('tanggal SPK', formatTanggalIndonesia(tanggalSPK), startY, startX + 180);
    startY -= 15;

    // drawDetailLine('Nama Satuan Pendidikan', costumer.Sekolah, startY,startX + 100);
    
     // Document number
    page.drawText(`Paket Pekerjaan`, { x: startX, y: startY, size: fontSize, font: fontRegular });
    drawDetailLine('Tanggal Negosiasi', tanggalFormatted, startY, startX + 180);
    startY -= 15;
    const keteranganSPK = `SPK ini mulai berlaku efektif terhitung sejak tanggal ditetapkan dan penyelesaian keseluruhan pekerjaan sebagaimana dimaksud dalam SPK ini`;
    startY = drawParagraphJustify(page, keteranganSPK.trim(), startX + 180, startY, 250, 18, fontRegular, fontSize, '');
    startY -= 20;
    drawDetailLine('WAKTU PELAKSANA PEKERJAAN',formatTanggalIndonesia( waktupelaksana), startY,startX,200);
    startY -= 20;
    drawDetailLine('WAKTU PENYELESAIAN PEKERJAAN',formatTanggalIndonesia( waktupenyelesaian), startY,startX,200);
    startY -= 20;
    // // // Introduction text
    // const introText = `Yang bertanda tangan di bawah ini ${costumer.Jabatan} ${costumer.Sekolah}, dengan ini memerintahkan:`;
    // let yPosition = drawParagraphJustify(page, introText.trim(), startX, startY, 450, 18, fontRegular, fontSize);
    // yPosition -= 30;
    const titleText = 'SURAT PERINTAH KERJA (SPK)';
    const titleWidth = fontBold.widthOfTextAtSize(titleText, fontSize);
    const centerX = (595 - titleWidth) / 2;
    page.drawText(titleText, { x: centerX, y: startY, size: fontSize, font: fontRegular });
     startY -= 20;
    
    // Table
    const columns = [
      { header: 'No', key: 'no', width: 30 },
      { header: 'Nama Barang/Pekerjaan', key: 'namabarang', width: 200 },
      { header: 'Volume', key: 'volume', width: 60 },
      { header: 'Satuan', key: 'satuan', width: 60 },
      { header: 'Harga Satuan', key: 'harga', width: 80 },
      { header: 'Jumlah', key: 'jumlah', width: 60 },
    ];

    const rows = detail_invoice.map((item, idx) => ({
      no: (idx + 1).toString(),
      namabarang: item.Nama_Barang || '',
      volume: item.Volume ? item.Volume.toString() : '',
      satuan: item.Satuan ? item.Satuan.toString() : '',
      harga: item.Harga_Satuan ? formatRupiah(item.Harga_Satuan) : '',
      jumlah: item.Jumlah ? formatRupiah(item.Jumlah) : '',
    }));

    const summaryRows = [
      { label: 'Jumlah', value: formatRupiah(invoice.Total) },
      { label: 'PPN (11%)', value: formatRupiah(invoice.PPN) },
      { label: 'Pengiriman', value: '-' },
      { label: 'Asuransi', value: '-' },
      { label: 'Total', value: formatRupiah(invoice.Total_Harga) },
    ];

    startY = drawTableWithSummary(page, startX, startY, columns, rows, summaryRows, fontRegular, fontBold, fontSize);
    startY -= 20;
  const hasil = terbilangManual(invoice.Total_Harga)
    drawDetailLine('Terbilang', hasil , startY,startX,);
    startY -= 30;
    page.drawText(`INTRUKSI PENYEDIA`, { x: startX, y: startY, size: fontSize, font: fontRegular });
    startY -= 20;
    const terms = "Penagihan hanya dapat di lakukan setelah penyelesaian pekerjaan yang diperintahkan dalam SPK ini dan dibuktikan dengan Surat Hasil Pemeriksaan dan Berita Acara Serah Terima "
    startY = drawParagraphJustify(page, terms.trim(), startX , startY, 500, 18, fontRegular, fontSize, '');

    // Signatures
    startY -= 20;
    
    // Left signature
    page.drawText(PT, { x: startX, y: startY - 30, size: fontSize, font: fontRegular });
    page.drawText(Direktur, { x: startX, y: startY - 115, size: fontSize, font: fontRegular });
    page.drawText(JabatanPT, { x: startX, y: startY - 100, size: fontSize, font: fontRegular });

    // Right signature
    page.drawText(costumer.Jabatan, { x: 350, y: startY - 30, size: fontSize, font: fontRegular });
    page.drawText(costumer.Nama, { x: 350, y: startY - 100, size: fontSize, font: fontRegular });
    page.drawText(`NIP. ${costumer.NIP}`, { x: 350, y: startY - 115, size: fontSize, font: fontRegular });

    const pdfBytes = await pdfDoc.save();
    const buffer = Buffer.from(pdfBytes);

    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="surat-perintah-kerja.pdf"',
      'Content-Length': buffer.length
    });
    res.end(buffer);

  } catch (err) {
    console.error('Gagal generate SPK PDF:', err.message);
    res.status(500).send(`Terjadi kesalahan: ${err.message}`);
  }
};

exports.generateUndanganNegosiasi = async (req, res) => {
  const {
    nomor, lampiran, invoiceId, hariTanggal, waktu, tempat, alamat, acara, daerah
  } = req.body;

  try {
    const [invoicerows] = await pool.query('SELECT * FROM Invoice WHERE id = ?', [invoiceId]);
    const invoice = invoicerows[0]; 
    if (!invoice) {
      return res.status(400).send('Invoice tidak valid atau belum dipilih');
    }
    const [costumerrows] = await pool.query('SELECT * FROM costumer WHERE id = ?', [invoice.Costumer_id]);
    const costumer = costumerrows[0]; 

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    console.log(costumer);
    

    // Load customer letterhead
    const templatePath = path.join(__dirname, '..', 'public', costumer.kop_surat);
    if (!fs.existsSync(templatePath)) {
      return res.status(404).send("Template image not found.");
    }
    const templateImageBytes = fs.readFileSync(templatePath);

    // Embed kop_surat image
    const pngImage = await pdfDoc.embedPng(templateImageBytes);
    const scale = 595 / pngImage.width;
    const height = pngImage.height * scale;
    page.drawImage(pngImage, { x: 0, y: 842 - height, width: 595, height });

    // Fonts
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontSize = 11;

    // Starting points
    const startX = 70;
    let startY = 842 - height - 15;

    // Letter header details
    function drawLabelColonValue(label, value, y) {
      page.drawText(label, { x: startX, y, size: fontSize, font: fontRegular });
      page.drawText(':', { x: startX + 70, y, size: fontSize, font: fontRegular });
      page.drawText(value, { x: startX + 90, y, size: fontSize, font: fontRegular });
    }

    drawLabelColonValue('Nomor', nomor || '', startY);
    startY -= 15;
    drawLabelColonValue('Lampiran', lampiran || '', startY);
    startY -= 15;
    drawLabelColonValue('Hal', 'Undangan Negosiasi', startY);
    page.drawText('Harga Penawaran', { x: startX + 90, y: startY - 15, size: fontSize, font: fontRegular });

    // Date (top right)
    page.drawText(`${daerah}, ${tanggalFormatted}`, { x: 350, y: startY + 30, size: fontSize, font: fontRegular });

    startY -= 20;

          page.drawText('Kepada', { x: startX + 250, y: startY, size: fontSize, font: fontRegular });
     startY -= 15;

    const paragraphs = AlamatKantor.split('\n\n'); // pisah paragraf dengan double line break
    paragraphs.forEach(paragraph => {
          page.drawText(paragraph, { x: startX + 250, y: startY, size: fontSize, font: fontRegular });
     startY -= 15;
 // spasi antar paragraf
    });

    startY -= 40;

    // Letter content
    page.drawText('Dengan Hormat,', { x: startX, y: startY, size: fontSize, font: fontRegular });
    startY -= 30;

    let yPosition = startY;
    const isi_surat = `Sehubungan dengan Penawaran Harga Belanja Barang dan Jasa BOP ${invoice.Kegiatan} pada ${costumer.Sekolah} yang saudara ajukan, setelah diadakan penelitian dan penilaian harga, maka kami berkesimpulan harga penawaran masih memungkinkan untuk diturunkan. Untuk itu kami mengundang Saudara mengadakan negosiasi pada:`;
    
    yPosition = drawParagraphJustify(page, isi_surat.trim(), startX, yPosition, 450, 18, fontRegular, fontSize);
    yPosition -= 30;

  function drawMeetingDetailWrapped(label, value, y) {
  const labelX = startX + 20;
  const colonX = startX + 120;
  const valueX = startX + 140;
  const maxWidth = 350; // max lebar teks isi

  page.drawText(label, { x: labelX, y, size: fontSize, font: fontRegular });
  page.drawText(':', { x: colonX, y, size: fontSize, font: fontRegular });

  const lines = wrapText(value, maxWidth, fontRegular, fontSize);
  lines.forEach((line, i) => {
    const lineY = y - i * (fontSize + 4);
    page.drawText(line, { x: valueX, y: lineY, size: fontSize, font: fontRegular });
  });

  return y - lines.length * (fontSize + 4);
}

    drawMeetingDetailWrapped('Hari/Tanggal', hariTanggal || 'Rabu, 11 Desember 2024', yPosition);
    yPosition -= 18;
    drawMeetingDetailWrapped('Waktu', waktu || 'Pukul 08.00 WIB - Selesai', yPosition);
    yPosition -= 18;
    drawMeetingDetailWrapped('Tempat', tempat || `Ruang Sidang ${costumer.Sekolah}`, yPosition);
    yPosition -= 18;
    drawMeetingDetailWrapped('Alamat', alamat || costumer.Alamat, yPosition);
    yPosition -= 36;
    drawMeetingDetailWrapped('Acara', acara || 'Negosiasi Harga Penawaran', yPosition);

    yPosition -= 40;

    // Closing
    const penutup = 'Atas perhatian dan kehadiran Saudara, kami sampaikan terima kasih.';
    yPosition = drawParagraphJustify(page, penutup.trim(), startX, yPosition, 495, 18, fontRegular, fontSize);

     // Signature section (top right)
    page.drawText('Pejabat Pelaksana Teknis Kegiatan', { x: 350, y: 200, size: fontSize, font: fontRegular });
    page.drawText(costumer.Jabatan, { x: 350, y: 200 - 15, size: fontSize, font: fontRegular });
    page.drawText(costumer.Nama, { x: 350, y: 200 - 100, size: fontSize, font: fontRegular });
    page.drawText(`NIP. ${costumer.NIP}`, { x: 350, y: 200 - 115, size: fontSize, font: fontRegular });

    const pdfBytes = await pdfDoc.save();
    const buffer = Buffer.from(pdfBytes);

    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="undangan-negosiasi.pdf"',
      'Content-Length': buffer.length
    });
    res.end(buffer);

  } catch (err) {
    console.error('Gagal generate Undangan Negosiasi PDF:', err.message);
    res.status(500).send(`Terjadi kesalahan: ${err.message}`);
  }
};

// Generate Surat Kesanggupan Melaksanakan - Letter of Commitment to Execute
exports.generateSuratKesanggupanMelaksanakan = async (req, res) => {
  const {
    nomor, invoiceId,
  } = req.body;

  try {
    const [invoicerows] = await pool.query('SELECT * FROM Invoice WHERE id = ?', [invoiceId]);
    const invoice = invoicerows[0]; 
    if (!invoice) {
      return res.status(400).send('Invoice tidak valid atau belum dipilih');
    }
    const [costumerrows] = await pool.query('SELECT * FROM costumer WHERE id = ?', [invoice.Costumer_id]);
    const costumer = costumerrows[0]; 
    const [detail_invoicerows] = await pool.query('SELECT * FROM detail_invoice WHERE Invoice_id = ?', [invoiceId]);
    const detail_invoice = detail_invoicerows;

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4

    // Use PT. Mastah letterhead
    const templatePath = path.join(__dirname, '..', 'public', 'template_kop_surat.png');
    if (!fs.existsSync(templatePath)) {
      return res.status(404).send("Template image not found.");
    }
    const templateImageBytes = fs.readFileSync(templatePath);

    // Embed kop_surat image
    const pngImage = await pdfDoc.embedPng(templateImageBytes);
    const scale = 595 / pngImage.width;
    const height = pngImage.height * scale;
    page.drawImage(pngImage, { x: 0, y: 842 - height, width: 595, height });

    // Fonts
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontSize = 11;

    // Starting points
    const startX = 70;
    let startY = 842 - height - 40;

    // Title
    const titleText = 'SURAT KESANGGUPAN MELAKSANAKAN PEKERJAAN';
    const titleWidth = fontBold.widthOfTextAtSize(titleText, fontSize + 2);
    const centerX = (595 - titleWidth) / 2;
    
    page.drawText(titleText, { x: centerX, y: startY, size: fontSize + 2, font: fontBold });
    startY -=15;

    // Draw line under title
    page.drawLine({
      start: { x: centerX, y: startY },
      end: { x: centerX + titleWidth, y: startY },
      thickness: 1,
      color: rgb(0, 0, 0),
    });


    // Letter header details
    function drawLabelColonValue(label, value, y,x) {
      page.drawText(label, { x: x, y, size: fontSize, font: fontRegular });
      page.drawText(':', { x: x + 70, y, size: fontSize, font: fontRegular });
      page.drawText(value, { x: x + 90, y, size: fontSize, font: fontRegular });
    }

    startY -= 20;
    drawLabelColonValue('Nomor', nomor || '', startY,centerX + titleWidth / 2 - 100);
 

    // Date (top right)

    startY -= 30;

   
    // Letter content
    page.drawText('Dengan Hormat,', { x: startX, y: startY, size: fontSize, font: fontRegular });
    startY -= 20;

    let yPosition = startY;
    
    // Company introduction
    const intro = `Yang bertanda tangan di bawah ini:`;
    yPosition = drawParagraphJustify(page, intro.trim(), startX, yPosition, 450, 18, fontRegular, fontSize);
    yPosition -= 20;

    // Company details
    function drawDetailWrapped(label, value, y) {
      const labelX = startX + 20;
      const colonX = startX + 120;
      const valueX = startX + 140;
      const maxWidth = 350;

      page.drawText(label, { x: labelX, y, size: fontSize, font: fontRegular });
      page.drawText(':', { x: colonX, y, size: fontSize, font: fontRegular });

      const lines = wrapText(value, maxWidth, fontRegular, fontSize);
      lines.forEach((line, i) => {
        const lineY = y - i * (fontSize + 4);
        page.drawText(line, { x: valueX, y: lineY, size: fontSize, font: fontRegular });
      });

      return y - lines.length * (fontSize + 4) - 5;
    }

    yPosition = drawDetailWrapped('Direktur', Direktur, yPosition);
    yPosition = drawDetailWrapped('Jabatan', `${JabatanPT} ${PT}`, yPosition);
    yPosition = drawDetailWrapped('Alamat Perusahaan', AlamatKantor.replace(/\n\n/g, ' '), yPosition);
    yPosition = drawDetailWrapped('No.NPWP', NPWP, yPosition);

    yPosition -= 20;

    // Main commitment text
    const commitmentText = `Dengan ini menyatakan kesanggupan untuk melaksanakan pekerjaan ${invoice.Kegiatan} pada ${costumer.Sekolah} dengan nilai kontrak sebesar Rp ${formatRupiah(invoice.Total_Harga)} (${terbilangManual(invoice.Total_Harga)}) .`;
    
    yPosition = drawParagraphJustify(page, commitmentText.trim(), startX, yPosition, 450, 18, fontRegular, fontSize);
    yPosition -= 30;

    // Work details
    const workDetails = `Demikian surat pernyataan kesanggupan melaksanakan pekerjaan ini bersifat mengikat dan untuk dipergunakan sebagaimana mestinya.`;
    yPosition = drawParagraphJustify(page, workDetails.trim(), startX, yPosition, 450, 18, fontRegular, fontSize);
    yPosition -= 20;

    // Commitment terms
    startY = yPosition;

    // Signature
    startY -= 50;
    page.drawText('Hormat kami,', { x: startX, y: startY, size: fontSize, font: fontRegular });
    startY -= 15;
    page.drawText(PT, { x: startX, y: startY, size: fontSize, font: fontBold });
    startY -= 15;
    page.drawText(JabatanPT, { x: startX, y: startY, size: fontSize, font: fontRegular });
    startY -= 80;
    page.drawText(Direktur, { x: startX, y: startY, size: fontSize, font: fontBold });

    const pdfBytes = await pdfDoc.save();
    const buffer = Buffer.from(pdfBytes);

    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="surat-kesanggupan-melaksanakan.pdf"',
      'Content-Length': buffer.length
    });
    res.end(buffer);

  } catch (err) {
    console.error('Gagal generate Surat Kesanggupan Melaksanakan PDF:', err.message);
    res.status(500).send(`Terjadi kesalahan: ${err.message}`);
  }
};


// Generate Surat Kesanggupan Melaksanakan - Letter of Commitment to Execute
exports.generateSuratJalan = async (req, res) => {
  const {
    nomor, invoiceId,notelpon,plat,kendaraan,tanggalsurat,driver
  } = req.body;

  try {
    const [invoicerows] = await pool.query('SELECT * FROM Invoice WHERE id = ?', [invoiceId]);
    const invoice = invoicerows[0]; 
    if (!invoice) {
      return res.status(400).send('Invoice tidak valid atau belum dipilih');
    }
    const [costumerrows] = await pool.query('SELECT * FROM costumer WHERE id = ?', [invoice.Costumer_id]);
    const costumer = costumerrows[0]; 
    const [detail_invoicerows] = await pool.query('SELECT * FROM detail_invoice WHERE Invoice_id = ?', [invoiceId]);
    const detail_invoice = detail_invoicerows;

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4

    // Use PT. Mastah letterhead
    const templatePath = path.join(__dirname, '..', 'public', 'template_kop_surat.png');
    if (!fs.existsSync(templatePath)) {
      return res.status(404).send("Template image not found.");
    }
    const templateImageBytes = fs.readFileSync(templatePath);

    // Embed kop_surat image
    const pngImage = await pdfDoc.embedPng(templateImageBytes);
    const scale = 595 / pngImage.width;
    const height = pngImage.height * scale;
    page.drawImage(pngImage, { x: 0, y: 842 - height, width: 595, height });

    // Fonts
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontSize = 11;

    // Starting points
    const startX = 70;
    let startY = 842 - height - 40;

    // Title
    const titleText = 'SURAT JALAN';
    const titleWidth = fontBold.widthOfTextAtSize(titleText, fontSize + 2);
    const centerX = (595 - titleWidth) / 2;
    
    page.drawText(titleText, { x: centerX, y: startY, size: fontSize + 2, font: fontBold });
    startY -=15;

    // Draw line under title
    page.drawLine({
      start: { x: centerX, y: startY },
      end: { x: centerX + titleWidth, y: startY },
      thickness: 1,
      color: rgb(0, 0, 0),
    });


    // Letter header details
    function drawLabelColonValue(label, value, y,x) {
      page.drawText(label, { x: x, y, size: fontSize, font: fontRegular });
      page.drawText(':', { x: x + 100, y, size: fontSize, font: fontRegular });
      page.drawText(value, { x: x + 120, y, size: fontSize, font: fontRegular });
    }

    startY -= 20;
    page.drawText(nomor, { x: centerX, y: startY, size: fontSize - 1 , font: fontRegular });

    startY -= 20;
    page.drawText('Kepada Yth,', { x: startX, y: startY, size: fontSize, font: fontRegular });
    startY -= 15;
    drawLabelColonValue('Nama', costumer.Sekolah || '', startY,startX);
    startY -= 15;
    drawLabelColonValue('Alamat', costumer.Alamat || '', startY,startX);
    startY -= 15;
    drawLabelColonValue('No.Telpon', notelpon || '', startY,startX);
    startY -= 20;
    drawLabelColonValue('Tanggal', formatTanggalIndonesia(tanggalsurat) || '', startY,startX);
    startY -= 15;
    drawLabelColonValue('Jenis Kendaraan', kendaraan || '', startY,startX);
    startY -= 15;
    drawLabelColonValue('No.Polisi', plat || '', startY,startX);
    startY -= 15;
    drawLabelColonValue('Driver', driver || '', startY,startX);
    startY -= 20;
    page.drawText('Dikirimkan barang - barang sebagai berikut :', { x: startX, y: startY, size: fontSize, font: fontRegular });
    startY -= 20;

    // Table
    const columns = [
      { header: 'No', key: 'no', width: 30 },
      { header: 'Nama Barang/Pekerjaan', key: 'namabarang', width: 200 },
      { header: 'Qty', key: 'qty', width: 60 },
      { header: 'Satuan', key: 'satuan', width: 60 },
      { header: 'Keterangan', key: 'keterangan', width: 100 },
   
    ];

    const rows = detail_invoice.map((item, idx) => ({
      no: (idx + 1).toString(),
      namabarang: item.Nama_Barang || '',
      qty: item.Qty ? item.Qty.toString() : '',
      satuan: item.Satuan ? item.Satuan.toString() : '',
      keterangan: "Sesuai / Tidak Sesuai *)" ,
    }));
    startY = drawTable(page, startX, startY, columns, rows,  fontRegular, fontSize);
    startY -= 20;
    page.drawText('*) Coret yang tidak perlu', { x: startX, y: startY, size: fontSize, font: fontRegular });
// Signature
    startY -= 50;
  
  
    page.drawText(PT, { x: startX, y: startY, size: fontSize, font: fontBold });
    startY -= 95;
    page.drawText(Direktur, { x: startX, y: startY, size: fontSize, font: fontBold });
    startY -= 15;
    page.drawText(JabatanPT, { x: startX, y: startY, size: fontSize, font: fontRegular });
    startY += 95;

    page.drawText("Penerima / Pemeriksa", { x: startX + 300, y: startY, size: fontSize, font: fontBold });
    startY -= 15;
    startY -= 80;
    page.drawText("........................................", { x: startX + 300, y: startY, size: fontSize, font: fontBold });


    const pdfBytes = await pdfDoc.save();
    const buffer = Buffer.from(pdfBytes);

    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="surat-jalan.pdf"',
      'Content-Length': buffer.length
    });
    res.end(buffer);

  } catch (err) {
    console.error('Gagal generate Surat Jalan PDF:', err.message);
    res.status(500).send(`Terjadi kesalahan: ${err.message}`);
  }
};



exports.generateSuratSerahTerima = async (req, res) => {
  const {
    nomor, invoiceId,daerah,tanggalsurat
  } = req.body;

  try {
    const [invoicerows] = await pool.query('SELECT * FROM Invoice WHERE id = ?', [invoiceId]);
    const invoice = invoicerows[0]; 
    if (!invoice) {
      return res.status(400).send('Invoice tidak valid atau belum dipilih');
    }
    const [costumerrows] = await pool.query('SELECT * FROM costumer WHERE id = ?', [invoice.Costumer_id]);
    const costumer = costumerrows[0]; 
    const [detail_invoicerows] = await pool.query('SELECT * FROM detail_invoice WHERE Invoice_id = ?', [invoiceId]);
    const detail_invoice = detail_invoicerows;

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4

    // Use PT. Mastah letterhead
    const templatePath = path.join(__dirname, '..', 'public', 'template_kop_surat.png');
    if (!fs.existsSync(templatePath)) {
      return res.status(404).send("Template image not found.");
    }
    const templateImageBytes = fs.readFileSync(templatePath);

    // Embed kop_surat image
    const pngImage = await pdfDoc.embedPng(templateImageBytes);
    const scale = 595 / pngImage.width;
    const height = pngImage.height * scale;
    page.drawImage(pngImage, { x: 0, y: 842 - height, width: 595, height });

    // Fonts
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontSize = 11;

    // Starting points
    const startX = 70;
    let startY = 842 - height - 40;

    // Kepada
    page.drawText('Kepada Yth.', { x: startX, y: startY, size: fontSize, font: fontBold });
    startY -= 15;
    page.drawText(costumer.Sekolah, { x: startX , y: startY, size: fontSize, font: fontBold });
    startY -= 15;
    page.drawText(`Di ${daerah}`, { x: startX, y: startY, size: fontSize, font: fontBold });
    startY -= 25;
    
    page.drawText('SURAT SERAH TERIMA PEMELIHARAAN SARANA DAN PRASARANA SEKOLAH ', { x: startX, y: startY, size: fontSize, font: fontBold });
    startY -= 20;
    // Letter header details
    function drawLabelColonValue(label, value, y,x) {
      page.drawText(label, { x: x, y, size: fontSize, font: fontRegular });
      page.drawText(':', { x: x + 100, y, size: fontSize, font: fontRegular });
      page.drawText(value, { x: x + 120, y, size: fontSize, font: fontRegular });
    }
    drawLabelColonValue('Nomor', nomor || '', startY, startX);
    startY -= 15;

    drawLabelColonValue('Tanggal', formatTanggalIndonesia(tanggalsurat) || '', startY, startX);
    startY -= 40;

    // Table
    const columns = [
      { header: 'No', key: 'no', width: 30 },
      { header: 'Nama Barang', key: 'namabarang', width: 200 },
      { header: 'Volume', key: 'volume', width: 60 },
      { header: 'Satuan', key: 'satuan', width: 60 },
      { header: 'Keterangan', key: 'keterangan', width: 80 },
      { header: 'Jumlah', key: 'jumlah', width: 80 },
   
    ];

    const rows = detail_invoice.map((item, idx) => ({
      no: (idx + 1).toString(),
      namabarang: item.Nama_Barang || '',
      volume: item.Volume ? item.Volume.toString() : '',
      satuan: item.Satuan ? item.Satuan.toString() : '',
      keterangan: "" ,
      jumlah: "" ,
    }));
    startY = drawTable(page, startX, startY, columns, rows,  fontRegular, fontSize);
    
     startY -= 50;
  
    page.drawText("Yang Menyerahkan", { x: startX, y: startY, size: fontSize, font: fontBold });
    startY -= 15; 
    page.drawText(PT, { x: startX, y: startY, size: fontSize, font: fontBold });
    startY -= 95;
    page.drawText(Direktur, { x: startX, y: startY, size: fontSize, font: fontBold });
    startY -= 15;
    page.drawText(JabatanPT, { x: startX, y: startY, size: fontSize, font: fontRegular });
    startY += 95;

    startY += 15;
    page.drawText("Penerima / Pemeriksa", { x: startX + 300, y: startY, size: fontSize, font: fontBold });
    startY -= 15;
    startY -= 80;
    page.drawText("........................................", { x: startX + 300, y: startY, size: fontSize, font: fontBold });

    const pdfBytes = await pdfDoc.save();
    const buffer = Buffer.from(pdfBytes);

    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="surat-serah-terima.pdf"',
      'Content-Length': buffer.length
    });
    res.end(buffer);

  } catch (err) {
    console.error('Gagal generate Surat Serah Terima PDF:', err.message);
    res.status(500).send(`Terjadi kesalahan: ${err.message}`);
  }
};


exports.generateTemplate = async (req, res) => {
  const {
    nomor, invoiceId,daerah,tanggalsurat
  } = req.body;

  try {
    const [invoicerows] = await pool.query('SELECT * FROM Invoice WHERE id = ?', [invoiceId]);
    const invoice = invoicerows[0]; 
    if (!invoice) {
      return res.status(400).send('Invoice tidak valid atau belum dipilih');
    }
    const [costumerrows] = await pool.query('SELECT * FROM costumer WHERE id = ?', [invoice.Costumer_id]);
    const costumer = costumerrows[0]; 
    const [detail_invoicerows] = await pool.query('SELECT * FROM detail_invoice WHERE Invoice_id = ?', [invoiceId]);
    const detail_invoice = detail_invoicerows;

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4

    // Use PT. Mastah letterhead
    const templatePath = path.join(__dirname, '..', 'public', 'template_kop_surat.png');
    if (!fs.existsSync(templatePath)) {
      return res.status(404).send("Template image not found.");
    }
    const templateImageBytes = fs.readFileSync(templatePath);

    // Embed kop_surat image
    const pngImage = await pdfDoc.embedPng(templateImageBytes);
    const scale = 595 / pngImage.width;
    const height = pngImage.height * scale;
    page.drawImage(pngImage, { x: 0, y: 842 - height, width: 595, height });

    // Fonts
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontSize = 11;

    // Starting points
    const startX = 70;
    let startY = 842 - height - 40;



    
    const pdfBytes = await pdfDoc.save();
    const buffer = Buffer.from(pdfBytes);

    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="surat-serah-terima.pdf"',
      'Content-Length': buffer.length
    });
    res.end(buffer);

  } catch (err) {
    console.error('Gagal generate Surat Serah Terima PDF:', err.message);
    res.status(500).send(`Terjadi kesalahan: ${err.message}`);
  }
};


exports.generateFaktur = async (req, res) => {
  const {
    nomor, invoiceId,daerah, rekening,atasnama,bank
  } = req.body;

  try {
    const [invoicerows] = await pool.query('SELECT * FROM Invoice WHERE id = ?', [invoiceId]);
    const invoice = invoicerows[0]; 
    if (!invoice) {
      return res.status(400).send('Invoice tidak valid atau belum dipilih');
    }
    const [costumerrows] = await pool.query('SELECT * FROM costumer WHERE id = ?', [invoice.Costumer_id]);
    const costumer = costumerrows[0]; 
    const [detail_invoicerows] = await pool.query('SELECT * FROM detail_invoice WHERE Invoice_id = ?', [invoiceId]);
    const detail_invoice = detail_invoicerows;

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4

    // Use PT. Mastah letterhead
    const templatePath = path.join(__dirname, '..', 'public', 'template_kop_surat.png');
    if (!fs.existsSync(templatePath)) {
      return res.status(404).send("Template image not found.");
    }
    const templateImageBytes = fs.readFileSync(templatePath);

    // Embed kop_surat image
    const pngImage = await pdfDoc.embedPng(templateImageBytes);
    const scale = 595 / pngImage.width;
    const height = pngImage.height * scale;
    page.drawImage(pngImage, { x: 0, y: 842 - height, width: 595, height });

    // Fonts
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontSize = 11;

    // Starting points
    const startX = 70;
    let startY = 842 - height - 40;

    // Title
    const titleText = 'Faktur';
    const titleWidth = fontBold.widthOfTextAtSize(titleText, fontSize + 2);
    const centerX = (595 - titleWidth) / 2;
    
    page.drawText(titleText, { x: centerX, y: startY, size: fontSize + 2, font: fontBold });
    startY -=5;

    // Draw line under title
    page.drawLine({
      start: { x: centerX, y: startY },
      end: { x: centerX + titleWidth, y: startY },
      thickness: 1,
      color: rgb(0, 0, 0),
    });


    // Letter header details
    function drawLabelColonValue(label, value, y,x,colon = 100 , end = 120) {
      page.drawText(label, { x: x, y, size: fontSize, font: fontRegular });
      page.drawText(':', { x: x + colon, y, size: fontSize, font: fontRegular });
      page.drawText(value, { x: x + end, y, size: fontSize, font: fontRegular });
    }

    startY -= 15;
    drawLabelColonValue('Nomor', nomor || '', startY, centerX - 50,35,40);
    startY -= 30;

    // Kepada
    page.drawText('Kepada Yth.', { x: startX, y: startY, size: fontSize, font: fontRegular });
    startY -= 15;
    page.drawText(costumer.Sekolah, { x: startX , y: startY, size: fontSize, font: fontRegular });
    startY -= 15;
     page.drawText(costumer.Alamat, { x: startX , y: startY, size: fontSize, font: fontRegular });
    startY -= 15;
    page.drawText(`Di ${daerah}`, { x: startX, y: startY, size: fontSize, font: fontRegular });
    startY -= 25;

    // Define columns & rows for tabel
    const columns = [
      { header: 'No', key: 'no', width: 30 },
      { header: 'Nama Barang', key: 'namabarang', width: 200 },
      { header: 'Volume', key: 'volume', width: 60 },
      { header: 'Satuan', key: 'satuan', width: 60 },
      { header: 'Harga Satuan', key: 'harga', width: 80 },
      { header: 'Jumlah', key: 'jumlah', width: 60 },
    ];

    const rows = detail_invoice.map((item, idx) => ({
      no: (idx + 1).toString(),
      namabarang: item.Nama_Barang || '',
      volume: item.Volume ? item.Volume.toString() : '',
      satuan: item.Satuan ? item.Satuan.toString() : '',
      harga: item.Harga_Satuan ? formatRupiah(item.Harga_Satuan) : '',
      jumlah: item.Jumlah ? formatRupiah(item.Jumlah) : '',
    }));  
    
    const summaryRows = [
      { label: 'Jumlah', value: formatRupiah(invoice.Total) },
      { label: 'PPN (11%)', value: formatRupiah(invoice.PPN) },
      { label: 'Total', value: formatRupiah(invoice.Total_Harga) },
    ];
    // Draw table with summary
    startY = drawTableWithSummary(page, startX, startY, columns, rows, summaryRows, fontRegular, fontBold, fontSize);

     startY -= 30;
    page.drawText('Pembayaran Dapat Melalui :', { x: startX, y: startY, size: fontSize, font: fontRegular });
    startY -= 20;
    drawLabelColonValue('Bank', bank || '', startY, startX);
        startY -= 20;
    drawLabelColonValue('No Rekening', rekening || '', startY, startX);
        startY -= 20;
    drawLabelColonValue('Atas Nama', atasnama || '', startY, startX);
        startY -= 40;

    // Left signature
    page.drawText(`${daerah} ${tanggalFormatted}`, { x: startX, y: startY, size: fontSize, font: fontRegular });
    page.drawText(PT, { x: startX, y: startY - 15, size: fontSize, font: fontRegular });
    page.drawText(JabatanPT, { x: startX, y: startY - 100, size: fontSize, font: fontBold });
    page.drawText(Direktur, { x: startX, y: startY - 115, size: fontSize, font: fontRegular });

   
    const pdfBytes = await pdfDoc.save();
    const buffer = Buffer.from(pdfBytes);

    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="surat-serah-terima.pdf"',
      'Content-Length': buffer.length
    });
    res.end(buffer);

  } catch (err) {
    console.error('Gagal generate Surat Serah Terima PDF:', err.message);
    res.status(500).send(`Terjadi kesalahan: ${err.message}`);
  }
};

exports.generateBeritaAcaraPemeriksaan = async (req, res) => {
  const {
    nomor, invoiceId,tanggalsurat
  } = req.body;

  try {
    const [invoicerows] = await pool.query('SELECT * FROM Invoice WHERE id = ?', [invoiceId]);
    const invoice = invoicerows[0]; 
    if (!invoice) {
      return res.status(400).send('Invoice tidak valid atau belum dipilih');
    }
    const [costumerrows] = await pool.query('SELECT * FROM costumer WHERE id = ?', [invoice.Costumer_id]);
    const costumer = costumerrows[0]; 
    const [detail_invoicerows] = await pool.query('SELECT * FROM detail_invoice WHERE Invoice_id = ?', [invoiceId]);
    const detail_invoice = detail_invoicerows;
    const [pphprows] = await pool.query('SELECT * FROM PPHP WHERE Invoice_id = ?', [invoiceId]);
    const pphp = pphprows;
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    const page2 = pdfDoc.addPage([595, 842]); // A4

    // Use PT. Mastah letterhead
    const templatePath = path.join(__dirname, '..', 'public', costumer.kop_surat);
    if (!fs.existsSync(templatePath)) {
      return res.status(404).send("Template image not found.");
    }
    const templateImageBytes = fs.readFileSync(templatePath);

    // Embed kop_surat image
    const pngImage = await pdfDoc.embedPng(templateImageBytes);
    const scale = 595 / pngImage.width;
    const height = pngImage.height * scale;
    page.drawImage(pngImage, { x: 0, y: 842 - height, width: 595, height });

    // Fonts
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontSize = 11;

    // Starting points
    let startX = 70;
    let startY = 842 - height - 40;

// Title
    const titleText = 'BERITA ACARA PEMERIKSAAN PEMELIHARAAN SARANA DAN PRASARANA';
    const titleWidth = fontBold.widthOfTextAtSize(titleText, fontSize + 2);
    const centerX = (595 - titleWidth) / 2;
    
    page.drawText(titleText, { x: centerX, y: startY, size: fontSize + 2, font: fontBold });
    startY -=5;

    // Draw line under title
    page.drawLine({
      start: { x: centerX, y: startY },
      end: { x: centerX + titleWidth, y: startY },
      thickness: 1,
      color: rgb(0, 0, 0),
    });


    // Letter header details
    function drawLabelColonValue(label, value, y,x,colon = 100 , end = 120,width = 150) {
      page.drawText(label, { x: x, y, size: fontSize, font: fontRegular });
      page.drawText(':', { x: x + colon, y, size: fontSize, font: fontRegular });
      page.drawText(value, { x: x + end, y, size: fontSize, font: fontRegular });
    }
    function drawLabelColonValueJustify(page,label, value, y,x,colon = 100 , end = 120) {
      page.drawText(label, { x: x, y, size: fontSize, font: fontRegular });
      page.drawText(':', { x: x + colon, y, size: fontSize, font: fontRegular });
      page.drawParagraphJustify(page,value.trim(), x + end, y,width,18, fontRegular, fontSize);
    }

    startY -= 15;
    drawLabelColonValue('Nomor', nomor || '', startY, centerX + titleWidth / 3 ,35,40);
    startY -= 30;

    let yPosition = startY;
    
    const workDetails = `Pada hari ini ${formatTanggalLisan(tanggalsurat)}, Panitia Penerima Hasil Pekerjaan (PPHP) telah mengadakan pemeriksaan terhadap Kegiatan Belanja Barang dan Jasa oleh ${PT} yang beralamat di ${AlamatKantor2}. Dari hasil pemeriksaan Tim Pemeriksa barang berkesimpulan bahwa Belanja Barang dan Jasa cukup sesuai dengan pesanan dan dalam keadaan baik, dengan daftar rincian sebagai berikut  :`;
    yPosition = drawParagraphJustify(page, workDetails.trim(), startX, yPosition, 450, 18, fontRegular, fontSize);
    startY = yPosition
    
    // Table
    const columns = [
      { header: 'No', key: 'no', width: 30 },
      { header: 'Nama Barang', key: 'namabarang', width: 200 },
      { header: 'Jumlah', key: 'qty', width: 60 },
      { header: 'Satuan', key: 'satuan', width: 60 },
      { header: 'Kondisi', key: 'kondisi', width: 80 },
      
    ];
    
    const rows = detail_invoice.map((item, idx) => ({
      no: (idx + 1).toString(),
      namabarang: item.Nama_Barang || '',
      qty: item.Qty ? item.Qty.toString() : '',
      satuan: item.Satuan ? item.Satuan.toString() : '',
      kondisi: "" ,
    }));
    

    startY = drawTable(page, startX, startY, columns, rows,  fontRegular, fontSize);
    startY -= 15;
    drawLabelColonValue('Perhatian',  '', startY, startX,50);
    startX += 200;
    drawLabelColonValue('Catatan',  '', startY, startX,50);
    startX -= 200;
    startY -= 30;

    const add = `Barang yang terdapat baik, kami beri tanda V yang selanjutnya akan diserahkan oleh ${PT} kepada Pemegang Barang, sedangkan yang tidak baik telah kami beri tanda X.`;
    yPosition = drawParagraphJustify(page, add.trim(), startX, startY, 450, 18, fontRegular, fontSize);
   
     const penutup = `Demikian Berita Acara ini dibuat untuk dipergunakan sebagaimana mestinya.`;
    yPosition = drawParagraphJustify(page, penutup.trim(), startX, yPosition, 450, 18, fontRegular, fontSize ,'');
    startY   = yPosition;
    // Left signature
    page.drawText(PT, { x: startX, y: startY - 15, size: fontSize, font: fontRegular });
    page.drawText(JabatanPT, { x: startX, y: startY - 80, size: fontSize, font: fontRegular });
    page.drawText(Direktur, { x: startX, y: startY - 95, size: fontSize, font: fontRegular });
    startY -= 130;
    page.drawText('Mengetahui/Menyetujui', { x: startX, y: startY , size: fontSize, font: fontRegular });
    page.drawText(costumer.Jabatan, { x: startX, y: startY - 15, size: fontSize, font: fontRegular });
    page.drawText(costumer.Nama, { x: startX, y: startY - 80, size: fontSize, font: fontRegular });
    page.drawText(`NIP ${costumer.NIP}`, { x: startX, y: startY - 95, size: fontSize, font: fontRegular });
    startY   += 115 ;
    startX += 250;
    
    

    page.drawText(`PANITIA PENERIMA HASIL PEKERJAAN (PPHP)`, { x: startX, y: startY, size: fontSize, font: fontRegular });
    startY -= 15;
    pphp.forEach((col, i) => {
      page.drawText(`${i +1}. `, { x: startX, y: startY, size: fontSize, font: fontRegular });
      startX += 20;
      drawLabelColonValue('Nama',  col.Nama, startY, startX,35,40);
      startY -= 20;      
      page.drawText(col.NIP? `NIP. ${col.NIP}` : col.NIKKI? `NIKKI . ${col.NIKKI}` : '', { x: startX, y: startY, size: fontSize, font: fontRegular });
      startY += 20;
      drawLabelColonValue('| Tanda Tangan', '', startY, startX + 90,80,90);
      startY -= 60;
      startX -= 20;

  });



  //PAGE 2

    let startX2 = 70;
    let startY2 = 842 - 40;
    function drawLabelColonValue2( label, value, y,x,colon = 100 , end = 120,width = 150) {
      page2.drawText(label, { x: x, y, size: fontSize, font: fontRegular });
      page2.drawText(':', { x: x + colon, y, size: fontSize, font: fontRegular });
      page2.drawText(value, { x: x + end, y, size: fontSize, font: fontRegular });
    }
    drawLabelColonValue2('Lampiran','Berita Acara Pemeriksaan',startY2,centerX + titleWidth / 3  )
    startY2 -= 20;
    page2.drawText( 'Pemeliharaan Sarana dan Prasarana', { x: centerX + titleWidth / 3, y: startY2, size: fontSize, font: fontRegular });
    startY2 -= 20;
    drawLabelColonValue2('Nomor',nomor,startY2,centerX + titleWidth / 3  )
    startY2 -= 20;
    drawLabelColonValue2('Tanggal',formatTanggalIndonesia(tanggalsurat),startY2,centerX + titleWidth / 3  )
    startY2 -= 30;
  // Table
    const columns2 = [
      { header: 'No', key: 'no', width: 30 },
      { header: 'Kegiatan', key: 'kegiatan', width: 60 },
      { header: 'Nama Barang', key: 'namabarang', width: 200 },
      { header: 'Spesifikasi', key: 'Spesifikasi', width: 80 },
      { header: 'Qty', key: 'Qty', width: 60 },
      { header: 'Satuan', key: 'satuan', width: 60 },
      
    ];
    
    const rows2 = detail_invoice.map((item, idx) => ({
      no: (idx + 1).toString(),
      namabarang: item.Nama_Barang || '',
      kegiatan: item.Kegiatan ? item.Kegiatan.toString() : '',
      Spesifikasi: "" ,
      Qty: item.Qty ? item.Qty.toString() : '',
      satuan: item.Satuan ? item.Satuan.toString() : '',
    }));
    

    startY2 = drawTable(page2, startX2, startY2, columns2, rows2, fontRegular, fontSize);
    startY2 -= 30;

    // PPHP signatures
    pphp.forEach((col, i) => {
      page2.drawText(`${i +1}. `, { x: startX2, y: startY2, size: fontSize, font: fontRegular });
      startX2 += 20;
      drawLabelColonValue2('Nama', col.Nama, startY2, startX2, 35, 40);
      startY2 -= 20;      
      page2.drawText(col.NIP ? `NIP. ${col.NIP}` : col.NIKKI ? `NIKKI . ${col.NIKKI}` : '', { x: startX2, y: startY2, size: fontSize, font: fontRegular });
      startY2 += 20;
      page2.drawText(`${i +1}. (....................................)`, { x: startX2 + 300, y: startY2, size: fontSize, font: fontRegular });
      startY2 -= 60;
      startX2 -= 20;
    });

    // Company signature
    startY2 -= 30;
    page2.drawText(PT, { x: startX2, y: startY2, size: fontSize, font: fontRegular });
    page2.drawText(JabatanPT, { x: startX2, y: startY2 - 75, size: fontSize, font: fontRegular });
    page2.drawText(Direktur, { x: startX2, y: startY2 - 90, size: fontSize, font: fontRegular });
    const pdfBytes = await pdfDoc.save();
    const buffer = Buffer.from(pdfBytes);

    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="surat-berita-acara-pemeriksaaan.pdf"',
      'Content-Length': buffer.length
    });
    res.end(buffer);

  } catch (err) {
    console.error('Gagal generate Surat Berita Acara Pemeriksaan PDF:', err.message);
    res.status(500).send(`Terjadi kesalahan: ${err.message}`);
  }
};
// Previous code remains unchanged...

exports.generateBeritaAcaraSerahTerima = async (req, res) => {
  const {
    nomor, invoiceId, tanggalsurat,nama,jabatan
  } = req.body;

  try {
    const [invoicerows] = await pool.query('SELECT * FROM Invoice WHERE id = ?', [invoiceId]);
    const invoice = invoicerows[0]; 
    if (!invoice) {
      return res.status(400).send('Invoice tidak valid atau belum dipilih');
    }
    const [costumerrows] = await pool.query('SELECT * FROM costumer WHERE id = ?', [invoice.Costumer_id]);
    const costumer = costumerrows[0]; 
    const [detail_invoicerows] = await pool.query('SELECT * FROM detail_invoice WHERE Invoice_id = ?', [invoiceId]);
    const detail_invoice = detail_invoicerows;
    const [pphprows] = await pool.query('SELECT * FROM PPHP WHERE Invoice_id = ?', [invoiceId]);
    const pphp = pphprows;

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    const page2 = pdfDoc.addPage([595, 842]); // A4

    // Load customer letterhead
    const templatePath = path.join(__dirname, '..', 'public', costumer.kop_surat);
    if (!fs.existsSync(templatePath)) {
      return res.status(404).send("Template image not found.");
    }
    const templateImageBytes = fs.readFileSync(templatePath);

    // Embed kop_surat image
    const pngImage = await pdfDoc.embedPng(templateImageBytes);
    const scale = 595 / pngImage.width;
    const height = pngImage.height * scale;
    page.drawImage(pngImage, { x: 0, y: 842 - height, width: 595, height });

    // Fonts
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontSize = 11;

    // Starting points
    const startX = 70;
    let startY = 842 - height - 40;

    // Title
    const titleText = 'BERITA ACARA SERAH TERIMA PEMELIHARAAN SARANA DAN PRASARANA';
    const titleWidth = fontBold.widthOfTextAtSize(titleText, fontSize + 2);
    const centerX = (595 - titleWidth) / 2;
    
    page.drawText(titleText, { x: centerX, y: startY, size: fontSize + 2, font: fontBold });
    startY -= 5;

    // Draw line under title
    page.drawLine({
      start: { x: centerX, y: startY },
      end: { x: centerX + titleWidth, y: startY },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    // Letter header details
    function drawLabelColonValue(label, value, y, x, colon = 100, end = 120) {
      page.drawText(label, { x: x, y, size: fontSize, font: fontRegular });
      page.drawText(':', { x: x + colon, y, size: fontSize, font: fontRegular });
      page.drawText(value, { x: x + end, y, size: fontSize, font: fontRegular });
    }

    startY -= 15;
    drawLabelColonValue('Nomor', nomor || '', startY,centerX + titleWidth / 3, 35, 40);
    startY -= 30;

    // Content
    let yPosition = startY;
    const introText = `Pada hari ini ${formatTanggalLisan(tanggalsurat)}, kami yang bertanda tangan dibawah ini:`;
    yPosition = drawParagraphJustify(page, introText.trim(), startX, yPosition, 450, 18, fontRegular, fontSize);
    yPosition -= 20;

    // First party details
    drawLabelColonValue('Nama', nama, yPosition, startX + 20);
    yPosition -= 15;
    drawLabelColonValue('Jabatan', jabatan, yPosition, startX + 20);
   
    yPosition -= 30;



    // Main content
    const mainContent = `Telah menerima hasil pekerjaan dari ${PT}berupa hasil pekerjaan Belanja Barang dan Jasa dalam keadaan baik dengan jumlah cukup dengan rincian sebagai berikut :`;
    yPosition = drawParagraphJustify(page, mainContent.trim(), startX, yPosition, 450, 18, fontRegular, fontSize);
    yPosition -= 20;
    startY = yPosition;

     // Table
    const columns = [
      { header: 'No', key: 'no', width: 30 },
      { header: 'Nama Barang', key: 'namabarang', width: 200 },
      { header: 'Jumlah', key: 'qty', width: 60 },
      { header: 'Satuan', key: 'satuan', width: 60 },
      { header: 'Kondisi', key: 'kondisi', width: 80 },
      
    ];
    
    const rows = detail_invoice.map((item, idx) => ({
      no: (idx + 1).toString(),
      namabarang: item.Nama_Barang || '',
      qty: item.Qty ? item.Qty.toString() : '',
      satuan: item.Satuan ? item.Satuan.toString() : '',
      kondisi: "" ,
    }));
    

    startY = drawTable(page, startX, startY, columns, rows,  fontRegular, fontSize);
    yPosition = startY -20;
    // Closing paragraph
    const closingText =   `Demikian Berita Acara Penerimaan Barang ini dibuat untuk dipergunakan sebagaimana mestinya.`;
    yPosition = drawParagraphJustify(page, closingText.trim(), startX, yPosition, 450, 18, fontRegular, fontSize);
    yPosition -= 30;
    // Signatures
    // Left signature (PIHAK KEDUA)
    page.drawText('Yang Menyerahkan', { x: startX, y: yPosition, size: fontSize, font: fontBold });
    page.drawText(PT, { x: startX, y: yPosition - 15, size: fontSize, font: fontRegular });
    page.drawText(JabatanPT, { x: startX, y: yPosition - 80, size: fontSize, font: fontRegular });
    page.drawText(Direktur, { x: startX, y: yPosition - 95, size: fontSize, font: fontRegular });

    // Right signature (PIHAK PERTAMA)
    page.drawText('Yang Menerima', { x: startX + 300, y: yPosition, size: fontSize, font: fontBold });
    page.drawText(costumer.Nama, { x: startX + 300, y: yPosition - 80, size: fontSize, font: fontRegular });
    page.drawText(`NIP. ${costumer.NIP}`, { x: startX + 300, y: yPosition - 95, size: fontSize, font: fontRegular });

    yPosition -= 120;
    page.drawText('Mengetahui', { x: centerX + titleWidth / 3 , y: yPosition, size: fontSize, font: fontBold });
    page.drawText(costumer.Jabatan, { x: centerX + titleWidth / 3 , y: yPosition - 15, size: fontSize, font: fontRegular });
    page.drawText(costumer.Nama, { x: centerX + titleWidth / 3 , y: yPosition - 80, size: fontSize, font: fontRegular });
    page.drawText(`NIP. ${costumer.NIP}`, { x: centerX + titleWidth / 3 , y: yPosition - 95, size: fontSize, font: fontRegular });


    

  //PAGE 2

    let startX2 = 70;
    let startY2 = 842 - 40;
    function drawLabelColonValue2( label, value, y,x,colon = 100 , end = 120,width = 150) {
      page2.drawText(label, { x: x, y, size: fontSize, font: fontRegular });
      page2.drawText(':', { x: x + colon, y, size: fontSize, font: fontRegular });
      page2.drawText(value, { x: x + end, y, size: fontSize, font: fontRegular });
    }
    
    drawLabelColonValue2('Lampiran','Berita Acara Serah Terima',startY2,centerX + titleWidth / 3  )
    startY2 -= 20;
    page2.drawText( 'Pemeliharaan Sarana dan Prasarana', { x: centerX + titleWidth / 3, y: startY2, size: fontSize, font: fontRegular });
    startY2 -= 20;
    drawLabelColonValue2('Nomor',nomor,startY2,centerX + titleWidth / 3  )
    startY2 -= 20;
    drawLabelColonValue2('Tanggal',formatTanggalIndonesia(tanggalsurat),startY2,centerX + titleWidth / 3  )
    startY2 -= 30;
  // Table
    const columns2 = [
      { header: 'No', key: 'no', width: 30 },
      { header: 'Kegiatan', key: 'kegiatan', width: 60 },
      { header: 'Nama Barang', key: 'namabarang', width: 200 },
      { header: 'Spesifikasi', key: 'Spesifikasi', width: 80 },
      { header: 'Qty', key: 'Qty', width: 60 },
      { header: 'Satuan', key: 'satuan', width: 60 },
      
    ];
    
    const rows2 = detail_invoice.map((item, idx) => ({
      no: (idx + 1).toString(),
      namabarang: item.Nama_Barang || '',
      kegiatan: item.Kegiatan ? item.Kegiatan.toString() : '',
      Spesifikasi: "" ,
      Qty: item.Qty ? item.Qty.toString() : '',
      satuan: item.Satuan ? item.Satuan.toString() : '',
    }));
    

    startY2 = drawTable(page2, startX2, startY2, columns2, rows2, fontRegular, fontSize);
    startY2 -= 30;

  

    page2.drawText('Pihak Kedua', { x: startX2, y: startY2, size: fontSize, font: fontRegular });
    page2.drawText('Pejabat Pelaksana Teknis Kegiatan', { x: startX2, y: startY2 -15, size: fontSize, font: fontRegular });
    page2.drawText(costumer.Nama, { x: startX2, y: startY2 - 90, size: fontSize, font: fontRegular });
    page2.drawText(costumer.NIP, { x: startX2, y: startY2 - 105, size: fontSize, font: fontRegular });

    startX2 += 300;
    page2.drawText('Pihak Pertama', { x: startX2, y: startY2, size: fontSize, font: fontRegular });
    page2.drawText(PT, { x: startX2, y: startY2-15, size: fontSize, font: fontRegular });
    page2.drawText(JabatanPT, { x: startX2, y: startY2 - 90, size: fontSize, font: fontRegular });
    page2.drawText(Direktur, { x: startX2, y: startY2 - 105, size: fontSize, font: fontRegular });

    const pdfBytes = await pdfDoc.save();
    const buffer = Buffer.from(pdfBytes);

    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="berita-acara-serah-terima.pdf"',
      'Content-Length': buffer.length
    });
    res.end(buffer);

  } catch (err) {
    console.error('Gagal generate Berita Acara Serah Terima PDF:', err.message);
    res.status(500).send(`Terjadi kesalahan: ${err.message}`);
  }
};
