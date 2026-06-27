import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { QueryTypes, Sequelize } from 'sequelize';
import { SEQUELIZE } from '../database/database.constants';
import { CreateMediaAssetDto } from './media.schemas';

const allowedMimePrefixes: Record<string, string[]> = {
  image: ['image/'],
  video: ['video/'],
  audio: ['audio/'],
  document: ['application/pdf', 'text/plain']
};

@Injectable()
export class MediaService {
  constructor(@Inject(SEQUELIZE) private readonly sequelize: Sequelize) {}

  async list() {
    return this.sequelize.query(
      `SELECT id, media_type AS "mediaType", url, caption, alt_text AS "altText", mime_type AS "mimeType", size_bytes AS "sizeBytes", created_at AS "createdAt" FROM media_assets ORDER BY created_at DESC LIMIT 100`,
      { type: QueryTypes.SELECT }
    );
  }

  async create(dto: CreateMediaAssetDto, userId: string) {
    const allowed = allowedMimePrefixes[dto.mediaType].some((prefix) => dto.mimeType.startsWith(prefix));
    if (!allowed) throw new BadRequestException('mimeType is not compatible with mediaType');

    const [row] = await this.sequelize.query(
      `
      INSERT INTO media_assets (uploaded_by_user_id, media_type, url, caption, alt_text, mime_type, size_bytes)
      VALUES (:userId, :mediaType, :url, :caption, :altText, :mimeType, :sizeBytes)
      RETURNING id, media_type AS "mediaType", url, caption, alt_text AS "altText", mime_type AS "mimeType", size_bytes AS "sizeBytes", created_at AS "createdAt";
      `,
      { replacements: { userId, ...dto, caption: dto.caption ?? null, altText: dto.altText ?? null }, type: QueryTypes.SELECT }
    );
    return row;
  }
}
