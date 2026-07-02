import { assertArray, assertAtLeast, createTypedSmokeRuntime } from './runtime';

async function main() {
  const runtime = createTypedSmokeRuntime();
  const session = await runtime.login();
  runtime.setToken(session.accessToken);

  const summary = await runtime.clients.businessLifecycle.getSummary(
    session.accessToken,
  );
  assertAtLeast(summary.customers, 1, 'business lifecycle customers');
  assertAtLeast(summary.availablePool, 1, 'business lifecycle available pool');

  const pool = await runtime.clients.businessLifecycle.listPoolEntries(
    session.accessToken,
    { page: 1, pageSize: 10 },
  );
  assertArray(pool.items, 'business lifecycle pool items');
  assertAtLeast(pool.total, 1, 'business lifecycle pool total');

  const customers = await runtime.clients.businessLifecycle.listCustomers(
    session.accessToken,
    { page: 1, pageSize: 10 },
  );
  assertArray(customers.items, 'business lifecycle customer items');
  assertAtLeast(customers.total, 1, 'business lifecycle customer total');

  const firstCustomer = customers.items[0];
  if (!firstCustomer) {
    throw new Error('Expected at least one business lifecycle customer.');
  }
  const timeline = await runtime.clients.businessLifecycle.listCustomerTimeline(
    session.accessToken,
    firstCustomer.id,
    { page: 1, pageSize: 10 },
  );
  assertArray(timeline.items, 'business lifecycle timeline items');

  const events = await runtime.clients.businessLifecycle.listLifecycleEvents(
    session.accessToken,
    { page: 1, pageSize: 10 },
  );
  assertArray(events.items, 'business lifecycle event items');

  const duplicates =
    await runtime.clients.businessLifecycle.listDuplicateGroups(
      session.accessToken,
      { page: 1, pageSize: 10 },
    );
  assertArray(duplicates.items, 'business lifecycle duplicate groups');
}

void main();
