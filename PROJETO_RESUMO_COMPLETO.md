# 📊 RESUMO COMPLETO DO PROJETO FSS SIMULATOR

## 🎯 O QUE É ESTE PROJETO?

**FSS Explorer** é um **simulador interativo de Superfícies Seletivas de Frequência (FSS - Frequency Selective Surfaces)** implementado em HTML5 + JavaScript. É uma ferramenta educacional e de pesquisa que permite visualizar e calcular o comportamento eletromagnético de diferentes geometrias de FSS.

---

## 🏗️ ESTRUTURA DO PROJETO

### Árvore de Arquivos
```
PFC/
├── index.html                    # Página inicial com índice de modelos
├── EspiraQuadrada.html          # Simulador: Espira Quadrada (Square Loop)
├── Quadrado.html                # Simulador: Patch Quadrado (Square Patch)
├── Cruzjeru.html                # Simulador: Cruz de Jerusalém (Jerusalem Cross)
├── anelcircular.html            # Simulador: Anel Circular (Circular Ring)
├── README.md                    # Documentação técnica
├── GUIA_RAPIDO.md              # Guia para usuário final
├── STATUS_DOCUMENTACAO.md       # Status do projeto
│
└── src/
    ├── css/
    │   └── styles.css           # Estilos únicos compartilhados
    │
    └── js/
        ├── math.js              # Funções matemáticas reutilizáveis
        ├── visual.js            # Utilitários visuais (gráficos, export)
        ├── ui_espira.js         # Controlador: Espira Quadrada
        ├── ui_quadrado.js       # Controlador: Patch Quadrado
        ├── ui_cruzjeru.js       # Controlador: Cruz de Jerusalém
        └── ui_anelcircular.js   # Controlador: Anel Circular
```

---

## 📚 MÓDULOS PRINCIPAIS

### 1️⃣ **src/js/math.js**
**Responsabilidade:** Funções matemáticas reutilizáveis

**Funções principais:**
- `mmToCm(mm)` - Converte milímetros para centímetros
- `FF(p, w, lambda, ang)` - Função fundamental para cálculos de FSS
- `GG(p, w, lambda, ang)` - Variante da função FF
- `csc(x)` - Função cossecante
- `calcS21(reactancia)` - Calcula parâmetro S21 (transmissão) a partir da reatância

**Usado por:** Todos os modelos de simulação

---

### 2️⃣ **src/js/visual.js**
**Responsabilidade:** Utilitários visuais compartilhados

**Funções principais:**
- `createLineChart(ctx, labels, datasets, options)` - Cria gráficos Chart.js responsivos
- `exportChartToCSV(chart, filename)` - Exporta dados para arquivo CSV

**Usado por:** Todos os modelos para gráficos e exportação

---

### 3️⃣ **src/css/styles.css**
**Responsabilidade:** Estilos únicos do projeto

**Componentes estilizados:**
- `.dashboard` - Layout principal (grid flexível)
- `.panel` - Painéis de conteúdo
- `.params` - Painel de parâmetros (sliders e inputs)
- `.visuals` - Painel de visualizações (gráfico e canvas)
- `.geometry-container` - Contenedor para desenho geométrico
- `.control-group` - Grupo de controle (slider + input numérico)
- `.chart-container` - Contenedor responsivo do gráfico

---

## 🔧 MODELOS DE SIMULAÇÃO

### Modelo 1: **Espira Quadrada (Square Loop FSS)**
**Arquivo:** `ui_espira.js` | `EspiraQuadrada.html`

**Parâmetros de entrada:**
- **p** (Período em mm) - Tamanho da célula unitária
- **d** (Diâmetro em mm) - Tamanho do loop quadrado
- **w** (Largura do fio em mm) - Espessura da linha metálica
- **g** (Gap em mm) - Espaço entre loops (calculado: p - d)
- **h_sub** (Altura do substrato em mm)
- **εr** (Permissividade do substrato)
- **Frequência** (GHz) - Faixa de operação

**Saídas:**
- Gráfico de transmissão (S21 em dB) vs Frequência
- Frequência de ressonância (fr)
- Largura de banda (-3dB)
- Canvas com visualização 2D da célula com dimensões anotadas

**Modelos de permissividade efetiva:**
- Costa (2020) com fator dinâmico α
- 6 diferentes fórmulas incluindo média, tanh, puro

---

### Modelo 2: **Patch Quadrado (Square Patch FSS)**
**Arquivo:** `ui_quadrado.js` | `Quadrado.html`

**Parâmetros de entrada:**
- **p** (Período em mm)
- **L** (Lado do quadrado em mm)
- **h_sub** (Altura do substrato em mm)
- **εr** (Permissividade)
- **Frequência** (GHz)

**Características especiais:**
- Modelo de Chen com capacitância concentrada
- Comparação com dados HFSS (upload de CSV)
- Presets de substrato (RO3003, RO3006, manual)

---

### Modelo 3: **Cruz de Jerusalém (Jerusalem Cross FSS)**
**Arquivo:** `ui_cruzjeru.js` | `Cruzjeru.html`

