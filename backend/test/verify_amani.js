const http = require("http");

async function postJson(path, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = http.request(
      {
        hostname: "localhost",
        port: 4000,
        path,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch (e) {
            resolve({ status: res.statusCode, body });
          }
        });
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  const accounts = [
    { email: "john.green@amanicenter.org", role: "admin", expectedTitle: "Executive Director / The Boss" },
    { email: "khavai@amanicenter.org", role: "admin", expectedTitle: "Overall Project Manager" },
    { email: "maureen.buya@amanicenter.org", role: "program_leader", expectedTitle: "Vox Radio Station Manager" },
    { email: "bob.wandati@amanicenter.org", role: "program_leader", expectedTitle: "KiliConnect Digital Hub Manager" },
    { email: "salma.finance@amanicenter.org", role: "program_leader", expectedTitle: "Finance Officer" },
    { email: "maua@amanicenter.org", role: "program_leader", expectedTitle: "Climate Change Program Lead" },
    { email: "elvis.comms@amanicenter.org", role: "staff", expectedTitle: "Online & Social Media Communications Officer" },
    { email: "nimoo.farah@amanicenter.org", role: "staff", expectedTitle: "Cross-Program Operations Officer" },
    { email: "kula.nzomo@amanicenter.org", role: "staff", expectedTitle: "Morning Radio Presenter (05:00 – 10:00)" },
    { email: "zaikun@amanicenter.org", role: "staff", expectedTitle: "Mid-day Radio Presenter (10:00 – 14:00)" },
    { email: "yoash@amanicenter.org", role: "staff", expectedTitle: "Afternoon Radio Presenter (14:00 – 17:00)" },
    { email: "yusuf.maro@amanicenter.org", role: "staff", expectedTitle: "Evening Radio Presenter (18:00 – 22:00)" },
  ];

  console.log("Verifying Amani Center CBO team logins...");
  for (const acc of accounts) {
    const res = await postJson("/api/auth/login", { email: acc.email, password: "amani2026" });
    if (res.status === 200 && res.data.success) {
      console.log(`✓ ${acc.email} (${res.data.user.name}) -> Role: ${res.data.user.role}, Job: ${res.data.user.job_title}`);
    } else {
      console.error(`✗ Failed login for ${acc.email}:`, res);
    }
  }
}

run().catch(console.error);
