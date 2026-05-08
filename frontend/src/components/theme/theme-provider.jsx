// components/theme-provider.jsx
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";


export function ThemeProvider({ children }) {
    return (
        <NextThemesProvider
            attribute="class"
            defaultTheme="dark" //solo cuando no hay tema guardado en localStorage
            enableSystem={false}
            storageKey="theme">
            {children}
        </NextThemesProvider>
    );
}