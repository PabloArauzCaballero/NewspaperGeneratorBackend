import { Sequelize, QueryTypes } from 'sequelize';
import 'dotenv/config';

type HttpResponse<T = unknown> = {
  status: number;
  body: T;
  headers: Headers;
};

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  user: { id: string; email: string; roles: string[] };
};

const baseUrl = (process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3000}/${process.env.API_PREFIX || 'api/v1'}`).replace(/\/$/, '');
const password = process.env.SMOKE_DEMO_PASSWORD || 'DemoPassword2026!';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function request<T>(method: string, path: string, options: { token?: string; body?: unknown; expectedStatus?: number | number[] } = {}): Promise<HttpResponse<T>> {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  const expected = options.expectedStatus ?? 200;
  const allowed = Array.isArray(expected) ? expected : [expected];
  assert(allowed.includes(response.status), `${method} ${path} expected ${allowed.join('/')} but got ${response.status}: ${text}`);
  return { status: response.status, body: body as T, headers: response.headers };
}

async function login(email: string): Promise<LoginResponse> {
  return (await request<LoginResponse>('POST', '/auth/login', {
    body: { email, password },
    expectedStatus: 201
  })).body;
}

function firstArray(value: unknown, label: string): any[] {
  assert(Array.isArray(value), `${label} must be an array`);
  assert(value.length > 0, `${label} must not be empty`);
  return value;
}

async function getDatabaseFixtures() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return null;
  const sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    logging: false,
    dialectOptions:
      process.env.DATABASE_SSL === 'true' || databaseUrl.includes('sslmode=require')
        ? { ssl: { require: true, rejectUnauthorized: false } }
        : {}
  });
  try {
    await sequelize.authenticate();
    const [row] = await sequelize.query<{
      category_id: string;
      tag_id: string;
      draft_article_id: string;
      public_article_id: string;
      premium_article_id: string;
      subscription_id: string;
      notification_id: string;
    }>(
      `
      SELECT
        (SELECT id FROM categories WHERE slug = 'sociedad' LIMIT 1) AS category_id,
        (SELECT id FROM tags WHERE slug = 'comunidad' LIMIT 1) AS tag_id,
        (SELECT id FROM articles WHERE slug = 'borrador-interno-seguimiento-economico-semanal' LIMIT 1) AS draft_article_id,
        (SELECT id FROM articles WHERE slug = 'comunidad-tecnologia-agenda-ciudadana-servicios-locales' LIMIT 1) AS public_article_id,
        (SELECT id FROM articles WHERE slug = 'informe-especial-premium-cambio-consumo-informativo' LIMIT 1) AS premium_article_id,
        (SELECT id FROM subscriptions ORDER BY created_at DESC LIMIT 1) AS subscription_id,
        (SELECT n.id FROM notifications n INNER JOIN users u ON u.id = n.user_id WHERE u.email = 'premium.demo@periodico.test' ORDER BY n.created_at DESC LIMIT 1) AS notification_id;
      `,
      { type: QueryTypes.SELECT }
    );
    return row;
  } finally {
    await sequelize.close();
  }
}

async function main() {
  console.log(`Running HTTP smoke against ${baseUrl}`);
  const fixtures = await getDatabaseFixtures();

  const live = await request<Record<string, unknown>>('GET', '/health/live');
  assert(live.body.status === 'ok', 'Liveness probe must be ok');

  const health = await request<Record<string, unknown>>('GET', '/health/ready');
  assert(['ok', 'degraded'].includes(String(health.body.status)), 'Readiness status must be ok or degraded');
  assert(health.body.database === 'ok', 'Database health must be ok');

  await request('POST', '/auth/login', {
    body: { email: 'admin.demo@periodico.test', password: 'wrong-password' },
    expectedStatus: 401
  });

  const admin = await login('admin.demo@periodico.test');
  const editor = await login('editor.demo@periodico.test');
  const reader = await login('lector.demo@periodico.test');
  let premium = await login('premium.demo@periodico.test');

  assert(typeof admin.refreshToken === 'string' && admin.refreshToken.length > 40, 'Login must return admin refresh token');
  const refreshedPremium = await request<LoginResponse>('POST', '/auth/refresh', {
    body: { refreshToken: premium.refreshToken },
    expectedStatus: 201
  });
  premium = refreshedPremium.body;
  assert(typeof premium.accessToken === 'string', 'Refresh must return new access token');

  assert(admin.user.roles.includes('admin'), 'admin.demo must include admin role');
  assert(reader.user.roles.includes('reader'), 'lector.demo must include reader role');

  const me = await request<Record<string, unknown>>('GET', '/auth/me', { token: premium.accessToken });
  assert(me.body.isPremium === true, 'premium.demo must be premium in /auth/me');

  const publicArticles = await request<unknown[]>('GET', '/articles?limit=10&offset=0');
  const articles = firstArray(publicArticles.body, 'public articles');
  assert(articles.some((article) => article.slug === 'comunidad-tecnologia-agenda-ciudadana-servicios-locales'), 'public article seed missing from public list');
  assert(articles.some((article) => article.slug === 'informe-especial-premium-cambio-consumo-informativo'), 'premium preview seed missing from public list');

  const publicDetail = await request<Record<string, unknown>>('GET', '/articles/comunidad-tecnologia-agenda-ciudadana-servicios-locales');
  assert(typeof publicDetail.body.body === 'string', 'Public article must expose body without login');
  assert((publicDetail.body.access as any)?.allowed === true, 'Public article access must be allowed');

  const premiumAnonymous = await request<Record<string, unknown>>('GET', '/articles/informe-especial-premium-cambio-consumo-informativo');
  assert(premiumAnonymous.body.body === null, 'Anonymous premium article must redact body');
  assert(Array.isArray(premiumAnonymous.body.ads) && (premiumAnonymous.body.ads as unknown[]).length === 0, 'Premium preview must never include ads');
  assert((premiumAnonymous.body.access as any)?.allowed === false, 'Anonymous premium access must be denied');

  await request('GET', '/premium/articles/informe-especial-premium-cambio-consumo-informativo', {
    token: reader.accessToken,
    expectedStatus: 403
  });

  const premiumDetail = await request<Record<string, unknown>>('GET', '/premium/articles/informe-especial-premium-cambio-consumo-informativo', {
    token: premium.accessToken
  });
  assert(String(premiumDetail.body.body).includes('CUERPO PREMIUM DEMO PROTEGIDO'), 'Premium subscriber must receive protected body');
  assert(Array.isArray(premiumDetail.body.ads) && (premiumDetail.body.ads as unknown[]).length === 0, 'Premium subscriber detail must have zero ads');

  const publicAds = await request<Record<string, unknown>>('GET', '/ads/slots?articleSlug=comunidad-tecnologia-agenda-ciudadana-servicios-locales', {
    token: reader.accessToken
  });
  assert(Array.isArray(publicAds.body.ads), 'Public article ad slots must return ads array');

  const premiumAds = await request<Record<string, unknown>>('GET', '/ads/slots?articleSlug=informe-especial-premium-cambio-consumo-informativo', {
    token: premium.accessToken
  });
  assert(Array.isArray(premiumAds.body.ads) && (premiumAds.body.ads as unknown[]).length === 0, 'Premium article ad slots must be empty');

  await request('POST', '/admin/articles', {
    token: reader.accessToken,
    body: {
      title: 'Intento no autorizado de crear noticia',
      summary: 'Este payload debe fallar porque un lector no puede crear contenido editorial.',
      body: 'Este contenido tiene más de cincuenta caracteres y existe solo para validar un error de negocio.',
      categoryId: fixtures?.category_id ?? '00000000-0000-4000-8000-000000000000',
      tagIds: [],
      articleType: 'news',
      accessType: 'public',
      commentsEnabled: true,
      reactionsEnabled: true
    },
    expectedStatus: 403
  });

  await request('POST', '/admin/articles', {
    token: editor.accessToken,
    body: { title: 'Bad' },
    expectedStatus: 400
  });

  if (fixtures?.draft_article_id) {
    await request('POST', `/admin/articles/${fixtures.draft_article_id}/schedule`, {
      token: editor.accessToken,
      body: { publishAt: '2020-01-01T00:00:00.000Z' },
      expectedStatus: 400
    });
  }

  await request('POST', '/admin/categories', {
    token: admin.accessToken,
    body: { name: 'Sociedad duplicada', slug: 'sociedad', description: 'Debe fallar por slug duplicado.', isActive: true },
    expectedStatus: 409
  });

  if (fixtures?.public_article_id) {
    const comments = await request<unknown[]>('GET', `/articles/${fixtures.public_article_id}/comments`);
    assert(Array.isArray(comments.body), 'Comments endpoint must return array');

    await request('POST', `/articles/${fixtures.public_article_id}/comments`, {
      token: reader.accessToken,
      body: { content: 'Comentario smoke válido para validar creación y moderación pendiente.' },
      expectedStatus: 201
    });

    await request('POST', `/articles/${fixtures.public_article_id}/reactions`, {
      token: reader.accessToken,
      body: { reactionType: 'interesting' },
      expectedStatus: [200, 201]
    });
  }

  const plans = await request<unknown[]>('GET', '/subscriptions/plans');
  firstArray(plans.body, 'subscription plans');

  const checkout = await request<Record<string, unknown>>('POST', '/subscriptions/checkout', {
    token: reader.accessToken,
    body: { planId: (plans.body[0] as any).id },
    expectedStatus: 201
  });
  assert(checkout.body.status === 'pending_payment', 'Checkout must create pending payment subscription');

  await request('POST', '/payments/webhook', {
    body: {
      provider: 'manual_demo',
      externalEventId: `smoke-${Date.now()}`,
      eventType: 'payment.succeeded',
      externalReference: checkout.body.externalReference,
      rawPayload: { source: 'smoke-http' }
    },
    expectedStatus: [200, 201]
  });

  const outbox = await request<unknown[]>('GET', '/admin/events/outbox?status=pending', { token: admin.accessToken });
  assert(Array.isArray(outbox.body), 'Outbox admin endpoint must return array');

  const dispatch = await request<Record<string, unknown>>('POST', '/admin/events/dispatch-pending', {
    token: admin.accessToken,
    body: { limit: 10 },
    expectedStatus: 201
  });
  assert(typeof dispatch.body.processed === 'number', 'Dispatch endpoint must return processed number');

  const workerRun = await request<Record<string, unknown>>('POST', '/admin/events/worker/run-once', {
    token: admin.accessToken,
    body: { limit: 10, workerName: 'smoke-http-event-worker' },
    expectedStatus: 201
  });
  assert(typeof workerRun.body.processed === 'number', 'Worker run endpoint must return processed number');

  const loginAttempts = await request<unknown[]>('GET', '/admin/security/login-attempts?limit=20', { token: admin.accessToken });
  assert(Array.isArray(loginAttempts.body), 'Security login attempts endpoint must return array');

  const workerRuns = await request<unknown[]>('GET', '/admin/security/worker-runs?limit=20', { token: admin.accessToken });
  assert(Array.isArray(workerRuns.body), 'Worker run history endpoint must return array');

  if (fixtures?.public_article_id) {
    const invalidation = await request<Record<string, unknown>>('POST', `/admin/cache-invalidation/articles/${fixtures.public_article_id}`, {
      token: editor.accessToken,
      body: { reason: 'smoke-http explicit invalidation' },
      expectedStatus: 201
    });
    assert((invalidation.body as any).status === 'processed', 'Cache invalidation must be processed');
  }

  if (fixtures?.notification_id) {
    await request('POST', `/notifications/${fixtures.notification_id}/read`, {
      token: premium.accessToken,
      expectedStatus: 201
    });
  }

  await request('POST', '/auth/logout', {
    token: premium.accessToken,
    body: { refreshToken: premium.refreshToken },
    expectedStatus: 201
  });

  console.log('HTTP smoke OK');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
