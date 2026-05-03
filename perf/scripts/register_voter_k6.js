
import http from 'k6/http';
import { check, fail } from 'k6';
import { SharedArray } from 'k6/data';
import { Trend, Rate } from 'k6/metrics';

// ======== Config ========
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const DATA_FILE = __ENV.DATA_FILE || 'perf/data/voters.csv';
const TIMEOUT_MS = Number(__ENV.TIMEOUT_MS || 2000);
const SCENARIO = __ENV.SCENARIO || 'baseline';

// Custom metrics
const registerDuration = new Trend('register_duration');
const registerFailed = new Rate('register_failed');

// Datos CSV (cargados una sola vez)
const voters = new SharedArray('voters', function () {
  const text = open(DATA_FILE);
  const lines = text.trim().split('\n').slice(1); // skip header
  return lines.map(l => {
    const [documentId, fullName, age, gender, cityCode, address, phone, email] = l.split(',');
    return { documentId, fullName, age, gender, cityCode, address, phone, email };
  });
});

// ======== Escenarios ========
const scenarios = {
  baseline: {
    vus: Number(__ENV.VU_BASE || 50),
    duration: '10m',
  },
  load: {
    stages: [
      { duration: '2m', target: Number(__ENV.VU_BASE || 50) },   // warmup
      { duration: '5m', target: Number(__ENV.VU_PEAK || 200) }, // ramp-up
      { duration: '5m', target: Number(__ENV.VU_PEAK || 200) }, // steady
      { duration: '5m', target: 0 },                              // ramp-down
    ],
  },
  stress: {
    stages: [
      { duration: '5m', target: Number(__ENV.VU_BASE || 200) },
      { duration: '10m', target: Number(__ENV.VU_PEAK || 600) },
      { duration: '5m', target: 0 },
    ],
  },
  spike: {
    stages: [
      { duration: '1m', target: 50 },
      { duration: '2m', target: 300 },
      { duration: '3m', target: 50 },
      { duration: '2m', target: 0 },
    ],
  },
  soak: {
    vus: Number(__ENV.VU_SOAK || 120),
    duration: '2h',
  },
};

export const options = {
  thresholds: {
    http_req_failed: ['rate<0.01'], // <1%
    'http_req_duration{status:ok}': ['p(95)<300', 'p(99)<800'],
    register_failed: ['rate<0.01'],
  },
  discardResponseBodies: true,
  insecureSkipTLSVerify: true,
  noConnectionReuse: false,
  userAgent: 'k6-registrar-votante/1.0',
  ...(scenarios[SCENARIO] || scenarios['baseline']),
};

// ======== Helper ========
function pickOne(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ======== Test Function ========
export default function () {
  const v = pickOne(voters);

  // Idempotency-Key para evitar duplicados si el backend lo soporta
  const idem = Math.random().toString(36).slice(2);

  const payload = JSON.stringify({
    id: (__VU * 10000 + __ITER) % 2000000000,
    name: v.fullName,
    age: Number(v.age),
    gender: v.gender === 'M' ? 'MALE' : v.gender === 'F' ? 'FEMALE' : 'MALE',
    alive: true,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idem,
    },
    timeout: TIMEOUT_MS + 'ms',
    tags: { endpoint: 'register' },
  };

  const res = http.post(`${BASE_URL}/register`, payload, params);

  registerDuration.add(res.timings.duration);
  const ok = check(res, {
    'status is 200': (r) => r.status == 200,
    'body VALID': (r) => String(r.body || '').toUpperCase().includes('VALID'),
  });

  if (!ok) {
    registerFailed.add(1);
  } else {
    registerFailed.add(0);
  }
}

export function handleSummary(data) {
  const scen = SCENARIO || 'baseline';
  return {
    [`perf/results/summary-voter-${scen}.json`]: JSON.stringify(data, null, 2),
  };
}
