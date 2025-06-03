const express = require('express');
const router = express.Router();
const costumerController = require('../controllers/costumerController');

// Multer setup
const multer = require('multer');
const path = require('path');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../public/uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});
const upload = multer({ storage: storage });

// List all costumers
router.get('/', costumerController.index);

// Show form to create new costumer
router.get('/new', costumerController.new);

// Create new costumer with file upload
router.post('/', upload.single('kop_surat'), costumerController.create);

// Show form to edit costumer
router.get('/:id/edit', costumerController.edit);

// Update costumer with file upload
router.post('/:id', upload.single('kop_surat'), costumerController.update);

// Delete costumer
router.post('/:id/delete', costumerController.delete);

module.exports = router;
