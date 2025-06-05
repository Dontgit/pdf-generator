const express = require('express');
const router = express.Router();
const pool = require('../db');
const generateController = require('../controllers/generateController');


const generateMenus = [
  { key: 'SuratHargaPenawaran', label: 'Generate Surat Harga Penawaran (s)' },
  { key: 'BelanjaBarangJasaBOP', label: 'Generate Belanja Barang dan Jasa BOP(s)' },
  { key: 'sph', label: 'Generate SURAT PENAWARAN HARGA(p)' },
  { key: 'NegoisasiHargaPenawaran', label: 'Generate Negoisasi Harga Penawaran (s)' },
  { key: 'DaftarHadir', label: 'Generate Daftar Hadir' },
  { key: 'PersetujuanHasilNegosiasi', label: 'Generate Persetujuan Hasil Negosiasi' },
  { key: 'SPK', label: 'Generate SPK' },
  { key: 'SPKMP', label: 'Generate SPKMP' },
  { key: 'SuratJalan', label: 'Generate Surat Jalan' },
  { key: 'SuratSerahTerima', label: 'Generate Surat Serah Terima' },
  { key: 'Faktur', label: 'Generate Faktur' },
  { key: 'BeritaAcaraPemeriksaan', label: 'Generate Berita Acara Pemeriksaan' },
  { key: 'BeritaAcaraSerahTerima', label: 'Generate Berita Acara Serah Terima' },
  { key: 'BeritaAcaraPenerimaanPemeliharaan', label: 'Generate BERITA ACARA PENERIMAAN PEMELIHARAAN' },
  { key: 'Kwitansi', label: 'Generate Kwitansi' },
  { key: 'DokumenPerencanaan', label: 'Generate Dokumen Perencanaan' },
  { key: 'HPS', label: 'Generate HPS' },
  { key: 'HasilPerbandingan', label: 'Generate Hasil Perbandingan' },
  { key: 'HasilNegosiasi', label: 'Generate Hasil Negosiasi' },
  { key: 'SuratHPP', label: 'Generate Surat HPP' },
  { key: 'BeritaAcaraSerahTerimaPekerjaan', label: 'Generate BERITA ACARA SERAH TERIMA PEKERJAAN' },
];

// Map key -> path
const generateFormPaths = {};
generateMenus.forEach(menu => {
  const formName = menu.key.charAt(0).toLowerCase() + menu.key.slice(1);
  generateFormPaths[menu.key] = `generate/forms/${formName}`;
});

// GET halaman utama
router.get('/', async (req, res) => {
  try {
    const [invoices] = await pool.query('SELECT * FROM Invoice');
    res.render('generate/index', { invoices, generateMenus, title: "Generate Dokumen" });
  } catch (err) {
    res.status(500).send(`Gagal mengambil data invoice: ${err.message}`);
  }
});

// GET halaman generate form berdasarkan key
router.get('/:generateKey', async (req, res) => {
  const { generateKey } = req.params;
  const { invoiceId } = req.query;

  try {
    const [invoices] = await pool.query('SELECT * FROM Invoice');
    const invoice = invoices.find(inv => inv.id == invoiceId);

    if (!invoice) {
      return res.status(400).send('Invoice tidak valid atau belum dipilih');
    }

    const formPath = generateFormPaths[generateKey];
    if (!formPath) {
      return res.status(404).send('Generate menu tidak ditemukan');
    }

    return res.render(formPath, { invoiceId, title : "Form Generate" });

  } catch (err) {
    res.status(500).send(`Terjadi kesalahan: ${err.message}`);
  }
});

router.post('/pdf/shp', generateController.generateSHP);
router.post('/pdf/sph', generateController.generateSPH);
router.post('/pdf/bop', generateController.generateBOPSurat);
router.post('/pdf/undangan-negosiasi', generateController.generateUndanganNegosiasi);
router.post('/pdf/daftar-hadir', generateController.generateDaftarHadir);
router.post('/pdf/persetujuan-negosiasi', generateController.generatePersetujuanNegosiasi);
router.post('/pdf/surat-kesanggupan', generateController.generateSuratKesanggupanMelaksanakan);
router.post('/pdf/surat-jalan', generateController.generateSuratJalan);
router.post('/pdf/surat-serah-terima', generateController.generateSuratSerahTerima);
router.post('/pdf/spk', generateController.generateSPK);
router.post('/pdf/faktur', generateController.generateFaktur);
router.post('/pdf/kwitansi', generateController.generateKwitansi);
router.post('/pdf/perencanaan', generateController.generateDokumenPerencanaan);
router.post('/pdf/hps', generateController.generateHPS);
router.post('/pdf/berita-acara-pemeriksaan', generateController.generateBeritaAcaraPemeriksaan);
router.post('/pdf/berita-acara-serah-terima', generateController.generateBeritaAcaraSerahTerima);
router.post('/pdf/berita-acara-penerimaan', generateController.generateBeritaAcaraPenerimaan);


module.exports = router;
