import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Country, getFlagEmoji } from "@/data/countryData";

interface CountrySelectProps {
  countries: Country[];
  value?: string; // country code
  onValueChange: (country: Country | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function CountrySelect({
  countries,
  value,
  onValueChange,
  placeholder = "국가 선택",
  disabled = false,
  className,
}: CountrySelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  const selectedCountry = React.useMemo(
    () => countries.find((c) => c.code === value),
    [countries, value]
  );

  // Filter countries based on search query (Korean name, English name, or code)
  const filteredCountries = React.useMemo(() => {
    if (!searchQuery.trim()) return countries;
    
    const query = searchQuery.toLowerCase().trim();
    return countries.filter((country) => {
      return (
        country.nameKo.toLowerCase().includes(query) ||
        country.nameEn.toLowerCase().includes(query) ||
        country.code.toLowerCase().includes(query) ||
        country.code3?.toLowerCase().includes(query)
      );
    });
  }, [countries, searchQuery]);

  const handleSelect = (countryCode: string) => {
    const country = countries.find((c) => c.code === countryCode);
    onValueChange(country || null);
    setOpen(false);
    setSearchQuery("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !selectedCountry && "text-muted-foreground",
            className
          )}
        >
          {selectedCountry ? (
            <span className="flex items-center gap-2">
              <span>{getFlagEmoji(selectedCountry.code)}</span>
              <span>{selectedCountry.nameKo}</span>
            </span>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 z-50" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="국가명 또는 코드 검색..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="h-9"
          />
          <CommandList>
            <CommandEmpty>일치하는 국가가 없습니다.</CommandEmpty>
            <CommandGroup className="max-h-[300px] overflow-auto">
              {filteredCountries.map((country) => (
                <CommandItem
                  key={country.code}
                  value={country.code}
                  onSelect={handleSelect}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Check
                    className={cn(
                      "h-4 w-4",
                      value === country.code ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span>{getFlagEmoji(country.code)}</span>
                  <span>{country.nameKo}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {country.code}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
