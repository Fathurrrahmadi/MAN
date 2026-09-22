# MAN

Sistem pelacakan aset rumah sakit terdesentralisasi berbasis Microservices. Aplikasi ini dirancang untuk memantau pergerakan fasilitas medis (seperti kursi roda, monitor pasien, dll) antar ruangan secara real-time menggunakan teknologi QR Code.

## Arsitektur Sistem

Dibangun menggunakan Node.js dan MySQL, sistem ini terbagi menjadi 4 layanan independen:

- **API Gateway (Port 3000)**: Gerbang utama yang meneruskan request dari frontend ke service terkait sekaligus menyediakan dokumentasi API.
- **Layanan Aset (Port 3001)**: Pusat inventaris. Bertugas mendaftarkan aset baru, membuat QR Code, dan memonitor status ketersediaan barang.
- **Layanan Ruangan (Port 3002)**: Mengelola data lokasi rumah sakit (UGD, ICU, dll) beserta kapasitasnya.
- **Layanan Mutasi (Port 3003)**: Menangani logistik dan proses transfer barang antar ruangan dengan validasi ketersediaan secara dinamis.
