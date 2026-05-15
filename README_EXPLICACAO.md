# Simulador FSS - Guia de Entendimento para Leigos

## O que é este projeto?

Este é um **simulador interativo** de **FSS (Frequency Selective Surfaces)** - que em português significa **Superfícies Seletivas de Frequência**.

Imagine uma peneira de cozinha:

- Partículas grandes não passam
- Partículas pequenas passam através

Uma FSS funciona de forma similar, mas com **ondas de rádio** em vez de partículas:

- Em certas frequências, as ondas são **bloqueadas**
- Em outras frequências, as ondas **passam através**

Isso é útil em tecnologia:

- **Antenas inteligentes** que funcionam apenas em certas frequências
- **Escudos eletromagnéticos** que protegem de interferências
- **Filtros ópticos** em comunicações
- **Painéis solares inteligentes** que deixam passar luz mas bloqueiam certos comprimentos de onda

---

## Os Três Tipos de Estruturas FSS

Este simulador oferece **3 geometrias diferentes** de FSS:

### 1. **Cruz de Jerusalém** (cruz.html)

- É um **padrão em forma de cruz** repetido em grade
- Cada unidade tem um padrão como um símbolo de cruz medieval
- Usada em: filtros de microondas, defesa eletromagnética

### 2. **Espira Quadrada** (espira.html)

- É um **anel quadrado de fio metálico** repetido em grade
- Como um fio dobrado em forma de quadrado oco
- Usada em: antenas ressonantes, absorvedores de ondas

### 3. **Patch Quadrado** (quadrado.html)

- É um **pequeno quadrado sólido de metal** repetido em grade
- Como pequenos "selos" de metal dispostos regularmente
- Usada em: refletores seletivos, painéis absorvedores

---

## Como Usar o Simulador

### Parâmetros de Entrada (Controles na Esquerda)

1. **Frequência** (Frequency)
   - `fStart`: frequência mínima em GHz (gigahertz)
   - `fEnd`: frequência máxima em GHz
   - Define o intervalo a simular

2. **Geometria** (dimens...ões dos padrões)
   - `p` (período): tamanho da célula que se repete (mm)
   - `d` (for Cruz/Espira) ou `c` (for Patch): tamanho do elemento metálico (mm)
   - `w`: largura da fita/fio (aplicável na Cruz e Espira)
   - `g`: espaço/gap entre elementos (aplicável na Cruz)
   - `h`: espessura (aplicável na Cruz)

3. **Material do Substrato** (o que fica por baixo)
   - `er`: constante dielétrica (permissividade relativa)
   - `h_sub`: altura do substrato em mm
   - Presets: RO3003 e RO3006 (marcas reais de PCB materials)

### Visualização (Centro)

- **Desenho da geometria**: Mostra como ficaria a estrutura
  - Azul escuro: elemento central
  - Azul claro: elementos vizinhos

- **Gráfico S21 vs Frequência** (Direita)
  - Eixo X: Frequência em GHz
  - Eixo Y: S21 em dB (decibel)
  - **O gráfico mostra quanto sinal passa em cada frequência**

---

## Entendendo o Gráfico S21

### O que é S21?

S21 é um parâmetro que mede **quanto de sinal consegue passar através** da FSS:

- **0 dB** = 100% do sinal passa (sem bloqueio)
- **-3 dB** = 50% do sinal passa (metade)
- **-10 dB** = 10% do sinal passa
- **-60 dB** = praticamente nada passa (bloqueado)

### O que Procurar no Gráfico

1. **Resson\u00e2ncia (ponto vermelho)**
   - O ponto mais baixo da curva
   - Onde o máximo de sinal **é bloqueado** (transmissão mínima)
   - Frequência em GHz é mostrada na legenda

2. **Largura de Banda**
   - Quanto de "espaço de frequência" a FSS afeta
   - Mostrada como área entre os dois pontos azuis
   - Medida em -3dB (meia potência)

3. **Diferentes Curvas**
   - Cada cor representa um **modelo de cálculo diferente**
   - Preto = modelo principal
   - Outras cores = modelos alternativos para comparação
   - Se carregou dados do HFSS: linha vermelha = resultado 3D real

---

## Modelos de Cálculo (6 Fórmulas Diferentes)

O simulador mostra **6 curvas diferentes** porque existem **6 formas diferentes** de calcular como a onda interage com a estrutura:

1. **Fator de Forma Dinâmico (Costa, Cruz)** - PRETO
   - Modelo mais avançado, usa parâmetro alfa dinâmico
   - Recomendado: modelo principal para análise

2. **Heurística Personalizada (Sua Tentativa)** - AZUL CLARO
   - Modelo experimental do projeto
   - Comparar com outros para ver se é bom

