import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Sequelize } from 'sequelize';
import { SEQUELIZE } from './database.constants';

@Global()
@Module({
  providers: [
    {
      provide: SEQUELIZE,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService): Promise<Sequelize> => {
        const databaseUrl = configService.getOrThrow<string>('DATABASE_URL');
        const useSsl = configService.get<boolean>('DATABASE_SSL', false);

        const sequelize = new Sequelize(databaseUrl, {
          dialect: 'postgres',
          logging: configService.get<string>('NODE_ENV') === 'development' ? false : false,
          dialectOptions: useSsl
            ? {
                ssl: {
                  require: true,
                  rejectUnauthorized: false
                }
              }
            : {}
        });

        await sequelize.authenticate();
        return sequelize;
      }
    }
  ],
  exports: [SEQUELIZE]
})
export class DatabaseModule {}
