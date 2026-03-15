(() => {
  var s = localStorage.getItem("openrecap-theme");
  if (s === "light") document.documentElement.classList.add("light");
})();
function toggleTheme() {
  var on = document.documentElement.classList.toggle("light");
  localStorage.setItem("openrecap-theme", on ? "light" : "dark");
}
// Notebook tab filtering
(() => {
  var tabs = document.querySelectorAll(".nb-tab");
  var items = document.querySelectorAll(".nb-item");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => {
        t.classList.remove("active");
      });
      tab.classList.add("active");
      var filter = tab.getAttribute("data-filter");
      items.forEach((item) => {
        if (filter === "all" || item.getAttribute("data-cat") === filter) {
          item.classList.remove("hidden");
        } else {
          item.classList.add("hidden");
        }
      });
    });
  });
})();