3. **Tangente Hiperbólica** - LARANJA
   - Modelo clássico da física
   - Usando função matemática tanh

4. **Exponencial Fixo 1.8** - VERDE
   - Modelo antigo, constante fixa
   - Referência histórica

5. **Média Clássica** - AZUL ESCURO
   - Média simples entre ar e material
   - Modelo básico de referência

6. **Material Puro** - ROXO
   - Sem considerar o ar (referência)
   - Mostra o extremo teórico

---

## Dados HFSS (Validação 3D)

O simulador também permite **carregar dados do HFSS** (software 3D profissional de eletromagnetismo):

1. Clique "Carregar Dados HFSS"
2. Selecione um arquivo CSV com dados reais
3. A curva vermelha grossa aparecerá no gráfico
4. Compare com o modelo analítico para validar

---

## Telas HTML do Projeto

- `index.html` - Página inicial com links para os 3 simuladores
- `Cruzjeru.html` - Simulador da Cruz de Jerusalém
- `EspiraQuadrada.html` - Simulador da Espira Quadrada
- `Quadrado.html` - Simulador do Patch Quadrado

---

## Estrutura de Arquivos

```
src/
├── css/
│   └── styles.css         # Estilos visuais
├── js/
│   ├── math.js            # Funções matemáticas compartilhadas
│   ├── visual.js          # Funções para criar gráficos e exportar
│   ├── ui_cruzjeru.js     # Lógica da Cruz de Jerusalém
│   ├── ui_espira.js       # Lógica da Espira Quadrada
│   ├── ui_quadrado.js     # Lógica do Patch Quadrado
│   └── visual.js          # Utilit\u00e1rios visuais
```

### O que Cada Arquivo Faz

**math.js**

- Funções matemáticas para calcular eletromagnetismo
- Convertém unidades (mm para cm)
- Calculam parâmetros como FF, GG, S21

**visual.js**

- Cria gráficos usando Chart.js
- Exporta dados para arquivos CSV
- Reutilizável por qualquer simulador

**ui_cruzjeru.js, ui_espira.js, ui_quadrado.js**

- Cada um gerencia um tipo de FSS diferente
- Desenham a geometria
- Calculam e atualizam os gráficos
- Lidam com entrada do usuário

**styles.css**

- Define cores, fontes, layout da página
- Responsivo (funciona em celular e desktop)

---

## Exemplos de Uso

### Experimento 1: Como o Período Afeta a Frequência?

1. Mantenha `d`, `w`, `g` fixos
2. **Aumente `p` (período)**
3. Note que a frequência de ressonância **diminui**
4. Conclusão: período maior = ressonância em frequência mais baixa

### Experimento 2: Como o Material Afeta?

1. Selecione RO3003 (substrate)
2. Veja a curva
3. Selecione RO3006 (maior permissividade)
4. Note que a ressonância **mudou**
5. Conclusão: material dielétrico mais forte = frequência mais baixa

### Experimento 3: Validação com HFSS

1. Execute simulação no HFSS em 3D real
2. Exporte dados do HFSS como CSV
3. "Carregar Dados HFSS" no simulador
4. Compare a linha vermelha com o preto
5. Veja se o modelo analítico é aproximado

---

## Entendendo os Parâmetros Técnicos

- **λ (lambda)** = comprimento de onda em cm = 30 / f(GHz)
- **p** = período = distância entre células repetidas
- **ε_r** = permissividade relativa do material (er)
- **B** = susceptância normalizada (parâmetro de cálculo)
- **S21** = parâmetro de transmissão em dB

---

## Dicas Avançadas

1. **Export CSV**: Clique o botão "Export" para salvar dados em Excel
2. **Múltiplos modelos**: Veja a diferença entre 6 modelos na mesma tela
3. **Presets de substrato**: Use RO3003 ou RO3006 para valores reais de PCB
4. **Eixos fixxos**: Gráfico sempre mostra -60 a 0 dB (Y) para comparação consistente
5. **Zona de precisão**: Aviso mostra quando o modelo perde precisão (frequência muito alta)

---

## Por Que Isso É Importante?

**Aplicações práticas:**

- Antennas (transmissores/receptores rádio) - filtram só frequências desejadas
- WiFi/5G - usam FSS para direcionamento de sinal
- Satélites - usam painéis FSS para isolação de frequências
- Defesa - escudos eletromagnéticos
- Medicina - alguns equipamentos usam FSS para filtração

---

## Conclusão

Este simulador permite **compreender e testar** como estruturas metálicas repetidas afetam ondas de rádio. É uma ferramenta educacional poderosa para engenharia eletromagnética!

**Comece**: Abra `index.html` no navegador e experimente com os controles. Veja como a geometria e os materiais mudam o comportamento das ondas!
