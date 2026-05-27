# Barras Categorizadas

Visual personalizado para Power BI — **grafico de barras horizontais por categoria**, com personalizacao completa de cores, ordem, rotulos, eixo e dicas de ferramenta.

## Recursos principais

- **Cor das barras** com dois modos no painel:
  - **Cor unica** (suporta `fx` para cor condicional via medida DAX)
  - **Cor por categoria (paleta)** — cores automaticas via paleta do host
- **Largura da barra** ajustavel (% do espaco disponivel) e **arredondamento de cantos**
- **Ordenacao configuravel** das barras: maior para menor (padrao), menor para maior, A para Z, Z para A, ordem dos dados
- **Rotulos de valor** com 4 posicoes (fora-fim, dentro-fim, dentro-inicio, centro) e **contraste automatico** (cor do texto escolhida via luminance quando dentro da barra)
- **Eixo X** com **minimo/maximo automatico ou manual**, passo configuravel, grade vertical (cor, espessura, tipo)
- **Categoria (eixo Y)** com truncamento automatico + tooltip nativo SVG para textos longos
- **Formatacao numerica** rica para rotulos e eixo X: inteiro, decimal, percentual, monetario (R$/US$/EUR), abreviacoes (mil/mi/bi), prefixos e sufixos personalizados
- **Dicas de ferramenta** customizaveis via campo `Dica de ferramenta` (medida multipla) — usa o tooltip nativo do Power BI

## Campos (data roles)

| Campo | Tipo | Obrigatorio | Descricao |
|---|---|---|---|
| `Categoria (eixo Y)` | Texto/Grupo | Sim | Categorias do eixo Y |
| `Quantidade (eixo X)` | Medida | Sim | Valor numerico de cada barra |
| `Dica de ferramenta` | Medida (multipla) | Nao | Itens adicionais no tooltip |

## Personalizacao

Todos os elementos podem ser configurados via painel de Formatacao do Power BI:

- **Layout** (margens topo/base/esquerda/direita)
- **Barras** (modo cor, cor unica, largura %, raio de canto, ordenacao, borda)
- **Rotulos de valor** (exibir, posicao, contraste auto, fonte, formato de numero)
- **Categoria (eixo Y)** (exibir, linha do eixo, fonte, tamanho, cor, largura maxima)
- **Eixo X (Quantidade)** (exibir, linha, fonte, min/max auto-manual, passo, formato, grade vertical)
- **Dica de ferramenta** (exibir, incluir categoria, incluir valor)

## Build

```bash
npm install
npx pbiviz package
```

O arquivo `.pbiviz` e gerado em `dist/`.

## Autor

Rodrigo de Souza Barbosa
