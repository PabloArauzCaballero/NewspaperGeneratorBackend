import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerSchema, loginSchema, resetPasswordSchema } from '../../src/auth/auth.schemas';
import { createArticleSchema, publicArticleQuerySchema, scheduleArticleSchema } from '../../src/articles/articles.schemas';
import { slugify } from '../../src/common/utils/slugify';

const uuid = '00000000-0000-4000-8000-000000000001';

describe('critical schema contracts', () => {
  it('normalizes emails and enforces minimum password strength', () => {
    const parsed = registerSchema.parse({ fullName: 'Lector Prueba', email: 'LECTOR@TEST.COM ', password: 'DemoPassword2026!' });
    assert.equal(parsed.email, 'lector@test.com');
    assert.throws(() => registerSchema.parse({ fullName: 'A', email: 'bad', password: 'short' }));
    assert.throws(() => loginSchema.parse({ email: 'bad', password: '' }));
    assert.throws(() => resetPasswordSchema.parse({ resetToken: 'short', newPassword: 'short' }));
  });

  it('creates safe slugs and preserves premium access type explicitly', () => {
    assert.equal(slugify('Árbol político / Noticias 2026!!!'), 'arbol-politico-noticias-2026');
    const parsed = createArticleSchema.parse({
      title: 'Informe Premium de Consumo Informativo',
      summary: 'Resumen suficientemente largo para validar el contrato de noticia.',
      body: 'Contenido suficientemente largo para pasar las validaciones mínimas de cuerpo editorial serio.',
      categoryId: uuid,
      tagIds: [uuid],
      accessType: 'premium'
    });
    assert.equal(parsed.slug, 'informe-premium-de-consumo-informativo');
    assert.equal(parsed.accessType, 'premium');
  });

  it('coerces pagination safely and rejects invalid schedules', () => {
    const parsed = publicArticleQuerySchema.parse({ limit: '10', offset: '0' });
    assert.equal(parsed.limit, 10);
    assert.equal(parsed.offset, 0);
    assert.throws(() => publicArticleQuerySchema.parse({ limit: '5000', offset: '-1' }));
    assert.throws(() => scheduleArticleSchema.parse({ publishAt: 'not-a-date' }));
  });
});
