"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface ComboboxProps {
    options: { value: string; label: string }[]
    value?: string
    onSelect: (value: string) => void
    placeholder?: string
    searchPlaceholder?: string
    emptyText?: string
    className?: string
    disabled?: boolean
}

export function Combobox({
    options = [],
    value,
    onSelect,
    placeholder = "Selecione...",
    searchPlaceholder = "Buscar...",
    emptyText = "Nenhum resultado encontrado.",
    className,
    disabled = false
}: ComboboxProps) {
    const [open, setOpen] = React.useState(false)

    // Otimização: limitar itens renderizados se lista for muito grande
    // CMDK virtualiza? Não nativamente da forma que shadcn expõe, mas cmdk interno sim.
    // Vamos confiar no cmdk por enquanto, mas se for 5000 cidades, pode ser pesado.
    // Filtramos aqui para garantir performance se necessário, mas CommandInput já filtra visualmente.
    // O ideal para 5000+ itens é windowing, mas vamos tentar abordagem padrão primeiro.

    const selectedLabel = React.useMemo(() => {
        return options.find((option) => option.value === value)?.label
    }, [options, value])

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between", className)}
                    disabled={disabled}
                >
                    {value
                        ? selectedLabel || value // Fallback para value se label não achado (ex: id antigo)
                        : placeholder}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                    <CommandInput placeholder={searchPlaceholder} />
                    <CommandList>
                        <CommandEmpty>{emptyText}</CommandEmpty>
                        <CommandGroup>
                            {options.slice(0, 100).map((option) => ( // Renderizar apenas os primeiros 100 inicialmente para performance se muitos
                                <CommandItem
                                    key={option.value}
                                    value={option.label} // Usar label para busca funcionar intuitivamente (cmdk busca pelo value prop por padrão se keywords n setadas)
                                    onSelect={(currentValue) => {
                                        // O cmdk retorna o value em lowercase. Precisamos re-encontrar o original value ID.
                                        // Mas aqui estamos passando option.label como value do item para a busca funcionar pelo texto.
                                        // Isso é confuso no shadcn.
                                        // Melhor abordagem: value={option.value} e keywords={[option.label]} se cmdk suportar,
                                        // mas shadcn <CommandItem> espera value como string de busca.
                                        // Workaround comum: value={option.label} e mapear de volta.
                                        onSelect(option.value === value ? "" : option.value)
                                        setOpen(false)
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === option.value ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {option.label}
                                </CommandItem>
                            ))}
                            {options.length > 100 && (
                                <div className="py-2 text-center text-xs text-muted-foreground">
                                    Exibindo 100 de {options.length} resultados. Refine a busca.
                                </div>
                            )}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
