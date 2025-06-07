const pool = require('../db');

exports.index = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Costumer');
    res.render('costumer/index', { costumers: rows ,title : "Costumers"});
  } catch (err) {
    res.status(500).send(err.message);
  }
};

exports.new = (req, res) => {
  res.render('costumer/new',{title : "Costumers"});
};

exports.create = async (req, res) => {
  const { Jabatan, Nama, NIP, Sekolah, Alamat } = req.body;
  let kop_surat_path = null;
  if (req.file) {
    kop_surat_path = '/uploads/' + req.file.filename;
  }
  try {
    await pool.query(
      'INSERT INTO Costumer (kop_surat, Jabatan, Nama, NIP, Sekolah, Alamat) VALUES (?, ?, ?, ?, ?, ?)',
      [kop_surat_path, Jabatan, Nama, NIP, Sekolah, Alamat]
    );
    res.redirect('/costumer');
  } catch (err) {
    res.status(500).send(err.message);
  }
};

exports.edit = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT * FROM Costumer WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).send('Costumer not found');
    }
    res.render('costumer/edit', { costumer: rows[0] ,title : "Costumers"});
  } catch (err) {
    res.status(500).send(err.message);
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { Jabatan, Nama, NIP, Sekolah, Alamat } = req.body;
  let kop_surat_path = null;
  if (req.file) {
    kop_surat_path = '/uploads/' + req.file.filename;
  }
  try {
    if (kop_surat_path) {
      await pool.query(
        'UPDATE Costumer SET kop_surat = ?, Jabatan = ?, Nama = ?, NIP = ?, Sekolah = ?, Alamat = ? WHERE id = ?',
        [kop_surat_path, Jabatan, Nama, NIP, Sekolah, Alamat, id]
      );
    } else {
      await pool.query(
        'UPDATE Costumer SET Jabatan = ?, Nama = ?, NIP = ?, Sekolah = ?, Alamat = ? WHERE id = ?',
        [Jabatan, Nama, NIP, Sekolah, Alamat, id]
      );
    }
    res.redirect('/costumer');
  } catch (err) {
    res.status(500).send(err.message);
  }
};

exports.delete = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM Costumer WHERE id = ?', [id]);
    res.redirect('/costumer');
  } catch (err) {
    res.status(500).send(err.message);
  }
};

exports.detail = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT * FROM Costumer WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).send('Costumer not found');
    }
    res.render('costumer/detail', { costumer: rows[0], title: "Costumer Detail" });
  } catch (err) {
    res.status(500).send(err.message);
  }
};
