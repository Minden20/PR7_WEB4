import fs from 'node:fs';

const BASE = process.env.BASE_URL ?? 'http://localhost:4000';
const [, , outFile = 'demo.json', phase = 'main'] = process.argv;
const log = [];

async function call(name, method, path, body) {
  const started = Date.now();
  const res = await fetch(BASE + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const entry = {
    name,
    method,
    url: BASE + path,
    requestBody: body ?? null,
    status: res.status,
    statusText: res.statusText,
    time: Date.now() - started,
    size: Buffer.byteLength(text),
    responseBody: text ? JSON.parse(text) : null,
  };
  log.push(entry);
  console.log(`${method} ${path} -> ${res.status}`);
  return entry.responseBody;
}

if (phase === 'main') {
  const extra = [
    { title: 'Рамен з куркою теріякі', price: 265.5, weightGrams: 450, calories: 610, isSpicy: true, category: 'soup' },
    { title: 'Салат Цезар з куркою', price: 210, weightGrams: 280, calories: 450, isSpicy: false, category: 'salad' },
    { title: 'Чізкейк Нью-Йорк', price: 145.9, weightGrams: 150, calories: 420, isSpicy: false, category: 'dessert' },
  ];
  const created = await call('create', 'POST', '/dishes', extra[0]);
  for (const d of extra.slice(1)) await call('create-more', 'POST', '/dishes', d);

  await call('list-default', 'GET', '/dishes');
  await call('list-page', 'GET', '/dishes?page=2&limit=2&sortBy=price&order=ASC');
  await call('find-one', 'GET', `/dishes/${created.id}`);
  await call('update', 'PATCH', `/dishes/${created.id}`, { price: 279.99, isSpicy: false });
  await call('validation-error', 'POST', '/dishes', {
    title: 'Дуже дорога страва',
    price: 12.345,
    weightGrams: 5.5,
    calories: -1,
    isSpicy: 'yes',
    category: 'burger',
  });
  await call('not-found', 'GET', '/dishes/00000000-0000-4000-8000-000000000000');
  await call('soft-delete', 'DELETE', `/dishes/${created.id}`);
  await call('get-after-delete', 'GET', `/dishes/${created.id}`);
  await call('deleted-list', 'GET', '/dishes/deleted');
  await call('restore', 'PATCH', `/dishes/${created.id}/restore`);
  
  const list = await call('list-for-delete', 'GET', '/dishes?search=чізкейк');
  await call('soft-delete-2', 'DELETE', `/dishes/${list.data[0].id}`);
} else {
  await call('after-restart', 'GET', '/dishes?limit=10&sortBy=createdAt&order=DESC');
}

fs.writeFileSync(outFile, JSON.stringify(log, null, 2));
