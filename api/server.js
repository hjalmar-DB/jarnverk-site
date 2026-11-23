"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const ROOT = path.resolve(__dirname, "..");
const MAX_BODY = 55 * 1024 * 1024;
const MAX_FILES = 5;
const MAX_FILE = 10 * 1024 * 1024;
const TYPES = {
  lagna: "Lagnaþjónusta í jörðu",
  jardvegur: "Jarðvegsþjónusta",
  yfirbord: "Yfirborðsfrágangur",
  husgrunnar: "Húsgrunnar",
  dren: "Drenlagnir",
  pallar: "Mokstur fyrir palla",
  snjor: "Snjóþjónusta",
  annad: "Annað"
};
const FILE_TYPES = {
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "application/pdf": [0x25, 0x50, 0x44, 0x46]
};

const hits = new Map();

function joinOg(list) {
  if (list.length < 2) return list.join("");
  if (list.length === 2) return list[0] + " og " + list[1];
  return list.slice(0, -1).join(", ") + " og " + list[list.length - 1];
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        const err = new Error("too-large");
        err.status = 413;
        reject(err);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function parseMultipart(buf, boundary) {
  const delim = Buffer.from("--" + boundary);
  const parts = [];
  let cursor = buf.indexOf(delim);
  if (cursor < 0) return parts;
  while (cursor >= 0) {
    let start = cursor + delim.length;
    if (buf.slice(start, start + 2).toString() === "--") break;
    if (buf.slice(start, start + 2).toString() === "\r\n") start += 2;
    const next = buf.indexOf(delim, start);
    if (next < 0) break;
    let chunk = buf.slice(start, next);
    if (chunk.slice(-2).toString() === "\r\n") chunk = chunk.slice(0, -2);
    const split = chunk.indexOf(Buffer.from("\r\n\r\n"));
    if (split >= 0) {
      const header = chunk.slice(0, split).toString("utf8");
      const body = chunk.slice(split + 4);
      const name = /name="([^"]+)"/.exec(header);
      const file = /filename="([^"]*)"/.exec(header);
      const type = /Content-Type:\s*([^\r\n]+)/i.exec(header);
      parts.push({
        name: name ? name[1] : "",
        filename: file ? file[1] : "",
        type: type ? type[1].trim().toLowerCase() : "",
        body
      });
    }
    cursor = next;
  }
  return parts;
}

function looksLike(buf, kind) {
  if (kind === "image/webp") {
    return buf.length > 12 && buf.slice(0, 4).toString() === "RIFF" && buf.slice(8, 12).toString() === "WEBP";
  }
  const magic = FILE_TYPES[kind];
  if (!magic || buf.length < magic.length) return false;
  return magic.every((byte, i) => buf[i] === byte);
}

function extKind(name) {
  const ext = path.extname(name || "").toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".pdf") return "application/pdf";
  return "";
}

function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded) return forwarded.split(",")[0].trim();
  return req.socket.remoteAddress || "unknown";
}

function limited(ip) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const recent = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 8;
}

function json(res, status, payload, extra) {
  const body = Buffer.from(JSON.stringify(payload));
  const headers = Object.assign({
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store",
    "Content-Length": body.length
  }, extra || {});
  res.writeHead(status, headers);
  res.end(body);
}

function allowedOrigin(origin) {
  const raw = process.env.QUOTE_ORIGIN || "";
  if (!raw || !origin) return "";
  const list = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return list.indexOf(origin) >= 0 ? origin : "";
}

async function verifyTurnstile(token, ip) {
  const secret = process.env.TURNSTILE_SECRET;
  if (!secret) return true;
  if (!token) return false;
  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  if (ip) body.set("remoteip", ip);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body
  });
  const data = await response.json();
  return !!data.success;
}

function validate(parts) {
  const fields = {};
  const files = [];
  parts.forEach((part) => {
    if (part.filename) files.push(part);
    else fields[part.name] = part.body.toString("utf8").trim();
  });
  if (fields.vefur) return { status: 400, error: "Beiðnin var ekki send." };
  const missing = [];
  if (!fields.nafn) missing.push("fullt nafn");
  if (!fields.netfang) missing.push("netfang");
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.netfang)) missing.push("gilt netfang");
  if (!fields.simi) missing.push("símanúmer");
  if (!fields.stadur) missing.push("staðsetningu");
  if (!fields.tegund || !TYPES[fields.tegund]) missing.push("tegund verkefnis");
  if (!fields.lysing) missing.push("lýsingu");
  const notes = [];
  if (files.length > MAX_FILES) notes.push("Mest má hlaða upp fimm skrám.");
  files.forEach((file) => {
    const kind = extKind(file.filename);
    if (!kind || !looksLike(file.body, kind)) notes.push("Aðeins má hlaða upp JPG, PNG, WEBP eða PDF.");
    if (file.body.length > MAX_FILE) notes.push("Hver skrá má vera mest 10 MB.");
  });
  if (missing.length || notes.length) {
    const text = [];
    if (missing.length) text.push("Vantar " + joinOg(missing) + ".");
    notes.filter((v, i, a) => a.indexOf(v) === i).forEach((v) => text.push(v));
    return { status: 400, error: text.join(" ") };
  }
  return { fields, files };
}

