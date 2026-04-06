"use client"

import * as React from "react"
import { Check, ChevronsUpDown, X, Loader2 } from "lucide-react"

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

interface AsyncMultiSelectComboboxProps {
    fetcher: (search: string) => Promise<MultiSelectOption[]>
    value?: string // Comma separated values "1,2,3"
    onSelect: (value: string) => void
    labelResolver?: (value: string) => string // Optional fallback to resolve label from value
    preSelectedItems?: MultiSelectOption[] // Items that are already selected with known labels
    placeholder?: string
    searchPlaceholder?: string
    emptyText?: string
    className?: string
    disabled?: boolean
    modal?: boolean
    debounceMs?: number
}

export function AsyncMultiSelectCombobox({
    fetcher,
    value = "",
    onSelect,
    labelResolver,
    preSelectedItems = [],
    placeholder = "Selecione...",
    searchPlaceholder = "Buscar...",
    emptyText = "Nenhum resultado encontrado.",
    className,
    disabled = false,
    modal = false,
    debounceMs = 300
}: AsyncMultiSelectComboboxProps) {
    const [open, setOpen] = React.useState(false)
    const [searchTerm, setSearchTerm] = React.useState("")
    const [options, setOptions] = React.useState<MultiSelectOption[]>([])
    const [loading, setLoading] = React.useState(false)
    const [internalPreSelected, setInternalPreSelected] = React.useState<MultiSelectOption[]>(preSelectedItems)

    const selectedValues = React.useMemo(() => {
        return value ? value.split(',').map(v => v.trim()).filter(Boolean) : []
    }, [value])

    // Fetch data with debounce
    React.useEffect(() => {
        if (!open) return

        const handler = setTimeout(() => {
            setLoading(true)
            fetcher(searchTerm)
                .then(data => {
                    setOptions(data)
                })
                .catch(err => {
                    console.error("AsyncMultiSelectCombobox fetch error:", err)
                    setOptions([])
                })
                .finally(() => {
                    setLoading(false)
                })
        }, debounceMs)

        return () => clearTimeout(handler)
    }, [searchTerm, open, fetcher, debounceMs])

    // Update internal pre-selected items when selected items change or options are loaded
    // This ensures we keep labels for selected items even if they are not in the current options list
    React.useEffect(() => {
        const newKnownItems = [...internalPreSelected]

        // Add any currently visible options that are selected to the known items list
        options.forEach(opt => {
            if (selectedValues.includes(opt.value)) {
                if (!newKnownItems.some(i => i.value === opt.value)) {
                    newKnownItems.push(opt)
                }
            }
        })

        // Also add props preSelectedItems
        preSelectedItems.forEach(opt => {
            if (!newKnownItems.some(i => i.value === opt.value)) {
                newKnownItems.push(opt)
            }
        })

        if (newKnownItems.length > internalPreSelected.length) {
            setInternalPreSelected(newKnownItems)
        }
    }, [options, selectedValues, preSelectedItems])

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

    const resolveLabel = (val: string) => {
        const opt = options.find(o => o.value === val) || internalPreSelected.find(o => o.value === val)
        if (opt) return opt.label
        if (labelResolver) return labelResolver(val)
        return val
    }

    return (
        <Popover open={open} onOpenChange={setOpen} modal={modal}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between h-auto min-h-10 py-2 text-left font-normal", className)}
                    disabled={disabled}
                >
                    <div className="flex flex-wrap gap-1 items-center max-w-[calc(100%-24px)]">
                        {selectedValues.length === 0 && <span className="text-muted-foreground">{placeholder}</span>}
                        {selectedValues.map((val) => {
                            const label = resolveLabel(val)
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
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 absolute right-3 top-3" />
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
                        {loading && (
                            <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                            </div>
                        )}

                        {!loading && options.length === 0 && (
                            <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                                {emptyText}
                            </CommandEmpty>
                        )}

                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.label}
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
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
