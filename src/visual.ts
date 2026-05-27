"use strict";

import powerbi from "powerbi-visuals-api";
import * as d3 from "d3";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import { VisualFormattingSettingsModel } from "./settings";
import { formatarValor, ehNumeroValido, larguraTextoEstimada, OpcoesFormato, TipoFormato } from "./numberFormatter";

import IVisual = powerbi.extensibility.visual.IVisual;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import DataView = powerbi.DataView;
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;
import DataViewValueColumn = powerbi.DataViewValueColumn;
import ITooltipService = powerbi.extensibility.ITooltipService;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;
import ISelectionId = powerbi.visuals.ISelectionId;

interface BarraDados {
    indice: number;
    categoriaTexto: string;
    valor: number;
    valorOriginal: any;
    cor: string;
    selectionId: ISelectionId;
    tooltips: { displayName: string; valor: any; formato?: string }[];
    formatoQuantidade: string | undefined;
}

function numOuNull(v: any): number | null {
    if (!ehNumeroValido(v)) return null;
    return Number(v);
}

function dashArray(tipo: string, espessura: number): string {
    const e = Math.max(0.5, espessura);
    switch (tipo) {
        case "dash": return `${e * 3} ${e * 2}`;
        case "dot": return `${e} ${e * 2}`;
        default: return "";
    }
}

function lerCor(picker: any, fallback: string): string {
    if (!picker) return fallback;
    let v: any = picker.value;
    while (v && typeof v === "object" && "value" in v) v = v.value;
    if (typeof v === "string" && v.length > 0) return v;
    return fallback;
}

function lerEnum(picker: any, fallback: string): string {
    if (!picker || !picker.value) return fallback;
    const v: any = picker.value;
    if (typeof v === "string") return v;
    if (v && typeof v === "object" && typeof v.value === "string") return v.value;
    return fallback;
}

function lerNumero(picker: any, fallback: number): number {
    if (!picker) return fallback;
    const n = Number(picker.value);
    return isFinite(n) ? n : fallback;
}

function lerBool(picker: any, fallback: boolean): boolean {
    if (!picker || picker.value === undefined || picker.value === null) return fallback;
    return !!picker.value;
}

function lerTexto(picker: any, fallback: string): string {
    if (!picker || picker.value === undefined || picker.value === null) return fallback;
    return String(picker.value);
}

function lerFonte(picker: any, fallback: string): string {
    if (!picker) return fallback;
    if (typeof picker.value === "string") return picker.value || fallback;
    return fallback;
}

function opcoesFormatoDeCard(card: any): OpcoesFormato {
    return {
        tipo: lerEnum(card.tipoFormato, "auto") as TipoFormato,
        casasDecimais: lerNumero(card.casasDecimais, 0),
        abreviar: lerBool(card.abreviar, false),
        limiarAbreviar: card.limiarAbreviar ? lerNumero(card.limiarAbreviar, 1000) : 1000,
        prefixo: card.prefixo ? lerTexto(card.prefixo, "") : "",
        sufixo: card.sufixo ? lerTexto(card.sufixo, "") : ""
    };
}

// Calcula luminance de uma cor hex para escolher texto branco/preto
function corContraste(hex: string): string {
    if (!hex || hex.length < 4) return "#111827";
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length >= 7) {
        r = parseInt(hex.substr(1, 2), 16);
        g = parseInt(hex.substr(3, 2), 16);
        b = parseInt(hex.substr(5, 2), 16);
    }
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.55 ? "#111827" : "#FFFFFF";
}

function truncarTexto(texto: string, larguraMax: number, family: string, size: number, bold: boolean): string {
    if (!texto) return "";
    const largura = larguraTextoEstimada(texto, family, size, bold);
    if (largura <= larguraMax) return texto;
    let baixo = 1;
    let alto = texto.length;
    while (baixo < alto) {
        const meio = Math.floor((baixo + alto + 1) / 2);
        const cand = texto.substr(0, meio) + "...";
        if (larguraTextoEstimada(cand, family, size, bold) <= larguraMax) {
            baixo = meio;
        } else {
            alto = meio - 1;
        }
    }
    return texto.substr(0, baixo) + "...";
}

