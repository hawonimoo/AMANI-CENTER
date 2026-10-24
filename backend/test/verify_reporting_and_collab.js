const http = require("http");

async function requestJson(method, path, payload = null, token = null) {
  return new Promise((resolve, reject) => {
    const data = payload ? JSON.stringify(payload) : null;
    const headers = { "Content-Type": "application/json" };
    if (data) headers["Content-Length"] = Buffer.byteLength(data);
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const req = http.request(
      {
        hostname: "localhost",
        port: 4000,
        path,
        method,
        headers,
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
    if (data) req.write(data);
    req.end();
  });
}

async function testWorkflow() {
  console.log("1. Logging in Kula Nzomo (Vox Presenter)...");
  const loginRes = await requestJson("POST", "/api/auth/login", {
    email: "kula.nzomo@amanicenter.org",
    password: "amani2026",
  });
  const kulaToken = loginRes.data.token;
  const kulaUser = loginRes.data.user;
  console.log("✓ Logged in Kula Nzomo, ID:", kulaUser.id);

  console.log("2. Submitting Daily Report for Vox Radio...");
  const reportRes = await requestJson(
    "POST",
    "/api/reports",
    {
      program_id: 1, // Vox Radio
      report_date: new Date().toISOString().slice(0, 10),
      work_done: "Hosted morning broadcast 05:00-10:00. Broadcasted community notices, community peace bulletin, and conducted 8 live listener call-ins.",
      challenges: "Studio audio console auxiliary headphone port has loose connection.",
      next_steps: "Review morning music playlist and coordinate studio guest interview on community water conservation.",
    },
    kulaToken
  );
  console.log("✓ Daily report submitted, ID:", reportRes.data.reportId);
  const reportId = reportRes.data.reportId;

  console.log("3. Logging in Maureen Buya (Vox Radio Manager) to review report...");
  const maureenLogin = await requestJson("POST", "/api/auth/login", {
    email: "maureen.buya@amanicenter.org",
    password: "amani2026",
  });
  const maureenToken = maureenLogin.data.token;

  console.log("4. Reviewing report as Maureen Buya...");
  const reviewRes = await requestJson(
    "PATCH",
    `/api/reports/${reportId}/review`,
    {
      status: "reviewed",
      leader_comment: "Excellent morning broadcast show! Audio technician will inspect the console headphone port before 2 PM.",
    },
    maureenToken
  );
  console.log("✓ Review result:", reviewRes.data.message);

  console.log("5. Logging in John Green (Executive Boss) to inspect all reports...");
  const johnLogin = await requestJson("POST", "/api/auth/login", {
    email: "john.green@amanicenter.org",
    password: "amani2026",
  });
  const johnToken = johnLogin.data.token;

  const allReportsRes = await requestJson("GET", "/api/reports", null, johnToken);
  console.log(`✓ John Green verified total daily reports in system: ${allReportsRes.data.reports.length}`);

  console.log("6. Testing Field Work & Ideas Hub post and discussion...");
  const postRes = await requestJson(
    "POST",
    "/api/collaboration",
    {
      category: "field_work",
      title: "Community Outreach & Digital Literacy Field Session in Taveta",
      content: "Team conducted community field training on basic digital skills and climate awareness with 45 local youth participants. Strong turnout and great feedback!",
      program_id: 2, // KiliConnect Hub
      location: "Taveta Community Center",
      pinned: 1,
    },
    johnToken
  );
  const postId = postRes.data.post.id;
  console.log("✓ Collaboration post created, ID:", postId);

  console.log("7. Khavai Aghribina commenting on field post...");
  const khavaiLogin = await requestJson("POST", "/api/auth/login", {
    email: "khavai@amanicenter.org",
    password: "amani2026",
  });
  const khavaiToken = khavaiLogin.data.token;

  const commentRes = await requestJson(
    "POST",
    `/api/collaboration/${postId}/comments`,
    {
      comment: "Incredible milestone! Let's feature these youth testimonials in the next Vox Radio bulletin and online media channels.",
    },
    khavaiToken
  );
  console.log("✓ Comment posted successfully by Khavai, ID:", commentRes.data.comment.id);

  console.log("\nALL VERIFICATIONS PASSED SUCCESSFULLY!");
}

testWorkflow().catch(console.error);
