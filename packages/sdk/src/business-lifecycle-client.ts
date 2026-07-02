import type { SdkRequest } from './rbac-client';
import type {
  AssignBusinessPoolEntryRequest,
  BusinessAssignmentEventPage,
  BusinessAssignmentEventQueryRequest,
  BusinessDuplicateGroupPage,
  BusinessLifecycleCustomerPage,
  BusinessLifecycleCustomerQueryRequest,
  BusinessLifecycleCustomerSummary,
  BusinessLifecycleEventPage,
  BusinessLifecycleEventQueryRequest,
  BusinessLifecycleExportPreview,
  BusinessLifecycleExportQueryRequest,
  BusinessLifecycleSummary,
  BusinessLifecycleTimelinePage,
  BusinessPoolEntryPage,
  BusinessPoolEntryQueryRequest,
  BusinessPoolEntrySummary,
  ChangeBusinessLifecycleStageRequest,
  ClaimBusinessPoolEntryRequest,
  EnterBusinessPoolRequest,
  RecycleBusinessPoolEntryRequest,
} from './business-lifecycle-types';

export type BusinessLifecycleClient = {
  getSummary: (token: string) => Promise<BusinessLifecycleSummary>;
  exportBusinessLifecycle: (
    token: string,
    query: BusinessLifecycleExportQueryRequest,
  ) => Promise<BusinessLifecycleExportPreview>;
  listPoolEntries: (
    token: string,
    query?: BusinessPoolEntryQueryRequest,
  ) => Promise<BusinessPoolEntryPage>;
  enterPool: (
    token: string,
    body: EnterBusinessPoolRequest,
  ) => Promise<BusinessPoolEntrySummary>;
  claimPoolEntry: (
    token: string,
    id: string,
    body: ClaimBusinessPoolEntryRequest,
  ) => Promise<BusinessPoolEntrySummary>;
  assignPoolEntry: (
    token: string,
    id: string,
    body: AssignBusinessPoolEntryRequest,
  ) => Promise<BusinessPoolEntrySummary>;
  transferPoolEntry: (
    token: string,
    id: string,
    body: AssignBusinessPoolEntryRequest,
  ) => Promise<BusinessPoolEntrySummary>;
  recyclePoolEntry: (
    token: string,
    id: string,
    body: RecycleBusinessPoolEntryRequest,
  ) => Promise<BusinessPoolEntrySummary>;
  listCustomers: (
    token: string,
    query?: BusinessLifecycleCustomerQueryRequest,
  ) => Promise<BusinessLifecycleCustomerPage>;
  changeCustomerStage: (
    token: string,
    id: string,
    body: ChangeBusinessLifecycleStageRequest,
  ) => Promise<BusinessLifecycleCustomerSummary>;
  listCustomerTimeline: (
    token: string,
    id: string,
    query?: BusinessLifecycleEventQueryRequest,
  ) => Promise<BusinessLifecycleTimelinePage>;
  listAssignmentEvents: (
    token: string,
    query?: BusinessAssignmentEventQueryRequest,
  ) => Promise<BusinessAssignmentEventPage>;
  listLifecycleEvents: (
    token: string,
    query?: BusinessLifecycleEventQueryRequest,
  ) => Promise<BusinessLifecycleEventPage>;
  listDuplicateGroups: (
    token: string,
    query?: BusinessPoolEntryQueryRequest,
  ) => Promise<BusinessDuplicateGroupPage>;
};

export function createBusinessLifecycleClient(
  request: SdkRequest,
): BusinessLifecycleClient {
  return {
    getSummary: (token) =>
      request<BusinessLifecycleSummary>('/business/lifecycle/summary', {
        token,
      }),
    exportBusinessLifecycle: (token, query) =>
      request<BusinessLifecycleExportPreview>(
        withQuery('/business/lifecycle/export', query),
        { token },
      ),
    listPoolEntries: (token, query) =>
      request<BusinessPoolEntryPage>(
        withQuery('/business/lifecycle/pool', query),
        { token },
      ),
    enterPool: (token, body) =>
      request<BusinessPoolEntrySummary>('/business/lifecycle/pool', {
        body,
        method: 'POST',
        token,
      }),
    claimPoolEntry: (token, id, body) =>
      request<BusinessPoolEntrySummary>(
        `/business/lifecycle/pool/${encodeURIComponent(id)}/claim`,
        { body, method: 'PATCH', token },
      ),
    assignPoolEntry: (token, id, body) =>
      request<BusinessPoolEntrySummary>(
        `/business/lifecycle/pool/${encodeURIComponent(id)}/assign`,
        { body, method: 'PATCH', token },
      ),
    transferPoolEntry: (token, id, body) =>
      request<BusinessPoolEntrySummary>(
        `/business/lifecycle/pool/${encodeURIComponent(id)}/transfer`,
        { body, method: 'PATCH', token },
      ),
    recyclePoolEntry: (token, id, body) =>
      request<BusinessPoolEntrySummary>(
        `/business/lifecycle/pool/${encodeURIComponent(id)}/recycle`,
        { body, method: 'PATCH', token },
      ),
    listCustomers: (token, query) =>
      request<BusinessLifecycleCustomerPage>(
        withQuery('/business/lifecycle/customers', query),
        { token },
      ),
    changeCustomerStage: (token, id, body) =>
      request<BusinessLifecycleCustomerSummary>(
        `/business/lifecycle/customers/${encodeURIComponent(id)}/stage`,
        { body, method: 'PATCH', token },
      ),
    listCustomerTimeline: (token, id, query) =>
      request<BusinessLifecycleTimelinePage>(
        withQuery(
          `/business/lifecycle/customers/${encodeURIComponent(id)}/timeline`,
          query,
        ),
        { token },
      ),
    listAssignmentEvents: (token, query) =>
      request<BusinessAssignmentEventPage>(
        withQuery('/business/lifecycle/assignment-events', query),
        { token },
      ),
    listLifecycleEvents: (token, query) =>
      request<BusinessLifecycleEventPage>(
        withQuery('/business/lifecycle/events', query),
        { token },
      ),
    listDuplicateGroups: (token, query) =>
      request<BusinessDuplicateGroupPage>(
        withQuery('/business/lifecycle/duplicates', query),
        { token },
      ),
  };
}

function withQuery(
  path: `/${string}`,
  query: Record<string, unknown> | undefined,
): `/${string}` {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const search = params.toString();

  return search ? `${path}?${search}` : path;
}
