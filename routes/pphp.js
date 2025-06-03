const express = require('express');
const router = express.Router();
const pphpController = require('../controllers/pphpController');

// List all pphp
router.get('/', pphpController.index);

// Show form to create new pphp
router.get('/new', pphpController.new);

// Create new pphp
router.post('/', pphpController.create);

// Show form to edit pphp
router.get('/:id/edit', pphpController.edit);

// Update pphp
router.post('/:id', pphpController.update);

// Delete pphp
router.post('/:id/delete', pphpController.delete);

module.exports = router;