**Parâmetros de entrada:**
- **p** (Período em mm)
- **d** (Tamanho do chapéu em mm)
- **w** (Espessura do braço interno em mm)
- **h** (Espessura do chapéu em mm)
- **g** (Gap/espaço vazio em mm)
- **h_sub** (Altura do substrato em mm)
- **εr** (Permissividade)
- **Frequência** (GHz)

**Características:**
- Geometria complexa com chapéus nas extremidades
- 5 dimensões mostradas com setas interativas
- Visualização dinâmica com legendas coloridas

---

### Modelo 4: **Anel Circular (Circular Ring FSS)**
**Arquivo:** `ui_anelcircular.js` | `anelcircular.html`

**Parâmetros de entrada:**
- **p** (Período em mm)
- **r** (Raio médio do anel em mm)
- **w** (Espessura do fio em mm)
- **g** (Gap em mm, calculado como p - 2r)
- **h_sub** (Altura do substrato em mm)
- **εr** (Permissividade)
- **Frequência** (GHz)

**Características:**
- Geometria circular simétrica
- Relacionamento automático: g = p - 2r
- Visualização com anotações de dimensões

---

## 🎨 SISTEMA DE VISUALIZAÇÃO COM DIMENSÕES

### Características Implementadas:
1. **Setas Dimensionais Responsivas**
   - Todas as dimensões mostradas com setas duplas
   - Tamanho e posição se ajustam automaticamente
   - Valores precisos em mm (3 casas decimais)

2. **Cores Padronizadas**
   - 🔴 Vermelho: Período (p) e Diâmetro/Comprimento (d)
   - 🟠 Laranja: Largura do fio/braço (w)
   - 🟣 Roxo: Espessura do chapéu (h)
   - 🔵 Azul: Gap/espaçamento (g)

3. **Legenda Interativa**
   - Localizada na base do canvas
   - Mostra cor e significado de cada dimensão
   - Atualiza dinamicamente com os valores

4. **Responsividade Completa**
   - Quando você move os sliders, as setas se movem proporcionalmente
   - Fonte redimensiona conforme o tamanho do canvas
   - Texto e setas escalam automaticamente

---

## 🔄 FLUXO DE EXECUÇÃO

### Para cada página de simulação:

1. **Carregamento (DOMContentLoaded)**
   - HTML carrega Chart.js via CDN
   - CSS central é aplicado
   - Módulo ES correspondente é injetado

2. **Inicialização (init/setup)**
   - Injeção de valores padrão
   - Vinculação de sliders com inputs numéricos (two-way binding)
   - Setup de presets de substrato
   - Botões de Export/Import

3. **Atualização (updateAll)**
   - Validação de parâmetros
   - Cálculo de parâmetros derivados (ex: g = p - 2r)
   - Desenho da geometria em canvas com dimensões
   - Loop de frequência com passo Δf = 0.001 GHz

4. **Cálculo de Transmissão**
   - Para cada frequência, calcula a reatância equivalente
   - Usa fórmula FF para capacitância distribuída
   - Converte reatância em S21 (dB)

5. **Renderização**
   - Gráfico atualiza com novos dados
   - Marca pontos de frequência de ressonância
   - Marca limites de largura de banda (-3dB)

6. **Exportação (Opcional)**
   - Usuário clica "Exportar CSV"
   - Dados são salvos em arquivo compatível com Excel
   - Pode ser importado em Quadrado.html para comparação com HFSS

---

## 🎛️ INTERFACE PADRÃO DE CADA PÁGINA

### Lado Esquerdo - Painel de Parâmetros
```
┌─ Parâmetros (Padrão: Valores)
├─ Parâmetros Físicos
│  ├─ Período p: [input] ────[slider]
│  ├─ Diâmetro d: [input] ────[slider]
│  ├─ Largura w: [input] ────[slider]
│  ├─ Altura h (opcional): [input] ────[slider]
│  └─ Gap g: [input-readonly]
│
├─ Parâmetros de Frequência
│  ├─ Frequência Inicial: [input] ────[slider]
│  └─ Frequência Final: [input] ────[slider]
│
└─ Parâmetros do Substrato
   ├─ Substrato: [dropdown: Manual/RO3003/RO3006]
   ├─ Espessura h_sub: [input] ────[slider]
   └─ Permissividade εr: [input] ────[slider]
```

### Lado Direito - Painel de Visualizações
```
┌─ Resposta de Transmissão (S21)
│  ├─ [GRÁFICO - Chart.js com múltiplas curvas]
│  └─ [Botão: Exportar CSV]
│
└─ Célula Unitária (Geometria)
   ├─ [CANVAS - Desenho 2D com setas dimensionais]
   ├─ [LEGENDA colorida]
   └─ Nota: "As cotas representam com exatidão..."
```

---

## 💾 FUNCIONALIDADES AVANÇADAS

### 1. Presets de Substrato
- **RO3003**: εr=3.00, h=1.52mm
- **RO3006**: εr=6.50, h=1.28mm
- **Manual**: Entrada livre

### 2. Exportação/Importação de Dados
- Exportar gráfico para CSV (formato: "Frequency;S21")
- Importar dados HFSS para comparação visual
- Compatível com Excel e ferramentas de análise