async function deliver(fields, files) {
  const to = process.env.QUOTE_TO;
  const host = process.env.SMTP_HOST;
  if (!to || !host) {
    return { status: 503, error: "Beiðnin var ekki send. Móttaka tilboða er ekki virk." };
  }
  let nodemailer;
  try {
    nodemailer = require("nodemailer");
  } catch (err) {
    return { status: 503, error: "Beiðnin var ekki send. Móttaka tilboða er ekki virk." };
  }
  const lines = [
    "Nafn: " + fields.nafn,
    fields.fyrirtaeki ? "Fyrirtæki: " + fields.fyrirtaeki : "",
    "Netfang: " + fields.netfang,
    "Sími: " + fields.simi,
    "Staðsetning: " + fields.stadur,
    "Tegund: " + TYPES[fields.tegund],
    fields.upphaf ? "Áætlaður upphafsdagur: " + fields.upphaf : "",
    "",
    fields.lysing,
    fields.athugasemd ? "\nAthugasemd:\n" + fields.athugasemd : ""
  ].filter(Boolean);
  const transport = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true" || String(process.env.SMTP_PORT || "") === "465",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || "" } : undefined
  });
  try {
    await transport.sendMail({
      from: process.env.QUOTE_FROM || process.env.SMTP_USER || to,
      to,
      replyTo: fields.netfang,
      subject: "Tilboðsbeiðni – " + fields.nafn,
      text: lines.join("\n"),
      attachments: files.map((file) => ({
        filename: path.basename(file.filename).replace(/[^\w.\- ()áéíóúýþæöðÁÉÍÓÚÝÞÆÖÐ]/g, "_").slice(0, 120) || "skra",
        content: file.body,
        contentType: extKind(file.filename)
      }))
    });
  } catch (err) {
    return { status: 502, error: "Beiðnin var ekki send. Móttaka brást." };
  }
  return { status: 200, payload: { ok: true } };
}

async function handleQuote(req, res) {
  const origin = allowedOrigin(req.headers.origin);
  const cors = origin ? {
    "Access-Control-Allow-Origin": origin,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept"
  } : {};
  if (req.method === "OPTIONS") {
    res.writeHead(204, cors);
    res.end();
    return;
  }
  if (req.method !== "POST") {
    json(res, 405, { ok: false, error: "Beiðnin var ekki send." }, cors);
    return;
  }
  const ip = clientIp(req);
  if (limited(ip)) {
    json(res, 429, { ok: false, error: "Of margar beiðnir. Reyndu aftur síðar." }, cors);
    return;
  }
  const type = String(req.headers["content-type"] || "");
  const boundary = /boundary=(?:"([^"]+)"|([^;]+))/.exec(type);
  if (!boundary) {
    json(res, 400, { ok: false, error: "Beiðnin var ekki send." }, cors);
    return;
  }
  let buf;
  try {
    buf = await readBody(req);
  } catch (err) {
    json(res, err.status || 400, { ok: false, error: "Skrárnar eru of stórar. Hver skrá má vera mest 10 MB." }, cors);
    return;
  }
  const checked = validate(parseMultipart(buf, boundary[1] || boundary[2]));
  if (checked.error) {
    json(res, checked.status, { ok: false, error: checked.error }, cors);
    return;
  }
  const token = checked.fields["cf-turnstile-response"] || "";
  let human = true;
  try {
    human = await verifyTurnstile(token, ip);
  } catch (err) {
    human = false;
  }
  if (!human) {
    json(res, 400, { ok: false, error: "Staðfestu að þú sért ekki vél." }, cors);
    return;
  }
  const sent = await deliver(checked.fields, checked.files);
  if (sent.payload) json(res, sent.status, sent.payload, cors);
  else json(res, sent.status, { ok: false, error: sent.error }, cors);
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json"
};

function serveStatic(req, res) {
  const url = new URL(req.url, "http://127.0.0.1");
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith("/")) pathname += "index.html";
  const file = path.normalize(path.join(ROOT, pathname));
  if (!file.startsWith(ROOT) || file.startsWith(path.join(ROOT, "api"))) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-cache"
    });
    res.end(data);
  });
}

function createServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    if (url.pathname === "/api/tilbod") {
      handleQuote(req, res).catch(() => {
        if (!res.headersSent) json(res, 500, { ok: false, error: "Beiðnin var ekki send. Móttaka brást." });
      });
      return;
    }
    if (url.pathname === "/api/health") {
      json(res, 200, { ok: true, mail: !!(process.env.SMTP_HOST && process.env.QUOTE_TO) });
      return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405);
      res.end();
      return;
    }
    serveStatic(req, res);
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 8787);
  createServer().listen(port, "0.0.0.0", () => {
    process.stdout.write("listening " + port + "\n");
  });
}

module.exports = {
  createServer,
  parseMultipart,
  validate,
  looksLike,
  deliver,
  handleQuote
};
