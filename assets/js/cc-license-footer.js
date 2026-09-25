document.addEventListener('DOMContentLoaded', function () {
  const footer = document.createElement('footer');
  footer.className = 'site-footer cc-license-footer';
  footer.innerHTML = `
    <div class="container">
      <p>© 2026 RLS Journal</p>
      <p><a href="license.html">Copyright &amp; License</a></p>
      <p>
        <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">
          <img src="https://licensebuttons.net/l/by/4.0/88x31.png" alt="Creative Commons Attribution 4.0 International License">
        </a>
      </p>
      <p>Articles are published under Creative Commons Attribution 4.0 International License (CC BY 4.0).</p>
    </div>`;
  document.body.appendChild(footer);
});
