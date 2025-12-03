{/* <script>
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.navlinks');

  toggle.addEventListener('click', () => {
    nav.classList.toggle('active');
  });
</script> */}

// Get current page filename
document.addEventListener('DOMContentLoaded', () => {
  // normalize a href into a comparable filename (treat "/" or "#" as index.html)
  const normalize = (href) => {
    if (!href) return '';
    if (href === '/' || href === '#' || href === '') return 'index.html';
    return href.split('?')[0].split('#')[0].split('/').pop();
  };

  // normalize current page (treat root "/" as index.html)
  const current = (location.pathname === '/' || location.pathname === '') 
    ? 'index.html' 
    : location.pathname.split('/').pop();

  // select both desktop and mobile links
  const links = document.querySelectorAll('.site-nav-links a, .mobile-links a');

  links.forEach(link => {
    const href = link.getAttribute('href') || '';
    const linkPage = normalize(href);

    // add active if normalized filenames match
    if (linkPage && linkPage === current) {
      link.classList.add('active');
    }
  });
});


const hamburger = document.getElementById("hamburger");
const mobileMenu = document.getElementById("mobileMenu");

hamburger.addEventListener("click", () => {
  mobileMenu.classList.toggle("hidden");
});


/*
  Client-side search for posts stored as separate HTML files in /posts/
  - Update 'posts' filenames if yours differ
  - Ensure basePath points to the folder where those html files are hosted
*/
(function () {
  // ==== EDIT: supply your own filenames if different ====
  const filenames = [
    "best-seo-tips-for-beginners.html",
    "growth-hacks-for-new-blogs.html",
    "how-to-monetize-your-blog.html",
    "how-to-start-a-blog-and-earn.html",
    "the-future-of-ai-in-2025.html",
    "top-10-web-development-tools.html"
  ];

  // ==== base path to posts folder (change if needed) ====
  const basePath = "/posts/"; // e.g. "/posts/" or "/blog/posts/"

  // in-memory index: { title, excerpt, bodyText, url }
  const index = [];

  // fetch & parse a post file and extract metadata
  async function fetchMeta(file) {
    try {
      const res = await fetch(basePath + file, { cache: "no-cache" });
      if (!res.ok) throw new Error("fetch " + file + " failed: " + res.status);
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, "text/html");

      let title = (doc.querySelector("title") && doc.querySelector("title").textContent.trim())
                  || (doc.querySelector("h1") && doc.querySelector("h1").textContent.trim())
                  || file.replace(/[-_]/g, " ").replace(/\.html?$/i, "");

      // strip scripts/styles and get body text
      doc.querySelectorAll("script, style, noscript").forEach(n => n.remove());
      const bodyText = (doc.body ? doc.body.textContent : "").replace(/\s+/g, " ").trim();

      // prefer meta description, otherwise first 40 words of body
      let excerpt = "";
      const metaDesc = doc.querySelector("meta[name='description']");
      if (metaDesc) excerpt = (metaDesc.getAttribute("content") || "").trim();
      if (!excerpt) excerpt = bodyText.split(/\s+/).slice(0, 40).join(" ").trim();

      return { title, excerpt, bodyText, url: basePath + file };
    } catch (err) {
      console.warn("Error reading post:", file, err);
      return null;
    }
  }

  // build index (for small number of posts this is fine)
  async function buildIndex() {
    for (let i = 0; i < filenames.length; i++) {
      const meta = await fetchMeta(filenames[i]);
      if (meta) index.push(meta);
    }
    // index ready
    // console.log("Index built", index);
  }

  // scoring search
  function searchQuery(q) {
    if (!q) return [];
    q = q.toLowerCase().trim();
    const words = q.split(/\s+/).filter(Boolean);

    const scored = index.map(item => {
      let score = 0;
      const t = (item.title || "").toLowerCase();
      const e = (item.excerpt || "").toLowerCase();

      if (t === q) score += 200;
      if (t.includes(q)) score += 80;
      if (e.includes(q)) score += 30;
      words.forEach(w => {
        if (t.includes(w)) score += 8;
        if (e.includes(w)) score += 3;
        if (item.bodyText && item.bodyText.toLowerCase().includes(w)) score += 1;
      });
      return { item, score };
    });

    return scored.filter(s => s.score > 0).sort((a,b) => b.score - a.score).map(s => s.item);
  }

  // create results container and render
  function createResultsContainer(form) {
    let existing = form.querySelector('.search-results');
    if (existing) existing.remove();
    const container = document.createElement('div');
    container.className = 'search-results';
    form.appendChild(container);
    return container;
  }

  function renderResults(container, results, query) {
    container.innerHTML = '';
    if (!results.length) {
      const no = document.createElement('div');
      no.className = 'no-results';
      no.textContent = `No results for "${query}"`;
      container.appendChild(no);
      return;
    }
    results.forEach(r => {
      const a = document.createElement('a');
      a.className = 'item';
      a.href = r.url;
      a.innerHTML = `<strong>${escapeHtml(r.title)}</strong><div style="font-size:0.86rem;color:#6b7280;margin-top:6px">${escapeHtml(r.excerpt)}</div>`;
      container.appendChild(a);
    });
  }

  function escapeHtml(s) {
    return (s||'').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }

  // wire search UI after building index
  async function setup() {
    await buildIndex();

    const forms = document.querySelectorAll('.search-bar');
    forms.forEach(form => {
      const input = form.querySelector('.search-input');
      const select = form.querySelector('.search-cat');
      let resultsContainer = null;
      let timer = null;

      // live search
      input.addEventListener('input', function () {
        const q = this.value.trim();
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          const matches = searchQuery(q);
          if (!resultsContainer) resultsContainer = createResultsContainer(form);
          renderResults(resultsContainer, matches, q);
        }, 150);
      });

      // hide results on blur (allow clicks)
      input.addEventListener('blur', function () {
        setTimeout(() => {
          if (resultsContainer) {
            resultsContainer.remove();
            resultsContainer = null;
          }
        }, 180);
      });

      // submit handling
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        const q = (input.value || '').trim();
        const cat = select ? select.value : 'all';
        if (!q) { input.focus(); return; }

        const matches = searchQuery(q);
        if (matches.length === 1) {
          window.location.href = matches[0].url;
          return;
        } else if (matches.length > 1) {
          if (!resultsContainer) resultsContainer = createResultsContainer(form);
          renderResults(resultsContainer, matches, q);
          input.focus();
          return;
        }
        // no matches -> redirect to a search page
        window.location.href = '/search.html?q=' + encodeURIComponent(q) + '&cat=' + encodeURIComponent(cat);
      });
    });

    // close on outside click
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.search-bar')) document.querySelectorAll('.search-results').forEach(n => n.remove());
    });
  }

  // run
  setup();

})();


