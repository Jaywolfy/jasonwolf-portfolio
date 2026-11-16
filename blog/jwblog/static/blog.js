// Artikel: „Link kopieren“ in der Zeile zum Teilen
document.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', () => {
  const label = button.textContent;
  navigator.clipboard.writeText(button.dataset.copy).then(() => {
    button.textContent = button.dataset.done;
    setTimeout(() => { button.textContent = label; }, 2000);
  });
}));
