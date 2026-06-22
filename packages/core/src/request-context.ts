import { AsyncLocalStorage } from 'node:async_hooks';

export type RequestContext = {
  requestId: string;
  traceId: string;
  actorUserId?: string;
  accessMode?: string;
  membershipId?: string;
  tenantId?: string;
};

const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(
  context: RequestContext,
  callback: () => T,
): T {
  return requestContextStorage.run(context, callback);
}

export function getRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}

export function setRequestActorContext(
  context: Pick<
    RequestContext,
    'accessMode' | 'actorUserId' | 'membershipId' | 'tenantId'
  >,
): void {
  const store = requestContextStorage.getStore();

  if (!store) {
    return;
  }

  Object.assign(store, context);
}
