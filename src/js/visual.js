// ==========================================
// UTILITÁRIOS VISUAIS COMPARTILHADOS
// Funções para criar gráficos e exportar dados
// ==========================================
// Este arquivo contém funções reutilizáveis para:
//   - Criar gráficos de linhas usando a biblioteca Chart.js
//   - Exportar dados dos gráficos para arquivos CSV
// É usado por ui_quadrado.js (e pode ser usado por outros simuladores)
//
// OBS: A biblioteca Chart.js deve estar carregada no HTML
//      (<script> tag com src="chart.js") para essas funções funcionarem

// ==========================================
// FUNÇÃO: createLineChart()
// Cria um gráfico de linhas usando Chart.js
// É uma função utilitária flexível que pode aceitar diferentes formatos de dados
// ==========================================
export function createLineChart(ctx, labels, data, options = {}) {
  // Normaliza os dados: aceita um array único OU um array de objetos dataset
  // Isso dá flexibilidade para usar com diferentes formatos de dados
  const datasets = Array.isArray(data)
    ? data.map((ds) => {
        // Se data é um array de objetos, cada um é um dataset
        return Object.assign(
          {
            // Valores padrão para cada dataset
            label: ds.label || options.datasetLabel || "S21", // Rótulo da legenda
            data: ds.data || [], // Dados do gráfico
            borderColor: ds.borderColor || "#000", // Cor da linha
            borderWidth: ds.borderWidth ?? 1.5, // Espessura da linha
            pointRadius: ds.pointRadius ?? 0, // Tamanho dos pontos
            fill: ds.fill ?? false, // Preenchimento sob a linha
            tension: ds.tension ?? 0.1, // Suavidade da linha
            showLine: ds.showLine !== undefined ? ds.showLine : true, // Mostra linha
          },
          ds, // Mescla com as propriedades passadas (sobrescreve padrões)
        );
      })
    : [
        // Se data é um array simples, cria um dataset padrão
        {
          label: options.datasetLabel || "S21",
          data: data,
          borderColor: options.borderColor || "#000",
          borderWidth: options.borderWidth || 1.5,
          pointRadius: 0,
          fill: false,
          tension: 0.1,
        },
      ];

  // Cria o gráfico Chart.js com as configurações
  const chart = new Chart(ctx, {
    type: "line", // Tipo de gráfico: linhas
    data: {
      labels: labels, // Rótulos do eixo X (frequências)
      datasets: datasets, // Dados a plotar
    },
    options: {
      responsive: true, // Adapta à tela
      maintainAspectRatio: false, // Altura customizável
      animation: false, // Sem animação (mais rápido)
      scales: {
        x: {
          // Configuração do eixo X (frequência)
          title: { display: true, text: "Frequency (GHz)" }, // Título
          grid: { color: "#eee" }, // Cor da grade
        },
        y: {
          // Configuração do eixo Y (S21)
          min: options.yMin ?? -60, // Mínimo: -60 dB
          max: options.yMax ?? 0, // Máximo: 0 dB
          title: { display: true, text: options.yTitle || "S21 (dB)" }, // Título
          grid: { color: "#eee" }, // Cor da grade
        },
      },
      plugins: {
        legend: {
          labels: { font: { family: "Times New Roman" } }, // Fonte da legenda
        },
      },
    },
  });
  return chart; // Retorna o gráfico criado
}

// ==========================================
// FUNÇÃO: exportChartToCSV()
// Exporta os dados do gráfico para um arquivo CSV
// CSV é um formato universal que pode ser aberto em Excel, Google Sheets, etc.
// ==========================================
export function exportChartToCSV(chart, filename = "export.csv") {
  // Valida se o gráfico tem dados
  if (
    !chart ||
    !chart.data ||
    !chart.data.labels ||
    !chart.data.labels.length
  ) {
    alert("Nenhum dado disponível.");
    return; // Sai se não há dados
  }

  // Começa a criar o CSV com o cabeçalho
  let csv = "Frequency (GHz);S21 (dB)\n";

  // Percorre cada ponto do gráfico
  chart.data.labels.forEach((freq, index) => {
    const rawFreq = freq; // Frequência bruta
    // Obtém o primeiro dataset (se houver múltiplos datasets, usa o primeiro)
    const rawS21 =
      chart.data.datasets && chart.data.datasets[0]
        ? chart.data.datasets[0].data[index]
        : null; // Valor de S21 bruto

    // Converte a frequência para número
    const f = parseFloat(String(rawFreq).replace(",", "."));
    let s21Val = rawS21;

    // Tratamento de valores vazios ou inválidos
    if (s21Val === null || s21Val === undefined || s21Val === "") {
      csv += `${isNaN(f) ? rawFreq : f.toFixed(3)};\n`;
      return; // Pula para a próxima linha
    }

    // Converte S21 para número se for string
    if (typeof s21Val === "string")
      s21Val = parseFloat(s21Val.replace(",", "."));

    // Adiciona a linha ao CSV se S21 é válido
    if (typeof s21Val === "number" && !isNaN(s21Val)) {
      csv += `${isNaN(f) ? rawFreq : f.toFixed(3)};${s21Val.toFixed(2)}\n`;
    } else {
      csv += `${isNaN(f) ? rawFreq : f.toFixed(3)};${rawS21}\n`;
    }
  });

  // ===== CRIAÇÃO E DOWNLOAD DO ARQUIVO =====
  // Cria um blob (arquivo binário) com o conteúdo CSV
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  // Cria um elemento link temporário
  const link = document.createElement("a");
  // Verifica se o navegador suporta download de arquivos
  if (link.download !== undefined) {
    // Cria uma URL para o arquivo blob
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename); // Nome do arquivo a baixar
    link.style.visibility = "hidden"; // Esconde o link
    document.body.appendChild(link); // Adiciona à página
    link.click(); // Clica (inicia o download)
    document.body.removeChild(link); // Remove o link
  }
}
