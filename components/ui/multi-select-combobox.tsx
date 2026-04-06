"use client"

import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"

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
import { Badge } from "@/components/ui/badge"

export interface MultiSelectOption {
    value: string
    label: string
}

interface MultiSelectComboboxProps {
    options: MultiSelectOption[]
    value?: string // Comma separated values "1,2,3"
    onSelect: (value: string) => void
    placeholder?: string
    searchPlaceholder?: string
    emptyText?: string
    className?: string
    disabled?: boolean
    modal?: boolean
}

export function MultiSelectCombobox({
    options = [],
    value = "",
    onSelect,
    placeholder = "Selecione...",
    searchPlaceholder = "Buscar...",
    emptyText = "Nenhum resultado encontrado.",
    className,
    disabled = false,
    modal = false
}: MultiSelectComboboxProps) {
    const [open, setOpen] = React.useState(false)
    const [searchTerm, setSearchTerm] = React.useState("")

    const selectedValues = React.useMemo(() => {
        return value ? value.split(',').map(v => v.trim()).filter(Boolean) : []
    }, [value])

    const uniqueOptions = React.useMemo(() => {
        // Dedup options based on value to avoid "duplicate key" warnings
        const seen = new Set()
        return options.filter(o => {
            if (seen.has(o.value)) return false
            seen.add(o.value)
            return true
        })
    }, [options])

    const filteredOptions = React.useMemo(() => {
        if (!searchTerm) return uniqueOptions
        const lower = searchTerm.toLowerCase()
        return uniqueOptions.filter(o =>
            o.label.toLowerCase().includes(lower) ||
            o.value.toLowerCase().includes(lower)
        )
    }, [uniqueOptions, searchTerm])

    const handleSelect = (optionValue: string) => {
        const newValues = selectedValues.includes(optionValue)
            ? selectedValues.filter(v => v !== optionValue)
            : [...selectedValues, optionValue]

        onSelect(newValues.join(','))
    }

    const handleRemove = (e: React.MouseEvent, optionValue: string) => {
        e.stopPropagation()
        const newValues = selectedValues.filter(v => v !== optionValue)
        onSelect(newValues.join(','))
    }

    // Reset search when closing
    React.useEffect(() => {
        if (!open) {
            setSearchTerm("")
        }
    }, [open])

    // Verify open state
    React.useEffect(() => {
        console.log(`[MultiSelectCombobox] State changed: open=${open}, options=${options.length}, disabled=${disabled}`);
    }, [open, options.length, disabled])

    return (
        <Popover open={open} onOpenChange={(val) => {
            console.log('[MultiSelectCombobox] onOpenChange called with:', val);
            setOpen(val);
        }} modal={modal}>
            <PopoverTrigger asChild>
                <Button
                    onClick={() => console.log('[MultiSelectCombobox] Trigger Clicked')}
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between h-auto min-h-12 py-2 text-left font-normal", className)}
                    disabled={disabled}
                >
                    <div className="flex flex-wrap gap-1 items-center max-w-[calc(100%-24px)]">
                        {selectedValues.length === 0 && <span className="text-muted-foreground">{placeholder}</span>}
                        {selectedValues.map((val) => {
                            const option = uniqueOptions.find(o => o.value === val)
                            const label = option?.label || val
                            return (
                                <Badge key={val} variant="secondary" className="mr-1 mb-1 font-normal text-xs">
                                    {label}
                                    <div
                                        className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                                        onPointerDown={(e) => handleRemove(e, val)}
                                    >
                                        <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                    </div>
                                </Badge>
                            )
                        })}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 absolute right-3 top-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[--radix-popover-trigger-width] p-0"
                align="start"
                style={{ zIndex: 99999 }}
            >
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder={searchPlaceholder}
                        value={searchTerm}
                        onValueChange={setSearchTerm}
                    />
                    <CommandList className="max-h-[300px] min-h-[150px]">
                        <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                            {emptyText}
                        </CommandEmpty>
                        <CommandGroup>
                            {filteredOptions.slice(0, 50).map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.label} // Value used for accessibility/selection logic usually, but here handled manually
                                    onSelect={() => handleSelect(option.value)}
                                >
                                    <div
                                        className={cn(
                                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                            selectedValues.includes(option.value)
                                                ? "bg-primary text-primary-foreground"
                                                : "opacity-50 [&_svg]:invisible"
                                        )}
                                    >
                                        <Check className={cn("h-4 w-4")} />
                                    </div>
                                    {option.label}
                                </CommandItem>
                            ))}
                            {filteredOptions.length > 50 && (
                                <div className="py-2 text-center text-xs text-muted-foreground">
                                    Mais {filteredOptions.length - 50} opções... Continue digitando para filtrar.
                                </div>
                            )}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
