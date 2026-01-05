from flask import Flask, render_template, request, jsonify
import sympy as sp
import numpy as np

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/calculate', methods=['POST'])
def calculate():
    try:
        data = request.json
        function_str = data.get('function')
        lower_bound_str = data.get('lower')
        upper_bound_str = data.get('upper')

        if not function_str or not lower_bound_str or not upper_bound_str:
            return jsonify({'error': 'Missing required fields'}), 400

        x = sp.symbols('x')
        
        # Parse function safely
        # specific_domain allowed to restrict inputs if needed, but standard sympy parsing is powerful
        # transform_expressions helps with implicit multiplication like "2x" -> "2*x"
        from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application, convert_xor
        transformations = (standard_transformations + (implicit_multiplication_application, convert_xor))
        
        try:
            f = parse_expr(function_str, transformations=transformations)
        except Exception as e:
            return jsonify({'error': f'Invalid function: {str(e)}'}), 400

        try:
            a = sp.sympify(lower_bound_str)
            b = sp.sympify(upper_bound_str)
        except Exception as e:
            return jsonify({'error': f'Invalid bounds: {str(e)}'}), 400

        if a >= b:
             return jsonify({'error': 'Lower bound must be strictly less than upper bound'}), 400

        # Indefinite Integral
        antiderivative = sp.integrate(f, x)
        
        # Definite Integral
        definite_integral = sp.integrate(f, (x, a, b))
        
        # Steps generation
        val_b = antiderivative.subs(x, b)
        val_a = antiderivative.subs(x, a)
        result_val = definite_integral.evalf()
        
        steps = [
            f"1. Identifikasi fungsi:<br>$$f(x) = {sp.latex(f)}$$",
            f"2. Tulis integral tentu:<br>$$\\int_{{{sp.latex(a)}}}^{{{sp.latex(b)}}} {sp.latex(f)} \\, dx$$",
            f"3. Cari antiturunan:<br>$$F(x) = {sp.latex(antiderivative)}$$",
            f"4. Terapkan Teorema Dasar Kalkulus:<br>$$F({sp.latex(b)}) - F({sp.latex(a)})$$",
            f"5. Evaluasi batas:<br>$${sp.latex(val_b)} - ({sp.latex(val_a)})$$",
            f"6. Hasil akhir:<br>$$\\boxed{{{sp.latex(definite_integral)}}} \\approx {result_val:.4f}$$"
        ]

        # Graph Data
        # Generate points for the function and the shaded area
        # padding 10%
        # Convert bounds to float for plotting functions
        a_float = float(a)
        b_float = float(b)
        
        span = b_float - a_float
        plot_start = a_float - span * 0.5
        plot_end = b_float + span * 0.5
        
        x_vals = np.linspace(plot_start, plot_end, 200)
        # lambdify is faster for numerical evaluation
        f_func = sp.lambdify(x, f, "numpy")
        
        try:
            y_vals = f_func(x_vals)
            # Handle possible singularities or complex numbers by filtering/masking?
            # For now, simplistic approach
            y_vals = np.nan_to_num(y_vals, nan=0.0, posinf=0.0, neginf=0.0)
        except Exception as e:
            # Fallback if numpy conversion fails
            y_vals = [float(f.subs(x, val)) for val in x_vals]

        # Shaded area points
        x_area = np.linspace(a_float, b_float, 100)
        y_area = f_func(x_area)
        
        return jsonify({
            'result': str(definite_integral.evalf()),
            'latex_result': sp.latex(definite_integral),
            'steps': steps,
            'plot_data': {
                'x': x_vals.tolist(),
                'y': y_vals.tolist(),
                'x_area': x_area.tolist(),
                'y_area': y_area.tolist()
            }
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
