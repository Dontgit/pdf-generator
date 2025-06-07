const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts } = require('pdf-lib');
router.get('/', invoiceController.index);
const pool = require('../db');


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
router.get('/invoice-pdf/:id', async (req, res) => {
  const { id } = req.params; // Ini adalah invoice_id

  try {
    // 1. Ambil data utama dari tabel Invoice untuk mendapatkan info seperti 'Kegiatan'
    const [mainInvoiceRows] = await pool.query('SELECT * FROM Invoice WHERE id = ?', [id]);
    
    // 2. Ambil data path PDF dari tabel pdf
    const [pdfRows] = await pool.query('SELECT * FROM pdf WHERE invoice_id = ?', [id]);

    // Periksa apakah data ditemukan
    if (mainInvoiceRows.length === 0 || pdfRows.length === 0) {
      return res.status(404).send('Invoice or PDF data not found');
    }

    const mainInvoiceData = mainInvoiceRows[0]; // Berisi id, Kegiatan, Sekolah, dll.
    const pdfLinkData = pdfRows[0]; // Berisi BAP, BOP, HPS, dll.

    // 3. Render halaman EJS dengan kedua set data menggunakan nama variabel yang benar
    res.render('invoice/invoice-pdf', {
      invoice: mainInvoiceData,   // Kirim data invoice utama sebagai 'invoice'
      pdfData: pdfLinkData,       // Kirim data link PDF sebagai 'pdfData'
      title: `Dokumen untuk Invoice - ${mainInvoiceData.Kegiatan}`
    });

  } catch (err) {
    console.error("Error fetching data for PDF page:", err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
