const pool = require('../db');
const path = require('path');
const fs = require('fs');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

const bulan = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const PT = "PT. Mastah Digital Teknologi";
const JabatanPT = "Direktur";
const Direktur = "Rochim Ramadhani Chiefto Irawan, S. Kom";
const sekarang = new Date();

const tanggal = sekarang.getDate().toString().padStart(2, '0'); // 2 digit, misal "03"
const namaBulan = bulan[sekarang.getMonth()]; // index bulan 0-based
const tahun = sekarang.getFullYear();

const tanggalFormatted = `${tanggal} ${namaBulan} ${tahun}`;
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
// Summary rows (colspan label di kolom ke-2 sampai ke-5)
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
function drawParagraphJustify(page, text, x, y, maxWidth, lineHeight, font, fontSize, indentPx = 0) {

  const indent = '    '; // 4 spasi misalnya
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
      drawJustifiedLine(page, line, currentY === y ? x + indentPx : x, currentY, maxWidth, font, fontSize);
      line = words[i];
      currentY -= lineHeight;
    } else {
      line = testLine;
    }
  }

  // Draw last line (rata kiri biasa)
  if (line) {
    page.drawText(line, { x: currentY === y ? x + indentPx : x, y: currentY, size: fontSize, font });
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
  const rowHeightAdjusted = maxLines * (fontSize + 4); // tinggi baris disesuaikan
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

const tableHeight = rowHeight + rowHeights.reduce((a, b) => a + b, 0); // ✅ Ini yang benar

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
  let yPointer = startY; // mulai dari bawah header
    page.drawLine({ // garis setelah header
      start: { x: startX, y: yPointer },
      end: { x: startX + tableWidth, y: yPointer },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    yPointer = startY - rowHeight; // mulai dari bawah header
    page.drawLine({ // garis setelah header
      start: { x: startX, y: yPointer },
      end: { x: startX + tableWidth, y: yPointer },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    yPointer -= 5;
for (let i = 0; i < rowHeights.length; i++) {
  yPointer -= rowHeights[i] ;
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


    // // Paragraf Penutup
    // const penutup = `Demikian permohonan ini kami sampaikan, atas perhatian dan kerja samanya kami ucapkan terima kasih.`;
    // bodyY = drawParagraphJustify(page, penutup, startX, bodyY - 10, 495, 18, fontRegular, fontSize);

    // // Tanda Tangan
    
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

  // Baris berikutnya (isi 'kepada' dari form) bisa multiline
  

  // Tulis "Di tempat" dengan font reguler
  page.drawText('Di Padang', { x: startX, y: startY, size: fontSize, font: fontBold });
  let yPosition = startY - 40; // beri jarak setelah bagian kepada yth
  var isi_surat = "Sehubungan dengan pelaksanaan Operasional "  + costumer.Sekolah +" Tahun Anggaran 2025 untuk Belanja Barang dan Jasa BOS/BOP dari dana BOS/BOP sekolah untuk "+ tujuanBelanja+", kami membutuhkan :";
  const paragraphs = isi_surat.split('\n\n'); // pisah paragraf dengan double line break
  paragraphs.forEach(paragraph => {
    yPosition = drawParagraphJustify(page, paragraph.trim(), 50, yPosition, 495, 18, fontRegular, fontSize);
    yPosition -= 18; // spasi antar paragraf
  });
  
  
      // // Invoice info from DB
      // drawLabelColonValue('Invoice ID', invoice.id.toString(), startY);
      // startY -= 15;
      // drawLabelColonValue('Tanggal Invoice', invoice.tanggal || '', startY);
      // startY -= 15;
      // drawLabelColonValue('Customer', costumer.nama || '', startY);
      // startY -= 30;
 
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
    // startY -= 15;
    // page.drawText(costumer.Jabatan, { x: startX, y: startY, size: fontSize, font: fontRegular });
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
    page.drawText(`${Direktur}`, { x: startX, y: yPosition - 120, size: fontSize, font: fontBold });

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
