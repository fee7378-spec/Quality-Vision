@import "tailwindcss";

@layer base {
  :root {
    color-scheme: dark;
  }
  body {
    background-color: #000000;
    color: #f4f4f5;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  }
}

/* Custom dark scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: #000000;
}
::-webkit-scrollbar-thumb {
  background: #27272a;
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: #3f3f46;
}

/* Ensure date inputs have dark background and yellow accent */
input[type="date"]::-webkit-calendar-picker-indicator {
  filter: invert(1) sepia(1) saturate(5) hue-rotate(15deg);
  cursor: pointer;
}
