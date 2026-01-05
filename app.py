# Mengimpor library yang diperlukan
from flask import Flask, render_template, request, jsonify
import sympy as sp
import numpy as np

# Inisialisasi aplikasi Flask
# Flask digunakan sebagai kerangka kerja web untuk menangani permintaan HTTP dari pengguna
app = Flask(__name__)

# Rute untuk halaman utama
# Saat pengguna membuka aplikasi web, fungsi ini akan dijalankan
@app.route('/')
def index():
    # Menampilkan file HTML dari folder templates
    return render_template('index.html')

# Rute untuk melakukan perhitungan integral
# Endpoint ini menerima permintaan POST dari frontend dengan data inputan fungsi, batas bawah, dan batas atas
@app.route('/calculate', methods=['POST'])
def calculate():
    try:
        # Mengambil data JSON yang dikirim dari klien (browser)
        data = request.json
        function_str = data.get('function') # String fungsi matematika
        lower_bound_str = data.get('lower') # String batas bawah intergal
        upper_bound_str = data.get('upper') # String batas atas integral

        # Memastikan semua data yang diperlukan ada
        if not function_str or not lower_bound_str or not upper_bound_str:
            return jsonify({'error': 'Data yang diperlukan tidak lengkap'}), 400

        # Mendefinisikan simbol matematika 'x' untuk digunakan dalam ekspresi SymPy
        x = sp.symbols('x')
        
        # Pengaturan untuk membaca string fungsi
        # Transformasi ini memungkinkan penulisan seperti "2x" dibaca sebagai "2 dikali x"
        from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application, convert_xor
        transformations = (standard_transformations + (implicit_multiplication_application, convert_xor))
        
        try:
            # Mengubah string input pengguna menjadi ekspresi matematika SymPy
            f = parse_expr(function_str, transformations=transformations)
        except Exception as e:
            # Jika format fungsi salah, kirim pesan error
            return jsonify({'error': f'Fungsi tidak valid: {str(e)}'}), 400

        try:
            # Mengubah string batas menjadi angka atau ekspresi simbolik
            a = sp.sympify(lower_bound_str)
            b = sp.sympify(upper_bound_str)
        except Exception as e:
            return jsonify({'error': f'Batas tidak valid: {str(e)}'}), 400

        # Validasi logika: Batas bawah harus lebih kecil dari batas atas agar visualisasi sesuai
        if a >= b:
             return jsonify({'error': 'Batas bawah harus lebih kecil dari batas atas'}), 400

        # Langkah 1: Mencari Integral Tak Tentu 
        # sp.integrate(f, x) mencari fungsi F(x) dimana F'(x) = f(x)
        antiderivative = sp.integrate(f, x)
        
        # Langkah 2: Menghitung Integral Tentu 
        # Menghitung luas pasti di bawah kurva dari a ke b
        definite_integral = sp.integrate(f, (x, a, b))
        
        #Langkah 3: Persiapan Penjelasan Langkah-demi-Langkah
        # Evaluasi F(b) dan F(a) untuk ditampilkan dalam rumus
        val_b = antiderivative.subs(x, b)
        val_a = antiderivative.subs(x, a)
        # Menghitung hasil numerik 
        result_val = definite_integral.evalf()
        
        # Menyusun langkah-langkah penyelesaian dalam format LaTeX untuk ditampilkan di web
        steps = [
            f"1. Identifikasi fungsi:<br>$$f(x) = {sp.latex(f)}$$",
            f"2. Tulis integral tentu:<br>$$\\int_{{{sp.latex(a)}}}^{{{sp.latex(b)}}} {sp.latex(f)} \\, dx$$",
            f"3. Cari antiturunan:<br>$$F(x) = {sp.latex(antiderivative)}$$",
            f"4. Terapkan Teorema Dasar Kalkulus:<br>$$F({sp.latex(b)}) - F({sp.latex(a)})$$",
            f"5. Evaluasi batas:<br>$${sp.latex(val_b)} - ({sp.latex(val_a)})$$",
            f"6. Hasil akhir:<br>$$\\boxed{{{sp.latex(definite_integral)}}} \\approx {result_val:.4f}$$"
        ]

        # Langkah 4: Persiapan Data Grafik
        # Kami perlu menghasilkan sekumpulan titik (x, y) untuk digambar oleh library grafik di frontend
        
        # Konversi batas ke tipe data float untuk keperluan plotting numerik
        a_float = float(a)
        b_float = float(b)
        
        # Menentukan rentang grafik agar tidak terlalu sempit (tambah 50% rentang di kiri dan kanan)
        span = b_float - a_float
        plot_start = a_float - span * 0.5
        plot_end = b_float + span * 0.5
        
        # Membuat 200 titik x secara merata dari plot_start sampai plot_end 
        x_vals = np.linspace(plot_start, plot_end, 200)
        
        # Mengubah fungsi simbolik SymPy menjadi fungsi Python/NumPy yang cepat dieksekusi
        f_func = sp.lambdify(x, f, "numpy")
        
        try:
            # Menghitung nilai y untuk setiap titik x
            y_vals = f_func(x_vals)
            # Membersihkan nilai y dari hasil yang tidak valid agar grafik tidak error
            y_vals = np.nan_to_num(y_vals, nan=0.0, posinf=0.0, neginf=0.0)
        except Exception as e:
            # Metode cadangan: Jika konversi NumPy gagal, hitung satu per satu
            y_vals = [float(f.subs(x, val)) for val in x_vals]

        # Langkah 5: Data Area yang Diarsir
        # Membuat titik-titik khusus hanya untuk area di bawah kurva antara a dan b
        x_area = np.linspace(a_float, b_float, 100)
        y_area = f_func(x_area)
        
        # Mengirim respon berupa format JSON kembali ke klien yang berisi hasil, langkah, dan data grafik
        return jsonify({
            'result': str(definite_integral.evalf()),
            'latex_result': sp.latex(definite_integral),
            'steps': steps,
            'plot_data': {
                'x': x_vals.tolist(),      # Garis kurva utama
                'y': y_vals.tolist(),
                'x_area': x_area.tolist(), # Area yang diarsir
                'y_area': y_area.tolist()
            }
        })

    except Exception as e:
        # Menangkap error umum yang tidak terduga dan mengirimkannya ke klien
        return jsonify({'error': str(e)}), 500

# Menjalankan aplikasi jika file ini dieksekusi langsung
if __name__ == '__main__':
    app.run(debug=True)
