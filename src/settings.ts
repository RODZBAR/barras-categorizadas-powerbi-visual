"use strict";

import powerbi from "powerbi-visuals-api";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import Card = formattingSettings.SimpleCard;
import Model = formattingSettings.Model;
import ValidatorType = powerbi.visuals.ValidatorType;

const FONTE_PADRAO = "Segoe UI, sans-serif";

const TIPOS_FORMATO: powerbi.IEnumMember[] = [
    { value: "auto", displayName: "Automatico" },
    { value: "decimal", displayName: "Decimal" },
    { value: "inteiro", displayName: "Inteiro" },
    { value: "percentualFracao", displayName: "Percentual (fracao 0-1)" },
    { value: "percentual", displayName: "Percentual (ja em %)" },
    { value: "moedaBRL", displayName: "Moeda (R$)" },
    { value: "moedaUSD", displayName: "Moeda (US$)" },
    { value: "moedaEUR", displayName: "Moeda (EUR)" }
];

const MODOS_COR: powerbi.IEnumMember[] = [
    { value: "unica", displayName: "Cor unica" },
    { value: "categoria", displayName: "Cor por categoria (paleta)" }
];

const ORDENS: powerbi.IEnumMember[] = [
    { value: "valorDesc", displayName: "Maior para menor" },
    { value: "valorAsc", displayName: "Menor para maior" },
    { value: "nomeAsc", displayName: "A para Z" },
    { value: "nomeDesc", displayName: "Z para A" },
    { value: "dados", displayName: "Ordem dos dados" }
];

const POSICOES_ROTULO: powerbi.IEnumMember[] = [
    { value: "foraFim", displayName: "Fora (apos a barra)" },
    { value: "dentroFim", displayName: "Dentro (fim da barra)" },
    { value: "dentroInicio", displayName: "Dentro (inicio da barra)" },
    { value: "centro", displayName: "Centro da barra" }
];

const TIPOS_LINHA_GRID: powerbi.IEnumMember[] = [
    { value: "solid", displayName: "Solida" },
    { value: "dash", displayName: "Tracejada" },
    { value: "dot", displayName: "Pontilhada" }
];

const ALINHAMENTOS_CATEGORIA: powerbi.IEnumMember[] = [
    { value: "esquerda", displayName: "Esquerda" },
    { value: "centro", displayName: "Centro" },
    { value: "direita", displayName: "Direita" }
];

function numero(name: string, displayName: string, valor: number, min: number, max: number): formattingSettings.NumUpDown {
    return new formattingSettings.NumUpDown({
        name,
        displayName,
        value: valor,
        options: {
            minValue: { type: ValidatorType.Min, value: min },
            maxValue: { type: ValidatorType.Max, value: max }
        }
    });
}

function cor(name: string, displayName: string, hex: string): formattingSettings.ColorPicker {
    return new formattingSettings.ColorPicker({
        name,
        displayName,
        value: { value: hex }
    });
}

function toggle(name: string, displayName: string, valor: boolean): formattingSettings.ToggleSwitch {
    return new formattingSettings.ToggleSwitch({ name, displayName, value: valor });
}

function texto(name: string, displayName: string, valor: string, placeholder?: string): formattingSettings.TextInput {
    return new formattingSettings.TextInput({
        name,
        displayName,
        value: valor,
        placeholder: placeholder || ""
    });
}

function dropdown(name: string, displayName: string, items: powerbi.IEnumMember[], indexPadrao: number): formattingSettings.ItemDropdown {
    return new formattingSettings.ItemDropdown({
        name,
        displayName,
        items,
        value: items[indexPadrao]
    });
}

/* =========================== Layout (margens) =========================== */
class LayoutCard extends Card {
    margemTopo = numero("margemTopo", "Margem topo", 16, 0, 200);
    margemBase = numero("margemBase", "Margem base", 32, 0, 200);
    margemEsquerda = numero("margemEsquerda", "Margem esquerda", 8, 0, 300);
    margemDireita = numero("margemDireita", "Margem direita", 24, 0, 300);
    name = "layout";
    displayName = "Layout (margens)";
    slices = [this.margemTopo, this.margemBase, this.margemEsquerda, this.margemDireita];
}

