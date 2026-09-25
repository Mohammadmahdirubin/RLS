document.addEventListener('DOMContentLoaded', function () {
  const footer = document.createElement('footer');
  footer.className = 'site-footer cc-license-footer';
  footer.innerHTML = `
    <div class="container cc-footer-line">
      <span>© 2026 RLS Journal |</span>
      <a href="copyright.html">Copyright &amp; License</a>
      <span>|</span>
      <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener" class="cc-license-link">
        <img src="https://licensebuttons.net/l/by/4.0/88x31.png" alt="CC BY 4.0">
      </a>
      <span>Creative Commons Attribution 4.0 International (CC BY 4.0)</span>
    </div>`;
  document.body.appendChild(footer);
});
