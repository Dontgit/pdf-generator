const pool = require('../db');

async function updateInvoiceTotals(invoice_id) {
  try {
    const [rows] = await pool.query(
      'SELECT SUM(Jumlah) as total FROM Detail_Invoice WHERE Invoice_id = ?',
      [invoice_id]
    );
    const total = Number(rows[0].total) || 0;
    const ppn = total * 0.12;
    const total_harga = total + ppn;
   
    await pool.query(
      'UPDATE Invoice SET Total = ?, PPN = ?, Total_Harga = ? WHERE id = ?',
      [total, ppn, total_harga, invoice_id]
    );
  } catch (err) {
    console.error('Error updating invoice totals:', err);
  }
}

exports.index = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Detail_Invoice');
    res.render('detail_invoice/index', { details: rows ,title:"Invoice"});
  } catch (err) {
    res.status(500).send(err.message);
  }
};

exports.new = async (req, res) => {
  try {
    // Get invoices for dropdown
    const [invoices] = await pool.query('SELECT id, Kegiatan FROM Invoice');
    res.render('detail_invoice/new', { invoices ,title:"Invoice"});
  } catch (err) {
    res.status(500).send(err.message);
  }
};

exports.create = async (req, res) => {
  const { Nama_Barang, Volume, Qty, Satuan, Harga_Satuan, Jumlah, Kondisi, Invoice_id } = req.body;
  try {
    await pool.query(
      'INSERT INTO Detail_Invoice (Nama_Barang, Volume, Qty, Satuan, Harga_Satuan, Jumlah, Kondisi, Invoice_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [Nama_Barang, Volume, Qty, Satuan, Harga_Satuan, Jumlah, Kondisi, Invoice_id]
    );
    await updateInvoiceTotals(Invoice_id);
    res.redirect('/detail_invoice');
  } catch (err) {
    res.status(500).send(err.message);
  }
};

exports.edit = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT * FROM Detail_Invoice WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).send('Detail Invoice not found');
    }
    const [invoices] = await pool.query('SELECT id, Kegiatan FROM Invoice');
    res.render('detail_invoice/edit', { detail: rows[0], invoices ,title:"Invoice"});
  } catch (err) {
    res.status(500).send(err.message);
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { Nama_Barang, Volume, Qty, Satuan, Harga_Satuan, Jumlah, Kondisi, Invoice_id } = req.body;
  try {
    await pool.query(
      'UPDATE Detail_Invoice SET Nama_Barang = ?, Volume = ?, Qty = ?, Satuan = ?, Harga_Satuan = ?, Jumlah = ?, Kondisi = ?, Invoice_id = ? WHERE id = ?',
      [Nama_Barang, Volume, Qty, Satuan, Harga_Satuan, Jumlah, Kondisi, Invoice_id, id]
    );
    await updateInvoiceTotals(Invoice_id);
    res.redirect('/detail_invoice');
  } catch (err) {
    res.status(500).send(err.message);
  }
};

exports.delete = async (req, res) => {
  const { id } = req.params;
  try {
    // Get invoice_id before delete to update totals
    const [rows] = await pool.query('SELECT Invoice_id FROM Detail_Invoice WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).send('Detail Invoice not found');
    }
    const invoice_id = rows[0].Invoice_id;
    await pool.query('DELETE FROM Detail_Invoice WHERE id = ?', [id]);
    await updateInvoiceTotals(invoice_id);
    res.redirect('/detail_invoice');
  } catch (err) {
    res.status(500).send(err.message);
  }
};

// API methods for modal CRUD

exports.apiGetByInvoiceId = async (req, res) => {
  const { invoice_id } = req.params;
  try {
    const [rows] = await pool.query('SELECT * FROM Detail_Invoice WHERE Invoice_id = ?', [invoice_id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.apiCreate = async (req, res) => {
console.log('Body API Create Detail:', req.body);
  const { Nama_Barang, Volume, Qty, Satuan, Harga_Satuan, Jumlah, Kondisi, Invoice_id } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO Detail_Invoice (Nama_Barang, Volume, Qty, Satuan, Harga_Satuan, Jumlah, Kondisi, Invoice_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [Nama_Barang, Volume, Qty, Satuan, Harga_Satuan, Jumlah, Kondisi, Invoice_id]
    );
    await updateInvoiceTotals(Invoice_id);
    res.json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.apiUpdate = async (req, res) => {
  const { id } = req.params;
  const { Nama_Barang, Volume, Qty, Satuan, Harga_Satuan, Jumlah, Kondisi, Invoice_id } = req.body;
  try {
    await pool.query(
      'UPDATE Detail_Invoice SET Nama_Barang = ?, Volume = ?, Qty = ?, Satuan = ?, Harga_Satuan = ?, Jumlah = ?, Kondisi = ?, Invoice_id = ? WHERE id = ?',
      [Nama_Barang, Volume, Qty, Satuan, Harga_Satuan, Jumlah, Kondisi, Invoice_id, id]
    );
    await updateInvoiceTotals(Invoice_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.apiDelete = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT Invoice_id FROM Detail_Invoice WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Detail Invoice not found' });
    }
    const invoice_id = rows[0].Invoice_id;
    await pool.query('DELETE FROM Detail_Invoice WHERE id = ?', [id]);
    await updateInvoiceTotals(invoice_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
