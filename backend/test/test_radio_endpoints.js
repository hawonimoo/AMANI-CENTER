const http = require("http");

async function check() {
  const loginData = JSON.stringify({ email: "john.green@amanicenter.org", password: "amani2026" });
  const loginRes = await new Promise((resolve) => {
    const req = http.request(
      {
        hostname: "localhost",
        port: 4000,
        path: "/api/auth/login",
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(loginData) },
      },
      (res) => {
        let b = "";
        res.on("data", (c) => (b += c));
        res.on("end", () => resolve(JSON.parse(b)));
      }
    );
    req.write(loginData);
    req.end();
  });

  const token = loginRes.token;
  console.log("Logged in as John Green. Token:", token ? "YES" : "NO");

  const endpoints = [
    "/api/radio/schedules",
    "/api/radio/handovers",
    "/api/radio/presenters",
  ];

  for (const ep of endpoints) {
    const res = await new Promise((resolve) => {
      http.get(
        {
          hostname: "localhost",
          port: 4000,
          path: ep,
          headers: { Authorization: `Bearer ${token}` },
        },
        (r) => {
          let b = "";
          r.on("data", (c) => (b += c));
          r.on("end", () => resolve({ status: r.statusCode, body: JSON.parse(b) }));
        }
      );
    });
    console.log(`Endpoint ${ep} status ${res.status}:`, JSON.stringify(res.body).slice(0, 150));
  }
}

check().catch(console.error);
