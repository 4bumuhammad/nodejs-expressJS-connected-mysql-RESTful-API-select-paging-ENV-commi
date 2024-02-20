require('dotenv').config();

const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

// Middleware untuk parsing body permintaan menjadi JSON
app.use(bodyParser.json());


// Konfigurasi koneksi database
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  port: process.env.DB_PORT,
  insecureAuth: process.env.DB_INSECUREAUTH
};

// Fungsi untuk menjalankan transaksi
const runTransaction = (transactionFn) => {
  const connection = mysql.createConnection(dbConfig);

  connection.connect((error) => {
    if (error) {
      console.error('Gagal membuka koneksi: ', error);
      return;
    }

    connection.beginTransaction((error) => {
      if (error) {
        console.error('Gagal memulai transaksi: ', error);
        connection.rollback(() => {
          console.log('Rollback transaksi');
          connection.end();
        });
        return;
      }

      transactionFn(connection);
    });//connection.beginTransaction

  }); //connection.connect
};

app.get('/api/data', (req, res) => {
  const page = parseInt(req.query.page) || 1; // Nomor halaman yang diminta oleh pengguna
  const limit = parseInt(req.query.limit) || 10; // Jumlah data yang akan ditampilkan per halaman

  // Hitung offset berdasarkan nomor halaman dan jumlah data per halaman
  const offset = (page - 1) * limit;

  runTransaction((connection) => {
    // Query database untuk mendapatkan data dengan limit dan offset
    connection.query('SELECT * FROM usersbanyak LIMIT ? OFFSET ?', [limit, offset], (error, results) => {
      if (error) {
        console.error('Terjadi kesalahan saat mengambil data pada tabel pertama: ', error);
        console.log('Rollback transaksi');
        res.status(500).json({ error: 'Terjadi kesalahan saat mengambil data pada tabel' });
        connection.rollback(() => {
          connection.end(); // Menutup koneksi database
        });
        return;
      }

      // Menghitung total jumlah data dalam tabel (tanpa limit dan offset)
      connection.query('SELECT COUNT(*) AS total FROM usersbanyak', (error, countResult) => {
        if (error) {
          console.error('Terjadi kesalahan saat menghitung total data: ', error);
          res.status(500).json({ error: 'Terjadi kesalahan saat menghitung total data.' });
          connection.rollback(() => {
            connection.end(); // Menutup koneksi database
          });
          return;
        }

        const total = countResult[0].total; // Total jumlah data dalam tabel

        const response = {
          page,
          limit,
          total,
          data: results
        };

        res.status(200).json(response);

        connection.commit((error) => {
          if (error) {
            console.error('Terjadi kesalahan saat melakukan commit transaksi: ', error);
            connection.rollback(() => {
              console.log('Rollback transaksi');
              connection.end(); // Menutup koneksi database
            });
            return;
          }

          console.log('Commit transaksi');
          connection.end(); // Menutup koneksi database setelah commit
        });
      });
    });
  });
});


// Menjalankan server
app.listen(port, () => {
  console.log(`Server berjalan pada port ${port}`);
});
