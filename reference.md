Phase 1: Core Infrastructure (Critical) - ❌ BELUM SELESAI
Deploy Apps Script Backend:
Rencana: Mengikuti APPS_SCRIPT_SETUP.md, deploy kode, dan konfigurasi API_TOKEN.
Fakta: Ini belum dikerjakan. Ini adalah prioritas utama yang menghalangi semua kemajuan lainnya.
Set Up Environment Configuration:
Rencana: Membuat file .env dari .env.example untuk menyimpan kunci API Gemini dan token Apps Script.
Fakta: Ini belum dikerjakan karena kita belum memiliki URL deployment dan token dari Apps Script.
Kesimpulan Phase 1: Kita sepenuhnya terhenti di sini. Tidak ada fungsionalitas nyata yang bisa berjalan sampai Phase 1 selesai.

Phase 2: AI Sheet Editing Capabilities - ❌ BELUM DIMULAI
Enhance AI Chat Integration & Connect to Sheet Operations:

Rencana: Memperbaiki parseUserInstruction, menambah function calling, dan menyambungkan handleActionGenerated ke operasi sheet.
Fakta: Ini belum bisa dimulai karena Phase 1 belum selesai. Namun, flow detail yang Anda berikan adalah blueprint sempurna untuk mengerjakan bagian ini.
Implement the Hidden LLM Normalizer:

Rencana: Membuat middleware untuk menormalkan output LLM yang "aneh".
Fakta: Ini adalah implementasi dari "Guardrail Layer" yang Anda deskripsikan. Komponen-komponennya (Regex, Normalizer, Validator, Hidden LLM Parser) belum dibuat.
Kesimpulan Phase 2: Konsepnya sudah sangat matang (terutama dengan flow yang Anda berikan), tetapi implementasi kode belum dimulai karena ketergantungan pada Phase 1.

Phase 3: Security and Robustness - ❌ BELUM DIMULAI
Rencana: Menambah sanitasi formula, audit log, dan snapshot.
Fakta: Ini adalah langkah-langkah penting berikutnya setelah fungsionalitas inti berjalan. Belum ada yang diimplementasikan.
Phase 4: UX Improvements - ❌ BELUM DIMULAI
Rencana: Menambah feedback, loading state, dan dokumentasi pengguna.
Fakta: Ini adalah polesan akhir. Belum relevan untuk dikerjakan sekarang.
Fokus pada "Guardrail Layer"
Flow yang Anda berikan sangat membantu memperjelas apa yang dimaksud dengan "Hidden LLM Normalizer" dan "AI Chat Editing" di roadmap.

Regex + Normalizer: Ini adalah langkah pertama untuk memastikan output AI setidaknya memiliki struktur dasar sebelum di-parse. Belum ada kodenya.
Schema Validator: Ini adalah penjaga gerbang utama untuk memastikan output AI sesuai dengan kontrak (schema) yang kita tentukan. Belum ada kodenya.
Hidden LLM Parser: Ini adalah fallback cerdas jika semua validasi gagal. Ide bagus untuk meningkatkan resiliensi. Belum ada kodenya.
Singkatnya, seluruh lapisan "Guardrail" ini adalah komponen krusial yang masih hilang.

Rekomendasi & Langkah Selanjutnya (Sesuai Prioritas)
SELESAIKAN PHASE 1 (Wajib & Mendesak):

Tugas: Ikuti APPS_SCRIPT_SETUP.md untuk men-deploy public/apps-script-template.js sebagai web app.
Hasil: Dapatkan URL Deployment Apps Script yang sebenarnya dan buat API_TOKEN di Script Properties.
KONFIGURASI FRONTEND ENVIRONMENT:

Tugas: Buat file .env di root project.
Isi: Masukkan URL dan API_TOKEN yang didapat dari langkah 1, beserta Gemini API Key Anda.
Contoh .env:
VITE_GEMINI_API_KEY=AIza...
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_REAL_SCRIPT_ID/exec
VITE_API_TOKEN=SECRET_TOKEN_FROM_APPS_SCRIPT
BUKTIKAN KONEKSI END-TO-END (Proof of Concept):

Tugas: Implementasikan fungsi paling sederhana: listTabs. Buat AIAssistantChat.jsx memanggil AppsScriptService.listTabs() dan tampilkan hasilnya di console. Ini akan membuktikan bahwa jembatan antara frontend dan backend sudah tersambung.
IMPLEMENTASIKAN GUARDRAIL LAYER (Secara Bertahap):

Tugas: Mulai bangun Regex Check dan Schema Validator untuk satu aksi saja, misalnya fetchTabData. Setelah itu, baru kembangkan untuk aksi-aksi lainnya dan tambahkan Normalizer serta Hidden LLM Parser.