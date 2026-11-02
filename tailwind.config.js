export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Taken from the app icon: navy backdrop, paper whites, amber page edges.
        'bg-primary': '#282b41',
        'bg-secondary': '#323550',
        'bg-tertiary': '#3d4060',
        'line': 'rgba(244, 241, 234, 0.09)',
        'accent': '#e0b56a',
        'text-primary': '#f4f1ea',
        'text-secondary': '#a7a9bd',
        'text-tertiary': '#7d8098',
      },
      fontFamily: {
        display: ['"Literata Variable"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
