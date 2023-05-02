import { inject } from '@loopback/core';
import { juggler } from '@loopback/repository';

const config = {
  name: 'memory',
  connector: 'memory',
};

export class MemoryDataSource extends juggler.DataSource {
  static dataSourceName = 'db';

  static readonly defaultConfig = config;

  constructor(
    @inject('datasources.config.memory', { optional: true })
    dsConfig: object = config,
  ) {
    super(dsConfig);
  }
}
