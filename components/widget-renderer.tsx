"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts"

interface Widget {
  tipo: "explicacao" | "card" | "grafico_barras" | "grafico_barras_horizontal" | "grafico_linha" | "grafico_pizza" | "grafico_donut" | "grafico_area" | "grafico_scatter" | "grafico_radar" | "grafico_barras_linha" | "tabela" | "lista_destaque"
  titulo: string
  dados: any
  metadados?: any
}

const COLORS = ['#1E5128', '#76BA1B', '#4D9144', '#B3DE71', '#004225', '#C0E3A2', '#2E7D32', '#81C784']

// Função para normalizar dados de widgets - aceita variações de estrutura
function normalizeChartData(dados: any): { labels: string[]; values: number[] } | null {
  if (!dados) return null;
  
  // Formato esperado: { labels: [...], values: [...] }
  if (Array.isArray(dados.labels) && Array.isArray(dados.values) && dados.labels.length > 0) {
    return { labels: dados.labels, values: dados.values };
  }
  
  // Formato alternativo: { data: [...], categories: [...] }
  if (Array.isArray(dados.data) && Array.isArray(dados.categories)) {
    return { labels: dados.categories, values: dados.data };
  }
  
  // Formato alternativo: Array de objetos [{ name/label, value/valor }]
  if (Array.isArray(dados) && dados.length > 0) {
    const first = dados[0];
    const nameKey = first.name ? 'name' : first.label ? 'label' : first.nome ? 'nome' : null;
    const valueKey = first.value !== undefined ? 'value' : first.valor !== undefined ? 'valor' : first.total !== undefined ? 'total' : null;
    if (nameKey && valueKey) {
      return {
        labels: dados.map((item: any) => String(item[nameKey] || '')),
        values: dados.map((item: any) => Number(item[valueKey]) || 0)
      };
    }
  }
  
  // Formato alternativo: { series: [{ name, data }], xaxis: { categories } }
  if (dados.series && Array.isArray(dados.series) && dados.xaxis?.categories) {
    return {
      labels: dados.xaxis.categories,
      values: dados.series[0]?.data || []
    };
  }
  
  // Formato: dados como array direto
  if (Array.isArray(dados.dados) && dados.dados.length > 0) {
    return normalizeChartData(dados.dados);
  }
  
  return null;
}

// Função para normalizar dados de card
function normalizeCardData(dados: any): { valor: string; variacao?: string; subtitulo?: string } | null {
  if (!dados) return null;
  
  // Formato esperado
  if (dados.valor !== undefined) {
    return {
      valor: String(dados.valor),
      variacao: dados.variacao,
      subtitulo: dados.subtitulo || dados.descricao
    };
  }
  
  // Alternativas
  const valorKey = dados.value !== undefined ? 'value' : dados.total !== undefined ? 'total' : dados.quantidade !== undefined ? 'quantidade' : null;
  if (valorKey) {
    return {
      valor: String(dados[valorKey]),
      variacao: dados.variacao || dados.change || dados.variation,
      subtitulo: dados.subtitulo || dados.subtitle || dados.descricao || dados.description
    };
  }
  
  return null;
}

// Função para formatar valores monetários em R$
function formatCurrency(value: number | string): string {
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^\d,-]/g, '').replace(',', '.')) : value

  if (isNaN(numValue)) return value.toString()

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(numValue)
}

// Detecta automaticamente se deve formatar como moeda baseado no título ou metadados
function shouldFormatAsCurrency(widget: Widget): boolean {
  if (widget.metadados?.formatoMonetario === true) return true;
  if (widget.metadados?.formatoMonetario === false) return false;
  
  const titulo = (widget.titulo || '').toLowerCase();
  const monetaryKeywords = [
    'valor', 'vendas', 'faturamento', 'receita', 'total', 'r$', 
    'reais', 'ticket', 'preço', 'preco', 'custo', 'lucro', 'margem',
    'monetário', 'monetario', 'dinheiro', 'pagamento', 'cobrança'
  ];
  
  return monetaryKeywords.some(keyword => titulo.includes(keyword));
}

export function WidgetRenderer({ widget }: { widget: Widget }) {
  switch (widget.tipo) {
    case "explicacao":
      return <ExplicacaoWidget widget={widget} />
    case "card":
      return <CardWidget widget={widget} />
    case "grafico_barras":
      return <BarChartWidget widget={widget} />
    case "grafico_barras_horizontal":
      return <HorizontalBarChartWidget widget={widget} />
    case "grafico_linha":
      return <LineChartWidget widget={widget} />
    case "grafico_pizza":
      return <PieChartWidget widget={widget} />
    case "grafico_donut":
      return <DonutChartWidget widget={widget} />
    case "grafico_area":
      return <AreaChartWidget widget={widget} />
    case "grafico_scatter":
      return <ScatterChartWidget widget={widget} />
    case "grafico_radar":
      return <RadarChartWidget widget={widget} />
    case "grafico_barras_linha":
      return <ComboChartWidget widget={widget} />
    case "tabela":
      return <TableWidget widget={widget} />
    case "lista_destaque":
      return <ListaDestaqueWidget widget={widget} />
    default:
      return null
  }
}

