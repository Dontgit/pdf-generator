const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts } = require('pdf-lib');
router.get('/', invoiceController.index);

// Show form to create new invoice
router.get('/new', invoiceController.new);

// Create new invoice
router.post('/', invoiceController.create);

// Show form to edit invoice
router.get('/:id/edit', invoiceController.edit);

// Update invoice
router.post('/:id', invoiceController.update);

// Delete invoice
router.post('/:id/delete', invoiceController.delete);




router.get('/minimal', async (req, res) => {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    page.drawText('Hello, this is a minimal PDF test!', {
      x: 50,
      y: 700,
      size: 14,
      font: font,
    });

    const pdfBytes = await pdfDoc.save();
    const buffer = Buffer.from(pdfBytes);

    res.writeHead(200, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': 'attachment; filename="test.pdf"',
    'Content-Length': buffer.length
  });
  res.end(buffer);


  } catch (err) {
    console.error('PDF error:', err);
    res.status(500).send('Gagal membuat PDF.');
  }
});
module.exports = router;
