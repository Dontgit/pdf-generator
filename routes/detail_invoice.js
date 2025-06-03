const express = require('express');
const router = express.Router();
const detailInvoiceController = require('../controllers/detailInvoiceController');

// // List all detail invoices
// router.get('/', detailInvoiceController.index);

// // Show form to create new detail invoice
// router.get('/new', detailInvoiceController.new);

// // Create new detail invoice
// router.post('/', detailInvoiceController.create);

// // Show form to edit detail invoice
// router.get('/:id/edit', detailInvoiceController.edit);

// // Update detail invoice
// router.post('/:id', detailInvoiceController.update);

// // Delete detail invoice
// router.post('/:id/delete', detailInvoiceController.delete);

// API routes for modal CRUD
router.get('/api/:invoice_id', detailInvoiceController.apiGetByInvoiceId);
router.post('/api', detailInvoiceController.apiCreate);
router.put('/api/:id', detailInvoiceController.apiUpdate);
router.delete('/api/:id', detailInvoiceController.apiDelete);

module.exports = router;
