(function(){
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var b = document.getElementById("burger"), n = document.getElementById("nav");
  if (b && n) {
    function set(o){n.classList.toggle("open", o);b.setAttribute("aria-expanded", o)}
    b.addEventListener("click", function(){set(!n.classList.contains("open"))});
    n.addEventListener("click", function(e){if(e.target.tagName === "A") set(false)});
  }
  var form = document.getElementById("tilbod");
  if (form) form.addEventListener("submit", function(e){
    e.preventDefault();
    document.getElementById("formmsg").style.display = "block";
  });

  function icelandYear(){
    try {
      return Number(new Intl.DateTimeFormat("en-GB", {timeZone:"Atlantic/Reykjavik", year:"numeric"}).format(new Date()));
    } catch (e) {
      return new Date().getUTCFullYear();
    }
  }
  var years = Math.max(0, icelandYear() - 2014);
  document.querySelectorAll("[data-count-years]").forEach(function(el){
    el.setAttribute("data-count-to", String(years));
  });

  function animateCount(el){
    if (el.getAttribute("data-placeholder") === "true") return;
    var target = Number(el.getAttribute("data-count-to"));
    if (!isFinite(target)) return;
    if (reduce) { el.textContent = String(target); return; }
    var start = performance.now(), dur = 1100;
    function tick(now){
      var t = Math.min(1, (now - start) / dur);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = String(Math.round(target * eased));
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  var counts = document.querySelectorAll("[data-count-to],[data-count-years]");
  if (counts.length && "IntersectionObserver" in window) {
    var cio = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if (!en.isIntersecting) return;
        animateCount(en.target);
        cio.unobserve(en.target);
      });
    }, {threshold: 0.45});
    counts.forEach(function(el){ cio.observe(el); });
  } else {
    counts.forEach(animateCount);
  }

  if (window.JARN_CLIENTS) {
    document.querySelectorAll("[data-clients]").forEach(function(list){
      list.innerHTML = JARN_CLIENTS.map(function(c){
        var inner = c.logo
          ? '<img src="' + esc(c.logo) + '" alt="' + esc(c.name) + '">'
          : '<span class="wordmark">' + esc(c.name) + '</span>';
        return '<li class="client">' + inner + '</li>';
      }).join("");
    });
  }

  if (!reduce && "IntersectionObserver" in window) {
    var items = document.querySelectorAll("main > section:not(.hero), .card, .proj, .eq, .page-head, .team-card, .client");
    var rio = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if (!en.isIntersecting) return;
        en.target.classList.add("in");
        rio.unobserve(en.target);
      });
    }, {threshold: 0.14, rootMargin: "0px 0px -6% 0px"});
    items.forEach(function(el){
      var r = el.getBoundingClientRect();
      el.classList.add("reveal");
      if (r.top < window.innerHeight * 0.94 && r.bottom > 0) el.classList.add("in");
      else rio.observe(el);
    });
  }

  var mapEl = document.getElementById("verkefni-map");
  if (mapEl && window.L && window.JARN_PROJECTS) {
    var map = L.map(mapEl, {scrollWheelZoom:false}).setView([64.12, -21.9], 11);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    var icon = L.divIcon({className:"pin", html:"<span></span>", iconSize:[18,18], iconAnchor:[9,9], popupAnchor:[0,-12]});
    JARN_PROJECTS.forEach(function(p){
      var html = '<div class="map-pop"><span class="tag">Dæmi</span><strong>' + esc(p.title) + "</strong><p>" + esc(p.text) + '</p><div class="map-photo">Mynd kemur</div></div>';
      L.marker([p.lat, p.lng], {icon:icon, title:p.title}).addTo(map).bindPopup(html, {maxWidth:280});
    });
    setTimeout(function(){ map.invalidateSize(); }, 200);
  }

  function esc(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }

  if (location.pathname === "/" || location.pathname === "/index.html") initSnow(reduce);

  function icelandMonth(){
    try {
      var parts = new Intl.DateTimeFormat("en-GB", {timeZone:"Atlantic/Reykjavik", month:"numeric"}).formatToParts(new Date());
      for (var i = 0; i < parts.length; i++) if (parts[i].type === "month") return Number(parts[i].value);
    } catch (e) {}
    return new Date().getUTCMonth() + 1;
  }

  function initSnow(reduced){
    var q = new URLSearchParams(location.search).get("snow");
    var month = icelandMonth();
    var season = month === 11 || month === 12 || month === 1 || month === 2 || month === 3;
    var saved = null;
    try { saved = localStorage.getItem("jarn-snow"); } catch (e) {}
    var on;
    if (q === "1") on = true;
    else if (q === "0" || reduced) on = false;
    else if (!season) on = false;
    else on = saved !== "off";

    var banner = document.getElementById("snow-banner");
    var toggle = document.getElementById("snow-toggle");
    var stopSnow = function(){};

    function paint(){
      if (banner) banner.hidden = !on;
      if (toggle) {
        var showToggle = q === "1" || (season && q !== "0" && !reduced);
        toggle.hidden = !showToggle;
        toggle.textContent = on ? "Slökkva á snjó" : "Kveikja á snjó";
        toggle.setAttribute("aria-pressed", on ? "true" : "false");
      }
      stopSnow();
      if (on) stopSnow = startSnow();
    }
    paint();
    if (toggle) toggle.addEventListener("click", function(){
      on = !on;
      try { localStorage.setItem("jarn-snow", on ? "on" : "off"); } catch (e) {}
      paint();
    });
  }

  function startSnow(){
    var canvas = document.createElement("canvas");
    canvas.id = "snow";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
    var ctx = canvas.getContext("2d", {alpha:true});
    var flakes = [];
    var running = true;
    var raf = 0;
    function size(){
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    size();
    var onResize = function(){ size(); };
    window.addEventListener("resize", onResize);
    var count = Math.max(24, Math.min(70, Math.round(window.innerWidth / 22)));
    for (var i = 0; i < count; i++) {
      flakes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.6 + 0.5,
        s: Math.random() * 0.55 + 0.25,
        d: Math.random() * 0.35 - 0.15
      });
    }
    function frame(){
      if (!running) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(255,255,255,.8)";
      for (var i = 0; i < flakes.length; i++) {
        var f = flakes[i];
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, 6.2832);
        ctx.fill();
        f.y += f.s;
        f.x += f.d;
        if (f.y > canvas.height + 4) { f.y = -4; f.x = Math.random() * canvas.width; }
        if (f.x > canvas.width) f.x = 0;
        else if (f.x < 0) f.x = canvas.width;
      }
      raf = requestAnimationFrame(frame);
    }
    function onVis(){
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (canvas.isConnected) {
        running = true;
        frame();
      }
    }
    document.addEventListener("visibilitychange", onVis);
    frame();
    return function stop(){
      running = false;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", onResize);
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    };
  }
})();
