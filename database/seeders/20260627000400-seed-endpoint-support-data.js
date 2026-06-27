'use strict';

const permissionRows = [
  ['articles.create', 'articles', 'Crear borradores editoriales'],
  ['articles.review', 'articles', 'Enviar, aprobar y solicitar cambios'],
  ['articles.publish', 'articles', 'Publicar, despublicar y archivar artículos'],
  ['ads.manage', 'ads', 'Gestionar anuncios discretos'],
  ['comments.moderate', 'comments', 'Moderar comentarios'],
  ['subscriptions.manage', 'subscriptions', 'Gestionar suscripciones manuales'],
  ['events.dispatch', 'events', 'Despachar outbox e inspeccionar inbox'],
  ['audit.read', 'audit', 'Consultar auditoría'],
  ['analytics.read', 'analytics', 'Consultar analítica básica']
];

const rolePermissionMap = {
  admin: permissionRows.map(([code]) => code),
  editor: ['articles.create', 'articles.review', 'articles.publish', 'comments.moderate', 'audit.read', 'analytics.read'],
  journalist: ['articles.create'],
  commercial_editor: ['ads.manage'],
  reader: []
};

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      for (const [code, module, description] of permissionRows) {
        await queryInterface.sequelize.query(
          `INSERT INTO permissions (code, module, description) VALUES (:code, :module, :description) ON CONFLICT (code) DO NOTHING`,
          { replacements: { code, module, description }, transaction }
        );
      }

      for (const [roleName, permissions] of Object.entries(rolePermissionMap)) {
        for (const permissionCode of permissions) {
          await queryInterface.sequelize.query(
            `
            INSERT INTO role_permissions (role_id, permission_id)
            SELECT r.id, p.id
            FROM roles r, permissions p
            WHERE r.name = :roleName AND p.code = :permissionCode
            ON CONFLICT (role_id, permission_id) DO NOTHING;
            `,
            { replacements: { roleName, permissionCode }, transaction }
          );
        }
      }

      await queryInterface.sequelize.query(
        `
        INSERT INTO article_views (id, article_id, user_id, visitor_hash, user_agent)
        VALUES
          ('00000000-0000-4000-8000-000000002001', '00000000-0000-4000-8000-000000000701', null, 'visitor-demo-public-1', 'seed/smoke'),
          ('00000000-0000-4000-8000-000000002002', '00000000-0000-4000-8000-000000000701', '00000000-0000-4000-8000-000000000105', null, 'seed/smoke'),
          ('00000000-0000-4000-8000-000000002003', '00000000-0000-4000-8000-000000000702', '00000000-0000-4000-8000-000000000106', null, 'seed/smoke')
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO search_index_documents (id, article_id, status, payload, indexed_at)
        VALUES
          ('00000000-0000-4000-8000-000000002101', '00000000-0000-4000-8000-000000000701', 'indexed', jsonb_build_object('seed', true, 'accessType', 'public'), now() - interval '2 days'),
          ('00000000-0000-4000-8000-000000002102', '00000000-0000-4000-8000-000000000702', 'indexed', jsonb_build_object('seed', true, 'accessType', 'premium', 'bodyExcluded', true), now() - interval '1 day')
        ON CONFLICT (article_id) DO NOTHING;

        INSERT INTO cache_invalidation_jobs (id, entity_name, entity_id, reason, status, processed_at)
        VALUES
          ('00000000-0000-4000-8000-000000002201', 'Article', '00000000-0000-4000-8000-000000000701', 'Seed public article cache invalidation', 'processed', now() - interval '2 days'),
          ('00000000-0000-4000-8000-000000002202', 'Article', '00000000-0000-4000-8000-000000000702', 'Seed premium article cache invalidation without ads', 'processed', now() - interval '1 day')
        ON CONFLICT (id) DO NOTHING;
        `,
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `
        DELETE FROM cache_invalidation_jobs WHERE id IN ('00000000-0000-4000-8000-000000002201', '00000000-0000-4000-8000-000000002202');
        DELETE FROM search_index_documents WHERE id IN ('00000000-0000-4000-8000-000000002101', '00000000-0000-4000-8000-000000002102');
        DELETE FROM article_views WHERE id IN ('00000000-0000-4000-8000-000000002001', '00000000-0000-4000-8000-000000002002', '00000000-0000-4000-8000-000000002003');
        DELETE FROM role_permissions WHERE permission_id IN (SELECT id FROM permissions WHERE code IN (:codes));
        DELETE FROM permissions WHERE code IN (:codes);
        `,
        { replacements: { codes: permissionRows.map(([code]) => code) }, transaction }
      );
    });
  }
};
