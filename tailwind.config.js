module.exports = {
  content: [
    "./components/**/*.js",
    "./pages/**/*.js",
    "./styles/globals.css",
  ],
  darkMode: "class",
  theme: {
    extend: {
      animation: {
        'spin-one-time': 'spin 0.3s linear',
      },
    },
  },
};
