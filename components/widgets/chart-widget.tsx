"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

interface ChartWidgetProps {
  data: {
    title: string
    chartType: 'bar' | 'line' | 'pie'
    labels: string[]
    values: number[]
    legend?: string
  }
}

const COLORS = ['#00A859', '#008F4C', '#00C76A', '#1E293B', '#334155', '#475569']

export default function ChartWidget({ data }: ChartWidgetProps) {
  const chartData = data.labels.map((label, index) => ({
    name: label,
    value: data.values[index] || 0
  }))

  const renderChart = () => {
    switch (data.chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '12px'
                }} 
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="value" fill="#00A859" radius={[8, 8, 0, 0]} name={data.legend || 'Valor'} />
            </BarChart>
          </ResponsiveContainer>
        )
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '12px'
                }} 
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line type="monotone" dataKey="value" stroke="#00A859" strokeWidth={3} dot={{ fill: '#00A859', r: 4 }} name={data.legend || 'Valor'} />
            </LineChart>
          </ResponsiveContainer>
        )
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height="100%">
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
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '12px'
                }} 
              />
            </PieChart>
          </ResponsiveContainer>
        )
    }
  }

  return (
    <Card className="h-full flex flex-col border shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold text-slate-800">{data.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        <div className="h-full min-h-[200px]">
          {renderChart()}
        </div>
      </CardContent>
    </Card>
  )
}
