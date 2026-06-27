import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { QueryTypes, Sequelize } from 'sequelize';
import { RedisCacheService } from '../cache/redis-cache.service';
import { SEQUELIZE } from '../database/database.constants';
import { CreateCategoryDto, UpdateCategoryDto } from './categories.schemas';

@Injectable()
export class CategoriesService {
  constructor(
    @Inject(SEQUELIZE) private readonly sequelize: Sequelize,
    private readonly redisCache: RedisCacheService
  ) {}

  async listPublic() {
    return this.redisCache.rememberJson(this.redisCache.key('categories', 'public-list'), 300, () =>
      this.sequelize.query(
        `SELECT id, name, slug, description, is_active AS "isActive", created_at AS "createdAt" FROM categories WHERE is_active = true ORDER BY name ASC`,
        { type: QueryTypes.SELECT }
      )
    );
  }

  async listAdmin() {
    return this.sequelize.query(
      `SELECT id, name, slug, description, is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt" FROM categories ORDER BY name ASC`,
      { type: QueryTypes.SELECT }
    );
  }

  async create(dto: CreateCategoryDto, actorUserId: string) {
    try {
      const [row] = await this.sequelize.query<{ id: string }>(
        `
        INSERT INTO categories (name, slug, description, is_active)
        VALUES (:name, :slug, :description, :isActive)
        RETURNING id;
        `,
        { replacements: { name: dto.name, slug: dto.slug, description: dto.description ?? null, isActive: dto.isActive }, type: QueryTypes.SELECT }
      );
      await this.audit(actorUserId, row.id, 'category.created', dto);
      await this.redisCache.deleteByPattern(this.redisCache.key('categories', '*'));
      await this.redisCache.deleteByPattern(this.redisCache.key('articles', '*'));
      return this.get(row.id);
    } catch {
      throw new ConflictException('Category slug already exists');
    }
  }

  async update(id: string, dto: UpdateCategoryDto, actorUserId: string) {
    const fields: string[] = [];
    const replacements: Record<string, unknown> = { id };
    if (dto.name !== undefined) { fields.push('name = :name'); replacements.name = dto.name; }
    if (dto.slug !== undefined) { fields.push('slug = :slug'); replacements.slug = dto.slug; }
    if (dto.description !== undefined) { fields.push('description = :description'); replacements.description = dto.description; }
    if (dto.isActive !== undefined) { fields.push('is_active = :isActive'); replacements.isActive = dto.isActive; }
    if (fields.length === 0) return this.get(id);

    const [row] = await this.sequelize.query<{ id: string }>(
      `UPDATE categories SET ${fields.join(', ')}, updated_at = now() WHERE id = :id RETURNING id`,
      { replacements, type: QueryTypes.SELECT }
    );
    if (!row) throw new NotFoundException('Category not found');
    await this.audit(actorUserId, id, 'category.updated', dto);
    await this.redisCache.deleteByPattern(this.redisCache.key('categories', '*'));
    await this.redisCache.deleteByPattern(this.redisCache.key('articles', '*'));
    return this.get(id);
  }

  async get(id: string) {
    const [row] = await this.sequelize.query(
      `SELECT id, name, slug, description, is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt" FROM categories WHERE id = :id LIMIT 1`,
      { replacements: { id }, type: QueryTypes.SELECT }
    );
    if (!row) throw new NotFoundException('Category not found');
    return row;
  }

  private async audit(actorUserId: string, entityId: string, action: string, metadata: Record<string, unknown>) {
    await this.sequelize.query(
      `INSERT INTO audit_logs (actor_user_id, entity_name, entity_id, action, metadata) VALUES (:actorUserId, 'Category', :entityId, :action, :metadata::jsonb)`,
      { replacements: { actorUserId, entityId, action, metadata: JSON.stringify(metadata) }, type: QueryTypes.INSERT }
    );
  }
}
