const assert = require("node:assert/strict");
const { test } = require("node:test");
const { escapeHtml } = require("../src/controllers/organizationController");

test("escapes untrusted organization names for invitation HTML", () => {
  assert.equal(
    escapeHtml(`Acme <img src=x onerror="alert(1)"> & 'Co'`),
    "Acme &lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &#39;Co&#39;"
  );
});
