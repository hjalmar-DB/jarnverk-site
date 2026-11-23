(function(){
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var header = document.querySelector("body > header");
  var burger = document.getElementById("burger");
  var nav = document.getElementById("nav");
  if (burger && nav) {
    function setOpen(open){
      nav.classList.toggle("open", open);
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      burger.setAttribute("aria-label", open ? "Loka valmynd" : "Opna valmynd");
    }
    burger.addEventListener("click", function(){ setOpen(!nav.classList.contains("open")); });
    nav.addEventListener("click", function(e){ if (e.target.closest("a")) setOpen(false); });
  }

  var TYPES = {
    lagna: "Lagnaþjónusta í jörðu",
    jardvegur: "Jarðvegsþjónusta",
    yfirbord: "Yfirborðsfrágangur",
    husgrunnar: "Húsgrunnar",
    dren: "Drenlagnir",
    pallar: "Mokstur fyrir palla",
    snjor: "Snjóþjónusta",
    annad: "Annað"
  };

  function joinOg(list){
    if (list.length < 2) return list.join("");
    if (list.length === 2) return list[0] + " og " + list[1];
    return list.slice(0, -1).join(", ") + " og " + list[list.length - 1];
  }

  function preselect(form){
    var key = new URLSearchParams(location.search).get("tegund");
    var select = form.querySelector("[name=tegund]");
    if (key && select && TYPES[key]) select.value = key;
  }

  document.querySelectorAll("form.quote").forEach(function(form){
    preselect(form);
    form.addEventListener("submit", function(e){
      e.preventDefault();
      submitQuote(form);
    });
  });

  function submitQuote(form){
    var err = form.querySelector(".form-error");
    var okBox = form.querySelector(".success");
    var button = form.querySelector("[type=submit]");
    if (err) { err.hidden = true; err.textContent = ""; }
    var honey = form.querySelector("[name=vefur]");
    if (honey && honey.value) {
      showError(form, err, "Beiðnin var ekki send.");
      return;
    }
    var missing = [];
    function need(name, label){
      var el = form.querySelector("[name=" + name + "]");
      if (!el) return;
      var good = String(el.value || "").trim().length > 0;
      el.setAttribute("aria-invalid", good ? "false" : "true");
      if (!good) missing.push(label);
    }
    need("nafn", "fullt nafn");
    var email = form.querySelector("[name=netfang]");
    var emailValue = email ? email.value.trim() : "";
    var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);
    if (email) email.setAttribute("aria-invalid", emailOk ? "false" : "true");
    if (!emailValue) missing.push("netfang");
    else if (!emailOk) missing.push("gilt netfang");
    need("simi", "símanúmer");
    need("stadur", "staðsetningu");
    need("tegund", "tegund verkefnis");
    need("lysing", "lýsingu");
    var notes = [];
    var files = form.querySelector("[name=skrar]");
    if (files && files.files) {
      var allowed = {"image/jpeg":1,"image/png":1,"image/webp":1,"application/pdf":1};
      var badType = false, badSize = false;
      if (files.files.length > 5) notes.push("Mest má hlaða upp fimm skrám.");
      for (var i = 0; i < files.files.length; i++) {
        var f = files.files[i];
        if (f.type && !allowed[f.type]) badType = true;
        if (f.size > 10 * 1024 * 1024) badSize = true;
      }
      if (badType) notes.push("Aðeins má hlaða upp JPG, PNG, WEBP eða PDF.");
      if (badSize) notes.push("Hver skrá má vera mest 10 MB.");
    }
    if (missing.length || notes.length) {
      var text = notes.slice();
      if (missing.length) text.unshift("Vantar " + joinOg(missing) + ".");
      showError(form, err, text.join(" "));
      var first = form.querySelector("[aria-invalid=true]");
      if (first) first.focus();
      return;
    }
    if (button) { button.disabled = true; button.setAttribute("aria-busy", "true"); }
    fetch(form.action || "/api/tilbod", { method: "POST", body: new FormData(form), headers: { "Accept": "application/json" } })
      .then(function(res){
        return res.json().catch(function(){ return null; }).then(function(data){
          return { status: res.status, data: data };
        });
      })
      .then(function(result){
        if (result.data && result.data.ok === true && result.status >= 200 && result.status < 300) {
          if (okBox) okBox.hidden = false;
          var fields = form.querySelector(".fields");
          var intro = form.querySelector(".form-intro");
          var privacy = form.querySelector(".privacy");
          if (fields) fields.hidden = true;
          if (intro) intro.hidden = true;
          if (privacy) privacy.hidden = true;
          if (button) button.hidden = true;
          if (okBox) okBox.focus();
          return;
        }
        var message = result.data && result.data.error
          ? result.data.error
          : "Beiðnin var ekki send. Móttaka tilboða er ekki virk.";
        showError(form, err, message);
      })
      .catch(function(){
        showError(form, err, "Beiðnin var ekki send. Móttaka tilboða er ekki virk.");
      })
      .then(function(){
        if (button) { button.disabled = false; button.removeAttribute("aria-busy"); }
      });
  }

  function showError(form, err, message){
    if (!err) return;
    err.hidden = false;
    err.textContent = message;
    err.focus();
  }

  if (window.JARN_CLIENTS) {
    document.querySelectorAll("[data-clients]").forEach(function(list){
      list.innerHTML = JARN_CLIENTS.map(function(c){
        var inner = c.logo
          ? '<img src="' + esc(c.logo) + '" alt="' + esc(c.name) + '" width="' + (c.w || 230) + '" height="' + (c.h || 50) + '" loading="lazy">'
          : '<span class="wordmark">' + esc(c.name) + '</span>';
        return '<li class="client">' + inner + '</li>';
      }).join("");
    });
  }

  var listEl = document.getElementById("verkefni-list");
  if (listEl && window.JARN_PROJECTS && JARN_PROJECTS.length) renderProjects(listEl);

  var verkRoot = document.getElementById("verk-root");
  if (verkRoot && window.JARN_PROJECTS) renderVerk(verkRoot);

  function published(){
    return (window.JARN_PROJECTS || []).filter(function(p){ return p && p.published && p.slug && p.title; });
  }

  function renderProjects(root){
    var items = published();
    if (!items.length) return;
    var types = [];
    items.forEach(function(p){ if (p.type && types.indexOf(p.type) < 0) types.push(p.type); });
    var filterHtml = "";
    if (types.length > 1) {
      filterHtml = '<div class="filters" role="group" aria-label="Sía verkefni"><button type="button" class="btn btn-ghost" aria-pressed="true" data-filter="">Öll</button>' +
        types.map(function(t){ return '<button type="button" class="btn btn-ghost" aria-pressed="false" data-filter="' + esc(t) + '">' + esc(labelFor(t)) + '</button>'; }).join("") +
        "</div>";
    }
    function cards(filter){
      return '<ul class="proj-list">' + items.filter(function(p){ return !filter || p.type === filter; }).map(function(p){
        var img = (p.images && p.images[0]) ? '<img src="' + esc(p.images[0].src) + '" alt="' + esc(p.images[0].alt || p.title) + '" width="800" height="500" loading="lazy">' : "";
        return '<li><article><h3><a href="/verkefni/verk/?id=' + encodeURIComponent(p.slug) + '">' + esc(p.title) + '</a></h3><p>' + esc(p.text || "") + '</p>' + img + '</article></li>';
      }).join("") + "</ul>";
    }
    root.hidden = false;
    root.innerHTML = filterHtml + cards("");
    root.querySelectorAll("[data-filter]").forEach(function(btn){
      btn.addEventListener("click", function(){
        root.querySelectorAll("[data-filter]").forEach(function(b){ b.setAttribute("aria-pressed", "false"); });
        btn.setAttribute("aria-pressed", "true");
        var ul = root.querySelector(".proj-list");
        if (ul) ul.outerHTML = cards(btn.getAttribute("data-filter"));
      });
    });
  }

  function renderVerk(root){
    var id = new URLSearchParams(location.search).get("id");
    var item = published().filter(function(p){ return p.slug === id; })[0];
    if (!item) return;
    var related = published().filter(function(p){ return p.slug !== item.slug && p.type && p.type === item.type; }).slice(0, 3);
    var gallery = (item.images || []).map(function(img){
      return '<img src="' + esc(img.src) + '" alt="' + esc(img.alt || item.title) + '" width="' + (img.w || 1200) + '" height="' + (img.h || 800) + '" loading="lazy">';
    }).join("");
    var relatedHtml = related.length ? '<h2>Tengd verkefni</h2><ul class="proj-list">' + related.map(function(p){
      return '<li><a href="/verkefni/verk/?id=' + encodeURIComponent(p.slug) + '">' + esc(p.title) + '</a></li>';
    }).join("") + "</ul>" : "";
    document.title = item.title + " | Járn verktakar ehf.";
    root.innerHTML = '<p class="kicker">' + esc(labelFor(item.type)) + '</p><h2>' + esc(item.title) + '</h2><p>' + esc(item.text || "") + '</p>' +
      (gallery ? '<div class="gallery">' + gallery + '</div>' : '') +
      relatedHtml +
      '<p><a class="btn" href="/hafa-samband/?tegund=' + encodeURIComponent(item.type || "") + '#tilbod">Óska eftir tilboði</a></p>';
  }

  function labelFor(type){ return TYPES[type] || type || ""; }

  function esc(s){
    return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }

  if ((location.pathname === "/" || location.pathname === "/index.html") && document.getElementById("snow-banner")) {
    initSnow(reduce);
  }

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
    var season = month >= 11 || month <= 3;
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
        var snowLabel = on ? "Slökkva á snjó" : "Kveikja á snjó";
        toggle.textContent = snowLabel;
        toggle.setAttribute("aria-label", snowLabel);
        toggle.setAttribute("aria-pressed", on ? "true" : "false");
      }
      stopSnow();
      if (on) {
        var start = function(){ stopSnow = startSnow(); };
        if ("requestIdleCallback" in window) requestIdleCallback(start, {timeout: 2000});
        else setTimeout(start, 1200);
      }
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
    function size(){ canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    size();
    var onResize = function(){ size(); };
    window.addEventListener("resize", onResize);
    var count = Math.max(18, Math.min(48, Math.round(window.innerWidth / 28)));
    for (var i = 0; i < count; i++) {
      flakes.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, r: Math.random() * 1.4 + 0.4, s: Math.random() * 0.45 + 0.2, d: Math.random() * 0.3 - 0.15 });
    }
    function frame(){
      if (!running) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(255,255,255,.75)";
      for (var i = 0; i < flakes.length; i++) {
        var f = flakes[i];
        ctx.fillRect(f.x, f.y, f.r, f.r);
        f.y += f.s; f.x += f.d;
        if (f.y > canvas.height + 4) { f.y = -4; f.x = Math.random() * canvas.width; }
        if (f.x > canvas.width) f.x = 0;
        else if (f.x < 0) f.x = canvas.width;
      }
      raf = requestAnimationFrame(frame);
    }
    function onVis(){
      if (document.hidden) { running = false; cancelAnimationFrame(raf); }
      else if (canvas.isConnected) { running = true; frame(); }
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