export class Visual implements IVisual {
    private host: IVisualHost;
    private target: HTMLElement;
    private svgRoot: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    private gRoot: d3.Selection<SVGGElement, unknown, null, undefined>;
    private formattingSettingsService: FormattingSettingsService;
    private formattingSettings: VisualFormattingSettingsModel;
    private tooltipService: ITooltipService;

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.tooltipService = options.host.tooltipService;
        this.formattingSettingsService = new FormattingSettingsService();
        this.target = options.element;
        this.target.classList.add("barras-categorizadas-host");

        this.svgRoot = d3.select(this.target).append("svg")
            .attr("xmlns", "http://www.w3.org/2000/svg")
            .attr("preserveAspectRatio", "none");
        this.gRoot = this.svgRoot.append("g").attr("class", "raiz");
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }

    public update(options: VisualUpdateOptions): void {
        const dv: DataView = options.dataViews && options.dataViews[0];
        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(
            VisualFormattingSettingsModel,
            dv
        );

        const w = Math.max(120, options.viewport.width);
        const h = Math.max(80, options.viewport.height);

        this.svgRoot.attr("width", w).attr("height", h).attr("viewBox", `0 0 ${w} ${h}`);
        this.gRoot.selectAll("*").remove();

        const cfg = this.formattingSettings;

        // ===== Validacao =====
        if (!dv || !dv.categorical) {
            this.renderMensagem(w, h, "Arraste campos para Categoria e Quantidade.");
            return;
        }
        const cat = dv.categorical;
        if (!cat.categories || cat.categories.length === 0) {
            this.renderMensagem(w, h, "Defina o campo Categoria (eixo Y).");
            return;
        }
        if (!cat.values || cat.values.length === 0) {
            this.renderMensagem(w, h, "Defina o campo Quantidade (eixo X).");
            return;
        }

        const categoriaCol: DataViewCategoryColumn = cat.categories[0];
        const quantidadeCol: DataViewValueColumn | undefined =
            cat.values.find(v => v.source && v.source.roles && v.source.roles["quantidade"]) || cat.values[0];

        if (!quantidadeCol) {
            this.renderMensagem(w, h, "Defina o campo Quantidade (eixo X).");
            return;
        }

        const tooltipCols: DataViewValueColumn[] = cat.values.filter(
            v => v.source && v.source.roles && v.source.roles["tooltips"]
        );

        const formatoQuantidade = quantidadeCol.source && quantidadeCol.source.format;

        // ===== Coleta de barras =====
        const modoCor = lerEnum(cfg.barras.modoCor, "unica");
        const corUnica = lerCor(cfg.barras.corUnica, "#3B82F6");

        const barras: BarraDados[] = [];
        const numRows = categoriaCol.values ? categoriaCol.values.length : 0;
        for (let i = 0; i < numRows; i++) {
            const catVal = categoriaCol.values[i];
            const quantVal = quantidadeCol.values ? quantidadeCol.values[i] : null;
            const valor = numOuNull(quantVal);
            if (valor === null) continue;
            const catTexto = catVal !== null && catVal !== undefined ? String(catVal) : "(em branco)";

            let cor: string;
            if (modoCor === "categoria") {
                cor = this.host.colorPalette.getColor(catTexto).value;
            } else {
                cor = corUnica;
            }

            const selId = this.host.createSelectionIdBuilder()
                .withCategory(categoriaCol, i)
                .createSelectionId();

            const tooltips = tooltipCols.map(tc => ({
                displayName: tc.source.displayName,
                valor: tc.values ? tc.values[i] : null,
                formato: tc.source.format
            }));

            barras.push({
                indice: i,
                categoriaTexto: catTexto,
                valor,
                valorOriginal: quantVal,
                cor,
                selectionId: selId,
                tooltips,
                formatoQuantidade
            });
        }

        if (barras.length === 0) {
            this.renderMensagem(w, h, "Nenhum valor numerico em Quantidade.");
            return;
        }

        // ===== Ordenacao =====
        const ordem = lerEnum(cfg.barras.ordem, "valorDesc");
        if (ordem === "valorDesc") barras.sort((a, b) => b.valor - a.valor);
        else if (ordem === "valorAsc") barras.sort((a, b) => a.valor - b.valor);
        else if (ordem === "nomeAsc") barras.sort((a, b) => a.categoriaTexto.localeCompare(b.categoriaTexto, "pt-BR"));
        else if (ordem === "nomeDesc") barras.sort((a, b) => b.categoriaTexto.localeCompare(a.categoriaTexto, "pt-BR"));

        // ===== Layout =====
        const mTopo = Math.max(0, lerNumero(cfg.layout.margemTopo, 16));
        const mBase = Math.max(0, lerNumero(cfg.layout.margemBase, 32));
        const mEsq = Math.max(0, lerNumero(cfg.layout.margemEsquerda, 8));
        const mDir = Math.max(0, lerNumero(cfg.layout.margemDireita, 24));

        // ===== Calcula largura necessaria para os rotulos de categoria =====
        const exibirCat = lerBool(cfg.categoria.exibir, true);
        const familyCat = lerFonte(cfg.categoria.fontFamily, "Segoe UI, sans-serif");
        const sizeCat = lerNumero(cfg.categoria.fontSize, 11);
        const boldCat = lerBool(cfg.categoria.fontBold, false);
        const larguraMaxCat = Math.max(30, lerNumero(cfg.categoria.larguraMaxima, 140));

        let larguraCategoria = 0;
        if (exibirCat) {
            let maior = 0;
            for (const b of barras) {
                const lw = larguraTextoEstimada(b.categoriaTexto, familyCat, sizeCat, boldCat);
                if (lw > maior) maior = lw;
            }
            larguraCategoria = Math.min(maior, larguraMaxCat) + 8;
        }

        // Eixo X (rotulos do eixo) reserva altura na base
        const exibirEixoX = lerBool(cfg.eixoX.exibir, true);
        const sizeEixoX = lerNumero(cfg.eixoX.fontSize, 11);
        const alturaEixoX = exibirEixoX ? sizeEixoX + 8 : 0;

        const plot = {
            x0: mEsq + larguraCategoria,
            x1: w - mDir,
            y0: mTopo,
            y1: h - mBase - alturaEixoX
        };

        if (plot.x1 <= plot.x0 + 20 || plot.y1 <= plot.y0 + 10) {
            this.renderMensagem(w, h, "Espaco insuficiente. Ajuste as margens.");
            return;
        }

        // ===== Escala Y (band scale para categorias) =====
        const larguraBarraPct = Math.max(0.05, Math.min(1, lerNumero(cfg.barras.largura, 70) / 100));
        const escalaY = d3.scaleBand<string>()
            .domain(barras.map(b => b.categoriaTexto))
            .range([plot.y0, plot.y1])
            .paddingInner(1 - larguraBarraPct)
            .paddingOuter(0.1);

        // ===== Escala X =====
        const minimoAuto = lerBool(cfg.eixoX.minimoAuto, true);
        const maximoAuto = lerBool(cfg.eixoX.maximoAuto, true);
        const valoresArr = barras.map(b => b.valor);
        let xMin = Math.min(0, ...valoresArr);
        let xMax = Math.max(0, ...valoresArr);
        if (!minimoAuto) xMin = lerNumero(cfg.eixoX.minimo, xMin);
        if (!maximoAuto) xMax = lerNumero(cfg.eixoX.maximo, xMax);
        if (xMax === xMin) xMax = xMin + 1;
        if (xMax < xMin) { const t = xMin; xMin = xMax; xMax = t; }

        const escalaX = d3.scaleLinear()
            .domain([xMin, xMax])
            .range([plot.x0, plot.x1]);

        const xZero = escalaX(Math.max(xMin, Math.min(0, xMax)));

        // ===== Grade vertical (gridlines do eixo X) =====
        if (lerBool(cfg.eixoX.exibirGrid, true)) {
            const corGrid = lerCor(cfg.eixoX.corGrid, "#E5E7EB");
            const espGrid = Math.max(0.5, lerNumero(cfg.eixoX.espessuraGrid, 1));
            const tipoGrid = lerEnum(cfg.eixoX.tipoLinhaGrid, "solid");
            const dashGrid = dashArray(tipoGrid, espGrid);
            const passo = lerNumero(cfg.eixoX.passo, 0);
            const ticks = passo > 0 ? this.gerarTicks(xMin, xMax, passo) : escalaX.ticks(5);
            for (const t of ticks) {
                const x = escalaX(t);
                this.gRoot.append("line")
                    .attr("x1", x).attr("x2", x)
                    .attr("y1", plot.y0).attr("y2", plot.y1)
                    .attr("stroke", corGrid)
                    .attr("stroke-width", espGrid)
                    .attr("stroke-dasharray", dashGrid)
                    .attr("shape-rendering", "crispEdges");
            }
        }

        // ===== Renderizar barras =====
        const raio = Math.max(0, lerNumero(cfg.barras.raioCanto, 2));
        const exibirBorda = lerBool(cfg.barras.exibirBorda, false);
        const corBorda = lerCor(cfg.barras.corBorda, "#1F2937");
        const espBorda = Math.max(0, lerNumero(cfg.barras.espessuraBorda, 1));
        const alturaBarra = escalaY.bandwidth();

        for (const b of barras) {
            const yBarra = escalaY(b.categoriaTexto);
            if (yBarra === undefined) continue;
            const xValor = escalaX(b.valor);
            const xBarraInicio = b.valor >= 0 ? xZero : xValor;
            const larguraBarra = Math.abs(xValor - xZero);

            const rect = this.gRoot.append("rect")
                .attr("x", xBarraInicio)
                .attr("y", yBarra)
                .attr("width", larguraBarra)
                .attr("height", alturaBarra)
                .attr("rx", raio)
                .attr("ry", raio)
                .attr("fill", b.cor)
                .style("cursor", "pointer");

            if (exibirBorda && espBorda > 0) {
                rect.attr("stroke", corBorda).attr("stroke-width", espBorda);
            }

            this.anexarTooltip(rect, b);
        }

        // ===== Rotulos de valor =====
        if (lerBool(cfg.rotulos.exibir, true)) {
            const posicao = lerEnum(cfg.rotulos.posicao, "foraFim");
            const contrasteAuto = lerBool(cfg.rotulos.contrasteAuto, true);
            const corManual = lerCor(cfg.rotulos.cor, "#111827");
            const familyR = lerFonte(cfg.rotulos.fontFamily, "Segoe UI, sans-serif");
            const sizeR = lerNumero(cfg.rotulos.fontSize, 11);
            const pesoR = lerBool(cfg.rotulos.fontBold, false) ? "700" : "400";
            const italicoR = lerBool(cfg.rotulos.fontItalic, false) ? "italic" : "normal";
            const sublinR = lerBool(cfg.rotulos.fontUnderline, false) ? "underline" : "none";
            const opts = opcoesFormatoDeCard(cfg.rotulos);

            for (const b of barras) {
                const yBarra = escalaY(b.categoriaTexto);
                if (yBarra === undefined) continue;
                const xValor = escalaX(b.valor);
                const xBarraInicio = b.valor >= 0 ? xZero : xValor;
                const xBarraFim = b.valor >= 0 ? xValor : xZero;
                const larguraBarra = Math.abs(xValor - xZero);
                const yCentro = yBarra + alturaBarra / 2;

                const textoVal = formatarValor(b.valor, opts, b.formatoQuantidade);
                if (!textoVal) continue;

                const larguraTexto = larguraTextoEstimada(textoVal, familyR, sizeR, pesoR === "700");

                let xR: number;
                let anchor: string;
                let dentro = false;

                if (posicao === "foraFim") {
                    if (b.valor >= 0) {
                        xR = xBarraFim + 4;
                        anchor = "start";
                        if (xR + larguraTexto > plot.x1) {
                            xR = xBarraFim - 4;
                            anchor = "end";
                            dentro = true;
                        }
                    } else {
                        xR = xBarraFim - 4;
                        anchor = "end";
                        if (xR - larguraTexto < plot.x0) {
                            xR = xBarraFim + 4;
                            anchor = "start";
                            dentro = true;
                        }
                    }
                } else if (posicao === "dentroFim") {
                    xR = b.valor >= 0 ? xBarraFim - 4 : xBarraFim + 4;
                    anchor = b.valor >= 0 ? "end" : "start";
                    dentro = true;
                } else if (posicao === "dentroInicio") {
                    xR = b.valor >= 0 ? xBarraInicio + 4 : xBarraInicio - 4;
                    anchor = b.valor >= 0 ? "start" : "end";
                    dentro = true;
                } else {
                    xR = (xBarraInicio + xBarraFim) / 2;
                    anchor = "middle";
                    dentro = larguraBarra > larguraTexto + 4;
                }

                let corTexto = corManual;
                if (contrasteAuto && dentro) {
                    corTexto = corContraste(b.cor);
                }

                this.gRoot.append("text")
                    .attr("x", xR)
                    .attr("y", yCentro)
                    .attr("text-anchor", anchor)
                    .attr("dominant-baseline", "central")
                    .attr("font-family", familyR)
                    .attr("font-size", sizeR)
                    .attr("font-weight", pesoR)
                    .attr("font-style", italicoR)
                    .attr("text-decoration", sublinR)
                    .attr("fill", corTexto)
                    .attr("pointer-events", "none")
                    .text(textoVal);
            }
        }

        // ===== Categoria (eixo Y) =====
        if (exibirCat) {
            const corCat = lerCor(cfg.categoria.cor, "#374151");
            const pesoCat = boldCat ? "700" : "400";
            const italicoCat = lerBool(cfg.categoria.fontItalic, false) ? "italic" : "normal";
            const sublinCat = lerBool(cfg.categoria.fontUnderline, false) ? "underline" : "none";

            for (const b of barras) {
                const yBarra = escalaY(b.categoriaTexto);
                if (yBarra === undefined) continue;
                const yCentro = yBarra + alturaBarra / 2;
                const textoTrunc = truncarTexto(b.categoriaTexto, larguraMaxCat, familyCat, sizeCat, boldCat);
                const tNode = this.gRoot.append("text")
                    .attr("x", plot.x0 - 6)
                    .attr("y", yCentro)
                    .attr("text-anchor", "end")
                    .attr("dominant-baseline", "central")
                    .attr("font-family", familyCat)
                    .attr("font-size", sizeCat)
                    .attr("font-weight", pesoCat)
                    .attr("font-style", italicoCat)
                    .attr("text-decoration", sublinCat)
                    .attr("fill", corCat)
                    .text(textoTrunc);
                if (textoTrunc !== b.categoriaTexto) {
                    tNode.append("title").text(b.categoriaTexto);
                }
            }
        }
        if (lerBool(cfg.categoria.exibirLinha, false)) {
            this.gRoot.append("line")
                .attr("x1", plot.x0).attr("x2", plot.x0)
                .attr("y1", plot.y0).attr("y2", plot.y1)
                .attr("stroke", lerCor(cfg.categoria.corLinha, "#6B7280"))
                .attr("stroke-width", Math.max(0.5, lerNumero(cfg.categoria.espessuraLinha, 1)))
                .attr("shape-rendering", "crispEdges");
        }

        // ===== Eixo X (linha + rotulos) =====
        if (lerBool(cfg.eixoX.exibirLinha, true)) {
            this.gRoot.append("line")
                .attr("x1", plot.x0).attr("x2", plot.x1)
                .attr("y1", plot.y1).attr("y2", plot.y1)
                .attr("stroke", lerCor(cfg.eixoX.corLinha, "#6B7280"))
                .attr("stroke-width", Math.max(0.5, lerNumero(cfg.eixoX.espessuraLinha, 1)))
                .attr("shape-rendering", "crispEdges");
        }
        if (exibirEixoX) {
            const familyX = lerFonte(cfg.eixoX.fontFamily, "Segoe UI, sans-serif");
            const pesoX = lerBool(cfg.eixoX.fontBold, false) ? "700" : "400";
            const italicoX = lerBool(cfg.eixoX.fontItalic, false) ? "italic" : "normal";
            const sublinX = lerBool(cfg.eixoX.fontUnderline, false) ? "underline" : "none";
            const corX = lerCor(cfg.eixoX.cor, "#374151");
            const optsX = opcoesFormatoDeCard(cfg.eixoX);
            const passo = lerNumero(cfg.eixoX.passo, 0);
            const ticks = passo > 0 ? this.gerarTicks(xMin, xMax, passo) : escalaX.ticks(5);

            for (const t of ticks) {
                const x = escalaX(t);
                this.gRoot.append("text")
                    .attr("x", x)
                    .attr("y", plot.y1 + sizeEixoX + 2)
                    .attr("text-anchor", "middle")
                    .attr("font-family", familyX)
                    .attr("font-size", sizeEixoX)
                    .attr("font-weight", pesoX)
                    .attr("font-style", italicoX)
                    .attr("text-decoration", sublinX)
                    .attr("fill", corX)
                    .text(formatarValor(t, optsX, formatoQuantidade));
            }
        }
    }

    private gerarTicks(min: number, max: number, passo: number): number[] {
        const ticks: number[] = [];
        if (passo <= 0) return ticks;
        let v = Math.ceil(min / passo) * passo;
        let guarda = 0;
        while (v <= max && guarda < 1000) {
            ticks.push(v);
            v += passo;
            guarda++;
        }
        return ticks;
    }

    private anexarTooltip(sel: d3.Selection<SVGRectElement, unknown, null, undefined>, b: BarraDados): void {
        if (!this.tooltipService) return;
        const cfg = this.formattingSettings;
        if (!lerBool(cfg.tooltip.exibir, true)) return;

        const optsX = opcoesFormatoDeCard(cfg.eixoX);
        const node = sel.node();
        if (!node) return;

        const construirItens = (): VisualTooltipDataItem[] => {
            const itens: VisualTooltipDataItem[] = [];
            if (lerBool(cfg.tooltip.incluirCategoria, true)) {
                itens.push({
                    displayName: "Categoria",
                    value: b.categoriaTexto,
                    color: b.cor
                });
            }
            if (lerBool(cfg.tooltip.incluirValor, true)) {
                itens.push({
                    displayName: "Quantidade",
                    value: formatarValor(b.valor, optsX, b.formatoQuantidade),
                    color: b.cor
                });
            }
            for (const t of b.tooltips) {
                itens.push({
                    displayName: t.displayName,
                    value: ehNumeroValido(t.valor)
                        ? formatarValor(t.valor, optsX, t.formato)
                        : String(t.valor !== null && t.valor !== undefined ? t.valor : "")
                });
            }
            return itens;
        };

        sel.on("mousemove", (ev: MouseEvent) => {
            const rect = (this.target as HTMLElement).getBoundingClientRect();
            this.tooltipService.show({
                coordinates: [ev.clientX - rect.left, ev.clientY - rect.top],
                isTouchEvent: false,
                dataItems: construirItens(),
                identities: [b.selectionId as any]
            });
        });
        sel.on("mouseout", () => {
            this.tooltipService.hide({ isTouchEvent: false, immediately: false });
        });
    }

    private renderMensagem(w: number, h: number, msg: string): void {
        this.gRoot.append("text")
            .attr("x", w / 2).attr("y", h / 2)
            .attr("text-anchor", "middle").attr("dominant-baseline", "central")
            .attr("font-family", "Segoe UI, sans-serif")
            .attr("font-size", 13)
            .attr("fill", "#6B7280")
            .text(msg);
    }
}
