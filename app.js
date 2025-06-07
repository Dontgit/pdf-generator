const express = require('express');
const path = require('path');
const multer = require('multer'); // Added multer import
const app = express();
const db = require('./db');
const bodyParser = require('body-parser');

// Multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'public/uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ storage: storage });
app.use(bodyParser.urlencoded({ extended: true }));
// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Set EJS as templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files (if needed)
app.use(express.static(path.join(__dirname, 'public')));

// Routes placeholder
app.get('/', (req, res) => {
  res.redirect('/costumer');
});
app.use('/pdf', express.static(path.join(__dirname, 'public/pdf')));

// Import routes
const costumerRoutes = require('./routes/costumer');
const invoiceRoutes = require('./routes/invoice');
const detailInvoiceRoutes = require('./routes/detail_invoice');
const pphpRoutes = require('./routes/pphp');
const generateRoutes = require('./routes/generate');

// Make upload middleware available to routes
app.use((req, res, next) => {
  req.upload = upload;
  next();
});

app.use('/costumer', costumerRoutes);
app.use('/invoice', invoiceRoutes);
app.use('/detail_invoice', detailInvoiceRoutes);
app.use('/pphp', pphpRoutes);
app.use('/generate', generateRoutes);
app.use('/generate/pdf', (req, res, next) => {
  res.locals.layout = false; 
  next();
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
