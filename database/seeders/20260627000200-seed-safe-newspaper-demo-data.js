'use strict';

const bcrypt = require('bcryptjs');

const ids = {
  roles: {
    admin: '00000000-0000-4000-8000-000000000001',
    editor: '00000000-0000-4000-8000-000000000002',
    journalist: '00000000-0000-4000-8000-000000000003',
    commercialEditor: '00000000-0000-4000-8000-000000000004',
    reader: '00000000-0000-4000-8000-000000000005'
  },
  users: {
    admin: '00000000-0000-4000-8000-000000000101',
    editor: '00000000-0000-4000-8000-000000000102',
    journalist: '00000000-0000-4000-8000-000000000103',
    commercialEditor: '00000000-0000-4000-8000-000000000104',
    reader: '00000000-0000-4000-8000-000000000105',
    premiumReader: '00000000-0000-4000-8000-000000000106'
  },
  plans: {
    monthly: '00000000-0000-4000-8000-000000000201',
    annual: '00000000-0000-4000-8000-000000000202'
  },
  subscriptions: {
    premiumActive: '00000000-0000-4000-8000-000000000301'
  },
  payments: {
    premiumActive: '00000000-0000-4000-8000-000000000401'
  },
  categories: {
    sociedad: '00000000-0000-4000-8000-000000000501',
    economia: '00000000-0000-4000-8000-000000000502',
    investigacion: '00000000-0000-4000-8000-000000000503',
    cultura: '00000000-0000-4000-8000-000000000504'
  },
  tags: {
    santaCruz: '00000000-0000-4000-8000-000000000601',
    economia: '00000000-0000-4000-8000-000000000602',
    investigacion: '00000000-0000-4000-8000-000000000603',
    comunidad: '00000000-0000-4000-8000-000000000604',
    premium: '00000000-0000-4000-8000-000000000605'
  },
  articles: {
    publicPublished: '00000000-0000-4000-8000-000000000701',
    premiumPublished: '00000000-0000-4000-8000-000000000702',
    draft: '00000000-0000-4000-8000-000000000703'
  },
  media: {
    publicCover: '00000000-0000-4000-8000-000000000801',
    premiumCover: '00000000-0000-4000-8000-000000000802'
  },
  placements: {
    articleInline: '00000000-0000-4000-8000-000000000901',
    articleSidebar: '00000000-0000-4000-8000-000000000902'
  },
  ads: {
    publicInline: '00000000-0000-4000-8000-000000001001'
  },
  events: {
    publicPublished: '00000000-0000-4000-8000-000000001101',
    premiumPublished: '00000000-0000-4000-8000-000000001102',
    premiumAdsDisabled: '00000000-0000-4000-8000-000000001103'
  },
  revisions: {
    publicInitial: '00000000-0000-4000-8000-000000001111',
    premiumInitial: '00000000-0000-4000-8000-000000001112'
  },
  notificationBatches: {
    public: '00000000-0000-4000-8000-000000001201',
    premium: '00000000-0000-4000-8000-000000001202'
  },
  notificationPreferences: {
    readerInApp: '00000000-0000-4000-8000-000000001211',
    premiumInApp: '00000000-0000-4000-8000-000000001212'
  },
  auditLogs: {
    publicPublished: '00000000-0000-4000-8000-000000001701',
    premiumPublished: '00000000-0000-4000-8000-000000001702',
    adActivated: '00000000-0000-4000-8000-000000001703'
  }
};

