# GUIA RÁPIDO - Dicionário de Termos

## Glossário de Termos Técnicos Explicados

### Eletromagnetismo Básico

- **Onda Eletromagnética**: Oscilação de campo elétrico e magnético que se propaga no espaço (ex: luz, rádio, WiFi)
- **Frequência (f)**: Quantas oscilações por segundo. Medida em GHz (gigahertz). 1 GHz = 1 bilhão de oscilações/segundo
- **Comprimento de onda (λ)**: Distância entre dois picos consecutivos da onda. λ = 30cm/f(GHz)
- **Transmissão**: Quanto do sinal consegue passar através de algo
- **Reflexão**: Quanto do sinal volta/rebota em algo
- **Bloqueio/Absorção**: O sinal é absorvido e desaparece

### FSS - Superfície Seletiva de Frequência

- **FSS**: Padrão repetido de estruturas metálicas que filtra ondas
- **Período (p)**: Tamanho da célula básica que se repete
- **Ressonância**: Frequência onde a transmissão é máxima (o máximo bloqueio ocorre)
- **Frequência de ressonância (fr)**: Frequência onde S21 é mínimo (mais bloqueado)

### Parâmetros S (Scatter Parameters)

- **S21**: Parâmetro de Transmissão
  - Quanto de sinal sai de um lado quando entra do outro
  - Em dB: 0 = tudo passa, -60 = quase nada passa
- **S11**: Parâmetro de Reflexão (não usado aqui)
  - Quanto de sinal volta/rebota

### Materiais

- **er (epsilon_r)**: Constante dielétrica relativa
  - Mede como um material reage a campos elétricos
  - Ar: er ≈ 1.0
  - RO3003 (PCB): er = 3.0
  - RO3006 (PCB): er = 6.5 (mais forte)
  - Vidro: er ≈ 5-8
  - Água: er ≈ 80

- **h_sub**: Altura do substrato
  - Espessura do material dielétrico onde a FSS está impressa

### Unidades

- **GHz**: Gigahertz = 1.000.000.000 Hz (frequência)
- **mm**: Milímetro = 0.1 cm (distância)
- **cm**: Centímetro = 10 mm (distância)
- **dB**: Decibel (escala logarítmica)
  - 0 dB = referência
  - -3 dB = metade da potência
  - -10 dB = um décimo da potência

---

## Geometrias Explicadas

### Cruz de Jerusalém

```
    ╔═══╗
    ║   ║
╔═══╦═╩═╦═══╗
║   ║   ║   ║
╠═══╬═══╬═══╣
║   ║ █ ║   ║  (█ = cruz central)
╠═══╬═══╬═══╣
║   ║   ║   ║
╚═══╩═╦═╩═══╝
    ║   ║
    ╚═══╝
```

- Parâmetros: p (período), d (comprimento cruz), w (espessura), h (altura), g (gap)

### Espira Quadrada

```
╔═════╗  ╔═════╗
║     ║  ║     ║
║  █  ║  ║     ║  (█ = espaço interior vazio)
║     ║  ║     ║
╚═════╝  ╚═════╝
```

- Parâmetros: p (período), d (tamanho do anel), w (largura do fio)

### Patch Quadrado

```
█████  █████
█████  █████

█████  █████
█████  █████
```

- Parâmetros: p (período), c (tamanho do patch)
- Totalmente sólido, sem espaço interior

---

## Lendo o Gráfico S21

```
S21 (dB)
    0 ├─────────────────────── (sinal passa 100%)
      │    ╱╲
  -10 ├───╱  ╲
      │  ╱    ╲
  -20 ├─╱──────╲─────
      │╱        ╲
  -30 ├──────────╲──── (largura de banda -3dB)
      │          ╲
  -40 ├───────────╲──
      │            ╲╱
  -50 ├──────────────
      │
  -60 └─────────────────────── (sinal bloqueado)
         5    10    15    20
         Frequência (GHz)

        ▼
      fr=10 GHz (frequência de ressonância)
```

