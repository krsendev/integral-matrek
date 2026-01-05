document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('calculator-form');
    const calculateBtn = document.getElementById('calculate-btn');
    const errorMessage = document.getElementById('error-message');
    const resultSummary = document.getElementById('result-summary');
    const stepsSection = document.getElementById('steps-section');
    const stepsContent = document.getElementById('steps-content');
    const mathResult = document.querySelector('.math-result');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Reset UI
        errorMessage.classList.add('hidden');
        errorMessage.textContent = '';
        calculateBtn.disabled = true;
        calculateBtn.textContent = 'Calculating...';
        
        const formData = new FormData(form);
        const data = {
            function: formData.get('function'),
            lower: formData.get('lower'),
            upper: formData.get('upper')
        };

        try {
            const response = await fetch('/calculate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'An error occurred during calculation.');
            }

            displayResults(result, data);

        } catch (error) {
            errorMessage.textContent = error.message;
            errorMessage.classList.remove('hidden');
            // Hide results if error
            resultSummary.classList.add('hidden');
            stepsSection.classList.add('hidden');
        } finally {
            calculateBtn.disabled = false;
            calculateBtn.textContent = 'Calculate Integral';
        }
    });

    function displayResults(result, inputData) {
        // Show result section
        resultSummary.classList.remove('hidden');
        stepsSection.classList.remove('hidden');

        // Update Math Result
        // $$ \int_{a}^{b} f(x) \, dx = Result $$
        const latexResult = `$$ \\int_{${inputData.lower}}^{${inputData.upper}} ${result.latex_result} \\approx ${parseFloat(result.result).toFixed(4)} $$`;
        
        // We might want to construct the full equation nicely
        // Let's rely on the backend provided step or build it here. 
        // For the summary box, let's keep it simple.
        mathResult.innerHTML = `$$ \\int_{${inputData.lower}}^{${inputData.upper}} (${inputData.function}) \\, dx = ${result.latex_result} $$`;
        
        // Render MathJax
        MathJax.typesetPromise([mathResult]);

        // Render Steps
        stepsContent.innerHTML = '';
        result.steps.forEach(step => {
            const div = document.createElement('div');
            div.className = 'step-item';
            div.innerHTML = step; // Step strings allow HTML/LaTeX
            stepsContent.appendChild(div);
        });
        MathJax.typesetPromise([stepsContent]);

        // Render Plot
        renderPlot(result.plot_data, inputData);
    }

    function renderPlot(plotData, inputData) {
        const xRaw = plotData.x;
        const yRaw = plotData.y;
        const xArea = plotData.x_area;
        const yArea = plotData.y_area;

        const trace1 = {
            x: xRaw,
            y: yRaw,
            mode: 'lines',
            name: `f(x)`,
            line: {
                color: '#6366f1',
                width: 3
            }
        };

        // Shaded area
        // To shade under the curve properly with Plotly 'tozeroy', we need to be careful
        // But since we have clear x_area and y_area, we can fill to zero.
        const trace2 = {
            x: xArea,
            y: yArea,
            mode: 'none',
            name: 'Area',
            fill: 'tozeroy', // Fills to x-axis (y=0)
            fillcolor: 'rgba(99, 102, 241, 0.3)',
            type: 'scatter'
        };

        const layout = {
            title: `Graph of f(x) from ${inputData.lower} to ${inputData.upper}`,
            font: { family: 'Outfit, sans-serif' },
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
            margin: { t: 40, r: 20, l: 50, b: 40 },
            hovermode: 'closest'
        };

        const config = { responsive: true };

        Plotly.newPlot('plot-container', [trace1, trace2], layout, config);
    }
});