/* =========================== Barras =========================== */
class BarrasCard extends Card {
    modoCor = dropdown("modoCor", "Modo de cor", MODOS_COR, 0);
    corUnica = cor("corUnica", "Cor unica", "#3B82F6");
    largura = numero("largura", "Largura da barra (%)", 70, 5, 100);
    raioCanto = numero("raioCanto", "Arredondamento dos cantos", 2, 0, 30);
    ordem = dropdown("ordem", "Ordenacao", ORDENS, 0);
    exibirBorda = toggle("exibirBorda", "Exibir borda", false);
    corBorda = cor("corBorda", "Cor da borda", "#1F2937");
    espessuraBorda = numero("espessuraBorda", "Espessura da borda", 1, 0, 10);
    name = "barras";
    displayName = "Barras";
    slices = [
        this.modoCor, this.corUnica,
        this.largura, this.raioCanto, this.ordem,
        this.exibirBorda, this.corBorda, this.espessuraBorda
    ];
}

/* =========================== Rotulos de valor =========================== */
class RotulosCard extends Card {
    exibir = toggle("exibir", "Exibir rotulos", true);
    posicao = dropdown("posicao", "Posicao", POSICOES_ROTULO, 0);
    contrasteAuto = toggle("contrasteAuto", "Cor automatica (contraste com a barra)", true);
    fontFamily = new formattingSettings.FontPicker({ name: "fontFamily", value: FONTE_PADRAO });
    fontSize = numero("fontSize", "Tamanho", 11, 6, 60);
    fontBold = toggle("fontBold", "Negrito", false);
    fontItalic = toggle("fontItalic", "Italico", false);
    fontUnderline = toggle("fontUnderline", "Sublinhado", false);
    cor = cor("cor", "Cor (quando contraste auto desligado)", "#111827");
    tipoFormato = dropdown("tipoFormato", "Tipo de formato", TIPOS_FORMATO, 0);
    casasDecimais = numero("casasDecimais", "Casas decimais", 0, 0, 6);
    abreviar = toggle("abreviar", "Abreviar (mil/mi/bi)", false);
    limiarAbreviar = numero("limiarAbreviar", "Limiar para abreviar", 1000, 100, 1_000_000);
    prefixo = texto("prefixo", "Prefixo", "", "ex.: R$ ");
    sufixo = texto("sufixo", "Sufixo", "", "ex.: %");
    name = "rotulos";
    displayName = "Rotulos de valor";
    slices = [
        this.exibir, this.posicao, this.contrasteAuto,
        this.fontFamily, this.fontSize, this.fontBold, this.fontItalic, this.fontUnderline, this.cor,
        this.tipoFormato, this.casasDecimais, this.abreviar, this.limiarAbreviar, this.prefixo, this.sufixo
    ];
}

/* =========================== Categoria (eixo Y) =========================== */
class CategoriaCard extends Card {
    exibir = toggle("exibir", "Exibir categorias", true);
    exibirLinha = toggle("exibirLinha", "Exibir linha do eixo", false);
    corLinha = cor("corLinha", "Cor da linha", "#6B7280");
    espessuraLinha = numero("espessuraLinha", "Espessura da linha", 1, 0, 10);
    fontFamily = new formattingSettings.FontPicker({ name: "fontFamily", value: FONTE_PADRAO });
    fontSize = numero("fontSize", "Tamanho", 11, 6, 60);
    fontBold = toggle("fontBold", "Negrito", false);
    fontItalic = toggle("fontItalic", "Italico", false);
    fontUnderline = toggle("fontUnderline", "Sublinhado", false);
    cor = cor("cor", "Cor do texto", "#374151");
    larguraMaxima = numero("larguraMaxima", "Largura maxima (px)", 140, 30, 600);
    alinhamento = dropdown("alinhamento", "Alinhamento", ALINHAMENTOS_CATEGORIA, 2);
    name = "categoria";
    displayName = "Categoria (eixo Y)";
    slices = [
        this.exibir, this.exibirLinha, this.corLinha, this.espessuraLinha,
        this.fontFamily, this.fontSize, this.fontBold, this.fontItalic, this.fontUnderline,
        this.cor, this.larguraMaxima, this.alinhamento
    ];
}

