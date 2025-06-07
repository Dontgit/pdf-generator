
const pool = require('../db');

exports.index = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, Kegiatan, Sekolah, Total, PPN, Total_Harga, Costumer_id, Total_sn, PPN_sn, Total_Harga_sn FROM Invoice');
    res.render('invoice/index', { invoices: rows, title: "Invoice" });
  } catch (err) {
    res.status(500).send(err.message);
  }
};

exports.new = async (req, res) => {
  const [costumers] = await pool.query('SELECT id, Nama FROM Costumer');
  res.render('invoice/new', { costumers, title: "Invoice" });
};

exports.create = async (req, res) => {
  // Melakukan dekonstruksi body dari request dan memberikan nilai default untuk menghindari undefined
  const { 
    Kegiatan, 
    Sekolah, 
    Costumer_id, 
    Total_sn = 0, 
    PPN_sn = 0, 
    Total_Harga_sn = 0 
  } = req.body;

  // Mendapatkan koneksi dari pool untuk memulai transaksi
  let connection;
  try {
    connection = await pool.getConnection();
    
    // Memulai transaksi
    await connection.beginTransaction();

    // Query pertama: Menyisipkan data ke dalam tabel Invoice
    // Menggunakan [results] untuk mendapatkan hasil query dari mysql2/mysql
    const [invoiceResult] = await connection.query(
      'INSERT INTO Invoice (Kegiatan, Sekolah, Total, PPN, Total_Harga, Costumer_id, Total_sn, PPN_sn, Total_Harga_sn) VALUES (?, ?, 0, 0, 0, ?, ?, ?, ?)',
      [Kegiatan, Sekolah, Costumer_id, Total_sn, PPN_sn, Total_Harga_sn]
    );

    // Mengambil ID dari invoice yang baru saja dibuat
    const newInvoiceId = invoiceResult.insertId;
    
    // Memeriksa apakah insertId berhasil didapatkan
    if (!newInvoiceId) {
        throw new Error("Gagal membuat invoice, tidak ada ID yang dikembalikan.");
    }

    // Query kedua: Menyisipkan ID invoice ke dalam tabel pdf
    await connection.query(
      'INSERT INTO pdf (invoice_id) VALUES (?)',
      [newInvoiceId]
    );

    // Jika semua query berhasil, commit transaksi
    await connection.commit();

    // Mengalihkan pengguna ke halaman invoice setelah berhasil
    res.redirect('/invoice');

  } catch (err) {
    // Jika terjadi error, rollback semua perubahan dalam transaksi
    if (connection) {
      await connection.rollback();
    }
    
    // Mencatat error ke konsol untuk debugging
    console.error("Error saat membuat invoice:", err);
    
    // Mengirim response error ke client
    res.status(500).send("Terjadi kesalahan pada server: " + err.message);

  } finally {
    // Selalu lepaskan koneksi kembali ke pool setelah selesai
    if (connection) {
      connection.release();
    }
  }
};

exports.edit = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT id, Kegiatan, Sekolah, Total, PPN, Total_Harga, Costumer_id, Total_sn, PPN_sn, Total_Harga_sn FROM Invoice WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).send('Invoice not found');
    }
    const [costumers] = await pool.query('SELECT id, Nama FROM Costumer');
    res.render('invoice/edit', { invoice: rows[0], costumers, title: "Invoice" });
  } catch (err) {
    res.status(500).send(err.message);
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { Kegiatan, Sekolah, Total, PPN, Total_Harga, Costumer_id, Total_sn = 0, PPN_sn = 0, Total_Harga_sn = 0 } = req.body;
  try {
    await pool.query(
      'UPDATE Invoice SET Kegiatan = ?, Sekolah = ?, Total = ?, PPN = ?, Total_Harga = ?, Costumer_id = ?, Total_sn = ?, PPN_sn = ?, Total_Harga_sn = ? WHERE id = ?',
      [Kegiatan, Sekolah, Total, PPN, Total_Harga, Costumer_id, Total_sn, PPN_sn, Total_Harga_sn, id]
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

}
