(function () {
  var aliases = {
    noir: "dark-red",
    marble: "light-red",
    ember: "dark-orange",
    ocean: "dark-blue",
    forest: "dark-red",
    dusk: "dark-purple",
    light: "light-red",
  };
  var saved = localStorage.getItem("ga-theme") || "dark-red";
  var theme = aliases[saved] || saved;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme.indexOf("light-") === 0 ? "light" : "dark";
})();
