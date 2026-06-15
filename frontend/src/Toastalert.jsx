import { useEffect } from 'react';

function ToastAlert(props) {
  var pesan = props.pesan;
  var muncul = props.muncul;
  var tutup = props.tutup;

  useEffect(function() {
    if (muncul) {
      var timer = setTimeout(function() {
        tutup();
      }, 3000);
      return function() { clearTimeout(timer); };
    }
  }, [muncul, tutup]);

  if (!muncul) return null;

  var isError = pesan.toLowerCase().indexOf("gagal") !== -1 || pesan.toLowerCase().indexOf("habis") !== -1 || pesan.toLowerCase().indexOf("batal") !== -1;
  var bgColor = isError ? "#ef4444" : "#10b981";

  return (
    <div style={{
      position: "fixed",
      bottom: "15px",
      left: "15px",
      backgroundColor: bgColor,
      color: "white",
      padding: "5px 10px",
      borderRadius: "4px",
      fontSize: "11px",
      boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      maxWidth: "300px",
      lineHeight: "1.2"
    }}>
      <span style={{ marginRight: "6px", fontSize: "12px" }}>{isError ? "⚠️" : "✅"}</span>
      <span>{pesan}</span>
    </div>
  );
}

export default ToastAlert;