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




module.exports = router;
