"use strict";

const assert = require("assert");
const { parseMultipart, validate, looksLike, createServer } = require("./server");

function multipart(fields, files) {
  const boundary = "----jarnverkboundary";
  const chunks = [];
  Object.keys(fields).forEach((name) => {
    chunks.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${fields[name]}\r\n`
    ));
  });
  (files || []).forEach((file) => {
    chunks.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="skrar"; filename="${file.name}"\r\nContent-Type: ${file.type}\r\n\r\n`
    ));
    chunks.push(file.body);
    chunks.push(Buffer.from("\r\n"));
  });
  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return { boundary, buf: Buffer.concat(chunks) };
}

const valid = {
  nafn: "Anna Jónsdóttir",
  netfang: "anna@example.com",
  simi: "5551234",
  stadur: "Reykjavík",
  tegund: "lagna",
  lysing: "Mokstur við lögn."
};

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
const parsed = parseMultipart(multipart(valid, [{ name: "a.jpg", type: "image/jpeg", body: jpeg }]).buf, "----jarnverkboundary");
const checked = validate(parsed);
assert.strictEqual(checked.fields.nafn, "Anna Jónsdóttir");
assert.strictEqual(checked.files.length, 1);
assert.strictEqual(looksLike(jpeg, "image/jpeg"), true);
assert.strictEqual(looksLike(Buffer.from("hello"), "image/jpeg"), false);

const missing = validate(parseMultipart(multipart({ nafn: "Anna" }).buf, "----jarnverkboundary"));
assert.strictEqual(missing.status, 400);
assert.match(missing.error, /Vantar/);

const honey = validate(parseMultipart(multipart(Object.assign({}, valid, { vefur: "http://spam" })).buf, "----jarnverkboundary"));
assert.strictEqual(honey.status, 400);
assert.doesNotMatch(honey.error, /Takk/);

const badFile = validate(parseMultipart(multipart(valid, [{ name: "a.jpg", type: "image/jpeg", body: Buffer.from("not-a-jpeg") }]).buf, "----jarnverkboundary"));
assert.match(badFile.error, /JPG/);

delete process.env.SMTP_HOST;
delete process.env.QUOTE_TO;

const server = createServer();
const port = 8799;
server.listen(port, "127.0.0.1", async () => {
  const body = multipart(valid);
  const response = await fetch("http://127.0.0.1:" + port + "/api/tilbod", {
    method: "POST",
    headers: { "Content-Type": "multipart/form-data; boundary=" + body.boundary },
    body: body.buf
  });
  const data = await response.json();
  assert.strictEqual(response.status, 503);
  assert.strictEqual(data.ok, false);
  assert.match(data.error, /ekki send/);
  assert.doesNotMatch(JSON.stringify(data), /Takk/);
  const health = await fetch("http://127.0.0.1:" + port + "/api/health");
  const healthJson = await health.json();
  assert.strictEqual(healthJson.mail, false);
  server.close();
  process.stdout.write("api tests passed\n");
});
