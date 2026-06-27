import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { QueryTypes, Sequelize } from 'sequelize';
import { RedisCacheService } from '../cache/redis-cache.service';
import { SEQUELIZE } from '../database/database.constants';
import { CreateTagDto } from './tags.schemas';

@Injectable()
export class TagsService {
  constructor(
    @Inject(SEQUELIZE) private readonly sequelize: Sequelize,
    private readonly redisCache: RedisCacheService
  ) {}

  async list() {
    return this.redisCache.rememberJson(this.redisCache.key('tags', 'list'), 300, () =>
      this.sequelize.query(`SELECT id, name, slug, created_at AS "createdAt" FROM tags ORDER BY name ASC`, { type: QueryTypes.SELECT })
    );
  }

  async create(dto: CreateTagDto) {
    try {
      const [row] = await this.sequelize.query(
        `INSERT INTO tags (name, slug) VALUES (:name, :slug) RETURNING id, name, slug, created_at AS "createdAt"`,
        { replacements: { name: dto.name, slug: dto.slug }, type: QueryTypes.SELECT }
      );
      await this.redisCache.deleteByPattern(this.redisCache.key('tags', '*'));
      await this.redisCache.deleteByPattern(this.redisCache.key('articles', '*'));
      return row;
    } catch {
      throw new ConflictException('Tag slug already exists');
    }
  }
}
