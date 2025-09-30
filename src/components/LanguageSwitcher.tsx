"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { i18n, type Locale } from "../i18n-config";

{ i18n.locales.map((locale: Locale) => (
  <button key={locale}>{locale}</button>
))}
export function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();

  const handleLanguageChange = (value: Locale) => {
    // ambil path tanpa prefix locale lama
    const newPath = `/${value}${pathname.substring(3)}`;
    router.push(newPath);
  };

  return (
    <div className="flex items-center space-x-2">
      <Select
        onValueChange={handleLanguageChange}
        defaultValue={i18n.defaultLocale}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select a language" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Languages</SelectLabel>
            {i18n.locales.map((locale: Locale) => (
              <SelectItem key={locale} value={locale}>
                {locale === "en" ? "English" : locale}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}