- **Pico para baixo**: Máximo bloqueio nessa frequência
- **Largura**: Quanto tempo/frequência o padrão funciona
- **Diferentes cores**: Diferentes modelos matemáticos

---

## Experimentos Práticos

### Teste 1: Aumentar o Período

1. Aumente `p` de 10mm para 20mm
2. **Resultado**: A ressonância se move para frequência **mais baixa**
3. **Motivo**: Períodos maiores afetam ondas mais longas (frequências mais baixas)

### Teste 2: Aumentar a Dimensão do Elemento

1. Aumente `d` (Cruz) ou `c` (Patch) de 5mm para 8mm
2. **Resultado**: A ressonância muda
3. **Motivo**: Tamanho do elemento afeta a frequência de ressonância

### Teste 3: Trocar de Material

1. Use RO3003 (er=3)
2. Depois use RO3006 (er=6.5)
3. **Resultado**: Ressonância em frequência **mais baixa** com material mais forte
4. **Motivo**: Material dielétrico mais forte = velocidade da onda menor

### Teste 4: Aumentar Gap/Espaço

1. Aumente `g` (só na Cruz)
2. **Resultado**: Muda o comportamento de transmissão
3. **Motivo**: Espaço entre elementos afeta acoplamento

---

## Valores Típicos para Começar

**Cruz de Jerusalém:**

```
fStart = 1.0 GHz
fEnd = 20.0 GHz
p = 10.0 mm
d = 8.0 mm
w = 0.5 mm
h = 2.0 mm
g = 1.0 mm
```

**Espira Quadrada:**

```
fStart = 1.0 GHz
fEnd = 20.0 GHz
p = 10.0 mm
d = 8.0 mm
w = 0.5 mm
```

**Patch Quadrado:**

```
fStart = 0.0 GHz
fEnd = 20.0 GHz
p = 10.0 mm
c = 5.0 mm
```

---

## Troubleshooting

**Problema: Gráfico não muda**

- Verifique se os valores estão dentro dos intervalos válidos
- Certifique-se que fStart < fEnd
- Certifique-se que c < p (patch não pode ser maior que período)

**Problema: Gráfico muito "plano"**

- Estrutura pode estar acima/abaixo da faixa de frequência de interesse
- Ajuste fStart e fEnd
- Tente mudar o período p

**Problema: Valores mostram -60dB em tudo**

- Frequência muito alta ou período muito grande
- Reduza p ou aumente fEnd
- Ou aumente as dimensões d/c

**Problema: Diferença grande entre as 6 curvas**

- Normal! Diferentes modelos matemáticos podem variar
- Compare com dados HFSS reais para validar
- O modelo preto (principal) geralmente é mais preciso

---

## Dicas Profissionais

1. **Sempre começar simples**: Teste um parâmetro por vez
2. **Usar presets**: RO3003 e RO3006 são substratos reais
3. **Validar com HFSS**: Se possível, simule em 3D e compare
4. **Exportar dados**: Use CSV para plotar em Excel ou análise extra
5. **Documentar mudanças**: Anote quais parâmetros mudam o comportamento
6. **Comparar modelos**: Veja as 6 curvas - ajuda a entender variabilidade

---

## Próximos Passos

1. **Leia a documentação completa**: README_EXPLICACAO.md
2. **Experimente online**: Abra os HTML nos navegadores
3. **Estude o código**: Cada arquivo JS tem comentários em português
4. **Adapte para seus parâmetros**: Use valores que importam para seu projeto
5. **Compare com realidade**: Valide contra medições reais ou HFSS

---

## Contato / Dúvidas

Todos os arquivos estão comentados em **português** para facilitar compreensão.

- Veja `/src/js/` para código comentado
- Veja `/src/css/` para estilos
- Veja arquivo HTML para estrutura

Divirta-se aprendendo! 🚀
