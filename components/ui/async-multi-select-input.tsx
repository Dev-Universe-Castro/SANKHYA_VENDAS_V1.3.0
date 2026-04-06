"use client"

import * as React from "react"
import { Check, X, Loader2 } from "lucide-react"
import { Command as CommandPrimitive } from "cmdk"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import {
    Command,
    CommandGroup,
    CommandItem,
    CommandList,
    CommandEmpty
} from "@/components/ui/command"

export interface MultiSelectOption {
    value: string
    label: string
}

interface AsyncMultiSelectInputProps {
    fetcher: (search: string) => Promise<MultiSelectOption[]>
    value?: string // Comma separated values "1,2,3"
    onSelect: (value: string) => void
    labelResolver?: (value: string) => string
    preSelectedItems?: MultiSelectOption[]
    placeholder?: string
    emptyText?: string
    className?: string
    disabled?: boolean
    debounceMs?: number
    multi?: boolean
}

export function AsyncMultiSelectInput({
    fetcher,
    value = "",
    onSelect,
    labelResolver,
    preSelectedItems = [],
    placeholder = "Selecione...",
    emptyText = "Nenhum resultado encontrado.",
    className,
    disabled = false,
    debounceMs = 300,
    multi = true
}: AsyncMultiSelectInputProps) {
    const inputRef = React.useRef<HTMLInputElement>(null)
    const [open, setOpen] = React.useState(false)
    const [searchTerm, setSearchTerm] = React.useState("")
    const [options, setOptions] = React.useState<MultiSelectOption[]>([])
    const [loading, setLoading] = React.useState(false)
    const [internalPreSelected, setInternalPreSelected] = React.useState<MultiSelectOption[]>(preSelectedItems)

    const selectedValues = React.useMemo(() => {
        return value ? value.split(',').map(v => v.trim()).filter(Boolean) : []
    }, [value])

    // Update internal pre-selected items
    React.useEffect(() => {
        const newKnownItems = [...internalPreSelected]

        options.forEach(opt => {
            if (selectedValues.includes(opt.value)) {
                if (!newKnownItems.some(i => i.value === opt.value)) {
                    newKnownItems.push(opt)
                }
            }
        })

        preSelectedItems.forEach(opt => {
            if (!newKnownItems.some(i => i.value === opt.value)) {
                newKnownItems.push(opt)
            }
        })

        if (newKnownItems.length > internalPreSelected.length) {
            setInternalPreSelected(newKnownItems)
        }
    }, [options, selectedValues, preSelectedItems])

    // Fetch data with debounce
    React.useEffect(() => {
        if (!searchTerm) {
            setOptions([])
            return
        }

        setOpen(true)
        const handler = setTimeout(() => {
            setLoading(true)
            fetcher(searchTerm)
                .then(data => {
                    setOptions(data)
                })
                .catch(err => {
                    console.error("AsyncMultiSelectInput fetch error:", err)
                    setOptions([])
                })
                .finally(() => {
                    setLoading(false)
                })
        }, debounceMs)

        return () => clearTimeout(handler)
    }, [searchTerm, fetcher, debounceMs])

    const handleSelect = (optionValue: string) => {
        if (!multi) {
            // Se for seleção única, substitui o valor
            onSelect(optionValue)
            setSearchTerm("")
            setOpen(false) // Fecha o dropdown em single select
            return
        }

        const newValues = selectedValues.includes(optionValue)
            ? selectedValues.filter(v => v !== optionValue)
            : [...selectedValues, optionValue]

        onSelect(newValues.join(','))
        setSearchTerm("")
        // Keep focus on input
        // inputRef.current?.focus()
    }

    const handleRemove = (e: React.MouseEvent | React.KeyboardEvent, optionValue: string) => {
        e.stopPropagation()
        const newValues = selectedValues.filter(v => v !== optionValue)
        onSelect(newValues.join(','))
    }

    const handleUnselect = (optionValue: string) => {
        const newValues = selectedValues.filter(v => v !== optionValue)
        onSelect(newValues.join(','))
    }

    const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
        const input = inputRef.current
        if (input) {
            if (e.key === "Delete" || e.key === "Backspace") {
                if (input.value === "" && selectedValues.length > 0) {
                    // Remove last item
                    handleUnselect(selectedValues[selectedValues.length - 1])
                }
            }
            if (e.key === "Escape") {
                input.blur()
            }
        }
    }, [selectedValues])

    const resolveLabel = (val: string) => {
        const opt = options.find(o => o.value === val) || internalPreSelected.find(o => o.value === val)
        if (opt) return opt.label
        if (labelResolver) return labelResolver(val)
        return val
    }

    return (
        <Command shouldFilter={false} onKeyDown={handleKeyDown} className={cn("overflow-visible bg-transparent", className)}>
            <div
                className="group border border-input px-3 py-2 text-sm ring-offset-background rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
            >
                <div className="flex gap-1 flex-wrap">
                    {selectedValues.map((val) => {
                        const label = resolveLabel(val)
                        return (
                            <Badge key={val} variant="secondary">
                                {label}
                                <button
                                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            handleRemove(e, val)
                                        }
                                    }}
                                    onMouseDown={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                    }}
                                    onClick={(e) => handleRemove(e, val)}
                                >
                                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                </button>
                            </Badge>
                        )
                    })}
                    {/* Input Field */}
                    {(!multi && selectedValues.length > 0) ? null : (
                        <CommandPrimitive.Input
                            ref={inputRef}
                            value={searchTerm}
                            onValueChange={setSearchTerm}
                            onBlur={() => setOpen(false)}
                            onFocus={() => setOpen(true)}
                            placeholder={selectedValues.length === 0 ? placeholder : ""}
                            className="ml-2 bg-transparent outline-none placeholder:text-muted-foreground flex-1 min-w-[50px] disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={disabled}
                        />
                    )}
                </div>
            </div>

            <div className="relative mt-2">
                {open && searchTerm.length > 0 && (
                    <div className="absolute top-0 z-50 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95">
                        <CommandList>
                            {loading && (
                                <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                                </div>
                            )}

                            {!loading && options.length === 0 && (
                                <CommandEmpty>{emptyText}</CommandEmpty>
                            )}

                            <CommandGroup className="h-full overflow-auto">
                                {options.map((option) => (
                                    <CommandItem
                                        key={option.value}
                                        onSelect={() => handleSelect(option.value)}
                                        className="cursor-pointer"
                                        onMouseDown={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                        }}
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
                    </div>
                )}
            </div>
        </Command>
    )
}
