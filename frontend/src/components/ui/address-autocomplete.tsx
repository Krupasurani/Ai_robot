import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/utils/cn';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MapPin, Loader2 } from 'lucide-react';

// Geoapify API key
const GEOAPIFY_API_KEY = 'f8272f53b92444579fe7fb91f4338f60';

export interface AddressComponents {
    addressLine1: string;
    city: string;
    state: string;
    postCode: string;
    country: string;
}

interface AddressSuggestion {
    formatted: string;
    address_line1?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
    place_id: string;
}

interface AddressAutocompleteProps {
    value?: string;
    onChange?: (value: string) => void;
    onAddressSelect?: (components: AddressComponents) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    id?: string;
}

export function AddressAutocomplete({
    value = '',
    onChange,
    onAddressSelect,
    placeholder = 'Enter address...',
    disabled = false,
    className,
    id,
}: AddressAutocompleteProps) {
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState(value);
    const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
    const [loading, setLoading] = useState(false);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    // Sync input value with external value
    useEffect(() => {
        setInputValue(value);
    }, [value]);

    const fetchSuggestions = useCallback(async (query: string) => {
        if (query.length < 3) {
            setSuggestions([]);
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(
                `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(query)}&limit=5&lang=de&apiKey=${GEOAPIFY_API_KEY}`
            );
            const data = await response.json();

            if (data.features) {
                const mapped: AddressSuggestion[] = data.features.map((feature: any) => ({
                    formatted: feature.properties.formatted || '',
                    address_line1: feature.properties.address_line1 || feature.properties.street || '',
                    city: feature.properties.city || feature.properties.town || feature.properties.village || '',
                    state: feature.properties.state || '',
                    postcode: feature.properties.postcode || '',
                    country: feature.properties.country || '',
                    place_id: feature.properties.place_id || feature.properties.formatted,
                }));
                setSuggestions(mapped);
                if (mapped.length > 0) {
                    setOpen(true);
                }
            }
        } catch (error) {
            console.error('Error fetching address suggestions:', error);
            setSuggestions([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        onChange?.(newValue);

        // Debounce API calls
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }
        debounceRef.current = setTimeout(() => {
            fetchSuggestions(newValue);
        }, 300);
    };

    const handleSelect = (suggestion: AddressSuggestion) => {
        setInputValue(suggestion.formatted);
        onChange?.(suggestion.formatted);
        setOpen(false);
        setSuggestions([]);

        // Parse and return address components
        if (onAddressSelect) {
            onAddressSelect({
                addressLine1: suggestion.address_line1 || suggestion.formatted.split(',')[0] || '',
                city: suggestion.city || '',
                state: suggestion.state || '',
                postCode: suggestion.postcode || '',
                country: suggestion.country || '',
            });
        }
    };

    return (
        <Popover open={open && suggestions.length > 0} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <div className="relative w-full">
                    <Input
                        id={id}
                        value={inputValue}
                        onChange={handleInputChange}
                        placeholder={placeholder}
                        disabled={disabled}
                        className={cn(
                            'h-11 rounded-lg bg-background/50 border-border/50 focus:border-primary/50',
                            'placeholder:text-muted-foreground/50 pr-10',
                            disabled && 'cursor-not-allowed opacity-60',
                            className
                        )}
                        onFocus={() => {
                            if (suggestions.length > 0) setOpen(true);
                        }}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <MapPin className="h-4 w-4" />
                        )}
                    </div>
                </div>
            </PopoverTrigger>
            <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] p-0"
                align="start"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <Command>
                    <CommandList>
                        <CommandEmpty>Keine Adressen gefunden</CommandEmpty>
                        <CommandGroup>
                            {suggestions.map((suggestion) => (
                                <CommandItem
                                    key={suggestion.place_id}
                                    value={suggestion.formatted}
                                    onSelect={() => handleSelect(suggestion)}
                                    className="cursor-pointer flex items-start gap-2 py-3"
                                >
                                    <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                                    <span className="text-sm">{suggestion.formatted}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