### 3. Cálculo de Especificações
- Frequência de ressonância (fr)
- Largura de banda (-3dB)
- Permissividade efetiva
- Fator de forma dinâmico (α)

### 4. Múltiplas Fórmulas de Permissividade
- Costa (2020) com α dinâmico
- Média (er + 1)/2
- Exponencial-tanh
- Comparação de 6 modelos diferentes

---

## 🚀 COMO EXECUTAR

### Pré-requisitos
- Navegador moderno (suporte a ES6 modules)
- Servidor HTTP (necessário para módulos ES)

### Rodar localmente
```bash
# Opção 1: Node.js + http-server
npx http-server . -p 8000 -c-1

# Opção 2: Python 3
python -m http.server 8000

# Opção 3: Python 2
python -m SimpleHTTPServer 8000
```

### Acessar
- Índice: http://localhost:8000/index.html
- Espira: http://localhost:8000/EspiraQuadrada.html
- Patch: http://localhost:8000/Quadrado.html
- Cruz: http://localhost:8000/Cruzjeru.html
- Anel: http://localhost:8000/anelcircular.html

---

## 📖 GUIA RÁPIDO PARA DESENVOLVEDORES

### Adicionar novo modelo
1. Criar `src/js/ui_novomodelo.js` com função `updateAll()`
2. Implementar `drawGeometry(params)` com canvas + dimensões
3. Criar `novomodelo.html` que carrega o CSS e o módulo
4. Importar `math.js` para cálculos
5. Adicionar link no `index.html`

### Modificar fórmulas matemáticas
1. Editar `src/js/math.js`
2. Todas as mudanças se propagam automaticamente
3. Testar em múltiplas páginas

### Personalizar estilos
1. Editar `src/css/styles.css`
2. Afeta todas as páginas simultaneamente
3. Use classes como `.panel`, `.param-col`, `.chart-container`

---

## 🎓 CONCEITOS FÍSICOS ENVOLVIDOS

### FSS (Frequency Selective Surfaces)
- Estruturas periódicas que filtram frequências eletromagnéticas
- Baseadas em elementos ressonadores (loops, patches, cruzes, anéis)
- Usadas em: antenas, filtros, blindagem, absorvedores

### Modelo de Circuito Equivalente de Langley-Munk
- Aproximação analítica para comportamento FSS
- Elementos RLC equivalentes
- Válido para comprimentos de onda >> dimensões da célula

### Parâmetro S21
- Medida de transmissão eletromagnética
- S21 = 0 dB → transmissão total
- S21 = -40 dB → bloqueio significativo

---

## 📊 SAÍDAS DO SISTEMA

### Gráfico de Transmissão
- Eixo X: Frequência (GHz)
- Eixo Y: S21 (dB)
- Múltiplas curvas por modelo (até 6 fórmulas)
- Marca pontos de ressonância e BW

### Canvas Geométrico
- Desenho 2D escalonado da célula unitária
- Células vizinhas (com transparência)
- Célula central (destaque)
- Linha tracejada mostrando período (p × p)
- Setas e rótulos com dimensões precisas
- Legenda colorida interativa

### Arquivo CSV (Exportação)
```csv
Frequency (GHz);S21 (dB)
1.000;-2.45
1.001;-2.47
...
```

---

## 🔍 STATUS ATUAL DO PROJETO

✅ **Implementado:**
- 4 modelos de FSS (Espira, Patch, Cruz, Anel)
- Sistema de visualização com dimensões
- Setas responsivas com cores padronizadas
- Presets de substrato
- Exportação/Importação de dados HFSS
- Cálculo de fr e BW
- Interface HTML5 moderna
- Documentação completa em código

⏳ **Em desenvolvimento:**
- Otimizações de performance para grandes faixas de frequência
- Modelos 3D interativos
- Análise de impedância

---

## 📝 NOTAS IMPORTANTES

1. **Aproximações:** Estas são simulações analíticas simplificadas, não análise EM full-wave
2. **Unidades:** Sempre em mm para dimensões, GHz para frequência
3. **Validação:** Comparar com dados HFSS/Ansys para trabalhos críticos
4. **Navegadores:** Testar em Chrome, Firefox, Edge (Safari pode ter limitações com módulos ES)

---

## 👨‍💻 PARA COMPARTILHAR COM OUTRO DESENVOLVEDOR

Use este documento como referência. Após ler:

1. ✅ Entender a arquitetura modular
2. ✅ Localizar responsabilidades em cada arquivo
3. ✅ Compreender fluxo de dados (HTML → JS → Canvas → Gráfico)
4. ✅ Modificar parâmetros e formatos sem quebrar outros modelos
5. ✅ Adicionar novos modelos mantendo padrão visual

**Arquivo mais importante para começar:** `math.js` (lógica compartilhada)
**Arquivo para entender UI:** `ui_espira.js` (template para novos modelos)
**Arquivo para visual:** `styles.css` (design unificado)

---

**Versão:** 1.0 | **Data:** 22/05/2026 | **Status:** ✅ Operacional
