import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css'; // FIX 1: Import CSS Leaflet langsung ke dalam file komponen

// FIX 2: Workaround untuk bug Vite yang gagal merender Icon Leaflet bawaan
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

const API_URL = "https://script.google.com/macros/s/AKfycbxYpfxaD8K4w4IqrQNqFr5E_bwuJe_3fFgdt0WhYB73t7zrighKphN9_afqBmtTAHjc/exec"; // <-- GANTI DENGAN URL MILIK ANDA

export default function App() {
  const [dataSpasial, setDataSpasial] = useState([]);
  const [dataReguler, setDataReguler] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // FITUR BARU: State untuk menyimpan data marker yang sedang diklik
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

  const totalInfrastruktur = dataSpasial.length;
  const totalPenerimaReguler = dataReguler.reduce((total, item) => total + (parseInt(item.Jumlah_Penerima) || 0), 0);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-200 font-sans">
      
      {/* LAPISAN 1: Peta Interaktif Leaflet */}
      {/* FIX 3: Tambahkan style inline width & height yang absolut */}
      <MapContainer 
        center={posisiMalang} 
        zoom={11} 
        zoomControl={false}
        style={{ height: "100vh", width: "100vw", zIndex: 0 }} 
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
       {!loading && dataSpasial.map((item, index) => {
          // Parsing string ke angka desimal, ganti koma jadi titik untuk berjaga-jaga
          const latStr = String(item.Latitude).replace(',', '.');
          const lngStr = String(item.Longitude).replace(',', '.');
          
          const lat = parseFloat(latStr);
          const lng = parseFloat(lngStr);
          
          // Validasi Ketat: Cek apakah data kosong, bukan angka, atau di luar batas Bumi
          if (
            isNaN(lat) || isNaN(lng) || 
            lat < -90 || lat > 90 || 
            lng < -180 || lng > 180
          ) {
            console.warn(`Data diskip: Koordinat tidak valid pada ${item.Nama_Penerima}`);
            return null; // Skip marker ini agar tidak membuat web crash
          }

          return (
            <Marker 
              key={index} 
              position={[lat, lng]}
              eventHandlers={{
                click: () => setActiveMarker(item),
              }}
            >
              <Popup>
                <div className="font-sans text-center">
                  <h3 className="font-bold text-teal-800">{item.Nama_Penerima}</h3>
                  <p className="text-xs text-slate-600">Klik untuk lihat detail di panel kanan</p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* LAPISAN 2: UI Floating Dashboard */}
      
      <nav className="absolute top-4 left-4 right-4 z-[1000] liquid-glass rounded-2xl flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-teal-500/50">NH</div>
          <div>
            <h1 className="text-xl font-bold text-teal-900 leading-tight">Peta Penyaluran</h1>
            <p className="text-sm text-teal-700">LAZNAS Nurul Hayat Malang</p>
          </div>
        </div>
      </nav>

      {/* Panel Kiri: Filter */}
      <aside className="absolute top-28 left-4 z-[1000] w-80 flex flex-col gap-4">
        <div className="liquid-glass rounded-2xl p-5">
          <h2 className="text-sm font-bold text-teal-800 mb-3 uppercase tracking-wider">Status Program</h2>
          <select className="w-full bg-white/50 border border-white/50 text-teal-900 text-sm rounded-xl focus:ring-teal-500 p-2.5 outline-none">
            <option>Semua Status</option>
            <option>Selesai</option>
            <option>Dalam Pengerjaan</option>
          </select>
        </div>
      </aside>

      {/* PANEL KANAN DINAMIS: Berubah sesuai state `activeMarker` */}
      <aside className="absolute top-28 right-4 z-[1000] w-96 liquid-glass rounded-2xl flex flex-col overflow-hidden max-h-[75vh] transition-all duration-300">
        
        {activeMarker ? (
          
          /* === TAMPILAN DETAIL JIKA MARKER DIKLIK === */
          <>
            <div className="liquid-glass-solid p-5 border-b border-white/30 relative">
              {/* Tombol Tutup / Kembali */}
              <button 
                onClick={() => setActiveMarker(null)}
                className="absolute top-4 right-4 w-8 h-8 bg-white/50 hover:bg-red-100 hover:text-red-600 text-teal-900 rounded-full flex items-center justify-center font-bold transition"
              >
                ✕
              </button>
              
              <div className="flex gap-2 mb-2">
                <span className="bg-teal-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">{activeMarker.Jenis_Program}</span>
                <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">{activeMarker.Status_Program}</span>
              </div>
              <h2 className="text-xl font-bold text-teal-950 pr-8">{activeMarker.Nama_Penerima}</h2>
              <p className="text-sm text-teal-800">{activeMarker.Alamat_Lengkap} - {activeMarker.Kecamatan}</p>
            </div>

            <div className="p-5 flex-1 overflow-y-auto">
              <p className="text-[10px] text-teal-700 mb-4 bg-white/50 inline-block px-2 py-1 rounded">Update: {activeMarker.Tanggal_Update} | {activeMarker.PJ_Lapangan}</p>
              
              <h3 className="font-semibold text-teal-900 mb-2 text-sm">Metrik Bantuan</h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white/40 border border-white/50 p-3 rounded-xl text-center">
                  <div className="text-2xl font-bold text-teal-600">{activeMarker.Penerima_Manfaat}</div>
                  <div className="text-xs text-teal-800 uppercase">Jiwa</div>
                </div>
                <div className="bg-white/40 border border-white/50 p-3 rounded-xl text-center">
                  <div className="text-2xl font-bold text-teal-600">{activeMarker.Progres_Persen}%</div>
                  <div className="text-xs text-teal-800 uppercase">Progres</div>
                </div>
              </div>
              
              <h3 className="font-semibold text-teal-900 mb-2 text-sm">Spesifikasi Teknis</h3>
              <p className="text-sm text-slate-700 bg-white/40 p-3 rounded-xl border border-white/50">{activeMarker.Spesifikasi_Teknis}</p>
            </div>
          </>

        ) : (

          /* === TAMPILAN DEFAULT JIKA TIDAK ADA MARKER DIKLIK === */
          <>
            <div className="liquid-glass-solid p-5 border-b border-white/30">
              <h2 className="text-lg font-bold text-teal-950">Ringkasan Laporan Reguler</h2>
              <p className="text-sm text-teal-800">Total {totalPenerimaReguler} Penerima Manfaat</p>
            </div>
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {loading ? (
                <p className="text-teal-800 text-center animate-pulse text-sm">Memuat dari Spreadsheet...</p>
              ) : (
                dataReguler.map((item, idx) => (
                  <div key={idx} className="bg-white/40 border border-white/50 p-3 rounded-xl">
                    <h3 className="font-bold text-teal-900 text-sm">{item.Jenis_Program}</h3>
                    <p className="text-xs text-teal-800 mb-2">{item.Wilayah_Kecamatan} • {item.Jumlah_Penerima} Penerima</p>
                    <div className="text-[10px] text-teal-700 bg-white/50 px-2 py-1 rounded inline-block">{item.Keterangan_Tambahan}</div>
                  </div>
                ))
              )}
            </div>
          </>

        )}

      </aside>
      
    </div>
  );
}
