"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface TableWidgetProps {
  data: {
    title: string
    columns: string[]
    rows: string[][]
  }
}

export default function TableWidget({ data }: TableWidgetProps) {
  return (
    <Card className="h-full flex flex-col border shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold text-slate-800">{data.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                {data.columns.map((column, index) => (
                  <TableHead key={index} className="font-bold text-slate-700">
                    {column}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row, rowIndex) => (
                <TableRow key={rowIndex} className="hover:bg-slate-50">
                  {row.map((cell, cellIndex) => (
                    <TableCell key={cellIndex} className="text-slate-600">
                      {cell}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
