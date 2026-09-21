import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API_URL = "https://script.google.com/macros/s/AKfycbxYpfxaD8K4w4IqrQNqFr5E_bwuJe_3fFgdt0WhYB73t7zrighKphN9_afqBmtTAHjc/exec"; 

export default function App() {
  const [dataSpasial, setDataSpasial] = useState([]);
  const [dataReguler, setDataReguler] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [activeMarker, setActiveMarker] = useState(null);
  const [photoModal, setPhotoModal] = useState(null);

  const currentYear = new Date().getFullYear().toString();
  
  // Filter Dashboard
  const [selectedYear, setSelectedYear] = useState(currentYear);
  // Filter Peta
  const [mapYearFilter, setMapYearFilter] = useState('Semua');
  const [mapProgramFilter, setMapProgramFilter] = useState('Semua');
  // Filter Laporan (Default: Tahun berjalan & Semua program)
  const [laporanYearFilter, setLaporanYearFilter] = useState(currentYear);
  const [laporanProgramFilter, setLaporanProgramFilter] = useState('Semua');

  const posisiMalang = [-8.1345, 112.5746];
  const CHART_COLORS = ['#0f766e', '#0ea5e9', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#f43f5e', '#3b82f6'];

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

  // --- HELPER FORMATTING ---
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

  const getYear = (dateStr) => {
    if (!dateStr) return null;
    if (dateStr.includes('-')) return dateStr.split('-')[0];
    if (dateStr.includes(' ')) return dateStr.split(' ')[1];
    return dateStr.substring(0,4);
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

  const extractPhotos = (item) => {
    return [item.URL_Foto_1, item.URL_Foto_2, item.URL_Foto_3, item.URL_Foto_After, item.URL_Foto_Before, item.url_foto]
      .filter(url => url && url.trim() !== '');
  };

  // --- PEMETAAN WARNA & KATEGORI GLOBAL ---
  const allYears = [...new Set([
    ...dataSpasial.map(d => getYear(d.Tanggal_Update)),
    ...dataReguler.map(d => getYear(d.Periode_Laporan))
  ])].filter(Boolean).sort((a, b) => b - a);

  const allPrograms = [...new Set([
    ...dataSpasial.map(d => d.Jenis_Program),
    ...dataReguler.map(d => d.Jenis_Program)
  ])].filter(Boolean);

  const programColors = {};
  allPrograms.forEach((prog, index) => {
    programColors[prog] = CHART_COLORS[index % CHART_COLORS.length];
  });

  const createCustomPin = (color) => {
    const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="${color}" stroke="#ffffff" stroke-width="1.5"/></svg>`;
    return L.divIcon({ className: 'bg-transparent border-none', html: svgIcon, iconSize: [36, 36], iconAnchor: [18, 36], popupAnchor: [0, -36] });
  };

  // Validasi fallback tahun jika belum ada data di tahun berjalan
  useEffect(() => {
    if (!loading && allYears.length > 0) {
      if (!allYears.includes(selectedYear)) setSelectedYear('Semua');
      if (!allYears.includes(laporanYearFilter)) setLaporanYearFilter('Semua');
    }
  }, [loading, allYears, selectedYear, laporanYearFilter]);

  // --- DATA DASHBOARD ---
  const filteredSpasial = selectedYear === 'Semua' ? dataSpasial : dataSpasial.filter(d => getYear(d.Tanggal_Update) === selectedYear);
  const filteredReguler = selectedYear === 'Semua' ? dataReguler : dataReguler.filter(d => getYear(d.Periode_Laporan) === selectedYear);

  const totalLokasi = filteredSpasial.length;
  
  // PERHITUNGAN BARU: Spasial ambil dari Jumlah_Jiwa, Reguler ambil dari Jumlah_Penerima
  const penerimaSpasial = filteredSpasial.reduce((acc, curr) => acc + (parseInt(String(curr.Jumlah_Jiwa).replace(/[^0-9]/g, '')) || 0), 0);
  const penerimaReguler = filteredReguler.reduce((acc, curr) => acc + (parseInt(String(curr.Jumlah_Penerima).replace(/[^0-9]/g, '')) || 0), 0);
  const totalJiwaPenerima = penerimaSpasial + penerimaReguler;

  const danaReguler = filteredReguler.reduce((acc, curr) => acc + (parseInt(String(curr.Total_Nominal || '0').replace(/[^0-9]/g, '')) || 0), 0);
  const danaSpasial = filteredSpasial.reduce((acc, curr) => acc + (parseInt(String(curr.penggunaan_dana || curr.Penggunaan_Dana || '0').replace(/[^0-9]/g, '')) || 0), 0);
  const totalDana = danaReguler + danaSpasial;

  const summaryMap = {};
  filteredSpasial.forEach(item => {
    const prog = item.Jenis_Program || 'Lainnya';
    if (!summaryMap[prog]) summaryMap[prog] = { penerima: 0, dana: 0 };
    // Tabel rincian bawah juga menggunakan logika Jumlah_Jiwa
    summaryMap[prog].penerima += (parseInt(String(item.Jumlah_Jiwa).replace(/[^0-9]/g, '')) || 0);
    summaryMap[prog].dana += (parseInt(String(item.penggunaan_dana || item.Penggunaan_Dana || '0').replace(/[^0-9]/g, '')) || 0);
  });
  filteredReguler.forEach(item => {
    const prog = item.Jenis_Program || 'Lainnya';
    if (!summaryMap[prog]) summaryMap[prog] = { penerima: 0, dana: 0 };
    summaryMap[prog].penerima += (parseInt(String(item.Jumlah_Penerima).replace(/[^0-9]/g, '')) || 0);
    summaryMap[prog].dana += (parseInt(String(item.Total_Nominal || '0').replace(/[^0-9]/g, '')) || 0);
  });

  const programSummary = Object.keys(summaryMap).map(key => ({
    name: key, penerima: summaryMap[key].penerima, dana: summaryMap[key].dana, color: programColors[key] || '#94a3b8'
  }));
  const pieData = programSummary.filter(d => d.dana > 0).map(d => ({ name: d.name, value: d.dana, color: d.color }));

  // --- DATA PETA PUBLIK ---
  const mapFilteredData = dataSpasial.filter(item => {
    const isYearMatch = mapYearFilter === 'Semua' ? true : getYear(item.Tanggal_Update) === mapYearFilter;
    const isProgramMatch = mapProgramFilter === 'Semua' ? true : item.Jenis_Program === mapProgramFilter;
    return isYearMatch && isProgramMatch;
  });

  // --- DATA LAPORAN ---
  const baseLaporan = [
    ...dataSpasial.map(item => ({
      kategori: 'Infrastruktur',
      tanggal: item.Tanggal_Update,
      program: item.Jenis_Program,
      namaPenerima: item.Nama_Penerima || item.nama_penerima || '-', 
      wilayah: item.Kecamatan,
      penerima: `${item.Jumlah_Jiwa} Jiwa`, // Update Laporan agar pakai Jumlah_Jiwa
      dana: item.penggunaan_dana || item.Penggunaan_Dana,
      fotos: extractPhotos(item)
    })),
    ...dataReguler.map(item => ({
      kategori: 'Reguler',
      tanggal: item.Periode_Laporan,
      program: item.Jenis_Program,
      namaPenerima: item.Nama_Penerima || item.nama_penerima || item.Keterangan_Tambahan || item.Jenis_Program,
      wilayah: item.Wilayah_Kecamatan,
      penerima: `${item.Jumlah_Penerima} Jiwa`, // Update string biar seragam
      dana: item.Total_Nominal,
      fotos: extractPhotos(item)
    }))
  ];

  // Terapkan Filter Khusus Laporan
  const filteredLaporan = baseLaporan.filter(item => {
    const matchYear = laporanYearFilter === 'Semua' ? true : getYear(item.tanggal) === laporanYearFilter;
    const matchProgram = laporanProgramFilter === 'Semua' ? true : item.program === laporanProgramFilter;
    return matchYear && matchProgram;
  });

  // --- FUNGSI SHARE WHATSAPP ---
  const handleShareGlobal = () => {
    const totalDanaLaporan = filteredLaporan.reduce((acc, curr) => acc + (parseInt(String(curr.dana).replace(/[^0-9]/g, '')) || 0), 0);
    const domainLengkap = window.location.host; 
    
    const text = `*Laporan Penyaluran Bantuan NH Malang* 📊\nPeriode: ${laporanYearFilter}\nProgram: ${laporanProgramFilter}\n\nTotal Data: ${filteredLaporan.length} Penyaluran\nTotal Dana Tersalurkan: ${formatRupiah(totalDanaLaporan)}\n\nCek rincian & foto dokumentasi lengkap di:\n🌐 https://${domainLengkap}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleShareRow = (item) => {
    const domainLengkap = window.location.host;
    const text = `*Detail Penyaluran NH Malang* 🌿\n\nPenerima: ${item.namaPenerima}\nProgram: ${item.program}\nWilayah: ${item.wilayah}\nTanggal: ${formatDate(item.tanggal)}\nPenerima Manfaat: ${item.penerima}\nDana Disalurkan: ${formatRupiah(item.dana)}\n\nCek peta persebaran & dokumentasinya di:\n🌐 https://${domainLengkap}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const renderNavbar = () => (
    <nav className="absolute top-2 left-2 right-2 md:top-4 md:left-4 md:right-4 z-[1000] liquid-glass rounded-xl md:rounded-2xl flex flex-col md:flex-row items-center justify-between px-4 py-3 md:px-6 md:py-4 shadow-sm gap-3 md:gap-0">
      <div className="flex items-center gap-3 w-full md:w-auto">
        <div className="w-8 h-8 md:w-10 md:h-10 bg-teal-500 rounded-full flex items-center justify-center text-white font-bold text-xs md:text-base shadow-lg shadow-teal-500/50 flex-shrink-0">NH</div>
        <div>
          <h1 className="text-lg md:text-xl font-bold text-teal-900 leading-tight">Program Layanan Sosial</h1>
          <p className="text-xs md:text-sm text-teal-700 hidden md:block">LAZNAS Nurul Hayat Malang</p>
        </div>
      </div>
      <div className="flex gap-2 font-medium text-xs md:text-sm w-full md:w-auto overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
        <button onClick={() => setActiveTab('dashboard')} className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg transition whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-teal-500 text-white shadow-md' : 'text-teal-800 hover:bg-white/50 border border-transparent'}`}>Dashboard</button>
        <button onClick={() => setActiveTab('peta')} className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg transition whitespace-nowrap ${activeTab === 'peta' ? 'bg-teal-500 text-white shadow-md' : 'text-teal-800 hover:bg-white/50 border border-transparent'}`}>Peta Publik</button>
        <button onClick={() => setActiveTab('laporan')} className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg transition whitespace-nowrap ${activeTab === 'laporan' ? 'bg-teal-500 text-white shadow-md' : 'text-teal-800 hover:bg-white/50 border border-transparent'}`}>Laporan</button>
      </div>
    </nav>
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-100 font-sans">
      {renderNavbar()}

      {/* ========================================= */}
      {/* DASHBOARD                                 */}
      {/* ========================================= */}
      {activeTab === 'dashboard' && (
        <div className="absolute inset-0 pt-32 md:pt-28 px-4 md:px-8 pb-8 overflow-y-auto z-10">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-xl md:text-2xl font-bold text-teal-900">Dashboard Program Laysos</h2>
              <div className="flex items-center gap-3 bg-white/40 px-4 py-2 rounded-xl border border-white/50 shadow-sm backdrop-blur-md">
                <span className="text-sm font-semibold text-teal-800">Filter Tahun:</span>
                <select 
                  className="bg-transparent text-teal-900 font-bold outline-none cursor-pointer"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                >
                  <option value="Semua">Semua Waktu</option>
                  {allYears.map(yr => <option key={yr} value={yr}>{yr}</option>)}
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              <div className="liquid-glass-solid p-6 rounded-2xl flex flex-col justify-center items-center text-center shadow-sm hover:-translate-y-1 transition duration-300">
                <span className="text-4xl mb-3">📍</span>
                <h3 className="text-teal-800 font-semibold mb-2 text-sm uppercase tracking-wider">Total Lokasi Program</h3>
                <p className="text-3xl font-bold text-teal-600">{loading ? '...' : totalLokasi} <span className="text-sm font-normal text-teal-800">Titik</span></p>
              </div>
              
              {/* TAMPILAN KARTU PENERIMA MANFAAT YANG BARU (SATU ANGKA) */}
              <div className="liquid-glass-solid p-6 rounded-2xl flex flex-col justify-center items-center text-center shadow-sm hover:-translate-y-1 transition duration-300">
                <span className="text-4xl mb-3">👥</span>
                <h3 className="text-teal-800 font-semibold mb-2 text-sm uppercase tracking-wider">Penerima Manfaat</h3>
                {loading ? <p>...</p> : (
                  <p className="text-3xl font-bold text-teal-600">{totalJiwaPenerima} <span className="text-sm font-normal text-teal-800">Jiwa</span></p>
                )}
              </div>
              
              <div className="liquid-glass-solid p-6 rounded-2xl flex flex-col justify-center items-center text-center shadow-sm sm:col-span-2 md:col-span-1 hover:-translate-y-1 transition duration-300">
                <span className="text-4xl mb-3">💰</span>
                <h3 className="text-teal-800 font-semibold mb-2 text-sm uppercase tracking-wider">Dana Tersalurkan</h3>
                <p className="text-2xl font-bold text-teal-600">{loading ? '...' : formatRupiah(totalDana)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
              <div className="liquid-glass-solid p-6 rounded-2xl shadow-sm">
                 <h3 className="text-lg font-bold text-teal-900 mb-6 uppercase tracking-wide">Ringkasan Program</h3>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b-2 border-teal-500/20 text-teal-800 text-xs uppercase tracking-wider">
                          <th className="pb-3 font-semibold">Jenis Program</th>
                          <th className="pb-3 font-semibold text-center">Penerima (Jiwa)</th>
                          <th className="pb-3 font-semibold text-right">Dana Tersalurkan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-teal-500/10">
                        {loading ? (
                          <tr><td colSpan="3" className="py-4 text-center text-sm text-teal-700">Memuat data...</td></tr>
                        ) : programSummary.length > 0 ? (
                          programSummary.map((prog, idx) => (
                            <tr key={idx} className="hover:bg-teal-50/50 transition">
                              <td className="py-4 text-sm font-medium text-teal-900 flex items-center gap-3">
                                 <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: prog.color }}></div> 
                                 {prog.name}
                              </td>
                              <td className="py-4 text-sm text-teal-800 text-center">{prog.penerima}</td>
                              <td className="py-4 text-sm font-semibold text-teal-800 text-right">{formatRupiah(prog.dana)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr><td colSpan="3" className="py-4 text-center text-sm text-teal-700">Tidak ada data.</td></tr>
                        )}
                      </tbody>
                    </table>
                 </div>
              </div>
              <div className="liquid-glass-solid p-6 rounded-2xl shadow-sm flex flex-col">
                 <h3 className="text-lg font-bold text-teal-900 mb-2 uppercase tracking-wide">Penggunaan Dana</h3>
                 <div className="flex-1 min-h-[280px] w-full mt-4">
                    {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={4} dataKey="value" stroke="rgba(255,255,255,0.5)" strokeWidth={2}>
                            {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                          </Pie>
                          <Tooltip formatter={(value) => formatRupiah(value)} contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} itemStyle={{ color: '#134e4a', fontWeight: 'bold' }} />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#115e59' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-teal-700/50 text-sm">Tidak ada data untuk tahun ini</div>
                    )}
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* PETA PUBLIK                               */}
      {/* ========================================= */}
      {activeTab === 'peta' && (
        <>
          <MapContainer center={posisiMalang} zoom={11} zoomControl={false} style={{ height: "100vh", width: "100vw", zIndex: 0 }}>
            <TileLayer attribution='&copy; OSM' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {!loading && mapFilteredData.map((item, index) => {
              const lat = parseFloat(String(item.Latitude).replace(',', '.'));
              const lng = parseFloat(String(item.Longitude).replace(',', '.'));
              if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
              const pinColor = programColors[item.Jenis_Program] || '#94a3b8';
              return (
                <Marker key={index} position={[lat, lng]} icon={createCustomPin(pinColor)} eventHandlers={{ click: () => setActiveMarker(item) }}>
                  <Popup>
                    <div className="font-sans text-center">
                      <h3 className="font-bold text-teal-800">{item.Nama_Penerima}</h3>
                      <p className="text-xs text-slate-600">{item.Jenis_Program}</p>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          <div className="absolute top-28 left-4 md:left-6 z-[1000] liquid-glass rounded-2xl p-4 flex flex-col gap-3 shadow-md w-[calc(100%-2rem)] md:w-64 border border-white/50">
            <h3 className="text-sm font-bold text-teal-900 mb-1">Filter Peta</h3>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider font-semibold text-teal-800">Tahun</label>
              <select className="w-full bg-white/50 border border-white/50 text-teal-900 text-sm rounded-lg focus:ring-teal-500 p-2 outline-none" value={mapYearFilter} onChange={(e) => { setMapYearFilter(e.target.value); setActiveMarker(null); }}>
                <option value="Semua">Semua Waktu</option>
                {allYears.map(yr => <option key={yr} value={yr}>{yr}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider font-semibold text-teal-800">Jenis Program</label>
              <select className="w-full bg-white/50 border border-white/50 text-teal-900 text-sm rounded-lg focus:ring-teal-500 p-2 outline-none" value={mapProgramFilter} onChange={(e) => { setMapProgramFilter(e.target.value); setActiveMarker(null); }}>
                <option value="Semua">Semua Program</option>
                {[...new Set(dataSpasial.map(d => d.Jenis_Program))].filter(Boolean).map(prog => (
                  <option key={prog} value={prog}>{prog}</option>
                ))}
              </select>
            </div>
          </div>

          <aside className="absolute bottom-4 left-4 right-4 md:top-28 md:bottom-auto md:left-auto md:right-4 z-[1000] md:w-80 liquid-glass rounded-2xl flex flex-col overflow-hidden max-h-[50vh] md:max-h-[75vh] shadow-xl transition-all">
            {activeMarker ? (
              <>
                <div className="liquid-glass-solid p-4 md:p-5 border-b border-white/30 relative">
                  <button onClick={() => setActiveMarker(null)} className="absolute top-2 right-3 text-teal-900 font-bold text-lg md:top-4 md:right-4 md:text-base">✕</button>
                  <span className="text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm" style={{ backgroundColor: programColors[activeMarker.Jenis_Program] || '#94a3b8' }}>
                    {activeMarker.Jenis_Program}
                  </span>
                  <h2 className="text-lg md:text-xl font-bold text-teal-950 mt-2 pr-6">{activeMarker.Nama_Penerima}</h2>
                  <p className="text-xs md:text-sm text-teal-800">{activeMarker.Kecamatan}</p>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {extractPhotos(activeMarker).length > 0 && (
                    <div className="flex overflow-x-auto gap-2 p-3 bg-teal-900/5 snap-x hide-scrollbar border-b border-white/50">
                      {extractPhotos(activeMarker).map((fotoUrl, idx) => (
                        <img key={idx} src={getDirectImage(fotoUrl)} alt={`Dokumentasi ${idx + 1}`} className="w-3/4 md:w-4/5 h-32 md:h-36 object-cover rounded-lg cursor-pointer flex-shrink-0 snap-center shadow-sm" onClick={() => setPhotoModal(extractPhotos(activeMarker))} />
                      ))}
                    </div>
                  )}
                  <div className="p-4 md:p-5 space-y-2">
                    <p className="text-xs md:text-sm bg-white/40 p-3 rounded-xl border border-white/50">{activeMarker.Spesifikasi_Teknis}</p>
                    <p className="text-xs text-teal-700">Penerima Manfaat: <b>{activeMarker.Jumlah_Jiwa} Jiwa</b></p>
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

      {/* ========================================= */}
      {/* LAPORAN (DENGAN FILTER & WHATSAPP)        */}
      {/* ========================================= */}
      {activeTab === 'laporan' && (
        <div className="absolute inset-0 pt-32 md:pt-28 px-4 md:px-8 pb-8 overflow-y-auto z-10">
          <div className="max-w-6xl mx-auto liquid-glass-solid rounded-2xl p-4 md:p-6 shadow-sm border border-white/50">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-teal-900 mb-3">Detail Laporan Penyaluran Laysos</h2>
                <div className="flex flex-wrap items-center gap-3">
                  <select 
                    className="bg-white/50 border border-white/50 text-teal-900 font-semibold text-sm rounded-lg p-2 outline-none focus:ring-1 focus:ring-teal-500"
                    value={laporanYearFilter}
                    onChange={(e) => setLaporanYearFilter(e.target.value)}
                  >
                    <option value="Semua">Semua Tahun</option>
                    {allYears.map(yr => <option key={yr} value={yr}>{yr}</option>)}
                  </select>
                  
                  <select 
                    className="bg-white/50 border border-white/50 text-teal-900 font-semibold text-sm rounded-lg p-2 outline-none focus:ring-1 focus:ring-teal-500"
                    value={laporanProgramFilter}
                    onChange={(e) => setLaporanProgramFilter(e.target.value)}
                  >
                    <option value="Semua">Semua Program</option>
                    {allPrograms.map(prog => <option key={prog} value={prog}>{prog}</option>)}
                  </select>
                </div>
              </div>
              
              <button 
                onClick={handleShareGlobal}
                className="flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-semibold py-2 px-4 rounded-xl shadow-lg shadow-green-500/30 transition whitespace-nowrap"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                Bagikan Laporan (WA)
              </button>
            </div>
            
            <div className="overflow-x-auto pb-4">
              <table className="w-full text-left border-collapse whitespace-nowrap min-w-[700px]">
                <thead>
                  <tr className="bg-teal-500/10 text-teal-900 border-b border-teal-500/20">
                    <th className="p-3 text-xs md:text-sm font-semibold">Tgl / Periode</th>
                    <th className="p-3 text-xs md:text-sm font-semibold">Kategori</th>
                    <th className="p-3 text-xs md:text-sm font-semibold">Nama Penerima & Wilayah</th>
                    <th className="p-3 text-xs md:text-sm font-semibold text-center">Penerima (Jiwa)</th>
                    <th className="p-3 text-xs md:text-sm font-semibold text-right">Nominal Dana</th>
                    <th className="p-3 text-xs md:text-sm font-semibold text-center">Dokumentasi</th>
                    <th className="p-3 text-xs md:text-sm font-semibold text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="7" className="text-center p-4 text-teal-700 text-sm">Memuat data tabel...</td></tr>
                  ) : filteredLaporan.length === 0 ? (
                    <tr><td colSpan="7" className="text-center p-8 text-teal-700 text-sm">Tidak ada data untuk filter yang dipilih.</td></tr>
                  ) : (
                    filteredLaporan.map((item, index) => (
                      <tr key={index} className="border-b border-teal-500/10 hover:bg-white/40 transition">
                        <td className="p-3 text-xs md:text-sm text-teal-800">{formatDate(item.tanggal)}</td>
                        <td className="p-3 text-xs md:text-sm font-medium text-teal-900">
                          <span 
                             className="px-2 py-1 rounded text-[10px] md:text-xs text-white shadow-sm"
                             style={{ backgroundColor: programColors[item.program] || '#94a3b8' }}
                          >
                            {item.program}
                          </span>
                        </td>
                        <td className="p-3 text-xs md:text-sm text-teal-900">
                          <strong>{item.namaPenerima}</strong> <br/>
                          <span className="text-[10px] md:text-xs text-teal-700">{item.wilayah}</span>
                        </td>
                        <td className="p-3 text-xs md:text-sm text-teal-800 text-center">{item.penerima}</td>
                        <td className="p-3 text-xs md:text-sm text-teal-800 text-right font-medium">{formatRupiah(item.dana)}</td>
                        <td className="p-3 text-center">
                          {item.fotos.length > 0 ? (
                            <button 
                              onClick={() => setPhotoModal(item.fotos)} 
                              className="inline-block px-3 py-1.5 bg-teal-500 hover:bg-teal-600 shadow-md shadow-teal-500/30 text-white text-[10px] md:text-xs rounded-lg transition"
                            >
                              Lihat Foto ({item.fotos.length})
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                           <button 
                              onClick={() => handleShareRow(item)}
                              className="inline-flex items-center justify-center p-1.5 bg-green-100 text-green-700 hover:bg-[#25D366] hover:text-white rounded-lg transition shadow-sm border border-green-200 hover:border-transparent"
                              title="Bagikan data ini ke WhatsApp"
                           >
                             <svg className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                           </button>
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
