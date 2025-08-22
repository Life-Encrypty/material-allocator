import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchableComboboxProps {
  options: Array<{ value: string; label: string; subtitle?: string }>;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  className?: string;
  disabled?: boolean;
}

export const SearchableCombobox = ({
  options,
  value,
  onValueChange,
  placeholder = "Select...",
  emptyText = "No items found",
  className,
  disabled
}: SearchableComboboxProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(search.toLowerCase()) ||
    option.value.toLowerCase().includes(search.toLowerCase()) ||
    (option.subtitle && option.subtitle.toLowerCase().includes(search.toLowerCase()))
  );

  const selectedOption = options.find(option => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", className)}
          disabled={disabled}
        >
          {selectedOption ? (
            <div className="flex flex-col items-start">
              <span className="truncate">{selectedOption.label}</span>
              {selectedOption.subtitle && (
                <span className="text-xs text-muted-foreground truncate">
                  {selectedOption.subtitle}
                </span>
              )}
            </div>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput 
            placeholder={`Search ${placeholder.toLowerCase()}...`} 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue === value ? "" : currentValue);
                    setOpen(false);
                    setSearch('');
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{option.label}</span>
                    {option.subtitle && (
                      <span className="text-xs text-muted-foreground">
                        {option.subtitle}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};