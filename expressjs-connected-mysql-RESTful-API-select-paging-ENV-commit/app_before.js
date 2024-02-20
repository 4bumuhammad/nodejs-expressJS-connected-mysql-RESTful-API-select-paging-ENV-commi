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


// Menangani permintaan POST untuk operasi INSERT ke dua tabel terkait
app.post('/api/insert-data', (req, res) => {
  const { intbiasa, intpositive, bigintbiasa, mediumintbiasa } = req.body;

  runTransaction((connection) => {
      connection.query('INSERT INTO angka (intbiasa, intpositive) VALUES (?, ?)', [intbiasa, intpositive], (error, results1) => {
        if (error) {
          console.error('Terjadi kesalahan saat insert ke tabel pertama: ', error);
          connection.rollback(() => {
            console.log('Rollback transaksi');
            res.status(500).json({ error: 'Terjadi kesalahan saat menambahkan data pada tabel 1.' });
            connection.end(); // Menutup koneksi database
          });
          return;
        }    

        // Mendapatkan ID yang di-generate dari tabel pertama
        const insertedId1 = results1.insertId;   
        console.log(`Data tabel 1 berhasil ditambahkan | ${insertedId1}`);


        connection.query('INSERT INTO angkabesar (bigintbiasa, mediumintbiasa, angka_autoincr) VALUES (?, ?, ?)', [bigintbiasa, mediumintbiasa, insertedId1], (error, results2) => {
          if (error) {
              console.error('Terjadi kesalahan saat insert ke tabel kedua: ', error);
              connection.rollback(() => {
                console.log('Rollback transaksi');
                res.status(500).json({ error: 'Terjadi kesalahan saat menambahkan data pada tabel 2.' });
                connection.end(); // Menutup koneksi database
              });
              return;
          }

          // Commit transaksi jika sukses
          connection.commit((error) => {
            if (error) {
              console.error('Gagal melakukan commit transaksi: ', error);
              connection.rollback(() => {
                console.log('Rollback transaksi');
                res.status(500).json({ error: 'Terjadi kesalahan saat melakukan commit transaksi.' });
                connection.end(); // Menutup koneksi database
              });
            } else {
              console.log('Transaksi berhasil');
              res.status(200).json({ message: 'Transaksi berhasil ( Insert ).' });
              connection.end(); // Menutup koneksi database
            }
          }); //connection.commit ( ADD )

        }); //connection.query results2 ( ADD )

      }); //connection.query results1 ( ADD )

  }); //runTransaction ( ADD )

}); //app.post ( ADD )






// Menangani permintaan PUT untuk operasi EDIT ke dua tabel terkait berdasarkan autoincr tabel 1
app.put('/api/edit-data/:autoincr', (req, res) => {
  const { autoincr } = req.params;
  const { intbiasa, intpositive, bigintbiasa, mediumintbiasa } = req.body;

  runTransaction((connection) => {
    connection.query('UPDATE angka SET intbiasa = ?, intpositive = ? WHERE autoincr = ?', [intbiasa, intpositive, autoincr], (error, results1) => {
      if (error) {
        console.error('Terjadi kesalahan saat mengedit ke tabel pertama: ', error);
        connection.rollback(() => {
          console.log('Rollback transaksi');
          res.status(500).json({ error: 'Terjadi kesalahan saat mengedit data pada tabel 1.' });
          connection.end(); // Menutup koneksi database
        });
        return;
      } 


      connection.query('UPDATE angkabesar SET bigintbiasa = ?, mediumintbiasa = ? WHERE angka_autoincr = ?', [bigintbiasa, mediumintbiasa, autoincr], (error, results2) => {
        if (error) {
            console.error('Terjadi kesalahan saat mengedit ke tabel kedua: ', error);
            connection.rollback(() => {
              console.log('Rollback transaksi');
              res.status(500).json({ error: 'Terjadi kesalahan saat mengedit data pada tabel 2.' });
              connection.end(); // Menutup koneksi database
            });
            return;
        }

        // Commit transaksi jika sukses
        connection.commit((error) => {
          if (error) {
            console.error('Gagal melakukan commit transaksi: ', error);
            connection.rollback(() => {
              console.log('Rollback transaksi');
              res.status(500).json({ error: 'Terjadi kesalahan saat melakukan commit transaksi.' });
              connection.end(); // Menutup koneksi database
            });
          } else {
            console.log('Transaksi berhasil');
            res.status(200).json({ message: 'Transaksi berhasil ( Edit ).' });
            connection.end(); // Menutup koneksi database
          }
        }); //connection.commit ( EDIT )
        
      }); //connection.query results2 ( EDIT )

    }); //connection.query results1 ( EDIT )

  }); //runTransaction ( EDIT )

}); //app.put ( EDIT )


// Menangani route untuk menghapus data berdasarkan autoincr tabel 1
app.delete('/api/delete-data/:autoincr', (req, res) => {
  const { autoincr } = req.params;

  runTransaction((connection) => {
    connection.query('DELETE FROM angka WHERE autoincr = ?', [autoincr], (error, results1) => {
      if (error) {
        console.error('Terjadi kesalahan saat menghapus ke tabel pertama: ', error);
        connection.rollback(() => {
          console.log('Rollback transaksi');
          res.status(500).json({ error: 'Terjadi kesalahan saat menghapus data pada tabel 1.' });
          connection.end(); // Menutup koneksi database
        });
        return;
      } 

      connection.query('DELETE FROM angkabesar WHERE angka_autoincr = ?', [autoincr], (error, results2) => {
        if (error) {
            console.error('Terjadi kesalahan saat menghapus ke tabel kedua: ', error);
            connection.rollback(() => {
              console.log('Rollback transaksi');
              res.status(500).json({ error: 'Terjadi kesalahan saat menghapus data pada tabel 2.' });
              connection.end(); // Menutup koneksi database
            });
            return;
        }      

        // Commit transaksi jika sukses
        connection.commit((error) => {
          if (error) {
            console.error('Gagal melakukan commit transaksi: ', error);
            connection.rollback(() => {
              console.log('Rollback transaksi');
              res.status(500).json({ error: 'Terjadi kesalahan saat melakukan commit transaksi.' });
              connection.end(); // Menutup koneksi database
            });
          } else {
            console.log('Transaksi berhasil');
            res.status(200).json({ message: 'Transaksi berhasil ( Delete ).' });
            connection.end(); // Menutup koneksi database
          }
        }); //connection.commit ( DELETE )

      }); //connection.query results2 ( DELETE )
    
    }); //connection.query results1 ( DELETE )
  
  }); //runTransaction ( DELETE )

}); //app.delete ( DELETE )

// Menjalankan server
app.listen(port, () => {
  console.log(`Server berjalan pada port ${port}`);
});