/* =========================== Eixo X (quantidade) =========================== */
class EixoXCard extends Card {
    exibir = toggle("exibir", "Exibir eixo X", true);
    exibirLinha = toggle("exibirLinha", "Exibir linha do eixo", true);
    corLinha = cor("corLinha", "Cor da linha", "#6B7280");
    espessuraLinha = numero("espessuraLinha", "Espessura da linha", 1, 0, 10);
    fontFamily = new formattingSettings.FontPicker({ name: "fontFamily", value: FONTE_PADRAO });
    fontSize = numero("fontSize", "Tamanho", 11, 6, 60);
    fontBold = toggle("fontBold", "Negrito", false);
    fontItalic = toggle("fontItalic", "Italico", false);
    fontUnderline = toggle("fontUnderline", "Sublinhado", false);
    cor = cor("cor", "Cor do texto", "#374151");
    minimoAuto = toggle("minimoAuto", "Minimo automatico", true);
    minimo = numero("minimo", "Minimo", 0, -1e12, 1e12);
    maximoAuto = toggle("maximoAuto", "Maximo automatico", true);
    maximo = numero("maximo", "Maximo", 100, -1e12, 1e12);
    passo = numero("passo", "Passo (0 = automatico)", 0, 0, 1e9);
    tipoFormato = dropdown("tipoFormato", "Tipo de formato", TIPOS_FORMATO, 0);
    casasDecimais = numero("casasDecimais", "Casas decimais", 0, 0, 6);
    abreviar = toggle("abreviar", "Abreviar (mil/mi/bi)", true);
    prefixo = texto("prefixo", "Prefixo", "", "ex.: R$ ");
    sufixo = texto("sufixo", "Sufixo", "", "ex.: %");
    exibirGrid = toggle("exibirGrid", "Exibir linhas de grade verticais", true);
    corGrid = cor("corGrid", "Cor da grade", "#E5E7EB");
    espessuraGrid = numero("espessuraGrid", "Espessura da grade", 1, 0, 5);
    tipoLinhaGrid = dropdown("tipoLinhaGrid", "Tipo da grade", TIPOS_LINHA_GRID, 0);
    name = "eixoX";
    displayName = "Eixo X (Quantidade)";
    slices = [
        this.exibir, this.exibirLinha, this.corLinha, this.espessuraLinha,
        this.fontFamily, this.fontSize, this.fontBold, this.fontItalic, this.fontUnderline, this.cor,
        this.minimoAuto, this.minimo, this.maximoAuto, this.maximo, this.passo,
        this.tipoFormato, this.casasDecimais, this.abreviar, this.prefixo, this.sufixo,
        this.exibirGrid, this.corGrid, this.espessuraGrid, this.tipoLinhaGrid
    ];
}

/* =========================== Tooltip (dica de ferramenta) =========================== */
class TooltipCard extends Card {
    exibir = toggle("exibir", "Exibir dicas de ferramenta", true);
    incluirCategoria = toggle("incluirCategoria", "Incluir categoria", true);
    incluirValor = toggle("incluirValor", "Incluir valor (Quantidade)", true);
    name = "tooltip";
    displayName = "Dica de ferramenta";
    slices = [this.exibir, this.incluirCategoria, this.incluirValor];
}

/* =========================== Modelo =========================== */
export class VisualFormattingSettingsModel extends Model {
    layout = new LayoutCard();
    barras = new BarrasCard();
    rotulos = new RotulosCard();
    categoria = new CategoriaCard();
    eixoX = new EixoXCard();
    tooltip = new TooltipCard();
    cards = [
        this.layout,
        this.barras,
        this.rotulos,
        this.categoria,
        this.eixoX,
        this.tooltip
    ];
}
