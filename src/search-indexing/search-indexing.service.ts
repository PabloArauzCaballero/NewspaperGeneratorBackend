import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { QueryTypes, Sequelize } from 'sequelize';
import { SEQUELIZE } from '../database/database.constants';

@Injectable()
export class SearchIndexingService {
  constructor(@Inject(SEQUELIZE) private readonly sequelize: Sequelize) {}

  async listDocuments() {
    return this.sequelize.query(
      `
      SELECT sid.id, sid.article_id AS "articleId", a.title AS "articleTitle", a.slug AS "articleSlug",
             sid.status, sid.indexed_at AS "indexedAt", sid.last_error AS "lastError", sid.updated_at AS "updatedAt"
      FROM search_index_documents sid
      INNER JOIN articles a ON a.id = sid.article_id
      ORDER BY sid.updated_at DESC
      LIMIT 200;
      `,
      { type: QueryTypes.SELECT }
    );
  }

  async rebuildArticle(articleId: string) {
    const [article] = await this.sequelize.query<{ id: string; title: string; slug: string; summary: string; access_type: string; status: string }>(
      `SELECT id, title, slug, summary, access_type, status FROM articles WHERE id = :articleId LIMIT 1`,
      { replacements: { articleId }, type: QueryTypes.SELECT }
    );
    if (!article) throw new NotFoundException('Article not found');
    const payload = {
      articleId: article.id,
      title: article.title,
      slug: article.slug,
      summary: article.summary,
      accessType: article.access_type,
      status: article.status,
      note: article.access_type === 'premium' ? 'Premium body intentionally excluded from search index payload.' : 'Public summary indexed.'
    };
    const [row] = await this.sequelize.query(
      `
      INSERT INTO search_index_documents (article_id, status, payload, indexed_at)
      VALUES (:articleId, 'indexed', :payload::jsonb, now())
      ON CONFLICT (article_id) DO UPDATE SET status = 'indexed', payload = EXCLUDED.payload, indexed_at = now(), updated_at = now(), last_error = null
      RETURNING id, article_id AS "articleId", status, indexed_at AS "indexedAt", payload;
      `,
      { replacements: { articleId, payload: JSON.stringify(payload) }, type: QueryTypes.SELECT }
    );
    return row;
  }
}
