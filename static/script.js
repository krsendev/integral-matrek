// Event Listener, intinya menunggu seluruh konten halaman HTML dimuat sebelum menjalankan skrip
document.addEventListener('DOMContentLoaded', () => {
    // Mendapatkan referensi ke elemen-elemen HTML berdasarkan ID mereka
    const form = document.getElementById('calculator-form');       // Formulir input
    const calculateBtn = document.getElementById('calculate-btn'); // Tombol hitung
    const errorMessage = document.getElementById('error-message'); // Tempat menampilkan pesan error
    const resultSummary = document.getElementById('result-summary'); // Kontainer ringkasan hasil
    const stepsSection = document.getElementById('steps-section');   // Kontainer langkah-langkah
    const stepsContent = document.getElementById('steps-content');   // Isi langkah-langkah
    const mathResult = document.querySelector('.math-result');       // Elemen untuk menampilkan rumus hasil utama

    // Menambahkan event listener saat formulir disubmit
    form.addEventListener('submit', async (e) => {
        e.preventDefault(); // Mencegah halaman reload secara otomatis saat submit form

        // Reset Tampilan UI 
        // Menyembunyikan pesan error lama dan menonaktifkan tombol agar tidak diklik ganda
        errorMessage.classList.add('hidden');
        errorMessage.textContent = '';
        calculateBtn.disabled = true;
        calculateBtn.textContent = 'Sedang Menghitung...';

        // Mengambil data dari input form
        const formData = new FormData(form);
        const data = {
            function: formData.get('function'), // Mengambil nilai fungsi input
            lower: formData.get('lower'),       // Mengambil nilai batas bawah
            upper: formData.get('upper')        // Mengambil nilai batas atas
        };

        try {
            // Mengirim Permintaan ke Backend 
            // Menggunakan fetch API untuk mengirim data JSON ke backend Python
            const response = await fetch('/calculate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data) // Mengubah objek data Javascript menjadi string JSON
            });

            // Menunggu respon dari server dan mengubahnya kembali menjadi objek Javascript
            const result = await response.json();

            // Jika status respon bukan OK 
            if (!response.ok) {
                // Lempar error agar ditangkap blok catch di bawah
                throw new Error(result.error || 'Terjadi kesalahan saat menghitung.');
            }

            // Jika sukses, panggil fungsi untuk menampilkan hasil
            displayResults(result, data);

        } catch (error) {
            // Penanganan Error
            // Tampilkan pesan error ke pengguna
            errorMessage.textContent = error.message;
            errorMessage.classList.remove('hidden');
            // Sembunyikan bagian hasil jika terjadi error
            resultSummary.classList.add('hidden');
            stepsSection.classList.add('hidden');
        } finally {
            // Pembersihan Akhir
            // Kode ini selalu dijalankan baik sukses maupun error
            // Mengembalikan tombol ke keadaan semula
            calculateBtn.disabled = false;
            calculateBtn.textContent = 'Hitung Integral';
        }
    });

    // Fungsi untuk menampilkan hasil perhitungan ke layar
    function displayResults(result, inputData) {
        // Tampilkan kontainer hasil dan langkah-langkah
        resultSummary.classList.remove('hidden');
        stepsSection.classList.remove('hidden');

        // Update Hasil Matematis
        // Membuat string LaTeX untuk menampilkan integral tentu dan hasilnya
        // result.latex_result didapat dari backend
        const latexResult = `$$ \\int_{${inputData.lower}}^{${inputData.upper}} ${result.latex_result} \\approx ${parseFloat(result.result).toFixed(4)} $$`;

        // Menuliskan HTML ke elemen hasil. Disini kami tulis ulang format integralnya untuk kejelasan
        mathResult.innerHTML = `$$ \\int_{${inputData.lower}}^{${inputData.upper}} (${inputData.function}) \\, dx = ${result.latex_result} $$`;

        // Merender ulang elemen tersebut menggunakan MathJax agar rumus matematika memiliki tampilan yang bagus
        MathJax.typesetPromise([mathResult]);

        // Render Langkah-Langkah Pengerjaan
        stepsContent.innerHTML = ''; // Kosongkan isi langkah lama
        result.steps.forEach(step => {
            // Untuk setiap langkah yang dikirim backend:
            const div = document.createElement('div');
            div.className = 'step-item';
            div.innerHTML = step; // Isi langkah
            stepsContent.appendChild(div);
        });
        // Render MathJax juga untuk bagian langkah-langkah
        MathJax.typesetPromise([stepsContent]);

        //Render visualisasi grafik
        // Memanggil fungsi khusus untuk menggambar grafik menggunakan Plotly.js
        renderPlot(result.plot_data, inputData);
    }

    // Fungsi untuk menggambar grafik interaktif
    function renderPlot(plotData, inputData) {
        // Mengambil array koordinat x dan y dari data backend
        const xRaw = plotData.x;
        const yRaw = plotData.y;
        const xArea = plotData.x_area;
        const yArea = plotData.y_area;

        // Untuk garis Kurva Fungsi utama
        const trace1 = {
            x: xRaw,
            y: yRaw,
            mode: 'lines',
            name: `f(x)`,
            line: {
                color: '#6366f1', // Warna ungu/biru modern
                width: 3
            }
        };

        // Untuk area yang diarsir
        // Kita menggunakan fill: 'tozeroy' untuk mengisi warna sampai sumbu x
        const trace2 = {
            x: xArea,
            y: yArea,
            mode: 'none',    // Tidak ada garis tepi, hanya isian
            name: 'Luas',
            fill: 'tozeroy', // Mengisi area ke bawah sampai y=0
            fillcolor: 'rgba(99, 102, 241, 0.3)', // Warna transparan
            type: 'scatter'
        };

        // Layout Grafik: Konfigurasi tampilan grafik
        const layout = {
            title: `Grafik f(x) dari ${inputData.lower} hingga ${inputData.upper}`,
            font: { family: 'Outfit, sans-serif' }, // Font yang sama dengan website
            showlegend: false,
            xaxis: {
                title: 'x',
                zeroline: true,
                zerolinecolor: '#94a3b8',
                gridcolor: '#e2e8f0'
            },
            yaxis: {
                title: 'f(x)',
                zeroline: true,
                zerolinecolor: '#94a3b8',
                gridcolor: '#e2e8f0'
            },
            margin: { t: 40, r: 20, l: 50, b: 40 }, // Margin grafik
            hovermode: 'closest' // Mode tooltip saat mouse diarahkan
        };

        const config = { responsive: true }; // Grafik responsif

        // Perintah Plotly untuk menggambar grafik di div dengan ID 'plot-container'
        Plotly.newPlot('plot-container', [trace1, trace2], layout, config);
    }
});
