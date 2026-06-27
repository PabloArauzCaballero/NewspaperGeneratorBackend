import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ZodError, ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe<TInput = unknown, TOutput = unknown> implements PipeTransform<TInput, TOutput> {
  constructor(private readonly schema: ZodSchema<TOutput>) {}

  transform(value: TInput): TOutput {
    try {
      return this.schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: 'Validation failed',
          issues: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message
          }))
        });
      }

      throw error;
    }
  }
}