module.exports = {
  async up(queryInterface) {
    const rounds = Number(process.env.BCRYPT_ROUNDS || 10);
    const passwordHash = await bcrypt.hash('DemoPassword2026!', rounds);

    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `
        INSERT INTO roles (id, name, description)
        VALUES
          (:adminRole, 'admin', 'Administración total del sistema'),
          (:editorRole, 'editor', 'Revisión, aprobación y publicación editorial'),
          (:journalistRole, 'journalist', 'Redacción y propuesta de artículos'),
          (:commercialEditorRole, 'commercial_editor', 'Gestión de publicidad discreta'),
          (:readerRole, 'reader', 'Lector registrado')
        ON CONFLICT (id) DO NOTHING;
        `,
        { replacements: ids.roles, transaction }
      );

      await queryInterface.sequelize.query(
        `
        INSERT INTO users (id, full_name, email, password_hash, status)
        VALUES
          (:admin, 'Admin Demo', 'admin.demo@periodico.test', :passwordHash, 'active'),
          (:editor, 'Editora Demo', 'editor.demo@periodico.test', :passwordHash, 'active'),
          (:journalist, 'Periodista Demo', 'periodista.demo@periodico.test', :passwordHash, 'active'),
          (:commercialEditor, 'Comercial Demo', 'comercial.demo@periodico.test', :passwordHash, 'active'),
          (:reader, 'Lector Demo', 'lector.demo@periodico.test', :passwordHash, 'active'),
          (:premiumReader, 'Lector Premium Demo', 'premium.demo@periodico.test', :passwordHash, 'active')
        ON CONFLICT (id) DO NOTHING;
        `,
        { replacements: { ...ids.users, passwordHash }, transaction }
      );

      await queryInterface.sequelize.query(
        `
        INSERT INTO user_roles (user_id, role_id)
        VALUES
          (:admin, :adminRole),
          (:editor, :editorRole),
          (:journalist, :journalistRole),
          (:commercialEditor, :commercialEditorRole),
          (:reader, :readerRole),
          (:premiumReader, :readerRole)
        ON CONFLICT (user_id, role_id) DO NOTHING;
        `,
        {
          replacements: {
            ...ids.users,
            adminRole: ids.roles.admin,
            editorRole: ids.roles.editor,
            journalistRole: ids.roles.journalist,
            commercialEditorRole: ids.roles.commercialEditor,
            readerRole: ids.roles.reader
          },
          transaction
        }
      );

      await queryInterface.sequelize.query(
        `
        INSERT INTO subscription_plans (id, name, description, price, currency, duration_days, is_active)
        VALUES
          (:monthly, 'Plan mensual demo', 'Plan de prueba para validar paywall; precio no definitivo.', 49.00, 'BOB', 30, true),
          (:annual, 'Plan anual demo', 'Plan anual de prueba; precio no definitivo.', 499.00, 'BOB', 365, true)
        ON CONFLICT (id) DO NOTHING;
        `,
        { replacements: ids.plans, transaction }
      );

      await queryInterface.sequelize.query(
        `
        INSERT INTO subscriptions (id, user_id, plan_id, status, starts_at, ends_at)
        VALUES (:premiumActive, :premiumReader, :annual, 'active', now() - interval '10 days', timestamp with time zone '2035-12-31 23:59:59+00')
        ON CONFLICT (id) DO NOTHING;
        `,
        {
          replacements: {
            premiumActive: ids.subscriptions.premiumActive,
            premiumReader: ids.users.premiumReader,
            annual: ids.plans.annual
          },
          transaction
        }
      );

      await queryInterface.sequelize.query(
        `
        INSERT INTO payment_transactions (id, subscription_id, provider, external_reference, amount, currency, status, paid_at)
        VALUES (:paymentId, :subscriptionId, 'manual_demo', 'manual-demo-premium-2035', 499.00, 'BOB', 'succeeded', now() - interval '10 days')
        ON CONFLICT (id) DO NOTHING;
        `,
        {
          replacements: {
            paymentId: ids.payments.premiumActive,
            subscriptionId: ids.subscriptions.premiumActive
          },
          transaction
        }
      );

      await queryInterface.sequelize.query(
        `
        INSERT INTO categories (id, name, slug, description, is_active)
        VALUES
          (:sociedad, 'Sociedad', 'sociedad', 'Noticias de interés ciudadano y comunidad.', true),
          (:economia, 'Economía', 'economia', 'Cobertura económica y contexto empresarial.', true),
          (:investigacion, 'Investigación', 'investigacion', 'Reportajes especiales y análisis profundo.', true),
          (:cultura, 'Cultura', 'cultura', 'Agenda cultural, entrevistas y patrimonio.', true)
        ON CONFLICT (id) DO NOTHING;
        `,
        { replacements: ids.categories, transaction }
      );

      await queryInterface.sequelize.query(
        `
        INSERT INTO tags (id, name, slug)
        VALUES
          (:santaCruz, 'Santa Cruz', 'santa-cruz'),
          (:economia, 'Economía', 'economia'),
          (:investigacion, 'Investigación', 'investigacion'),
          (:comunidad, 'Comunidad', 'comunidad'),
          (:premium, 'Premium', 'premium')
        ON CONFLICT (id) DO NOTHING;
        `,
        { replacements: ids.tags, transaction }
      );

      await queryInterface.sequelize.query(
        `
        INSERT INTO articles (
          id, author_id, category_id, title, slug, summary, body, audio_transcript,
          article_type, access_type, status, comments_enabled, reactions_enabled, published_at
        ) VALUES
          (
            :publicPublished,
            :journalist,
            :sociedad,
            'Comunidad y tecnología: una agenda ciudadana para mejorar servicios locales',
            'comunidad-tecnologia-agenda-ciudadana-servicios-locales',
            'Una nota pública de demostración para validar listados, lectura abierta, comentarios y publicidad discreta.',
            'Este contenido público sirve para probar la experiencia abierta del periódico. El artículo mantiene una estructura editorial clara con contexto, desarrollo, datos de apoyo y cierre. También permite validar que visitantes puedan leer sin iniciar sesión, mientras que comentarios y reacciones quedan reservados para usuarios autenticados.',
            'Transcripción demo: resumen narrado de la nota pública sobre comunidad y tecnología.',
            'news',
            'public',
            'published',
            true,
            true,
            now() - interval '2 days'
          ),
          (
            :premiumPublished,
            :editor,
            :investigacion,
            'Informe especial premium: señales tempranas de cambio en el consumo informativo',
            'informe-especial-premium-cambio-consumo-informativo',
            'Vista previa controlada de una investigación premium. El cuerpo completo solo debe entregarse con suscripción activa.',
            'CUERPO PREMIUM DEMO PROTEGIDO. Este texto completo solo debe devolverse a usuarios autenticados con suscripción activa. La API pública debe ocultarlo y entregar únicamente la vista previa. Esta semilla permite validar el paywall, la ausencia de publicidad en premium y la segmentación de notificaciones.',
            'Transcripción demo premium protegida para usuarios con suscripción activa.',
            'report',
            'premium',
            'published',
            true,
            true,
            now() - interval '1 day'
          ),
          (
            :draft,
            :journalist,
            :economia,
            'Borrador interno: seguimiento económico semanal',
            'borrador-interno-seguimiento-economico-semanal',
            'Borrador interno para validar estados editoriales sin exposición pública.',
            'Contenido de borrador no publicado. No debe aparecer en endpoints públicos.',
            null,
            'analysis',
            'internal_only',
            'draft',
            false,
            false,
            null
          )
        ON CONFLICT (id) DO NOTHING;
        `,
        {
          replacements: {
            ...ids.articles,
            journalist: ids.users.journalist,
            editor: ids.users.editor,
            sociedad: ids.categories.sociedad,
            investigacion: ids.categories.investigacion,
            economia: ids.categories.economia
          },
          transaction
        }
      );

      await queryInterface.sequelize.query(
        `
        INSERT INTO article_revisions (id, article_id, edited_by_user_id, title_snapshot, body_snapshot, change_reason)
        VALUES
          (:publicInitialRevision, :publicPublished, :editor, 'Comunidad y tecnología: una agenda ciudadana para mejorar servicios locales', 'Snapshot público demo.', 'Seed inicial publicado'),
          (:premiumInitialRevision, :premiumPublished, :editor, 'Informe especial premium: señales tempranas de cambio en el consumo informativo', 'Snapshot premium demo.', 'Seed inicial premium publicado')
        ON CONFLICT (id) DO NOTHING;
        `,
        { replacements: { ...ids.articles, editor: ids.users.editor, publicInitialRevision: ids.revisions.publicInitial, premiumInitialRevision: ids.revisions.premiumInitial }, transaction }
      );

      await queryInterface.sequelize.query(
        `
        INSERT INTO article_tags (article_id, tag_id)
        VALUES
          (:publicPublished, :santaCruz),
          (:publicPublished, :comunidad),
          (:premiumPublished, :investigacion),
          (:premiumPublished, :premium),
          (:draft, :economia)
        ON CONFLICT (article_id, tag_id) DO NOTHING;
        `,
        { replacements: { ...ids.articles, ...ids.tags }, transaction }
      );

      await queryInterface.sequelize.query(
        `
        INSERT INTO media_assets (id, uploaded_by_user_id, media_type, url, caption, alt_text, mime_type, size_bytes)
        VALUES
          (:publicCover, :journalist, 'image', 'https://cdn.example.test/newspaper/demo/public-cover.webp', 'Imagen demo pública', 'Ciudad con personas usando servicios digitales', 'image/webp', 120000),
          (:premiumCover, :editor, 'image', 'https://cdn.example.test/newspaper/demo/premium-cover.webp', 'Imagen demo premium', 'Mesa editorial revisando datos', 'image/webp', 135000)
        ON CONFLICT (id) DO NOTHING;
        `,
        { replacements: { ...ids.media, journalist: ids.users.journalist, editor: ids.users.editor }, transaction }
      );

      await queryInterface.sequelize.query(
        `
        INSERT INTO article_media (article_id, media_asset_id, display_order, is_cover)
        VALUES
          (:publicPublished, :publicCover, 1, true),
          (:premiumPublished, :premiumCover, 1, true)
        ON CONFLICT (article_id, media_asset_id) DO NOTHING;
        `,
        { replacements: { ...ids.articles, ...ids.media }, transaction }
      );

      await queryInterface.sequelize.query(
        `
        INSERT INTO comments (id, article_id, user_id, content, status)
        VALUES
          ('00000000-0000-4000-8000-000000001301', :publicPublished, :reader, 'Comentario demo aprobado sobre una nota pública.', 'approved'),
          ('00000000-0000-4000-8000-000000001302', :premiumPublished, :premiumReader, 'Comentario demo de usuario premium en nota protegida.', 'approved')
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO reactions (id, article_id, user_id, reaction_type)
        VALUES
          ('00000000-0000-4000-8000-000000001401', :publicPublished, :reader, 'interesting'),
          ('00000000-0000-4000-8000-000000001402', :premiumPublished, :premiumReader, 'like')
        ON CONFLICT (article_id, user_id) DO NOTHING;
        `,
        {
          replacements: {
            ...ids.articles,
            reader: ids.users.reader,
            premiumReader: ids.users.premiumReader
          },
          transaction
        }
      );

      await queryInterface.sequelize.query(
        `
        INSERT INTO advertisement_placements (id, code, name, description, allowed_context, is_active)
        VALUES
          (:articleInline, 'article_inline_small', 'Bloque discreto en artículo público', 'Espacio pequeño, no popup, no invasivo.', 'public_articles', true),
          (:articleSidebar, 'article_sidebar_small', 'Lateral discreto en escritorio', 'Espacio lateral pequeño para contenido público.', 'public_articles', true)
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO advertisements (id, placement_id, title, image_url, target_url, status, starts_at, ends_at)
        VALUES
          (:publicInlineAd, :articleInline, 'Anuncio discreto demo para contenido público', 'https://cdn.example.test/ads/demo-inline.webp', 'https://example.test/anunciante-demo', 'active', now() - interval '1 day', timestamp with time zone '2035-12-31 23:59:59+00')
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO advertisement_category_targets (advertisement_id, category_id)
        VALUES (:publicInlineAd, :sociedad)
        ON CONFLICT (advertisement_id, category_id) DO NOTHING;

        INSERT INTO advertisement_impressions (id, advertisement_id, article_id, user_id, rendered_at)
        VALUES ('00000000-0000-4000-8000-000000001501', :publicInlineAd, :publicPublished, null, now() - interval '12 hours')
        ON CONFLICT (id) DO NOTHING;
        `,
        {
          replacements: {
            ...ids.placements,
            publicInlineAd: ids.ads.publicInline,
            readerInAppPreference: ids.notificationPreferences.readerInApp,
            premiumInAppPreference: ids.notificationPreferences.premiumInApp,
            publicInitialRevision: ids.revisions.publicInitial,
            premiumInitialRevision: ids.revisions.premiumInitial,
            publicPublishedAudit: ids.auditLogs.publicPublished,
            premiumPublishedAudit: ids.auditLogs.premiumPublished,
            adActivatedAudit: ids.auditLogs.adActivated,
            sociedad: ids.categories.sociedad,
            publicPublished: ids.articles.publicPublished
          },
          transaction
        }
      );

      await queryInterface.sequelize.query(
        `
        INSERT INTO event_outbox (id, event_type, aggregate_type, aggregate_id, payload, status, correlation_id, causation_id, occurred_at, published_at)
        VALUES
          (
            :publicEvent,
            'PublicArticlePublished',
            'Article',
            :publicPublished,
            jsonb_build_object('articleId', :publicPublished::uuid, 'title', 'Comunidad y tecnología: una agenda ciudadana para mejorar servicios locales', 'slug', 'comunidad-tecnologia-agenda-ciudadana-servicios-locales', 'accessType', 'public', 'categoryId', :sociedad::uuid),
            'published',
            gen_random_uuid(),
            gen_random_uuid(),
            now() - interval '2 days',
            now() - interval '2 days'
          ),
          (
            :premiumEvent,
            'PremiumArticlePublished',
            'Article',
            :premiumPublished,
            jsonb_build_object('articleId', :premiumPublished::uuid, 'title', 'Informe especial premium: señales tempranas de cambio en el consumo informativo', 'slug', 'informe-especial-premium-cambio-consumo-informativo', 'accessType', 'premium', 'categoryId', :investigacion::uuid),
            'published',
            gen_random_uuid(),
            gen_random_uuid(),
            now() - interval '1 day',
            now() - interval '1 day'
          ),
          (
            :premiumAdsDisabledEvent,
            'PremiumAdSlotsDisabled',
            'Article',
            :premiumPublished,
            jsonb_build_object('articleId', :premiumPublished::uuid, 'reason', 'premium_articles_have_zero_ads'),
            'published',
            gen_random_uuid(),
            gen_random_uuid(),
            now() - interval '1 day',
            now() - interval '1 day'
          )
        ON CONFLICT (id) DO NOTHING;
        `,
        {
          replacements: {
            publicEvent: ids.events.publicPublished,
            premiumEvent: ids.events.premiumPublished,
            premiumAdsDisabledEvent: ids.events.premiumAdsDisabled,
            publicPublished: ids.articles.publicPublished,
            premiumPublished: ids.articles.premiumPublished,
            sociedad: ids.categories.sociedad,
            investigacion: ids.categories.investigacion
          },
          transaction
        }
      );

      await queryInterface.sequelize.query(
        `
        INSERT INTO event_inbox (event_id, consumer_name, status, processed_at)
        VALUES
          (:publicEvent, 'notification-worker', 'consumed', now() - interval '2 days'),
          (:premiumEvent, 'notification-worker', 'consumed', now() - interval '1 day'),
          (:premiumAdsDisabledEvent, 'ads-worker', 'consumed', now() - interval '1 day')
        ON CONFLICT (event_id, consumer_name) DO NOTHING;

        INSERT INTO notification_batches (id, source_event_id, article_id, audience_type, status, total_recipients)
        VALUES
          (:publicBatch, :publicEvent, :publicPublished, 'active_registered_users', 'sent', 2),
          (:premiumBatch, :premiumEvent, :premiumPublished, 'active_premium_users', 'sent', 1)
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO notifications (id, batch_id, user_id, article_id, channel, title, message, status, sent_at)
        VALUES
          ('00000000-0000-4000-8000-000000001601', :publicBatch, :reader, :publicPublished, 'in_app', 'Nueva noticia pública', 'Ya está disponible una noticia pública demo.', 'sent', now() - interval '2 days'),
          ('00000000-0000-4000-8000-000000001602', :publicBatch, :premiumReader, :publicPublished, 'in_app', 'Nueva noticia pública', 'Ya está disponible una noticia pública demo.', 'sent', now() - interval '2 days'),
          ('00000000-0000-4000-8000-000000001603', :premiumBatch, :premiumReader, :premiumPublished, 'in_app', 'Nueva nota premium', 'Ya está disponible una nota premium demo.', 'sent', now() - interval '1 day')
        ON CONFLICT (id) DO NOTHING;
        `,
        {
          replacements: {
            publicEvent: ids.events.publicPublished,
            premiumEvent: ids.events.premiumPublished,
            premiumAdsDisabledEvent: ids.events.premiumAdsDisabled,
            publicBatch: ids.notificationBatches.public,
            premiumBatch: ids.notificationBatches.premium,
            publicPublished: ids.articles.publicPublished,
            premiumPublished: ids.articles.premiumPublished,
            reader: ids.users.reader,
            premiumReader: ids.users.premiumReader
          },
          transaction
        }
      );

      await queryInterface.sequelize.query(
        `
        INSERT INTO user_notification_preferences (id, user_id, category_id, channel, premium_only, enabled, public_news_alerts_enabled, premium_alerts_enabled)
        VALUES
          (:readerInAppPreference, :reader, null, 'in_app', false, true, true, false),
          (:premiumInAppPreference, :premiumReader, null, 'in_app', false, true, true, true)
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO audit_logs (id, actor_user_id, entity_name, entity_id, action, metadata)
        VALUES
          (:publicPublishedAudit, :editor, 'Article', :publicPublished, 'article.seed_published', jsonb_build_object('source', 'safe-demo-seeder')),
          (:premiumPublishedAudit, :editor, 'Article', :premiumPublished, 'article.seed_published', jsonb_build_object('source', 'safe-demo-seeder')),
          (:adActivatedAudit, :commercialEditor, 'Advertisement', :publicInlineAd, 'advertisement.seed_activated', jsonb_build_object('source', 'safe-demo-seeder'))
        ON CONFLICT (id) DO NOTHING;
        `,
        {
          replacements: {
            reader: ids.users.reader,
            premiumReader: ids.users.premiumReader,
            editor: ids.users.editor,
            commercialEditor: ids.users.commercialEditor,
            publicPublished: ids.articles.publicPublished,
            premiumPublished: ids.articles.premiumPublished,
            publicInlineAd: ids.ads.publicInline,
            readerInAppPreference: ids.notificationPreferences.readerInApp,
            premiumInAppPreference: ids.notificationPreferences.premiumInApp,
            publicPublishedAudit: ids.auditLogs.publicPublished,
            premiumPublishedAudit: ids.auditLogs.premiumPublished,
            adActivatedAudit: ids.auditLogs.adActivated
          },
          transaction
        }
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `
        DELETE FROM audit_logs WHERE id IN (:publicPublishedAudit, :premiumPublishedAudit, :adActivatedAudit);
        DELETE FROM notifications WHERE id IN ('00000000-0000-4000-8000-000000001601', '00000000-0000-4000-8000-000000001602', '00000000-0000-4000-8000-000000001603');
        DELETE FROM notification_batches WHERE id IN (:publicBatch, :premiumBatch);
        DELETE FROM user_notification_preferences WHERE id IN (:readerInAppPreference, :premiumInAppPreference);
        DELETE FROM event_inbox WHERE event_id IN (:publicEvent, :premiumEvent, :premiumAdsDisabledEvent);
        DELETE FROM event_outbox WHERE id IN (:publicEvent, :premiumEvent, :premiumAdsDisabledEvent);
        DELETE FROM advertisement_impressions WHERE id = '00000000-0000-4000-8000-000000001501';
        DELETE FROM advertisement_category_targets WHERE advertisement_id = :publicInlineAd;
        DELETE FROM advertisements WHERE id = :publicInlineAd;
        DELETE FROM advertisement_placements WHERE id IN (:articleInline, :articleSidebar);
        DELETE FROM reactions WHERE id IN ('00000000-0000-4000-8000-000000001401', '00000000-0000-4000-8000-000000001402');
        DELETE FROM comments WHERE id IN ('00000000-0000-4000-8000-000000001301', '00000000-0000-4000-8000-000000001302');
        DELETE FROM article_media WHERE article_id IN (:publicPublished, :premiumPublished);
        DELETE FROM media_assets WHERE id IN (:publicCover, :premiumCover);
        DELETE FROM article_tags WHERE article_id IN (:publicPublished, :premiumPublished, :draft);
        DELETE FROM article_revisions WHERE id IN (:publicInitialRevision, :premiumInitialRevision);
        DELETE FROM articles WHERE id IN (:publicPublished, :premiumPublished, :draft);
        DELETE FROM tags WHERE id IN (:santaCruz, :economiaTag, :investigacionTag, :comunidad, :premiumTag);
        DELETE FROM categories WHERE id IN (:sociedad, :economia, :investigacion, :cultura);
        DELETE FROM payment_transactions WHERE id = :paymentId;
        DELETE FROM subscriptions WHERE id = :subscriptionId;
        DELETE FROM subscription_plans WHERE id IN (:monthly, :annual);
        DELETE FROM user_roles WHERE user_id IN (:admin, :editor, :journalist, :commercialEditor, :reader, :premiumReader);
        DELETE FROM users WHERE id IN (:admin, :editor, :journalist, :commercialEditor, :reader, :premiumReader);
        DELETE FROM roles WHERE id IN (:adminRole, :editorRole, :journalistRole, :commercialEditorRole, :readerRole);
        `,
        {
          replacements: {
            publicBatch: ids.notificationBatches.public,
            premiumBatch: ids.notificationBatches.premium,
            publicEvent: ids.events.publicPublished,
            premiumEvent: ids.events.premiumPublished,
            premiumAdsDisabledEvent: ids.events.premiumAdsDisabled,
            publicInlineAd: ids.ads.publicInline,
            readerInAppPreference: ids.notificationPreferences.readerInApp,
            premiumInAppPreference: ids.notificationPreferences.premiumInApp,
            publicInitialRevision: ids.revisions.publicInitial,
            premiumInitialRevision: ids.revisions.premiumInitial,
            publicPublishedAudit: ids.auditLogs.publicPublished,
            premiumPublishedAudit: ids.auditLogs.premiumPublished,
            adActivatedAudit: ids.auditLogs.adActivated,
            articleInline: ids.placements.articleInline,
            articleSidebar: ids.placements.articleSidebar,
            publicPublished: ids.articles.publicPublished,
            premiumPublished: ids.articles.premiumPublished,
            draft: ids.articles.draft,
            publicCover: ids.media.publicCover,
            premiumCover: ids.media.premiumCover,
            santaCruz: ids.tags.santaCruz,
            economiaTag: ids.tags.economia,
            investigacionTag: ids.tags.investigacion,
            comunidad: ids.tags.comunidad,
            premiumTag: ids.tags.premium,
            sociedad: ids.categories.sociedad,
            economia: ids.categories.economia,
            investigacion: ids.categories.investigacion,
            cultura: ids.categories.cultura,
            paymentId: ids.payments.premiumActive,
            subscriptionId: ids.subscriptions.premiumActive,
            monthly: ids.plans.monthly,
            annual: ids.plans.annual,
            admin: ids.users.admin,
            editor: ids.users.editor,
            journalist: ids.users.journalist,
            commercialEditor: ids.users.commercialEditor,
            reader: ids.users.reader,
            premiumReader: ids.users.premiumReader,
            adminRole: ids.roles.admin,
            editorRole: ids.roles.editor,
            journalistRole: ids.roles.journalist,
            commercialEditorRole: ids.roles.commercialEditor,
            readerRole: ids.roles.reader
          },
          transaction
        }
      );
    });
  }
};
