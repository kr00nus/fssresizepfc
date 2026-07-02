# FSS Explorer

O **FSS Explorer** é uma ferramenta web de código aberto (estática baseada em HTML, CSS e JavaScript) focada na simulação analítica rápida e no projeto de Superfícies Seletivas de Frequência (FSS) aplicadas a micro-ondas e redes de telecomunicações.

Através de Modelos de Circuito Equivalente (ECM), o simulador permite investigar a resposta eletromagnética e sintonizar parâmetros geométricos de diversas topologias impressas sem a necessidade inicial de simulações de onda completa (full-wave) de alto custo computacional.

## Topologias Suportadas

O simulador suporta a simulação interativa das seguintes geometrias:
- **Anel Quadrado** (Square Loop)
- **Cruz de Jerusalém** (Jerusalem Cross)
- **Estrela de 4 Pontas** (Tapered Star)
- **Anel Circular**
- **Quase Quadrado** (Mamedes)
- **Patch Quadrado**

## Como Acessar e Rodar

- **Modo Local:** Clone o repositório e abra o arquivo `index.html` no seu navegador. 
- **Modo Servidor (Recomendado):** Para garantir o funcionamento correto de módulos JavaScript ES6 e recursos de exportação CSV em alguns navegadores, utilize um servidor HTTP local:
  ```bash
  npx http-server . -p 8000 -c-1
  # ou
  python -m http.server 8000
  ```
  Acesse `http://localhost:8000/index.html`.

## Estrutura do Projeto

- **`index.html`**: Dashboard principal e acesso às ferramentas.
- **`src/html/topologies/`**: Interfaces de simulação, contendo arquivos HTML individuais para cada geometria.
- **`src/html/docs/`**: Centro de documentação estruturado, contendo todo o embasamento do projeto:
  - *Guia Rápido* e *Explicação para Leigos*
  - *Fundamentação Teórica* (Todo o equacionamento matemático)
  - *Cálculo de L & C*
  - *Análise Paramétrica* (Resultados e comportamentos detalhados)
  - *Resumo Completo do Projeto*
- **`src/js/`**: Motores de cálculo modularizados.
  - `math.js`: Utilitários matemáticos globais e funções de espalhamento de Marcuvitz.
  - `visual.js`: Renderização de dados gráficos.
  - `ui_*.js`: Controladores individuais que implementam as formulações de cada topologia.
- **`src/css/`**: Estilos padronizados globais, paletas de cores modernas e design responsivo (`styles.css` e `docs.css`).

## Tecnologias Empregadas

- **Linguagens:** HTML5, CSS3, JavaScript Vanilla (ES6+).
- **Bibliotecas:** Chart.js (para gráficos dinâmicos de parâmetros S) e MathJax 3 (para renderização de equações).
- **Design:** FontAwesome para iconografia e uma interface voltada à experiência do usuário profissional.

## Referencial Teórico

A fundamentação analítica completa, cobrindo o modelo original de fita paralela de Marcuvitz até as correções de confinamento de campo magnético em substratos finos (como as funções dinâmicas de Costa e calibrações de Mamedes), está rigorosamente documentada na seção de **Fundamentação Teórica** interna da plataforma.

## Observações e Limitações

- **Modelo Analítico:** Os dados gerados derivam de Circuitos LC Equivalentes, ideais para cálculos instantâneos de ressonâncias em modos fundamentais sob incidência TE/TM ortogonal. 
- **Exportação:** Para simulações avançadas envolvendo acoplamentos não triviais, o FSS Explorer permite a exportação da curva de frequência (formato `.csv`) para pronta comparação analítica *versus* onda completa (HFSS/CST).
