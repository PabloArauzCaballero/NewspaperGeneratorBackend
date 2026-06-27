import fs from 'node:fs';
import path from 'node:path';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function readJson(filePath: string): unknown {
  const absolute = path.resolve(filePath);
  assert(fs.existsSync(absolute), `Missing file: ${filePath}`);
  const raw = fs.readFileSync(absolute, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON in ${filePath}: ${(error as Error).message}`);
  }
}

function main() {
  const collection = readJson('postman/NewspaperGeneratorBackend.postman_collection.json') as Record<string, any>;
  const environment = readJson('postman/NewspaperGeneratorBackend.local.postman_environment.json') as Record<string, any>;

  assert(collection.info?.name, 'Postman collection must include info.name');
  assert(collection.info?.schema, 'Postman collection must include info.schema');
  assert(Array.isArray(collection.item) && collection.item.length > 0, 'Postman collection must include at least one folder/item');
  assert(Array.isArray(environment.values), 'Postman environment must include values array');
  assert(environment.values.some((item: any) => item?.key === 'baseUrl'), 'Postman environment must include baseUrl');

  console.log('Postman JSON validation OK');
}

main();
