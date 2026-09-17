import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// FIX DEFINITIF: Menggunakan absolute CDN untuk icon agar Vite tidak crash di Vercel
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
          const lat = parseFloat(String(item.Latitude).replace(',', '.'));
          const lng = parseFloat(String(item.Longitude).replace(',', '.'));
          
          if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return null;
          }

          return (
            <Marker 
              key={index} 
              position={[lat, lng]}
              icon={defaultIcon} // <-- Menerapkan Icon CDN di sini
              eventHandlers={{
                click: () => setActiveMarker(item),
              }}
            >
              <Popup>
                <div className="font-sans text-center">
                  <h3 className="font-bold text-teal-800">{item.Nama_Penerima}</h3>
                  <p className="text-xs text-slate-600">Klik untuk lihat detail</p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Navbar Atas */}
      <nav className="absolute top-4 left-4 right-4 z-[1000] liquid-glass rounded-2xl flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-teal-500/50">NH</div>
          <div>
            <h1 className="text-xl font-bold text-teal-900 leading-tight">Peta Penyaluran</h1>
            <p className="text-sm text-teal-700">LAZNAS Nurul Hayat Malang</p>
          </div>
        </div>
      </nav>

      {/* Panel Kanan Dinamis */}
      <aside className="absolute top-28 right-4 z-[1000] w-96 liquid-glass rounded-2xl flex flex-col overflow-hidden max-h-[75vh] transition-all duration-300">
        {activeMarker ? (
          <>
            <div className="liquid-glass-solid p-5 border-b border-white/30 relative">
              <button 
                onClick={() => setActiveMarker(null)}
                className="absolute top-4 right-4 w-8 h-8 bg-white/50 hover:bg-red-100 hover:text-red-600 text-teal-900 rounded-full flex items-center justify-center font-bold transition"
              >✕</button>
              <div className="flex gap-2 mb-2">
                <span className="bg-teal-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">{activeMarker.Jenis_Program}</span>
                <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">{activeMarker.Status_Program}</span>
              </div>
              <h2 className="text-xl font-bold text-teal-950 pr-8">{activeMarker.Nama_Penerima}</h2>
              <p className="text-sm text-teal-800">{activeMarker.Alamat_Lengkap} - {activeMarker.Kecamatan}</p>
            </div>
            <div className="p-5 flex-1 overflow-y-auto">
              <h3 className="font-semibold text-teal-900 mb-2 text-sm">Spesifikasi Teknis</h3>
              <p className="text-sm text-slate-700 bg-white/40 p-3 rounded-xl border border-white/50">{activeMarker.Spesifikasi_Teknis}</p>
            </div>
          </>
        ) : (
          <>
            <div className="liquid-glass-solid p-5 border-b border-white/30">
              <h2 className="text-lg font-bold text-teal-950">Laporan Reguler</h2>
              <p className="text-sm text-teal-800">Total {totalPenerimaReguler} Penerima Manfaat</p>
            </div>
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {loading ? (
                <p className="text-teal-800 text-center text-sm">Memuat data...</p>
              ) : (
                dataReguler.map((item, idx) => (
                  <div key={idx} className="bg-white/40 border border-white/50 p-3 rounded-xl">
                    <h3 className="font-bold text-teal-900 text-sm">{item.Jenis_Program}</h3>
                    <p className="text-xs text-teal-800">{item.Wilayah_Kecamatan} • {item.Jumlah_Penerima} Penerima</p>
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
