const pool = require('../db');

exports.index = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM PPHP');
    res.render('pphp/index', { pphps: rows ,title: "pphp"});
  } catch (err) {
    res.status(500).send(err.message);
  }
};

exports.new = async (req, res) => {
  try {
    // Get invoices for dropdown
    const [invoices] = await pool.query('SELECT id, Kegiatan FROM Invoice');
    res.render('pphp/new', { invoices,title: "pphp" });
  } catch (err) {
    res.status(500).send(err.message);
  }
};

exports.create = async (req, res) => {
  const { Nama, NIP, NIKKI, Invoice_id } = req.body;
  try {
    await pool.query(
      'INSERT INTO PPHP (Nama, NIP, NIKKI, Invoice_id) VALUES (?, ?, ?, ?)',
      [Nama, NIP, NIKKI, Invoice_id]
    );
    res.redirect('/pphp');
  } catch (err) {
    res.status(500).send(err.message);
  }
};

exports.edit = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT * FROM PPHP WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).send('PPHP not found');
    }
    const [invoices] = await pool.query('SELECT id, Kegiatan FROM Invoice');
    res.render('pphp/edit', { pphp: rows[0], invoices, title: "pphp" });
  } catch (err) {
    res.status(500).send(err.message);
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { Nama, NIP, NIKKI, Invoice_id } = req.body;
  try {
    await pool.query(
      'UPDATE PPHP SET Nama = ?, NIP = ?, NIKKI = ?, Invoice_id = ? WHERE id = ?',
      [Nama, NIP, NIKKI, Invoice_id, id]
    );
    res.redirect('/pphp');
  } catch (err) {
    res.status(500).send(err.message);
  }
};

exports.delete = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM PPHP WHERE id = ?', [id]);
    res.redirect('/pphp');
  } catch (err) {
    res.status(500).send(err.message);
  }
};
