import { useState } from 'react';

function Notifikasi() {
  const [notif, setNotif] = useState([
    { id: 1, tier: 1, teks: "Stok kategori Electronic habis (0)!" },
    { id: 2, tier: 2, teks: "Patient Monitor A1 dipindah ke ICU" }
  ]);

  function hapusLog(id, tier) {
    if (tier === 1) {
      alert("Alert Tier 1 tidak bisa dihapus sebelum restock!");
      return;
    }
    var sisa = notif.filter(n => n.id !== id);
    setNotif(sisa);
  }

  return (
    <div style={{ padding: "20px" }}>
      <h2>Daftar Notifikasi</h2>
      {notif.map(n => (
        <div key={n.id} style={{ border: "1px solid black", margin: "10px 0", padding: "10px", display: "flex", justifyContent: "space-between" }}>
          <p style={{ color: n.tier === 1 ? "red" : "black" }}>
            {n.tier === 1 ? "[PENTING] " : "[INFO] "} {n.teks}
          </p>
          <button onClick={() => hapusLog(n.id, n.tier)}>Hapus</button>
        </div>
      ))}
    </div>
  );
}

export default Notifikasi;