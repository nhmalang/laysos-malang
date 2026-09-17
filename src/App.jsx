import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const defaultIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// PASTIKAN URL INI SUDAH BENAR-BENAR MILIK ANDA
const API_URL = "https://script.google.com/macros/s/AKfycbxYpfxaD8K4w4IqrQNqFr5E_bwuJe_3fFgdt0WhYB73t7zrighKphN9_afqBmtTAHjc/exec"; 

export default function App() {
  const [dataSpasial, setDataSpasial] = useState([]);
  const [dataReguler, setDataReguler] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState('peta');
  const [activeMarker, setActiveMarker] = useState(null);

  const posisiMalang = [-8.1345, 112.5746];

  useEffect(() => {
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

  // --- LOGIKA PERHITUNGAN DASHBOARD ---
  const totalLokasi = dataSpasial.length;
  
  const penerimaSpasial = dataSpasial.reduce((acc, curr) => acc + (parseInt(curr.Penerima_Manfaat) || 0), 0);
  const penerimaReguler = dataReguler.reduce((acc, curr) => acc + (parseInt(curr.Jumlah_Penerima) || 0), 0);
  const totalPenerima = penerimaSpasial + penerimaReguler;

  // Menggabungkan total uang dari Program_Reguler dan Program_Spasial
  const danaReguler = dataReguler.reduce((acc, curr) => {
    const num = String(curr.Total_Nominal || '0').replace(/[^0-9]/g, '');
    return acc + (parseInt(num) || 0);
  }, 0);
  
  const danaSpasial = dataSpasial.reduce((acc, curr) => {
    // Membaca kolom penggunaan_dana (mendukung huruf besar/kecil dari Spreadsheet)
    const dana = curr.penggunaan_dana || curr.Penggunaan_Dana || curr.penggunaan_Dana || '0';
    const num = String(dana).replace(/[^0-9]/g, '');
    return acc + (parseInt(num) || 0);
  }, 0);

  const totalDana = danaReguler + danaSpasial;

  const formatRupiah = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);

  // --- PERSIAPAN DATA LAPORAN (GABUNGAN SPASIAL & REGULER) ---
  const gabunganLaporan = [
    ...dataSpasial.map(item => ({
      kategori: 'Infrastruktur',
      tanggal: item.Tanggal_Update,
      program: item.Jenis_Program,
      wilayah: item.Kecamatan,
      penerima: item.Penerima_Manfaat,
      dana: item.penggunaan_dana || item.Penggunaan_Dana,
      foto: item.URL_Foto_After || item.URL_Foto_Before
    })),
    ...dataReguler.map(item => ({
      kategori: 'Reguler',
      tanggal: item.Periode_Laporan,
      program: item.Jenis_Program,
      wilayah: item.Wilayah_Kecamatan,
      penerima: `${item.Jumlah_Penerima} Penerima`,
      dana: item.Total_Nominal,
      foto: item.url_foto || item.URL_Foto || item.Url_Foto
    }))
  ];

  // --- KOMPONEN MENU NAVBAR ---
  const renderNavbar = () => (
    <nav className="absolute top-4 left-4 right-4 z-[1000] liquid-glass rounded-2xl flex items-center justify-between px-6 py-4 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-teal-500/50">NH</div>
        <div>
          <h1 className="text-xl font-bold text-teal-900 leading-tight">Layanan Sosial</h1>
          <p className="text-sm text-teal-700">LAZNAS Nurul Hayat Malang</p>
        </div>
      </div>
      <div className="flex gap-2 font-medium text-sm">
        <button 
          onClick={() => setActiveTab('dashboard')} 
          className={`px-4 py-2 rounded-lg transition ${activeTab === 'dashboard' ? 'bg-teal-500 text-white shadow-md' : 'text-teal-800 hover:bg-white/50'}`}
        >
          Dashboard
        </button>
        <button 
          onClick={() => setActiveTab('peta')} 
          className={`px-4 py-2 rounded-lg transition ${activeTab === 'peta' ? 'bg-teal-500 text-white shadow-md' : 'text-teal-800 hover:bg-white/50'}`}
        >
          Peta Publik
        </button>
        <button 
          onClick={() => setActiveTab('laporan')} 
          className={`px-4 py-2 rounded-lg transition ${activeTab === 'laporan' ? 'bg-teal-500 text-white shadow-md' : 'text-teal-800 hover:bg-white/50'}`}
        >
          Laporan
        </button>
      </div>
    </nav>
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-100 font-sans">
      
      {renderNavbar()}

      {/* ========================================= */}
      {/* HALAMAN 1: DASHBOARD                      */}
      {/* ========================================= */}
      {activeTab === 'dashboard' && (
        <div className="absolute inset-0 pt-28 px-8 pb-8 overflow-y-auto z-10">
          <div className="max-w-5xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold text-teal-900 mb-4">Ringkasan Eksekutif</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="liquid-glass-solid p-6 rounded-2xl flex flex-col justify-center items-center text-center shadow-sm">
                <span className="text-4xl mb-2">📍</span>
                <h3 className="text-teal-800 font-semibold mb-1">Total Lokasi Program</h3>
                <p className="text-3xl font-bold text-teal-600">{loading ? '...' : totalLokasi} <span className="text-sm font-normal">Titik</span></p>
              </div>
              
              <div className="liquid-glass-solid p-6 rounded-2xl flex flex-col justify-center items-center text-center shadow-sm">
                <span className="text-4xl mb-2">👥</span>
                <h3 className="text-teal-800 font-semibold mb-1">Penerima Manfaat</h3>
                <p className="text-3xl font-bold text-teal-600">{loading ? '...' : totalPenerima} <span className="text-sm font-normal">Jiwa</span></p>
              </div>

              <div className="liquid-glass-solid p-6 rounded-2xl flex flex-col justify-center items-center text-center shadow-sm">
                <span className="text-4xl mb-2">💰</span>
                <h3 className="text-teal-800 font-semibold mb-1">Dana Tersalurkan</h3>
                <p className="text-2xl font-bold text-teal-600">{loading ? '...' : formatRupiah(totalDana)}</p>
              </div>
            </div>
            
            <div className="liquid-glass p-6 rounded-2xl mt-8">
              <p className="text-teal-800 text-sm">
                Perhitungan dana meliputi program fisik/infrastruktur (Sumur Bor, Bedah Rumah) yang tersebar di {totalLokasi} titik, serta program santunan reguler (Guru Ngaji, Anak Yatim).
              </p>
            </div>
          </div>
        </div>
      )}


      {/* ========================================= */}
      {/* HALAMAN 2: PETA PUBLIK                    */}
      {/* ========================================= */}
      {activeTab === 'peta' && (
        <>
          <MapContainer center={posisiMalang} zoom={11} zoomControl={false} style={{ height: "100vh", width: "100vw", zIndex: 0 }}>
            <TileLayer attribution='&copy; OSM' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            
            {!loading && dataSpasial.map((item, index) => {
              const lat = parseFloat(String(item.Latitude).replace(',', '.'));
              const lng = parseFloat(String(item.Longitude).replace(',', '.'));
              if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

              return (
                <Marker key={index} position={[lat, lng]} icon={defaultIcon} eventHandlers={{ click: () => setActiveMarker(item) }}>
                  <Popup>
                    <div className="font-sans text-center">
                      <h3 className="font-bold text-teal-800">{item.Nama_Penerima}</h3>
                      <p className="text-xs text-slate-600">Klik untuk detail</p>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          <aside className="absolute top-28 right-4 z-[1000] w-80 liquid-glass rounded-2xl flex flex-col overflow-hidden max-h-[75vh]">
            {activeMarker ? (
              <>
                <div className="liquid-glass-solid p-5 border-b border-white/30 relative">
                  <button onClick={() => setActiveMarker(null)} className="absolute top-4 right-4 text-teal-900 font-bold">✕</button>
                  <span className="bg-teal-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">{activeMarker.Jenis_Program}</span>
                  <h2 className="text-xl font-bold text-teal-950 mt-2">{activeMarker.Nama_Penerima}</h2>
                  <p className="text-sm text-teal-800">{activeMarker.Kecamatan}</p>
                </div>
                <div className="p-5 flex-1 overflow-y-auto">
                  <p className="text-sm bg-white/40 p-3 rounded-xl border border-white/50">{activeMarker.Spesifikasi_Teknis}</p>
                  <p className="text-xs text-teal-700 mt-4">Penerima Manfaat: <b>{activeMarker.Penerima_Manfaat}</b></p>
                  
                  {/* Menampilkan Dana di Panel Peta */}
                  <p className="text-xs text-teal-700">Penggunaan Dana: <b>{activeMarker.penggunaan_dana || activeMarker.Penggunaan_Dana || '-'}</b></p>
                  
                  <p className="text-xs text-teal-700">Progres: <b>{activeMarker.Progres_Persen}%</b></p>
                </div>
              </>
            ) : (
              <div className="p-5 text-center text-teal-800">
                <p className="text-sm">Silakan klik pin di peta untuk melihat detail program infrastruktur.</p>
              </div>
            )}
          </aside>
        </>
      )}


      {/* ========================================= */}
      {/* HALAMAN 3: LAPORAN (GABUNGAN)             */}
      {/* ========================================= */}
      {activeTab === 'laporan' && (
        <div className="absolute inset-0 pt-28 px-8 pb-8 overflow-y-auto z-10">
          <div className="max-w-6xl mx-auto liquid-glass-solid rounded-2xl p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-teal-900 mb-6">Laporan Detail Penyaluran</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-teal-500/10 text-teal-900 border-b border-teal-500/20">
                    <th className="p-3 text-sm font-semibold">Tgl / Periode</th>
                    <th className="p-3 text-sm font-semibold">Kategori</th>
                    <th className="p-3 text-sm font-semibold">Program & Wilayah</th>
                    <th className="p-3 text-sm font-semibold text-center">Penerima</th>
                    <th className="p-3 text-sm font-semibold text-right">Nominal Dana</th>
                    <th className="p-3 text-sm font-semibold text-center">Dokumentasi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="6" className="text-center p-4 text-teal-700">Memuat data tabel...</td></tr>
                  ) : (
                    gabunganLaporan.map((item, index) => (
                      <tr key={index} className="border-b border-teal-500/10 hover:bg-white/40 transition">
                        <td className="p-3 text-sm text-teal-800">{item.tanggal}</td>
                        <td className="p-3 text-sm font-medium text-teal-900">
                          <span className={`px-2 py-1 rounded text-xs text-white ${item.kategori === 'Infrastruktur' ? 'bg-blue-500' : 'bg-green-500'}`}>
                            {item.kategori}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-teal-900">
                          <strong>{item.program}</strong> <br/>
                          <span className="text-xs text-teal-700">{item.wilayah}</span>
                        </td>
                        <td className="p-3 text-sm text-teal-800 text-center">{item.penerima}</td>
                        <td className="p-3 text-sm text-teal-800 text-right font-medium">{item.dana || '-'}</td>
                        <td className="p-3 text-center">
                          {item.foto ? (
                            <a href={item.foto} target="_blank" rel="noopener noreferrer" className="inline-block px-3 py-1 bg-teal-100 hover:bg-teal-200 text-teal-800 text-xs rounded transition">
                              Lihat Foto
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
