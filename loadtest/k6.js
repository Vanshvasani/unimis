import http from "k6/http";
import { check, sleep } from "k6";
import { SharedArray } from "k6/data";

const tokens = new SharedArray("tokens", () => JSON.parse(open("./tokens.json")));
const pages = ["/dashboard", "/my", "/exams"];

export const options = {
  scenarios: {
    ramp: {
      executor: "ramping-vus",
      stages: [
        { duration: "2m", target: 2000 },
        { duration: "5m", target: 10000 },
        { duration: "3m", target: 10000 },
        { duration: "1m", target: 0 },
      ],
    },
  },
  thresholds: { http_req_failed: ["rate<0.01"], http_req_duration: ["p(95)<800"] },
};

export default function () {
  const token = tokens[(__VU - 1) % tokens.length];
  const page = pages[Math.floor(Math.random() * pages.length)];
  const res = http.get(`${__ENV.BASE}${page}`, { headers: { Cookie: `mis_session=${token}` }, redirects: 0 });
  check(res, { "status 200": (r) => r.status === 200 });
  sleep(15 + Math.random() * 15); // realistic think time
}
