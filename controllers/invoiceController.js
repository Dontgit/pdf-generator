const pool = require('../db');

exports.index = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Invoice');
    res.render('invoice/index', { invoices: rows,title:"Invoice" });
  } catch (err) {
    res.status(500).send(err.message);
  }
};

exports.new = async (req, res) => {
  const [costumers] = await pool.query('SELECT id, Nama FROM Costumer');
  res.render('invoice/new' ,{costumers,title:"Invoice"});
};

exports.create = async (req, res) => {
  const { Kegiatan, Sekolah, Costumer_id } = req.body;
  try {
    // Default totals to 0 on create
    await pool.query(
      'INSERT INTO Invoice (Kegiatan, Sekolah, Total, PPN, Total_Harga, Costumer_id) VALUES (?, ?, 0, 0, 0, ?)',
      [Kegiatan, Sekolah, Costumer_id]
    );
    res.redirect('/invoice');
  } catch (err) {
    res.status(500).send(err.message);
  }
};

exports.edit = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT * FROM Invoice WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).send('Invoice not found');
    }
    // Also get costumers for dropdown
    const [costumers] = await pool.query('SELECT id, Nama FROM Costumer');
    res.render('invoice/edit', { invoice: rows[0], costumers ,title:"Invoice"});
  } catch (err) {
    res.status(500).send(err.message);
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { Kegiatan, Sekolah, Total, PPN, Total_Harga, Costumer_id } = req.body;
  try {
    await pool.query(
      'UPDATE Invoice SET Kegiatan = ?, Sekolah = ?, Total = ?, PPN = ?, Total_Harga = ?, Costumer_id = ? WHERE id = ?',
      [Kegiatan, Sekolah, Total, PPN, Total_Harga, Costumer_id, id]
    );
    res.redirect('/invoice');
  } catch (err) {
    res.status(500).send(err.message);
  }
};

exports.delete = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM Invoice WHERE id = ?', [id]);
    res.redirect('/invoice');
  } catch (err) {
    res.status(500).send(err.message);
  }
};
