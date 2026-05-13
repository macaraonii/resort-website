module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ocean: {
          50: '#e9f7ff',
          100: '#cdeeff',
          200: '#9ddbff',
          300: '#66c3ff',
          400: '#2ea8ff',
          500: '#0b8be6',
          600: '#006fc4',
          700: '#005292',
          800: '#003463',
          900: '#001c3a'
        },
        aqua: {
          100: '#d7fbff',
          200: '#a9f3ff',
          300: '#6be8ff',
          400: '#35d4f6'
        },
        sun: {
          100: '#fff4c2',
          200: '#ffe28a',
          300: '#ffd24d',
          400: '#ffbf1f',
          500: '#ff9f0a'
        },
        coral: {
          300: '#ff9673',
          400: '#ff7a59',
          500: '#f25f4c'
        },
        sand: {
          50: '#fffaf0',
          100: '#fdf1d9'
        }
      },
      fontFamily: {
        display: ['Bree Serif', 'serif'],
        body: ['Nunito Sans', 'sans-serif']
      },
      boxShadow: {
        tropical: '0 16px 40px rgba(7, 46, 78, 0.18)'
      },
      backgroundImage: {
        'wave-pattern':
          "url('data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 1200 120\' preserveAspectRatio=\'none\'%3E%3Cpath d=\'M0 0L1200 0L1200 120C1000 80 800 100 600 120C400 140 200 120 0 80Z\' fill=\'%23ffffff\' opacity=\'0.4\'/%3E%3C/svg%3E')"
      }
    }
  },
  plugins: []
};
