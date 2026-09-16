import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

// Ganti dengan URL Web App Google Apps Script Anda
const API_URL = "https://script.google.com/macros/s/AKfycb.../exec";

export default function App() {
  const [dataSpasial, setDataSpasial] = useState([]);
  const [dataReguler, setDataReguler] = useState([]);
  const [loading, setLoading] = useState(true);

  // Titik tengah default peta (Wilayah Malang)
  const posisiMalang = [-8.1345, 112.5746];

  useEffect(() => {
    // Fetch data dari Google Spreadsheet
    const fetchData = async () => {
      try {
        const response = await fetch(API_URL);
        const result = await response.json();
        
        if (result.status === "success") {
          setDataSpasial(result.data.spasial || []);
          setDataReguler(result.data.reguler || []);
        }
      } catch (error) {
        console.error("Gagal mengambil data API:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalInfrastruktur = dataSpasial.length;
  const totalPenerimaReguler = dataReguler.reduce((total, item) => total + (parseInt(item.Jumlah_Penerima) || 0), 0);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-100">
      
      {/* LAPISAN 1: Peta Interaktif Leaflet */}
      <MapContainer center={posisiMalang} zoom={11} zoomControl={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Render titik marker berdasarkan data Spreadsheet */}
        {!loading && dataSpasial.map((item, index) => (
          <Marker key={index} position={[parseFloat(item.Latitude), parseFloat(item.Longitude)]}>
            <Popup>
              <div className="font-sans">
                <h3 className="font-bold text-teal-800">{item.Nama_Penerima}</h3>
                <p className="text-xs text-slate-600 mb-1">{item.Jenis_Program} - {item.Status_Program}</p>
                <img src={item.URL_Foto_After || item.URL_Foto_Before || 'https://via.placeholder.com/150'} alt="Dokumentasi" className="w-full h-24 object-cover rounded my-2" />
                <p className="text-xs">Progres: <b>{item.Progres_Persen}%</b></p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* LAPISAN 2: UI Floating Dashboard (Liquid Glass) */}
      
      {/* Navbar Atas */}
      <nav className="absolute top-4 left-4 right-4 z-[1000] liquid-glass rounded-2xl flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-teal-500/50">
            NH
          </div>
          <div>
            <h1 className="text-xl font-bold text-teal-900 leading-tight">Peta Penyaluran</h1>
            <p className="text-sm text-teal-700">LAZNAS Nurul Hayat Malang</p>
          </div>
        </div>
        <div className="flex gap-4 font-medium text-teal-800">
          <span className="px-4 py-2 bg-teal-500 text-white rounded-lg shadow-md shadow-teal-500/40">Dashboard</span>
        </div>
      </nav>

      {/* Indikator Metrik Global Kanan Atas */}
      <div className="absolute top-[6.5rem] right-[26rem] z-[1000] liquid-glass rounded-full px-4 py-2 flex gap-3 text-sm font-semibold text-teal-900">
        <span>📍 {totalInfrastruktur} Titik Infrastruktur</span>
        <span className="text-teal-700/50">|</span>
        <span>👥 {totalPenerimaReguler} Penerima Reguler</span>
      </div>

      {/* Panel Kiri: Filter (Statik untuk contoh) */}
      <aside className="absolute top-28 left-4 z-[1000] w-80 flex flex-col gap-4">
        <div className="liquid-glass rounded-2xl p-5">
          <h2 className="text-sm font-bold text-teal-800 mb-3 uppercase tracking-wider">Status Program</h2>
          <select className="w-full bg-white/50 border border-white/50 text-teal-900 text-sm rounded-xl focus:ring-teal-500 focus:border-teal-500 p-2.5 outline-none">
            <option>Semua Status</option>
            <option>Selesai</option>
            <option>Dalam Pengerjaan</option>
          </select>
        </div>
        <div className="liquid-glass rounded-2xl p-5">
          <h2 className="text-sm font-bold text-teal-800 mb-3 uppercase tracking-wider">Jenis Program</h2>
          <div className="flex flex-col gap-2 text-teal-900 text-sm font-medium">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 text-teal-600 rounded" defaultChecked />
              <span>💧 Sumur Bor</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 text-teal-600 rounded" defaultChecked />
              <span>🏠 Bedah Rumah</span>
            </label>
          </div>
        </div>
      </aside>

      {/* Panel Kanan: Laporan & Detail */}
      <aside className="absolute top-28 right-4 z-[1000] w-96 liquid-glass rounded-2xl flex flex-col overflow-hidden max-h-[75vh]">
        <div className="liquid-glass-solid p-5 border-b border-white/30">
          <h2 className="text-lg font-bold text-teal-950">Ringkasan Laporan Reguler</h2>
          <p className="text-sm text-teal-800">Berdasarkan data {dataReguler.length > 0 ? dataReguler[0].Periode_Laporan : 'terbaru'}</p>
        </div>
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {loading ? (
             <p className="text-teal-800 text-center animate-pulse">Memuat data dari Spreadsheet...</p>
          ) : (
            dataReguler.map((item, idx) => (
              <div key={idx} className="bg-white/40 border border-white/50 p-4 rounded-xl">
                <h3 className="font-bold text-teal-900">{item.Jenis_Program}</h3>
                <p className="text-sm text-teal-800 mb-2">{item.Wilayah_Kecamatan} • {item.Jumlah_Penerima} Penerima</p>
                <div className="text-xs text-teal-700 bg-white/50 px-2 py-1 rounded inline-block">{item.Keterangan_Tambahan}</div>
              </div>
            ))
          )}
        </div>
        <div className="p-4 bg-white/30 border-t border-white/30">
           <button 
             onClick={() => window.open('https://wa.me/?text=Cek+Laporan+Penyaluran+Bantuan+Nurul+Hayat+di+sini:+https://domain-anda.vercel.app', '_blank')}
             className="w-full py-2.5 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-medium rounded-xl shadow-lg shadow-green-500/30 transition flex items-center justify-center gap-2">
              Share via WhatsApp
           </button>
        </div>
      </aside>
      
    </div>
  );
}