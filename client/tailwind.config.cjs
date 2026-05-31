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
        display: ['Bai Jamjuree', 'sans-serif'],
        body: ['Space Grotesk', 'sans-serif']
      },
      boxShadow: {
        tropical: '0 16px 40px rgba(7, 46, 78, 0.18)'
      },
      backgroundImage: {
        'tropical-sky':
          'linear-gradient(180deg, #6cc9ff 0%, #d7fbff 38%, #fff4c2 72%, #ffffff 100%)',
        'wave-pattern':
          "url('data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 1200 120\' preserveAspectRatio=\'none\'%3E%3Cpath d=\'M0 0L1200 0L1200 120C1000 80 800 100 600 120C400 140 200 120 0 80Z\' fill=\'%23ffffff\' opacity=\'0.4\'/%3E%3C/svg%3E')",
        'wave-crest':
          "url('data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 1200 120\' preserveAspectRatio=\'none\'%3E%3Cpath d=\'M0 80C150 110 300 50 450 80C600 110 750 50 900 80C1050 110 1200 50 1200 50V120H0Z\' fill=\'%23cdeeff\'/%3E%3C/svg%3E')",
        'wave-sand':
          "url('data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 1200 120\' preserveAspectRatio=\'none\'%3E%3Cpath d=\'M0 60C200 90 400 30 600 60C800 90 1000 30 1200 60V120H0Z\' fill=\'%23fff4c2\'/%3E%3C/svg%3E')",
        'palm-left':
          "url('data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 120 200\'%3E%3Cpath fill=\'%232b8a63\' d=\'M60 12c-23 0-44 7-60 20 24-2 42 1 60 10 18-9 36-12 60-10-16-13-37-20-60-20z\'/%3E%3Cpath fill=\'%232b8a63\' d=\'M60 14c-18 16-24 34-18 56 10-12 25-22 44-27-10-6-19-15-26-29z\'/%3E%3Cpath fill=\'%232b8a63\' d=\'M60 14c18 16 24 34 18 56-10-12-25-22-44-27 10-6 19-15 26-29z\'/%3E%3Cpath fill=\'%239b6b3d\' d=\'M56 70c6 26 8 58 4 106h8c4-48 2-80-4-106z\'/%3E%3C/svg%3E')",
        'palm-right':
          "url('data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 120 200\'%3E%3Cg transform=\'translate(120 0) scale(-1 1)\'%3E%3Cpath fill=\'%232b8a63\' d=\'M60 12c-23 0-44 7-60 20 24-2 42 1 60 10 18-9 36-12 60-10-16-13-37-20-60-20z\'/%3E%3Cpath fill=\'%232b8a63\' d=\'M60 14c-18 16-24 34-18 56 10-12 25-22 44-27-10-6-19-15-26-29z\'/%3E%3Cpath fill=\'%232b8a63\' d=\'M60 14c18 16 24 34 18 56-10-12-25-22-44-27 10-6 19-15 26-29z\'/%3E%3Cpath fill=\'%239b6b3d\' d=\'M56 70c6 26 8 58 4 106h8c4-48 2-80-4-106z\'/%3E%3C/g%3E%3C/svg%3E')"
      }
    }
  },
  plugins: []
};
