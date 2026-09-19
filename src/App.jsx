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

const API_URL = "https://script.google.com/macros/s/AKfycbxYpfxaD8K4w4IqrQNqFr5E_bwuJe_3fFgdt0WhYB73t7zrighKphN9_afqBmtTAHjc/exec"; 

export default function App() {
  const [dataSpasial, setDataSpasial] = useState([]);
  const [dataReguler, setDataReguler] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [activeMarker, setActiveMarker] = useState(null);
  
  // State untuk popup foto sekarang menerima Array (kumpulan URL)
  const [photoModal, setPhotoModal] = useState(null);

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

  const formatRupiah = (angka) => {
    const num = parseInt(String(angka).replace(/[^0-9]/g, ''));
    if (isNaN(num)) return angka;
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    if (dateString.includes('T')) return dateString.split('T')[0]; 
    return dateString;
  };

  const getDirectImage = (url) => {
    if (!url) return null;
    try {
      if (url.includes('drive.google.com/file/d/')) {
        const id = url.split('/d/')[1].split('/')[0];
        return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
      }
    } catch (e) {
      console.error("Error parsing URL", e);
    }
    return url;
  };

  // Helper untuk mengekstrak dan memfilter URL foto yang valid (tidak kosong)
  const extractPhotos = (item) => {
    return [item.URL_Foto_1, item.URL_Foto_2, item.URL_Foto_3]
      .filter(url => url && url.trim() !== ''); // Hanya ambil kolom yang diisi link
  };

  const totalLokasi = dataSpasial.length;
  const penerimaSpasial = dataSpasial.reduce((acc, curr) => acc + (parseInt(curr.Penerima_Manfaat) || 0), 0);
  const penerimaReguler = dataReguler.reduce((acc, curr) => acc + (parseInt(curr.Jumlah_Penerima) || 0), 0);
  const totalPenerima = penerimaSpasial + penerimaReguler;

  const danaReguler = dataReguler.reduce((acc, curr) => {
    const num = String(curr.Total_Nominal || '0').replace(/[^0-9]/g, '');
    return acc + (parseInt(num) || 0);
  }, 0);
  
  const danaSpasial = dataSpasial.reduce((acc, curr) => {
    const dana = curr.penggunaan_dana || curr.Penggunaan_Dana || curr.penggunaan_Dana || '0';
    const num = String(dana).replace(/[^0-9]/g, '');
    return acc + (parseInt(num) || 0);
  }, 0);

  const totalDana = danaReguler + danaSpasial;

  const gabunganLaporan = [
    ...dataSpasial.map(item => ({
      kategori: 'Infrastruktur',
      tanggal: item.Tanggal_Update,
      program: item.Jenis_Program,
      wilayah: item.Kecamatan,
      penerima: item.Penerima_Manfaat,
      dana: item.penggunaan_dana || item.Penggunaan_Dana,
      fotos: extractPhotos(item) // Mengambil 3 foto
    })),
    ...dataReguler.map(item => ({
      kategori: 'Reguler',
      tanggal: item.Periode_Laporan,
      program: item.Jenis_Program,
      wilayah: item.Wilayah_Kecamatan,
      penerima: `${item.Jumlah_Penerima} Penerima`,
      dana: item.Total_Nominal,
      fotos: extractPhotos(item) // Mengambil 3 foto
    }))
  ];

  const renderNavbar = () => (
    <nav className="absolute top-2 left-2 right-2 md:top-4 md:left-4 md:right-4 z-[1000] liquid-glass rounded-xl md:rounded-2xl flex flex-col md:flex-row items-center justify-between px-4 py-3 md:px-6 md:py-4 shadow-sm gap-3 md:gap-0">
      <div className="flex items-center gap-3 w-full md:w-auto">
        <div className="w-8 h-8 md:w-10 md:h-10 bg-teal-500 rounded-full flex items-center justify-center text-white font-bold text-xs md:text-base shadow-lg shadow-teal-500/50 flex-shrink-0">NH</div>
        <div>
          <h1 className="text-lg md:text-xl font-bold text-teal-900 leading-tight">Layanan Sosial</h1>
          <p className="text-xs md:text-sm text-teal-700 hidden md:block">LAZNAS Nurul Hayat Malang</p>
        </div>
      </div>
      <div className="flex gap-2 font-medium text-xs md:text-sm w-full md:w-auto overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
        <button 
          onClick={() => setActiveTab('dashboard')} 
          className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg transition whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-teal-500 text-white shadow-md' : 'text-teal-800 hover:bg-white/50 border border-transparent'}`}
        >
          Dashboard
        </button>
        <button 
          onClick={() => setActiveTab('peta')} 
          className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg transition whitespace-nowrap ${activeTab === 'peta' ? 'bg-teal-500 text-white shadow-md' : 'text-teal-800 hover:bg-white/50 border border-transparent'}`}
        >
          Peta Publik
        </button>
        <button 
          onClick={() => setActiveTab('laporan')} 
          className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg transition whitespace-nowrap ${activeTab === 'laporan' ? 'bg-teal-500 text-white shadow-md' : 'text-teal-800 hover:bg-white/50 border border-transparent'}`}
        >
          Laporan
        </button>
      </div>
    </nav>
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-100 font-sans">
      
      {renderNavbar()}

      {/* --- DASHBOARD --- */}
      {activeTab === 'dashboard' && (
        <div className="absolute inset-0 pt-32 md:pt-28 px-4 md:px-8 pb-8 overflow-y-auto z-10">
          <div className="max-w-5xl mx-auto space-y-4 md:space-y-6">
            <h2 className="text-xl md:text-2xl font-bold text-teal-900 mb-2 md:mb-4">Ringkasan Eksekutif</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              <div className="liquid-glass-solid p-5 md:p-6 rounded-2xl flex flex-col justify-center items-center text-center shadow-sm">
                <span className="text-3xl md:text-4xl mb-2">📍</span>
                <h3 className="text-teal-800 font-semibold mb-1 text-sm md:text-base">Total Lokasi Program</h3>
                <p className="text-2xl md:text-3xl font-bold text-teal-600">{loading ? '...' : totalLokasi} <span className="text-xs md:text-sm font-normal">Titik</span></p>
              </div>
              <div className="liquid-glass-solid p-5 md:p-6 rounded-2xl flex flex-col justify-center items-center text-center shadow-sm">
                <span className="text-3xl md:text-4xl mb-2">👥</span>
                <h3 className="text-teal-800 font-semibold mb-1 text-sm md:text-base">Penerima Manfaat</h3>
                <p className="text-2xl md:text-3xl font-bold text-teal-600">{loading ? '...' : totalPenerima} <span className="text-xs md:text-sm font-normal">Jiwa</span></p>
              </div>
              <div className="liquid-glass-solid p-5 md:p-6 rounded-2xl flex flex-col justify-center items-center text-center shadow-sm sm:col-span-2 md:col-span-1">
                <span className="text-3xl md:text-4xl mb-2">💰</span>
                <h3 className="text-teal-800 font-semibold mb-1 text-sm md:text-base">Dana Tersalurkan</h3>
                <p className="text-xl md:text-2xl font-bold text-teal-600">{loading ? '...' : formatRupiah(totalDana)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- PETA PUBLIK --- */}
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

          {/* Panel Kanan Peta */}
          <aside className="absolute bottom-4 left-4 right-4 md:top-28 md:bottom-auto md:left-auto md:right-4 z-[1000] md:w-80 liquid-glass rounded-2xl flex flex-col overflow-hidden max-h-[60vh] md:max-h-[75vh] shadow-xl">
            {activeMarker ? (
              <>
                <div className="liquid-glass-solid p-4 md:p-5 border-b border-white/30 relative">
                  <button onClick={() => setActiveMarker(null)} className="absolute top-2 right-3 text-teal-900 font-bold text-lg md:top-4 md:right-4 md:text-base">✕</button>
                  <span className="bg-teal-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">{activeMarker.Jenis_Program}</span>
                  <h2 className="text-lg md:text-xl font-bold text-teal-950 mt-2 pr-6">{activeMarker.Nama_Penerima}</h2>
                  <p className="text-xs md:text-sm text-teal-800">{activeMarker.Kecamatan}</p>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                  {/* SLIDER FOTO: Jika ada lebih dari 1 foto, akan bisa digeser ke samping */}
                  {extractPhotos(activeMarker).length > 0 && (
                    <div className="flex overflow-x-auto gap-2 p-3 bg-teal-900/5 snap-x hide-scrollbar border-b border-white/50">
                      {extractPhotos(activeMarker).map((fotoUrl, idx) => (
                        <img 
                          key={idx}
                          src={getDirectImage(fotoUrl)} 
                          alt={`Dokumentasi ${idx + 1}`} 
                          className="w-3/4 md:w-4/5 h-32 md:h-36 object-cover rounded-lg cursor-pointer flex-shrink-0 snap-center shadow-sm"
                          onClick={() => setPhotoModal(extractPhotos(activeMarker))} // Klik gambar buka semua di Modal
                        />
                      ))}
                    </div>
                  )}
                  
                  <div className="p-4 md:p-5 space-y-2">
                    <p className="text-xs md:text-sm bg-white/40 p-3 rounded-xl border border-white/50">{activeMarker.Spesifikasi_Teknis}</p>
                    <p className="text-xs text-teal-700">Penerima Manfaat: <b>{activeMarker.Penerima_Manfaat}</b></p>
                    <p className="text-xs text-teal-700">Penggunaan Dana: <b>{formatRupiah(activeMarker.penggunaan_dana || activeMarker.Penggunaan_Dana || 0)}</b></p>
                    <p className="text-xs text-teal-700">Progres: <b>{activeMarker.Progres_Persen}%</b></p>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-4 md:p-5 text-center text-teal-800">
                <p className="text-xs md:text-sm">Silakan klik pin di peta untuk melihat detail program infrastruktur.</p>
              </div>
            )}
          </aside>
        </>
      )}

      {/* --- LAPORAN GABUNGAN --- */}
      {activeTab === 'laporan' && (
        <div className="absolute inset-0 pt-32 md:pt-28 px-4 md:px-8 pb-8 overflow-y-auto z-10">
          <div className="max-w-6xl mx-auto liquid-glass-solid rounded-2xl p-4 md:p-6 shadow-sm">
            <h2 className="text-xl md:text-2xl font-bold text-teal-900 mb-4 md:mb-6">Laporan Detail Penyaluran</h2>
            
            <div className="overflow-x-auto pb-4">
              <table className="w-full text-left border-collapse whitespace-nowrap min-w-[600px]">
                <thead>
                  <tr className="bg-teal-500/10 text-teal-900 border-b border-teal-500/20">
                    <th className="p-3 text-xs md:text-sm font-semibold">Tgl / Periode</th>
                    <th className="p-3 text-xs md:text-sm font-semibold">Kategori</th>
                    <th className="p-3 text-xs md:text-sm font-semibold">Program & Wilayah</th>
                    <th className="p-3 text-xs md:text-sm font-semibold text-center">Penerima</th>
                    <th className="p-3 text-xs md:text-sm font-semibold text-right">Nominal Dana</th>
                    <th className="p-3 text-xs md:text-sm font-semibold text-center">Dokumentasi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="6" className="text-center p-4 text-teal-700 text-sm">Memuat data tabel...</td></tr>
                  ) : (
                    gabunganLaporan.map((item, index) => (
                      <tr key={index} className="border-b border-teal-500/10 hover:bg-white/40 transition">
                        <td className="p-3 text-xs md:text-sm text-teal-800">{formatDate(item.tanggal)}</td>
                        <td className="p-3 text-xs md:text-sm font-medium text-teal-900">
                          <span className={`px-2 py-1 rounded text-[10px] md:text-xs text-white ${item.kategori === 'Infrastruktur' ? 'bg-blue-500' : 'bg-green-500'}`}>
                            {item.kategori}
                          </span>
                        </td>
                        <td className="p-3 text-xs md:text-sm text-teal-900">
                          <strong>{item.program}</strong> <br/>
                          <span className="text-[10px] md:text-xs text-teal-700">{item.wilayah}</span>
                        </td>
                        <td className="p-3 text-xs md:text-sm text-teal-800 text-center">{item.penerima}</td>
                        <td className="p-3 text-xs md:text-sm text-teal-800 text-right font-medium">{formatRupiah(item.dana)}</td>
                        <td className="p-3 text-center">
                          {item.fotos.length > 0 ? (
                            <button 
                              onClick={() => setPhotoModal(item.fotos)} // Mengirim array foto ke modal
                              className="inline-block px-3 py-1.5 bg-teal-500 hover:bg-teal-600 shadow-md shadow-teal-500/30 text-white text-[10px] md:text-xs rounded-lg transition"
                            >
                              Lihat Foto ({item.fotos.length})
                            </button>
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

      {/* --- POPUP (MODAL) MULTIPLE FOTO --- */}
      {photoModal && photoModal.length > 0 && (
        <div 
          className="fixed inset-0 z-[9999] bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 transition-opacity"
          onClick={() => setPhotoModal(null)}
        >
          <button 
            className="absolute top-4 right-4 md:top-8 md:right-8 text-white hover:text-teal-300 text-4xl font-bold transition z-50 drop-shadow-md"
            onClick={() => setPhotoModal(null)}
          >
            ✕
          </button>
          
          {/* Scroll Area untuk Foto */}
          <div 
            className="w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col gap-6 items-center hide-scrollbar py-8" 
            onClick={(e) => e.stopPropagation()}
          >
            {photoModal.map((fotoUrl, idx) => (
              <div key={idx} className="relative w-full flex flex-col items-center">
                <span className="text-white/50 text-xs mb-2">Foto {idx + 1} dari {photoModal.length}</span>
                <img 
                  src={getDirectImage(fotoUrl)} 
                  className="max-w-full rounded-xl object-contain shadow-2xl border-2 border-white/20" 
                  alt={`Dokumentasi Detail ${idx + 1}`} 
                />
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}