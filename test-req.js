import { AppDataSource } from './src/database/data-source.js';
import { RequestTypeEntity } from './src/models/entities/request-type.entity.js';

async function test() {
  await AppDataSource.initialize();
  const res = await AppDataSource.getRepository(RequestTypeEntity).find();
  console.log(res);
  process.exit(0);
}
test();