function CardWidget({ widget }: { widget: Widget }) {
  const normalizedData = normalizeCardData(widget.dados);
  
  if (!normalizedData) {
    console.error('Widget card sem dados válidos:', widget);
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{widget.titulo}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            ⚠️ Dados não disponíveis
          </div>
        </CardContent>
      </Card>
    );
  }

  const { valor, variacao, subtitulo } = normalizedData;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{widget.titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{valor || 'N/A'}</div>
        {variacao && (
          <p className="text-xs text-muted-foreground">
            {variacao}
          </p>
        )}
        {subtitulo && (
          <p className="text-xs text-muted-foreground mt-1">
            {subtitulo}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function BarChartWidget({ widget }: { widget: Widget }) {
  const normalizedData = normalizeChartData(widget.dados);
  
  if (!normalizedData) {
    console.error('Widget gráfico de barras sem dados válidos:', widget);
    return (
      <Card>
        <CardHeader>
          <CardTitle>{widget.titulo}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">⚠️ Dados não disponíveis</div>
        </CardContent>
      </Card>
    );
  }

  const chartData = normalizedData.labels.map((label: string, index: number) => ({
    name: label,
    value: normalizedData.values[index]
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{widget.titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis tickFormatter={(value) => shouldFormatAsCurrency(widget) ? formatCurrency(value) : value} />
            <Tooltip
              formatter={(value: any) => shouldFormatAsCurrency(widget) ? formatCurrency(value) : value}
            />
            <Bar dataKey="value" fill="#76BA1B" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function LineChartWidget({ widget }: { widget: Widget }) {
  const normalizedData = normalizeChartData(widget.dados);
  
  if (!normalizedData) {
    console.error('Widget gráfico de linha sem dados válidos:', widget);
    return (
      <Card>
        <CardHeader>
          <CardTitle>{widget.titulo}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">⚠️ Dados não disponíveis</div>
        </CardContent>
      </Card>
    );
  }

  const chartData = normalizedData.labels.map((label: string, index: number) => ({
    name: label,
    value: normalizedData.values[index]
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{widget.titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis tickFormatter={(value) => shouldFormatAsCurrency(widget) ? formatCurrency(value) : value} />
            <Tooltip formatter={(value: any) => shouldFormatAsCurrency(widget) ? formatCurrency(value) : value} />
            <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function PieChartWidget({ widget }: { widget: Widget }) {
  const normalizedData = normalizeChartData(widget.dados);
  
  if (!normalizedData) {
    console.error('Widget gráfico pizza sem dados válidos:', widget);
    return (
      <Card>
        <CardHeader>
          <CardTitle>{widget.titulo}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">⚠️ Dados não disponíveis</div>
        </CardContent>
      </Card>
    );
  }
  
  const chartData = normalizedData.labels.map((label: string, index: number) => ({
    name: label,
    value: normalizedData.values[index]
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{widget.titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((_entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: any) => shouldFormatAsCurrency(widget) ? formatCurrency(value) : value} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function ExplicacaoWidget({ widget }: { widget: Widget }) {
  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          {widget.titulo}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
          {widget.dados.texto}
        </p>
      </CardContent>
    </Card>
  )
}

function AreaChartWidget({ widget }: { widget: Widget }) {
  const normalizedData = normalizeChartData(widget.dados);
  
  if (!normalizedData) {
    console.error('Widget gráfico área sem dados válidos:', widget);
    return (
      <Card>
        <CardHeader>
          <CardTitle>{widget.titulo}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">⚠️ Dados não disponíveis</div>
        </CardContent>
      </Card>
    );
  }
  
  const chartData = normalizedData.labels.map((label: string, index: number) => ({
    name: label,
    value: normalizedData.values[index]
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{widget.titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis tickFormatter={(value) => shouldFormatAsCurrency(widget) ? formatCurrency(value) : value} />
            <Tooltip formatter={(value: any) => shouldFormatAsCurrency(widget) ? formatCurrency(value) : value} />
            <Area type="monotone" dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function ScatterChartWidget({ widget }: { widget: Widget }) {
  const chartData = widget.dados.pontos || []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{widget.titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" dataKey="x" name={widget.dados.labelX || 'X'} />
            <YAxis type="number" dataKey="y" name={widget.dados.labelY || 'Y'} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(value: any) => shouldFormatAsCurrency(widget) ? formatCurrency(value) : value} />
            <Scatter name={widget.titulo} data={chartData} fill="#8884d8" />
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function RadarChartWidget({ widget }: { widget: Widget }) {
  const normalizedData = normalizeChartData(widget.dados);
  
  if (!normalizedData) {
    console.error('Widget gráfico radar sem dados válidos:', widget);
    return (
      <Card>
        <CardHeader>
          <CardTitle>{widget.titulo}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">⚠️ Dados não disponíveis</div>
        </CardContent>
      </Card>
    );
  }
  
  const chartData = normalizedData.labels.map((label: string, index: number) => ({
    subject: label,
    value: normalizedData.values[index]
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{widget.titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={chartData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="subject" />
            <PolarRadiusAxis />
            <Radar name={widget.titulo} dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
            <Tooltip formatter={(value: any) => shouldFormatAsCurrency(widget) ? formatCurrency(value) : value} />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function ComboChartWidget({ widget }: { widget: Widget }) {
  // ComboChart tem estrutura diferente: labels + barras + linha
  if (!widget.dados || !widget.dados.labels || !widget.dados.barras || !widget.dados.linha) {
    console.error('Widget combo sem dados válidos:', widget);
    return (
      <Card>
        <CardHeader>
          <CardTitle>{widget.titulo}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">⚠️ Dados não disponíveis</div>
        </CardContent>
      </Card>
    );
  }
  
  const chartData = widget.dados.labels.map((label: string, index: number) => ({
    name: label,
    barras: widget.dados.barras[index],
    linha: widget.dados.linha[index]
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{widget.titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis yAxisId="left" tickFormatter={(value) => shouldFormatAsCurrency(widget) ? formatCurrency(value) : value} />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip formatter={(value: any, name: string) => {
              if (shouldFormatAsCurrency(widget) && name === widget.dados.labelBarras) {
                return [formatCurrency(value), name]
              }
              return [value, name]
            }} />
            <Legend />
            <Bar
              yAxisId="left"
              dataKey="barras"
              fill="#76BA1B"
              name={widget.dados.labelBarras || 'Barras'}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="linha"
              stroke="#FF8042"
              strokeWidth={2}
              name={widget.dados.labelLinha || 'Linha'}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function TableWidget({ widget }: { widget: Widget }) {
  if (!widget.dados || !widget.dados.colunas || !widget.dados.linhas) {
    console.error('Widget tabela sem dados válidos:', widget);
    return (
      <Card>
        <CardHeader>
          <CardTitle>{widget.titulo}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">⚠️ Dados não disponíveis</div>
        </CardContent>
      </Card>
    );
  }

  const { colunas, linhas } = widget.dados
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{widget.titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                {colunas.map((col: string, index: number) => (
                  <th key={index} className="text-left p-2 font-medium">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha: any[], rowIndex: number) => (
                <tr key={rowIndex} className="border-b hover:bg-muted/50">
                  {linha.map((cell, cellIndex) => {
                    const colName = (colunas[cellIndex] || '').toLowerCase();
                    const isMonetary = ['valor', 'total', 'vendas', 'ticket', 'preço', 'preco', 'receita', 'faturamento'].some(k => colName.includes(k));
                    const numValue = typeof cell === 'number' ? cell : parseFloat(String(cell).replace(/[^\d,-]/g, '').replace(',', '.'));
                    const displayValue = isMonetary && !isNaN(numValue) && numValue > 0 ? formatCurrency(numValue) : cell;
                    return <td key={cellIndex} className="p-2">{displayValue}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

function HorizontalBarChartWidget({ widget }: { widget: Widget }) {
  const normalizedData = normalizeChartData(widget.dados);
  
  if (!normalizedData) {
    console.error('Widget barras horizontal sem dados válidos:', widget);
    return (
      <Card>
        <CardHeader>
          <CardTitle>{widget.titulo}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">⚠️ Dados não disponíveis</div>
        </CardContent>
      </Card>
    );
  }

  const chartData = normalizedData.labels.map((label: string, index: number) => ({
    name: label,
    value: normalizedData.values[index]
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{widget.titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(300, chartData.length * 40)}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={(value) => shouldFormatAsCurrency(widget) ? formatCurrency(value) : value} />
            <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value: any) => shouldFormatAsCurrency(widget) ? formatCurrency(value) : value} />
            <Bar dataKey="value" fill="#76BA1B" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function DonutChartWidget({ widget }: { widget: Widget }) {
  const normalizedData = normalizeChartData(widget.dados);
  
  if (!normalizedData) {
    console.error('Widget donut sem dados válidos:', widget);
    return (
      <Card>
        <CardHeader>
          <CardTitle>{widget.titulo}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">⚠️ Dados não disponíveis</div>
        </CardContent>
      </Card>
    );
  }

  const chartData = normalizedData.labels.map((label: string, index: number) => ({
    name: label,
    value: normalizedData.values[index]
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{widget.titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            >
              {chartData.map((_entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: any) => shouldFormatAsCurrency(widget) ? formatCurrency(value) : value} />
            {widget.metadados?.valorCentral && (
              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-lg font-bold">
                {widget.metadados.valorCentral}
              </text>
            )}
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function ListaDestaqueWidget({ widget }: { widget: Widget }) {
  const itens = widget.dados?.itens || []

  if (itens.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{widget.titulo}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Nenhum item</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{widget.titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {itens.map((item: any, index: number) => (
            <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                {item.icone && <span className="text-lg">{item.icone}</span>}
                <span className="font-medium">{item.titulo}</span>
              </div>
              <span className={`font-bold ${item.cor === 'verde' ? 'text-green-600' : item.cor === 'vermelho' ? 'text-red-600' : item.cor === 'amarelo' ? 'text-yellow-600' : ''}`}>
                {item.valor}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}