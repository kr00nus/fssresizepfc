// Shared visual utilities: chart creation and CSV export
// Uses global Chart (loaded via script tag in HTML)
export function createLineChart(ctx, labels, data, options = {}) {
  // options: { title, yTitle, yMin, yMax, datasetLabel }
  const chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: options.datasetLabel || "S21",
          data: data,
          borderColor: options.borderColor || "#000",
          borderWidth: options.borderWidth || 1.5,
          pointRadius: 0,
          fill: false,
          tension: 0.1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        x: {
          title: { display: true, text: "Frequency (GHz)" },
          grid: { color: "#eee" },
        },
        y: {
          min: options.yMin ?? -60,
          max: options.yMax ?? 0,
          title: { display: true, text: options.yTitle || "S21 (dB)" },
          grid: { color: "#eee" },
        },
      },
      plugins: { legend: { labels: { font: { family: "Times New Roman" } } } },
    },
  });
    let chartDatasets = [];
    if (!Array.isArray(data)) {
      // backward compatibility: single data array passed
      chartDatasets = [
        {
          label: options.datasetLabel || 'S21',
          data: data,
          borderColor: options.borderColor || '#000',
          borderWidth: options.borderWidth || 1.5,
          pointRadius: 0,
          fill: false,
          tension: 0.1,
        },
      ];
    } else {
      chartDatasets = data.map((ds) => {
        return Object.assign(
          {
            borderColor: ds.borderColor || '#000',
            borderWidth: ds.borderWidth ?? 1.5,
            pointRadius: ds.pointRadius ?? 0,
            fill: ds.fill ?? false,
            tension: ds.tension ?? 0.1,
            showLine: ds.showLine !== undefined ? ds.showLine : true,
          },
          ds,
        );
      });
    }

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: chartDatasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: {
          x: {
            title: { display: true, text: 'Frequency (GHz)' },
            grid: { color: '#eee' },
          },
          y: {
            min: options.yMin ?? -60,
            max: options.yMax ?? 0,
            title: { display: true, text: options.yTitle || 'S21 (dB)' },
            grid: { color: '#eee' },
          },
        },
        plugins: { legend: { labels: { font: { family: 'Times New Roman' } } } },
      },
    });
    return chart;
  }

export function exportChartToCSV(chart, filename = "export.csv") {
  if (!chart || !chart.data.labels.length) {
    alert("Nenhum dado disponível.");
    return;
  }
  let csv = "Frequency (GHz);S21 (dB)\n";
  chart.data.labels.forEach((freq, index) => {
    const rawFreq = freq;
    const rawS21 = chart.data.datasets[0].data[index];
    const f = parseFloat(String(rawFreq).replace(",", "."));
    let s21Val = rawS21;
    if (s21Val === null || s21Val === undefined || s21Val === "") {
      csv += `${isNaN(f) ? rawFreq : f.toFixed(3)};\n`;
      return;
    }
    if (typeof s21Val === "string")
      s21Val = parseFloat(s21Val.replace(",", "."));
    if (typeof s21Val === "number" && !isNaN(s21Val)) {
      csv += `${isNaN(f) ? rawFreq : f.toFixed(3)};${s21Val.toFixed(2)}\n`;
    } else {
      csv += `${isNaN(f) ? rawFreq : f.toFixed(3)};${rawS21}\n`;
    }
  });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
