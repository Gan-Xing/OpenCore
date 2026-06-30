import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { getRequestContext } from '@opencore/core';
import { PrismaService } from '@opencore/database';
import type {
  ChangeCrmOpportunityStageDto,
  CompleteCrmTaskDto,
  ConvertCrmLeadDto,
  CreateCrmAttachmentDto,
  CreateCrmContactDto,
  CreateCrmCustomerDto,
  CreateCrmFollowUpDto,
  CreateCrmLeadDto,
  CreateCrmOpportunityDto,
  CreateCrmTagDto,
  CreateCrmTaskDto,
  CrmAttachmentDto,
  CrmAttachmentPageDto,
  CrmAuditEventDto,
  CrmAuditEventPageDto,
  CrmContactDto,
  CrmContactPageDto,
  CrmContactQueryDto,
  CrmCustomerDto,
  CrmCustomerPageDto,
  CrmCustomerQueryDto,
  CrmExportPreviewDto,
  CrmExportQueryDto,
  CrmFollowUpDto,
  CrmFollowUpPageDto,
  CrmLeadDto,
  CrmLeadPageDto,
  CrmLeadQueryDto,
  CrmOpportunityDto,
  CrmOpportunityPageDto,
  CrmOpportunityQueryDto,
  CrmOwnerTransferDto,
  CrmOwnerTransferPageDto,
  CrmSummaryDto,
  CrmTagDto,
  CrmTagPageDto,
  CrmTagQueryDto,
  CrmTargetQueryDto,
  CrmTargetType,
  CrmTaskDto,
  CrmTaskPageDto,
  CrmTaskQueryDto,
  TransferCrmOwnerDto,
  UpdateCrmContactDto,
  UpdateCrmCustomerDto,
  UpdateCrmLeadDto,
  UpdateCrmOpportunityDto,
  UpdateCrmTagDto,
} from './crm.dto';
import {
  CRM_CUSTOMER_STATUSES,
  CRM_FOLLOW_UP_METHODS,
  CRM_LEAD_STATUSES,
  CRM_OPPORTUNITY_STAGES,
  CRM_TARGET_TYPES,
  CRM_TASK_PRIORITIES,
  CRM_TASK_STATUSES,
} from './crm.dto';
import {
  createCrmPage,
  crmBadRequest,
  CrmRepository,
  crmNotFound,
} from './crm.repository';

const ROOT_TENANT_ID = 'tenant_root';
const CSV_CONTENT_TYPE = 'text/csv;charset=utf-8';

const CUSTOMER_INCLUDE = {
  _count: {
    select: {
      contacts: true,
      opportunities: true,
    },
  },
};
const CONTACT_INCLUDE = { customer: true };
const OPPORTUNITY_INCLUDE = { customer: true };

type CrmCustomerRow = Prisma.CrmCustomerGetPayload<{
  include: typeof CUSTOMER_INCLUDE;
}>;
type CrmContactRow = Prisma.CrmContactGetPayload<{
  include: typeof CONTACT_INCLUDE;
}>;
type CrmOpportunityRow = Prisma.CrmOpportunityGetPayload<{
  include: typeof OPPORTUNITY_INCLUDE;
}>;

@Injectable()
export class PrismaCrmRepository extends CrmRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getSummary(): Promise<CrmSummaryDto> {
    const tenantId = resolveCurrentTenantId();
    const [leads, customers, contacts, opportunities, tasks] =
      await Promise.all([
        this.prisma.crmLead.findMany({ where: { tenantId, archivedAt: null } }),
        this.prisma.crmCustomer.findMany({
          where: { tenantId, archivedAt: null },
        }),
        this.prisma.crmContact.findMany({
          where: { tenantId, archivedAt: null },
        }),
        this.prisma.crmOpportunity.findMany({
          where: { tenantId, archivedAt: null },
        }),
        this.prisma.crmTask.findMany({ where: { tenantId } }),
      ]);
    const now = Date.now();
    const openOpportunities = opportunities.filter(
      (opportunity) => !['won', 'lost'].includes(opportunity.stage),
    );
    const openTasks = tasks.filter((task) => task.status === 'open');

    return {
      leads: leads.length,
      customers: customers.length,
      contacts: contacts.length,
      opportunities: opportunities.length,
      openTasks: openTasks.length,
      overdueTasks: openTasks.filter(
        (task) => task.dueAt !== null && task.dueAt.getTime() < now,
      ).length,
      openPipelineAmount: openOpportunities
        .reduce(
          (sum, opportunity) => sum.plus(opportunity.amount),
          new Prisma.Decimal(0),
        )
        .toFixed(2),
      leadsByStatus: countBuckets(leads.map((lead) => lead.status)),
      customersByLevel: countBuckets(
        customers.map((customer) => customer.level),
      ),
      opportunitiesByStage: countBuckets(
        opportunities.map((opportunity) => opportunity.stage),
      ),
    };
  }

  async exportCrm(query: CrmExportQueryDto): Promise<CrmExportPreviewDto> {
    const resource = normalizeOptionalText(query.resource);
    if (!resource) {
      throw crmBadRequest(
        'INDUSTRY_CRM_EXPORT_RESOURCE_REQUIRED',
        'CRM export resource is required.',
      );
    }

    if (resource === 'leads') {
      const page = await this.listLeads(query);
      return createCsvExportPreview(
        'opencore-crm-leads.csv',
        ['number', 'name', 'company', 'status', 'source', 'owner', 'createdAt'],
        page.items.map((row) => [
          row.number,
          row.name,
          row.company ?? '',
          row.status,
          row.source,
          row.owner,
          row.createdAt,
        ]),
      );
    }

    if (resource === 'customers') {
      const page = await this.listCustomers(query);
      return createCsvExportPreview(
        'opencore-crm-customers.csv',
        ['number', 'name', 'status', 'level', 'source', 'owner', 'createdAt'],
        page.items.map((row) => [
          row.number,
          row.name,
          row.status,
          row.level,
          row.source,
          row.owner,
          row.createdAt,
        ]),
      );
    }

    if (resource === 'contacts') {
      const page = await this.listContacts(query);
      return createCsvExportPreview(
        'opencore-crm-contacts.csv',
        ['name', 'customerName', 'title', 'mobile', 'email', 'owner'],
        page.items.map((row) => [
          row.name,
          row.customerName ?? '',
          row.title ?? '',
          row.mobile ?? '',
          row.email ?? '',
          row.owner,
        ]),
      );
    }

    if (resource === 'opportunities') {
      const page = await this.listOpportunities(query);
      return createCsvExportPreview(
        'opencore-crm-opportunities.csv',
        [
          'number',
          'name',
          'customerName',
          'stage',
          'amount',
          'probability',
          'owner',
        ],
        page.items.map((row) => [
          row.number,
          row.name,
          row.customerName ?? '',
          row.stage,
          row.amount,
          String(row.probability),
          row.owner,
        ]),
      );
    }

    if (resource === 'tasks') {
      const page = await this.listTasks(query);
      return createCsvExportPreview(
        'opencore-crm-tasks.csv',
        ['title', 'targetType', 'targetId', 'assignee', 'status', 'dueAt'],
        page.items.map((row) => [
          row.title,
          row.targetType,
          row.targetId,
          row.assignee,
          row.status,
          row.dueAt ?? '',
        ]),
      );
    }

    throw crmBadRequest(
      'INDUSTRY_CRM_EXPORT_RESOURCE_INVALID',
      'CRM export resource is invalid.',
      { resource },
    );
  }

  async listTags(query: CrmTagQueryDto = {}): Promise<CrmTagPageDto> {
    const tenantId = resolveCurrentTenantId();
    const enabled = parseOptionalBoolean(query.enabled);
    const rows = await this.prisma.crmTag.findMany({
      where: { tenantId, ...(enabled === undefined ? {} : { enabled }) },
      orderBy: [{ enabled: 'desc' }, { name: 'asc' }, { id: 'asc' }],
    });

    return createCrmPage(rows.map(toTagRecord), query);
  }

  async createTag(body: CreateCrmTagDto): Promise<CrmTagDto> {
    const tenantId = resolveCurrentTenantId();
    const tag = await this.prisma.crmTag.create({
      data: {
        tenantId,
        code: requireText(body.code, 'code'),
        name: requireText(body.name, 'name'),
        color: normalizeOptionalText(body.color),
        description: normalizeOptionalText(body.description),
        enabled: body.enabled ?? true,
      },
    });

    return toTagRecord(tag);
  }

  async updateTag(id: string, body: UpdateCrmTagDto): Promise<CrmTagDto> {
    const tenantId = resolveCurrentTenantId();
    await this.findTag(id);
    const tag = await this.prisma.crmTag.update({
      where: { tenantId_id: { tenantId, id } },
      data: {
        ...(body.code === undefined
          ? {}
          : { code: requireText(body.code, 'code') }),
        ...(body.name === undefined
          ? {}
          : { name: requireText(body.name, 'name') }),
        ...(body.color === undefined
          ? {}
          : { color: normalizeNullableText(body.color) }),
        ...(body.description === undefined
          ? {}
          : { description: normalizeNullableText(body.description) }),
        ...(body.enabled === undefined ? {} : { enabled: body.enabled }),
      },
    });

    return toTagRecord(tag);
  }

  async listLeads(query: CrmLeadQueryDto = {}): Promise<CrmLeadPageDto> {
    const tenantId = resolveCurrentTenantId();
    const rows = await this.prisma.crmLead.findMany({
      where: buildLeadWhere(tenantId, query),
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });

    return createCrmPage(rows.map(toLeadRecord), query);
  }

  async getLead(id: string): Promise<CrmLeadDto> {
    return this.findLead(id);
  }

  async createLead(body: CreateCrmLeadDto): Promise<CrmLeadDto> {
    const tenantId = resolveCurrentTenantId();
    const tags = await this.normalizeTags(tenantId, body.tags);
    const lead = await this.prisma.crmLead.create({
      data: {
        tenantId,
        number: createCrmNumber('LEAD'),
        name: requireText(body.name, 'name'),
        company: normalizeOptionalText(body.company),
        mobile: normalizeOptionalText(body.mobile),
        email: normalizeOptionalText(body.email),
        source: requireText(body.source, 'source'),
        status: 'new',
        rating: normalizeOptionalText(body.rating) ?? 'warm',
        owner: requireText(body.owner, 'owner'),
        tags,
        remark: normalizeOptionalText(body.remark),
        nextContactAt: parseOptionalDate(body.nextContactAt, 'nextContactAt'),
      },
    });
    await this.writeAudit(
      tenantId,
      'lead',
      lead.id,
      'create-lead',
      lead.owner,
      {
        number: lead.number,
      },
    );

    return toLeadRecord(lead);
  }

  async updateLead(id: string, body: UpdateCrmLeadDto): Promise<CrmLeadDto> {
    const tenantId = resolveCurrentTenantId();
    await this.findLead(id);
    const tags =
      body.tags === undefined
        ? undefined
        : await this.normalizeTags(tenantId, body.tags);
    const lead = await this.prisma.crmLead.update({
      where: { tenantId_id: { tenantId, id } },
      data: {
        ...(body.name === undefined
          ? {}
          : { name: requireText(body.name, 'name') }),
        ...(body.company === undefined
          ? {}
          : { company: normalizeNullableText(body.company) }),
        ...(body.mobile === undefined
          ? {}
          : { mobile: normalizeNullableText(body.mobile) }),
        ...(body.email === undefined
          ? {}
          : { email: normalizeNullableText(body.email) }),
        ...(body.source === undefined
          ? {}
          : { source: requireText(body.source, 'source') }),
        ...(body.status === undefined
          ? {}
          : { status: parseChoice(body.status, CRM_LEAD_STATUSES, 'status') }),
        ...(body.rating === undefined
          ? {}
          : { rating: requireText(body.rating, 'rating') }),
        ...(body.owner === undefined
          ? {}
          : { owner: requireText(body.owner, 'owner') }),
        ...(tags === undefined ? {} : { tags }),
        ...(body.remark === undefined
          ? {}
          : { remark: normalizeNullableText(body.remark) }),
        ...(body.nextContactAt === undefined
          ? {}
          : {
              nextContactAt: parseNullableDate(
                body.nextContactAt,
                'nextContactAt',
              ),
            }),
      },
    });
    await this.writeAudit(tenantId, 'lead', id, 'update-lead', lead.owner);

    return toLeadRecord(lead);
  }

  async convertLead(id: string, body: ConvertCrmLeadDto) {
    const tenantId = resolveCurrentTenantId();
    const lead = await this.findLead(id);
    if (lead.convertedAt || lead.status === 'converted') {
      throw crmBadRequest(
        'INDUSTRY_CRM_LEAD_ALREADY_CONVERTED',
        'CRM lead is already converted.',
        { id },
      );
    }

    const actor = requireText(body.actor, 'actor');
    const customer = await this.prisma.crmCustomer.create({
      data: {
        tenantId,
        number: createCrmNumber('CUS'),
        name:
          normalizeOptionalText(body.customerName) ?? lead.company ?? lead.name,
        owner: lead.owner,
        status: 'active',
        level: 'standard',
        source: lead.source,
        phone: lead.mobile,
        email: lead.email,
        tags: toJsonArray(lead.tags),
        remark: lead.remark,
        nextContactAt: parseOptionalDate(lead.nextContactAt, 'nextContactAt'),
        lastFollowedAt: parseOptionalDate(
          lead.lastFollowedAt,
          'lastFollowedAt',
        ),
      },
      include: CUSTOMER_INCLUDE,
    });
    await this.prisma.crmContact.create({
      data: {
        tenantId,
        customerId: customer.id,
        name: lead.name,
        mobile: lead.mobile,
        email: lead.email,
        owner: lead.owner,
        primary: true,
      },
    });

    const opportunityName = normalizeOptionalText(body.opportunityName);
    const opportunity = opportunityName
      ? await this.prisma.crmOpportunity.create({
          data: {
            tenantId,
            customerId: customer.id,
            number: createCrmNumber('OPP'),
            name: opportunityName,
            owner: lead.owner,
            stage: 'qualification',
            amount: parseMoney(body.amount ?? '0'),
            probability: 10,
            tags: toJsonArray(lead.tags),
          },
          include: OPPORTUNITY_INCLUDE,
        })
      : undefined;

    await this.prisma.crmLead.update({
      where: { tenantId_id: { tenantId, id } },
      data: {
        status: 'converted',
        convertedAt: new Date(),
        convertedCustomerId: customer.id,
        convertedOpportunityId: opportunity?.id ?? null,
      },
    });
    await this.writeAudit(tenantId, 'lead', id, 'convert-lead', actor, {
      customerId: customer.id,
      opportunityId: opportunity?.id,
    });

    return {
      lead: await this.findLead(id),
      customer: toCustomerRecord(customer),
      opportunity: opportunity ? toOpportunityRecord(opportunity) : undefined,
    };
  }

  async transferLeadOwner(
    id: string,
    body: TransferCrmOwnerDto,
  ): Promise<CrmLeadDto> {
    const tenantId = resolveCurrentTenantId();
    const existing = await this.findLead(id);
    const toOwner = requireText(body.toOwner, 'toOwner');
    const actor = requireText(body.actor, 'actor');
    await this.prisma.crmLead.update({
      where: { tenantId_id: { tenantId, id } },
      data: { owner: toOwner },
    });
    await this.writeTransfer(tenantId, 'lead', id, existing.owner, body);
    await this.writeAudit(tenantId, 'lead', id, 'transfer-lead', actor, {
      fromOwner: existing.owner,
      toOwner,
    });

    return this.findLead(id);
  }

  async archiveLead(id: string): Promise<{ deleted: true }> {
    const tenantId = resolveCurrentTenantId();
    await this.findLead(id);
    await this.prisma.crmLead.update({
      where: { tenantId_id: { tenantId, id } },
      data: { archivedAt: new Date(), status: 'archived' },
    });
    await this.writeAudit(tenantId, 'lead', id, 'archive-lead', 'system');

    return { deleted: true };
  }

  async listCustomers(
    query: CrmCustomerQueryDto = {},
  ): Promise<CrmCustomerPageDto> {
    const tenantId = resolveCurrentTenantId();
    const rows = await this.prisma.crmCustomer.findMany({
      where: buildCustomerWhere(tenantId, query),
      include: CUSTOMER_INCLUDE,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });

    return createCrmPage(rows.map(toCustomerRecord), query);
  }

  async getCustomer(id: string): Promise<CrmCustomerDto> {
    return this.findCustomer(id);
  }

  async createCustomer(body: CreateCrmCustomerDto): Promise<CrmCustomerDto> {
    const tenantId = resolveCurrentTenantId();
    const tags = await this.normalizeTags(tenantId, body.tags);
    const customer = await this.prisma.crmCustomer.create({
      data: {
        tenantId,
        number: createCrmNumber('CUS'),
        name: requireText(body.name, 'name'),
        owner: requireText(body.owner, 'owner'),
        status: parseChoice(
          body.status ?? 'active',
          CRM_CUSTOMER_STATUSES,
          'status',
        ),
        level: normalizeOptionalText(body.level) ?? 'standard',
        source: requireText(body.source, 'source'),
        industry: normalizeOptionalText(body.industry),
        region: normalizeOptionalText(body.region),
        website: normalizeOptionalText(body.website),
        phone: normalizeOptionalText(body.phone),
        email: normalizeOptionalText(body.email),
        address: normalizeOptionalText(body.address),
        tags,
        remark: normalizeOptionalText(body.remark),
        nextContactAt: parseOptionalDate(body.nextContactAt, 'nextContactAt'),
      },
      include: CUSTOMER_INCLUDE,
    });
    await this.writeAudit(
      tenantId,
      'customer',
      customer.id,
      'create-customer',
      customer.owner,
      { number: customer.number },
    );

    return toCustomerRecord(customer);
  }

  async updateCustomer(
    id: string,
    body: UpdateCrmCustomerDto,
  ): Promise<CrmCustomerDto> {
    const tenantId = resolveCurrentTenantId();
    await this.findCustomer(id);
    const tags =
      body.tags === undefined
        ? undefined
        : await this.normalizeTags(tenantId, body.tags);
    const customer = await this.prisma.crmCustomer.update({
      where: { tenantId_id: { tenantId, id } },
      data: {
        ...(body.name === undefined
          ? {}
          : { name: requireText(body.name, 'name') }),
        ...(body.owner === undefined
          ? {}
          : { owner: requireText(body.owner, 'owner') }),
        ...(body.status === undefined
          ? {}
          : {
              status: parseChoice(body.status, CRM_CUSTOMER_STATUSES, 'status'),
            }),
        ...(body.level === undefined
          ? {}
          : { level: requireText(body.level, 'level') }),
        ...(body.source === undefined
          ? {}
          : { source: requireText(body.source, 'source') }),
        ...(body.industry === undefined
          ? {}
          : { industry: normalizeNullableText(body.industry) }),
        ...(body.region === undefined
          ? {}
          : { region: normalizeNullableText(body.region) }),
        ...(body.website === undefined
          ? {}
          : { website: normalizeNullableText(body.website) }),
        ...(body.phone === undefined
          ? {}
          : { phone: normalizeNullableText(body.phone) }),
        ...(body.email === undefined
          ? {}
          : { email: normalizeNullableText(body.email) }),
        ...(body.address === undefined
          ? {}
          : { address: normalizeNullableText(body.address) }),
        ...(tags === undefined ? {} : { tags }),
        ...(body.remark === undefined
          ? {}
          : { remark: normalizeNullableText(body.remark) }),
        ...(body.nextContactAt === undefined
          ? {}
          : {
              nextContactAt: parseNullableDate(
                body.nextContactAt,
                'nextContactAt',
              ),
            }),
      },
      include: CUSTOMER_INCLUDE,
    });
    await this.writeAudit(
      tenantId,
      'customer',
      id,
      'update-customer',
      customer.owner,
    );

    return toCustomerRecord(customer);
  }

  async transferCustomerOwner(
    id: string,
    body: TransferCrmOwnerDto,
  ): Promise<CrmCustomerDto> {
    const tenantId = resolveCurrentTenantId();
    const existing = await this.findCustomer(id);
    const toOwner = requireText(body.toOwner, 'toOwner');
    const actor = requireText(body.actor, 'actor');
    const customer = await this.prisma.crmCustomer.update({
      where: { tenantId_id: { tenantId, id } },
      data: { owner: toOwner },
      include: CUSTOMER_INCLUDE,
    });
    await this.writeTransfer(tenantId, 'customer', id, existing.owner, body);
    await this.writeAudit(
      tenantId,
      'customer',
      id,
      'transfer-customer',
      actor,
      {
        fromOwner: existing.owner,
        toOwner,
      },
    );

    return toCustomerRecord(customer);
  }

  async archiveCustomer(id: string): Promise<{ deleted: true }> {
    const tenantId = resolveCurrentTenantId();
    await this.findCustomer(id);
    await this.prisma.crmCustomer.update({
      where: { tenantId_id: { tenantId, id } },
      data: { archivedAt: new Date(), status: 'archived' },
    });
    await this.writeAudit(
      tenantId,
      'customer',
      id,
      'archive-customer',
      'system',
    );

    return { deleted: true };
  }

  async listContacts(
    query: CrmContactQueryDto = {},
  ): Promise<CrmContactPageDto> {
    const tenantId = resolveCurrentTenantId();
    const rows = await this.prisma.crmContact.findMany({
      where: buildContactWhere(tenantId, query),
      include: CONTACT_INCLUDE,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });

    return createCrmPage(rows.map(toContactRecord), query);
  }

  async getContact(id: string): Promise<CrmContactDto> {
    return this.findContact(id);
  }

  async createContact(body: CreateCrmContactDto): Promise<CrmContactDto> {
    const tenantId = resolveCurrentTenantId();
    const customer = await this.findCustomer(body.customerId);
    if (body.primary === true) {
      await this.prisma.crmContact.updateMany({
        where: { tenantId, customerId: body.customerId, primary: true },
        data: { primary: false },
      });
    }
    const contact = await this.prisma.crmContact.create({
      data: {
        tenantId,
        customerId: customer.id,
        name: requireText(body.name, 'name'),
        title: normalizeOptionalText(body.title),
        mobile: normalizeOptionalText(body.mobile),
        email: normalizeOptionalText(body.email),
        phone: normalizeOptionalText(body.phone),
        owner: normalizeOptionalText(body.owner) ?? customer.owner,
        decisionRole: normalizeOptionalText(body.decisionRole),
        primary: body.primary ?? false,
        remark: normalizeOptionalText(body.remark),
        nextContactAt: parseOptionalDate(body.nextContactAt, 'nextContactAt'),
      },
      include: CONTACT_INCLUDE,
    });
    await this.writeAudit(
      tenantId,
      'contact',
      contact.id,
      'create-contact',
      contact.owner,
    );

    return toContactRecord(contact);
  }

  async updateContact(
    id: string,
    body: UpdateCrmContactDto,
  ): Promise<CrmContactDto> {
    const tenantId = resolveCurrentTenantId();
    const existing = await this.findContact(id);
    if (body.primary === true) {
      await this.prisma.crmContact.updateMany({
        where: { tenantId, customerId: existing.customerId, primary: true },
        data: { primary: false },
      });
    }
    const contact = await this.prisma.crmContact.update({
      where: { tenantId_id: { tenantId, id } },
      data: {
        ...(body.name === undefined
          ? {}
          : { name: requireText(body.name, 'name') }),
        ...(body.title === undefined
          ? {}
          : { title: normalizeNullableText(body.title) }),
        ...(body.mobile === undefined
          ? {}
          : { mobile: normalizeNullableText(body.mobile) }),
        ...(body.email === undefined
          ? {}
          : { email: normalizeNullableText(body.email) }),
        ...(body.phone === undefined
          ? {}
          : { phone: normalizeNullableText(body.phone) }),
        ...(body.owner === undefined
          ? {}
          : { owner: requireText(body.owner, 'owner') }),
        ...(body.decisionRole === undefined
          ? {}
          : { decisionRole: normalizeNullableText(body.decisionRole) }),
        ...(body.primary === undefined ? {} : { primary: body.primary }),
        ...(body.remark === undefined
          ? {}
          : { remark: normalizeNullableText(body.remark) }),
        ...(body.nextContactAt === undefined
          ? {}
          : {
              nextContactAt: parseNullableDate(
                body.nextContactAt,
                'nextContactAt',
              ),
            }),
      },
      include: CONTACT_INCLUDE,
    });
    await this.writeAudit(
      tenantId,
      'contact',
      id,
      'update-contact',
      contact.owner,
    );

    return toContactRecord(contact);
  }

  async archiveContact(id: string): Promise<{ deleted: true }> {
    const tenantId = resolveCurrentTenantId();
    await this.findContact(id);
    await this.prisma.crmContact.update({
      where: { tenantId_id: { tenantId, id } },
      data: { archivedAt: new Date() },
    });
    await this.writeAudit(tenantId, 'contact', id, 'archive-contact', 'system');

    return { deleted: true };
  }

  async listOpportunities(
    query: CrmOpportunityQueryDto = {},
  ): Promise<CrmOpportunityPageDto> {
    const tenantId = resolveCurrentTenantId();
    const rows = await this.prisma.crmOpportunity.findMany({
      where: buildOpportunityWhere(tenantId, query),
      include: OPPORTUNITY_INCLUDE,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });

    return createCrmPage(rows.map(toOpportunityRecord), query);
  }

  async getOpportunity(id: string): Promise<CrmOpportunityDto> {
    return this.findOpportunity(id);
  }

  async createOpportunity(
    body: CreateCrmOpportunityDto,
  ): Promise<CrmOpportunityDto> {
    const tenantId = resolveCurrentTenantId();
    await this.findCustomer(body.customerId);
    const tags = await this.normalizeTags(tenantId, body.tags);
    const opportunity = await this.prisma.crmOpportunity.create({
      data: {
        tenantId,
        customerId: body.customerId,
        number: createCrmNumber('OPP'),
        name: requireText(body.name, 'name'),
        owner: requireText(body.owner, 'owner'),
        stage: parseChoice(
          body.stage ?? 'qualification',
          CRM_OPPORTUNITY_STAGES,
          'stage',
        ),
        amount: parseMoney(body.amount ?? '0'),
        probability: normalizeProbability(body.probability ?? 10),
        expectedCloseAt: parseOptionalDate(
          body.expectedCloseAt,
          'expectedCloseAt',
        ),
        tags,
        remark: normalizeOptionalText(body.remark),
      },
      include: OPPORTUNITY_INCLUDE,
    });
    await this.writeAudit(
      tenantId,
      'opportunity',
      opportunity.id,
      'create-opportunity',
      opportunity.owner,
    );

    return toOpportunityRecord(opportunity);
  }

  async updateOpportunity(
    id: string,
    body: UpdateCrmOpportunityDto,
  ): Promise<CrmOpportunityDto> {
    const tenantId = resolveCurrentTenantId();
    await this.findOpportunity(id);
    if (body.customerId !== undefined) {
      await this.findCustomer(body.customerId);
    }
    const tags =
      body.tags === undefined
        ? undefined
        : await this.normalizeTags(tenantId, body.tags);
    const opportunity = await this.prisma.crmOpportunity.update({
      where: { tenantId_id: { tenantId, id } },
      data: {
        ...(body.customerId === undefined
          ? {}
          : { customerId: body.customerId }),
        ...(body.name === undefined
          ? {}
          : { name: requireText(body.name, 'name') }),
        ...(body.owner === undefined
          ? {}
          : { owner: requireText(body.owner, 'owner') }),
        ...(body.stage === undefined
          ? {}
          : {
              stage: parseChoice(body.stage, CRM_OPPORTUNITY_STAGES, 'stage'),
            }),
        ...(body.amount === undefined
          ? {}
          : { amount: parseMoney(body.amount) }),
        ...(body.probability === undefined
          ? {}
          : { probability: normalizeProbability(body.probability) }),
        ...(body.expectedCloseAt === undefined
          ? {}
          : {
              expectedCloseAt: parseNullableDate(
                body.expectedCloseAt,
                'expectedCloseAt',
              ),
            }),
        ...(body.closeReason === undefined
          ? {}
          : { closeReason: normalizeNullableText(body.closeReason) }),
        ...(tags === undefined ? {} : { tags }),
        ...(body.remark === undefined
          ? {}
          : { remark: normalizeNullableText(body.remark) }),
      },
      include: OPPORTUNITY_INCLUDE,
    });
    await this.writeAudit(
      tenantId,
      'opportunity',
      id,
      'update-opportunity',
      opportunity.owner,
    );

    return toOpportunityRecord(opportunity);
  }

  async changeOpportunityStage(
    id: string,
    body: ChangeCrmOpportunityStageDto,
  ): Promise<CrmOpportunityDto> {
    const tenantId = resolveCurrentTenantId();
    const existing = await this.findOpportunity(id);
    const stage = parseChoice(body.stage, CRM_OPPORTUNITY_STAGES, 'stage');
    const actor = requireText(body.actor, 'actor');
    const opportunity = await this.prisma.crmOpportunity.update({
      where: { tenantId_id: { tenantId, id } },
      data: {
        stage,
        probability: getStageProbability(stage),
        closedAt: ['won', 'lost'].includes(stage) ? new Date() : null,
        closeReason:
          stage === 'lost'
            ? (normalizeOptionalText(body.closeReason) ?? 'lost')
            : stage === 'won'
              ? normalizeOptionalText(body.closeReason)
              : null,
      },
      include: OPPORTUNITY_INCLUDE,
    });
    await this.writeAudit(
      tenantId,
      'opportunity',
      id,
      'change-opportunity-stage',
      actor,
      { fromStage: existing.stage, toStage: stage },
    );

    return toOpportunityRecord(opportunity);
  }

  async transferOpportunityOwner(
    id: string,
    body: TransferCrmOwnerDto,
  ): Promise<CrmOpportunityDto> {
    const tenantId = resolveCurrentTenantId();
    const existing = await this.findOpportunity(id);
    const toOwner = requireText(body.toOwner, 'toOwner');
    const actor = requireText(body.actor, 'actor');
    const opportunity = await this.prisma.crmOpportunity.update({
      where: { tenantId_id: { tenantId, id } },
      data: { owner: toOwner },
      include: OPPORTUNITY_INCLUDE,
    });
    await this.writeTransfer(tenantId, 'opportunity', id, existing.owner, body);
    await this.writeAudit(
      tenantId,
      'opportunity',
      id,
      'transfer-opportunity',
      actor,
      { fromOwner: existing.owner, toOwner },
    );

    return toOpportunityRecord(opportunity);
  }

  async archiveOpportunity(id: string): Promise<{ deleted: true }> {
    const tenantId = resolveCurrentTenantId();
    await this.findOpportunity(id);
    await this.prisma.crmOpportunity.update({
      where: { tenantId_id: { tenantId, id } },
      data: { archivedAt: new Date() },
    });
    await this.writeAudit(
      tenantId,
      'opportunity',
      id,
      'archive-opportunity',
      'system',
    );

    return { deleted: true };
  }

  async listFollowUps(
    query: CrmTargetQueryDto = {},
  ): Promise<CrmFollowUpPageDto> {
    const tenantId = resolveCurrentTenantId();
    const rows = await this.prisma.crmFollowUp.findMany({
      where: buildTargetWhere(tenantId, query),
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });

    return createCrmPage(rows.map(toFollowUpRecord), query);
  }

  async createFollowUp(body: CreateCrmFollowUpDto): Promise<CrmFollowUpDto> {
    const tenantId = resolveCurrentTenantId();
    const targetType = parseTargetType(body.targetType);
    await this.ensureTarget(tenantId, targetType, body.targetId);
    const nextContactAt = parseOptionalDate(
      body.nextContactAt,
      'nextContactAt',
    );
    const followUp = await this.prisma.crmFollowUp.create({
      data: {
        tenantId,
        targetType,
        targetId: requireText(body.targetId, 'targetId'),
        method: parseChoice(body.method, CRM_FOLLOW_UP_METHODS, 'method'),
        content: requireText(body.content, 'content'),
        outcome: normalizeOptionalText(body.outcome),
        nextContactAt,
        createdBy: requireText(body.createdBy, 'createdBy'),
      },
    });
    await this.touchFollowUpTarget(
      tenantId,
      targetType,
      body.targetId,
      nextContactAt,
    );
    await this.writeAudit(
      tenantId,
      targetType,
      body.targetId,
      'create-follow-up',
      followUp.createdBy,
      { followUpId: followUp.id },
    );

    return toFollowUpRecord(followUp);
  }

  async listTasks(query: CrmTaskQueryDto = {}): Promise<CrmTaskPageDto> {
    const tenantId = resolveCurrentTenantId();
    const rows = await this.prisma.crmTask.findMany({
      where: buildTaskWhere(tenantId, query),
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }, { id: 'asc' }],
    });

    return createCrmPage(rows.map(toTaskRecord), query);
  }

  async createTask(body: CreateCrmTaskDto): Promise<CrmTaskDto> {
    const tenantId = resolveCurrentTenantId();
    const targetType = parseTargetType(body.targetType);
    await this.ensureTarget(tenantId, targetType, body.targetId);
    const task = await this.prisma.crmTask.create({
      data: {
        tenantId,
        targetType,
        targetId: requireText(body.targetId, 'targetId'),
        title: requireText(body.title, 'title'),
        assignee: requireText(body.assignee, 'assignee'),
        status: 'open',
        priority: parseChoice(
          body.priority ?? 'medium',
          CRM_TASK_PRIORITIES,
          'priority',
        ),
        dueAt: parseOptionalDate(body.dueAt, 'dueAt'),
        remark: normalizeOptionalText(body.remark),
        createdBy: requireText(body.createdBy, 'createdBy'),
      },
    });
    await this.writeAudit(
      tenantId,
      targetType,
      body.targetId,
      'create-task',
      task.createdBy,
      { taskId: task.id },
    );

    return toTaskRecord(task);
  }

  async completeTask(
    id: string,
    body: CompleteCrmTaskDto,
  ): Promise<CrmTaskDto> {
    const tenantId = resolveCurrentTenantId();
    const existing = await this.findTask(id);
    const actor = requireText(body.actor, 'actor');
    if (existing.status !== 'open') {
      return existing;
    }
    const task = await this.prisma.crmTask.update({
      where: { tenantId_id: { tenantId, id } },
      data: { status: 'done', completedAt: new Date() },
    });
    await this.writeAudit(
      tenantId,
      task.targetType as CrmTargetType,
      task.targetId,
      'complete-task',
      actor,
      { taskId: task.id },
    );

    return toTaskRecord(task);
  }

  async listAttachments(
    query: CrmTargetQueryDto = {},
  ): Promise<CrmAttachmentPageDto> {
    const tenantId = resolveCurrentTenantId();
    const rows = await this.prisma.crmAttachment.findMany({
      where: buildTargetWhere(tenantId, query),
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });

    return createCrmPage(rows.map(toAttachmentRecord), query);
  }

  async createAttachment(
    body: CreateCrmAttachmentDto,
  ): Promise<CrmAttachmentDto> {
    const tenantId = resolveCurrentTenantId();
    const targetType = parseTargetType(body.targetType);
    await this.ensureTarget(tenantId, targetType, body.targetId);
    const attachment = await this.prisma.crmAttachment.create({
      data: {
        tenantId,
        targetType,
        targetId: requireText(body.targetId, 'targetId'),
        originalName: requireText(body.originalName, 'originalName'),
        mimeType: requireText(body.mimeType, 'mimeType'),
        sizeBytes: normalizePositiveInteger(body.sizeBytes, 'sizeBytes'),
        storageKey: requireText(body.storageKey, 'storageKey'),
        uploadedBy: requireText(body.uploadedBy, 'uploadedBy'),
      },
    });
    await this.writeAudit(
      tenantId,
      targetType,
      body.targetId,
      'create-attachment',
      attachment.uploadedBy,
      { attachmentId: attachment.id },
    );

    return toAttachmentRecord(attachment);
  }

  async listOwnerTransfers(
    query: CrmTargetQueryDto = {},
  ): Promise<CrmOwnerTransferPageDto> {
    const tenantId = resolveCurrentTenantId();
    const rows = await this.prisma.crmOwnerTransfer.findMany({
      where: buildTargetWhere(tenantId, query),
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });

    return createCrmPage(rows.map(toOwnerTransferRecord), query);
  }

  async listAuditEvents(
    query: CrmTargetQueryDto = {},
  ): Promise<CrmAuditEventPageDto> {
    const tenantId = resolveCurrentTenantId();
    const rows = await this.prisma.crmAuditEvent.findMany({
      where: buildTargetWhere(tenantId, query),
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });

    return createCrmPage(rows.map(toAuditEventRecord), query);
  }

  private async findTag(id: string): Promise<CrmTagDto> {
    const tenantId = resolveCurrentTenantId();
    const tag = await this.prisma.crmTag.findUnique({
      where: { tenantId_id: { tenantId, id } },
    });
    if (!tag) {
      throw crmNotFound('INDUSTRY_CRM_TAG_NOT_FOUND', 'CRM tag not found.', {
        id,
      });
    }

    return toTagRecord(tag);
  }

  private async findLead(id: string): Promise<CrmLeadDto> {
    const tenantId = resolveCurrentTenantId();
    const lead = await this.prisma.crmLead.findUnique({
      where: { tenantId_id: { tenantId, id } },
    });
    if (!lead) {
      throw crmNotFound('INDUSTRY_CRM_LEAD_NOT_FOUND', 'CRM lead not found.', {
        id,
      });
    }

    return toLeadRecord(lead);
  }

  private async findCustomer(id: string): Promise<CrmCustomerDto> {
    const tenantId = resolveCurrentTenantId();
    const customer = await this.prisma.crmCustomer.findUnique({
      where: { tenantId_id: { tenantId, id } },
      include: CUSTOMER_INCLUDE,
    });
    if (!customer) {
      throw crmNotFound(
        'INDUSTRY_CRM_CUSTOMER_NOT_FOUND',
        'CRM customer not found.',
        { id },
      );
    }

    return toCustomerRecord(customer);
  }

  private async findContact(id: string): Promise<CrmContactDto> {
    const tenantId = resolveCurrentTenantId();
    const contact = await this.prisma.crmContact.findUnique({
      where: { tenantId_id: { tenantId, id } },
      include: CONTACT_INCLUDE,
    });
    if (!contact) {
      throw crmNotFound(
        'INDUSTRY_CRM_CONTACT_NOT_FOUND',
        'CRM contact not found.',
        { id },
      );
    }

    return toContactRecord(contact);
  }

  private async findOpportunity(id: string): Promise<CrmOpportunityDto> {
    const tenantId = resolveCurrentTenantId();
    const opportunity = await this.prisma.crmOpportunity.findUnique({
      where: { tenantId_id: { tenantId, id } },
      include: OPPORTUNITY_INCLUDE,
    });
    if (!opportunity) {
      throw crmNotFound(
        'INDUSTRY_CRM_OPPORTUNITY_NOT_FOUND',
        'CRM opportunity not found.',
        { id },
      );
    }

    return toOpportunityRecord(opportunity);
  }

  private async findTask(id: string): Promise<CrmTaskDto> {
    const tenantId = resolveCurrentTenantId();
    const task = await this.prisma.crmTask.findUnique({
      where: { tenantId_id: { tenantId, id } },
    });
    if (!task) {
      throw crmNotFound('INDUSTRY_CRM_TASK_NOT_FOUND', 'CRM task not found.', {
        id,
      });
    }

    return toTaskRecord(task);
  }

  private async normalizeTags(
    tenantId: string,
    input: readonly string[] | undefined,
  ): Promise<Prisma.InputJsonValue> {
    const tags = normalizeStringArray(input);
    if (tags.length === 0) {
      return [];
    }

    const rows = await this.prisma.crmTag.findMany({
      where: { tenantId, code: { in: tags }, enabled: true },
      select: { code: true },
    });
    const found = new Set(rows.map((row) => row.code));
    const missing = tags.filter((tag) => !found.has(tag));

    if (missing.length > 0) {
      throw crmBadRequest(
        'INDUSTRY_CRM_TAG_INVALID',
        'CRM tag code is invalid.',
        { tags: missing },
      );
    }

    return tags;
  }

  private async ensureTarget(
    tenantId: string,
    targetType: CrmTargetType,
    targetId: string,
  ): Promise<void> {
    const id = requireText(targetId, 'targetId');
    const found =
      targetType === 'lead'
        ? await this.prisma.crmLead.findUnique({
            where: { tenantId_id: { tenantId, id } },
          })
        : targetType === 'customer'
          ? await this.prisma.crmCustomer.findUnique({
              where: { tenantId_id: { tenantId, id } },
            })
          : targetType === 'contact'
            ? await this.prisma.crmContact.findUnique({
                where: { tenantId_id: { tenantId, id } },
              })
            : await this.prisma.crmOpportunity.findUnique({
                where: { tenantId_id: { tenantId, id } },
              });

    if (!found) {
      throw crmNotFound(
        'INDUSTRY_CRM_TARGET_NOT_FOUND',
        'CRM target not found.',
        { targetType, targetId },
      );
    }
  }

  private async touchFollowUpTarget(
    tenantId: string,
    targetType: CrmTargetType,
    targetId: string,
    nextContactAt: Date | undefined,
  ): Promise<void> {
    const data = {
      lastFollowedAt: new Date(),
      ...(nextContactAt === undefined ? {} : { nextContactAt }),
    };

    if (targetType === 'lead') {
      await this.prisma.crmLead.update({
        where: { tenantId_id: { tenantId, id: targetId } },
        data,
      });
    } else if (targetType === 'customer') {
      await this.prisma.crmCustomer.update({
        where: { tenantId_id: { tenantId, id: targetId } },
        data,
      });
    } else if (targetType === 'contact') {
      await this.prisma.crmContact.update({
        where: { tenantId_id: { tenantId, id: targetId } },
        data,
      });
    }
  }

  private async writeTransfer(
    tenantId: string,
    targetType: CrmTargetType,
    targetId: string,
    fromOwner: string | undefined,
    body: TransferCrmOwnerDto,
  ): Promise<void> {
    await this.prisma.crmOwnerTransfer.create({
      data: {
        tenantId,
        targetType,
        targetId,
        fromOwner: fromOwner ?? null,
        toOwner: requireText(body.toOwner, 'toOwner'),
        actor: requireText(body.actor, 'actor'),
        reason: normalizeOptionalText(body.reason),
      },
    });
  }

  private async writeAudit(
    tenantId: string,
    targetType: CrmTargetType,
    targetId: string,
    action: string,
    actor: string,
    detail: Record<string, unknown> = {},
  ): Promise<void> {
    await this.prisma.crmAuditEvent.create({
      data: {
        tenantId,
        targetType,
        targetId,
        action,
        actor: normalizeOptionalText(actor) ?? 'system',
        detail: toInputJson(detail),
      },
    });
  }
}

function resolveCurrentTenantId(): string {
  return getRequestContext()?.tenantId ?? ROOT_TENANT_ID;
}

function createCrmNumber(prefix: string): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = randomUUID().slice(0, 8).toUpperCase();

  return `${prefix}-${date}-${suffix}`;
}

function buildLeadWhere(tenantId: string, query: CrmLeadQueryDto) {
  const keyword = normalizeOptionalText(query.keyword);
  const includeArchived = parseOptionalBoolean(query.includeArchived) === true;
  const and: object[] = [];
  if (keyword) {
    and.push({
      OR: [
        { number: { contains: keyword, mode: 'insensitive' as const } },
        { name: { contains: keyword, mode: 'insensitive' as const } },
        { company: { contains: keyword, mode: 'insensitive' as const } },
        { mobile: { contains: keyword, mode: 'insensitive' as const } },
        { email: { contains: keyword, mode: 'insensitive' as const } },
      ],
    });
  }

  return {
    tenantId,
    ...(includeArchived ? {} : { archivedAt: null }),
    ...(query.status === undefined
      ? {}
      : { status: parseChoice(query.status, CRM_LEAD_STATUSES, 'status') }),
    ...(query.source === undefined ? {} : { source: query.source }),
    ...(query.owner === undefined ? {} : { owner: query.owner }),
    ...(and.length === 0 ? {} : { AND: and }),
  };
}

function buildCustomerWhere(tenantId: string, query: CrmCustomerQueryDto) {
  const keyword = normalizeOptionalText(query.keyword);
  const includeArchived = parseOptionalBoolean(query.includeArchived) === true;
  const and: object[] = [];
  if (keyword) {
    and.push({
      OR: [
        { number: { contains: keyword, mode: 'insensitive' as const } },
        { name: { contains: keyword, mode: 'insensitive' as const } },
        { phone: { contains: keyword, mode: 'insensitive' as const } },
        { email: { contains: keyword, mode: 'insensitive' as const } },
        { industry: { contains: keyword, mode: 'insensitive' as const } },
        { region: { contains: keyword, mode: 'insensitive' as const } },
      ],
    });
  }

  return {
    tenantId,
    ...(includeArchived ? {} : { archivedAt: null }),
    ...(query.status === undefined
      ? {}
      : {
          status: parseChoice(query.status, CRM_CUSTOMER_STATUSES, 'status'),
        }),
    ...(query.level === undefined ? {} : { level: query.level }),
    ...(query.source === undefined ? {} : { source: query.source }),
    ...(query.owner === undefined ? {} : { owner: query.owner }),
    ...(and.length === 0 ? {} : { AND: and }),
  };
}

function buildContactWhere(tenantId: string, query: CrmContactQueryDto) {
  const keyword = normalizeOptionalText(query.keyword);
  const includeArchived = parseOptionalBoolean(query.includeArchived) === true;
  const and: object[] = [];
  if (keyword) {
    and.push({
      OR: [
        { name: { contains: keyword, mode: 'insensitive' as const } },
        { title: { contains: keyword, mode: 'insensitive' as const } },
        { mobile: { contains: keyword, mode: 'insensitive' as const } },
        { email: { contains: keyword, mode: 'insensitive' as const } },
      ],
    });
  }

  return {
    tenantId,
    ...(includeArchived ? {} : { archivedAt: null }),
    ...(query.customerId === undefined ? {} : { customerId: query.customerId }),
    ...(query.owner === undefined ? {} : { owner: query.owner }),
    ...(and.length === 0 ? {} : { AND: and }),
  };
}

function buildOpportunityWhere(
  tenantId: string,
  query: CrmOpportunityQueryDto,
) {
  const keyword = normalizeOptionalText(query.keyword);
  const includeArchived = parseOptionalBoolean(query.includeArchived) === true;
  const and: object[] = [];
  if (keyword) {
    and.push({
      OR: [
        { number: { contains: keyword, mode: 'insensitive' as const } },
        { name: { contains: keyword, mode: 'insensitive' as const } },
      ],
    });
  }

  return {
    tenantId,
    ...(includeArchived ? {} : { archivedAt: null }),
    ...(query.customerId === undefined ? {} : { customerId: query.customerId }),
    ...(query.stage === undefined
      ? {}
      : {
          stage: parseChoice(query.stage, CRM_OPPORTUNITY_STAGES, 'stage'),
        }),
    ...(query.owner === undefined ? {} : { owner: query.owner }),
    ...(and.length === 0 ? {} : { AND: and }),
  };
}

function buildTaskWhere(tenantId: string, query: CrmTaskQueryDto) {
  return {
    ...buildTargetWhere(tenantId, query),
    ...(query.status === undefined
      ? {}
      : { status: parseChoice(query.status, CRM_TASK_STATUSES, 'status') }),
    ...(query.assignee === undefined ? {} : { assignee: query.assignee }),
  };
}

function buildTargetWhere(tenantId: string, query: CrmTargetQueryDto) {
  return {
    tenantId,
    ...(query.targetType === undefined
      ? {}
      : { targetType: parseTargetType(query.targetType) }),
    ...(query.targetId === undefined ? {} : { targetId: query.targetId }),
  };
}

function parseTargetType(value: string): CrmTargetType {
  return parseChoice(value, CRM_TARGET_TYPES, 'targetType');
}

function parseChoice<const T extends readonly string[]>(
  value: string,
  choices: T,
  field: string,
): T[number] {
  if ((choices as readonly string[]).includes(value)) {
    return value as T[number];
  }

  throw crmBadRequest('INDUSTRY_CRM_FIELD_INVALID', 'CRM field is invalid.', {
    field,
    value,
  });
}

function requireText(value: string | undefined, field: string): string {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    throw crmBadRequest(
      'INDUSTRY_CRM_FIELD_REQUIRED',
      'CRM field is required.',
      { field },
    );
  }

  return normalized;
}

function normalizeOptionalText(
  value: string | null | undefined,
): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const normalized = String(value).trim();

  return normalized.length > 0 ? normalized : undefined;
}

function normalizeNullableText(
  value: string | null | undefined,
): string | null {
  return normalizeOptionalText(value) ?? null;
}

function normalizeStringArray(value: readonly string[] | undefined): string[] {
  return Array.from(
    new Set(
      (value ?? []).map((item) => normalizeOptionalText(item)).filter(Boolean),
    ),
  ) as string[];
}

function parseOptionalBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw crmBadRequest(
    'INDUSTRY_CRM_BOOLEAN_INVALID',
    'CRM boolean query value is invalid.',
    { value },
  );
}

function parseOptionalDate(
  value: string | undefined,
  field: string,
): Date | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }

  return parseDate(value, field);
}

function parseNullableDate(value: string | null, field: string): Date | null {
  if (value === null || value === '') {
    return null;
  }

  return parseDate(value, field);
}

function parseDate(value: string, field: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw crmBadRequest('INDUSTRY_CRM_DATE_INVALID', 'CRM date is invalid.', {
      field,
      value,
    });
  }

  return date;
}

function parseMoney(value: string): Prisma.Decimal {
  try {
    const decimal = new Prisma.Decimal(value);
    if (decimal.isNegative()) {
      throw new Error('negative');
    }

    return decimal;
  } catch {
    throw crmBadRequest('INDUSTRY_CRM_MONEY_INVALID', 'CRM money is invalid.', {
      value,
    });
  }
}

function normalizeProbability(value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > 100) {
    throw crmBadRequest(
      'INDUSTRY_CRM_PROBABILITY_INVALID',
      'CRM opportunity probability is invalid.',
      { value },
    );
  }

  return value;
}

function normalizePositiveInteger(value: number, field: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw crmBadRequest('INDUSTRY_CRM_FIELD_INVALID', 'CRM field is invalid.', {
      field,
    });
  }

  return value;
}

function getStageProbability(stage: string): number {
  if (stage === 'won') return 100;
  if (stage === 'lost') return 0;
  if (stage === 'negotiation') return 75;
  if (stage === 'proposal') return 50;
  return 10;
}

function countBuckets(
  values: readonly string[],
): CrmSummaryDto['leadsByStatus'] {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([key, count]) => ({ key, count }))
    .sort(
      (left, right) =>
        right.count - left.count || left.key.localeCompare(right.key),
    );
}

function createCsvExportPreview(
  filename: string,
  columns: readonly string[],
  rows: readonly (readonly string[])[],
): CrmExportPreviewDto {
  const generatedAt = new Date().toISOString();
  const csv = [columns, ...rows]
    .map((row) => row.map(toCsvCell).join(','))
    .join('\n');

  return {
    filename,
    contentType: CSV_CONTENT_TYPE,
    contentBase64: Buffer.from(csv, 'utf8').toString('base64'),
    scope: 'current-page',
    columns,
    rowCount: rows.length,
    generatedAt,
  };
}

function toCsvCell(value: string): string {
  const safe = /^\s*[=+\-@]/.test(value) ? `'${value}` : value;

  return `"${safe.replace(/"/g, '""')}"`;
}

function toJsonArray(value: unknown): Prisma.InputJsonValue {
  return normalizeStoredTags(value);
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function normalizeStoredTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => String(item));
}

function toTagRecord(row: {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  color: string | null;
  description: string | null;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}): CrmTagDto {
  return {
    id: row.id,
    tenantId: row.tenantId,
    code: row.code,
    name: row.name,
    color: row.color ?? undefined,
    description: row.description ?? undefined,
    enabled: row.enabled,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toLeadRecord(row: {
  id: string;
  tenantId: string;
  number: string;
  name: string;
  company: string | null;
  mobile: string | null;
  email: string | null;
  source: string;
  status: string;
  rating: string;
  owner: string;
  tags: Prisma.JsonValue;
  remark: string | null;
  nextContactAt: Date | null;
  lastFollowedAt: Date | null;
  convertedCustomerId: string | null;
  convertedOpportunityId: string | null;
  convertedAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): CrmLeadDto {
  return {
    id: row.id,
    tenantId: row.tenantId,
    number: row.number,
    name: row.name,
    company: row.company ?? undefined,
    mobile: row.mobile ?? undefined,
    email: row.email ?? undefined,
    source: row.source,
    status: parseChoice(row.status, CRM_LEAD_STATUSES, 'status'),
    rating: row.rating,
    owner: row.owner,
    tags: normalizeStoredTags(row.tags),
    remark: row.remark ?? undefined,
    nextContactAt: row.nextContactAt?.toISOString(),
    lastFollowedAt: row.lastFollowedAt?.toISOString(),
    convertedCustomerId: row.convertedCustomerId ?? undefined,
    convertedOpportunityId: row.convertedOpportunityId ?? undefined,
    convertedAt: row.convertedAt?.toISOString(),
    archivedAt: row.archivedAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toCustomerRecord(row: CrmCustomerRow): CrmCustomerDto {
  return {
    id: row.id,
    tenantId: row.tenantId,
    number: row.number,
    name: row.name,
    owner: row.owner,
    status: parseChoice(row.status, CRM_CUSTOMER_STATUSES, 'status'),
    level: row.level,
    source: row.source,
    industry: row.industry ?? undefined,
    region: row.region ?? undefined,
    website: row.website ?? undefined,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    address: row.address ?? undefined,
    tags: normalizeStoredTags(row.tags),
    remark: row.remark ?? undefined,
    nextContactAt: row.nextContactAt?.toISOString(),
    lastFollowedAt: row.lastFollowedAt?.toISOString(),
    archivedAt: row.archivedAt?.toISOString(),
    contactCount: row._count.contacts,
    opportunityCount: row._count.opportunities,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toContactRecord(row: CrmContactRow): CrmContactDto {
  return {
    id: row.id,
    tenantId: row.tenantId,
    customerId: row.customerId,
    customerName: row.customer.name,
    name: row.name,
    title: row.title ?? undefined,
    mobile: row.mobile ?? undefined,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    owner: row.owner,
    decisionRole: row.decisionRole ?? undefined,
    primary: row.primary,
    remark: row.remark ?? undefined,
    nextContactAt: row.nextContactAt?.toISOString(),
    lastFollowedAt: row.lastFollowedAt?.toISOString(),
    archivedAt: row.archivedAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toOpportunityRecord(row: CrmOpportunityRow): CrmOpportunityDto {
  return {
    id: row.id,
    tenantId: row.tenantId,
    customerId: row.customerId,
    customerName: row.customer.name,
    number: row.number,
    name: row.name,
    owner: row.owner,
    stage: parseChoice(row.stage, CRM_OPPORTUNITY_STAGES, 'stage'),
    amount: row.amount.toFixed(2),
    probability: row.probability,
    expectedCloseAt: row.expectedCloseAt?.toISOString(),
    closedAt: row.closedAt?.toISOString(),
    closeReason: row.closeReason ?? undefined,
    tags: normalizeStoredTags(row.tags),
    remark: row.remark ?? undefined,
    archivedAt: row.archivedAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toFollowUpRecord(row: {
  id: string;
  tenantId: string;
  targetType: string;
  targetId: string;
  method: string;
  content: string;
  outcome: string | null;
  nextContactAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}): CrmFollowUpDto {
  return {
    id: row.id,
    tenantId: row.tenantId,
    targetType: parseTargetType(row.targetType),
    targetId: row.targetId,
    method: parseChoice(row.method, CRM_FOLLOW_UP_METHODS, 'method'),
    content: row.content,
    outcome: row.outcome ?? undefined,
    nextContactAt: row.nextContactAt?.toISOString(),
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toTaskRecord(row: {
  id: string;
  tenantId: string;
  targetType: string;
  targetId: string;
  title: string;
  assignee: string;
  status: string;
  priority: string;
  dueAt: Date | null;
  completedAt: Date | null;
  remark: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}): CrmTaskDto {
  return {
    id: row.id,
    tenantId: row.tenantId,
    targetType: parseTargetType(row.targetType),
    targetId: row.targetId,
    title: row.title,
    assignee: row.assignee,
    status: parseChoice(row.status, CRM_TASK_STATUSES, 'status'),
    priority: parseChoice(row.priority, CRM_TASK_PRIORITIES, 'priority'),
    dueAt: row.dueAt?.toISOString(),
    completedAt: row.completedAt?.toISOString(),
    remark: row.remark ?? undefined,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toAttachmentRecord(row: {
  id: string;
  tenantId: string;
  targetType: string;
  targetId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
}): CrmAttachmentDto {
  return {
    id: row.id,
    tenantId: row.tenantId,
    targetType: parseTargetType(row.targetType),
    targetId: row.targetId,
    originalName: row.originalName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    storageKey: row.storageKey,
    uploadedBy: row.uploadedBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toOwnerTransferRecord(row: {
  id: string;
  tenantId: string;
  targetType: string;
  targetId: string;
  fromOwner: string | null;
  toOwner: string;
  actor: string;
  reason: string | null;
  createdAt: Date;
}): CrmOwnerTransferDto {
  return {
    id: row.id,
    tenantId: row.tenantId,
    targetType: parseTargetType(row.targetType),
    targetId: row.targetId,
    fromOwner: row.fromOwner ?? undefined,
    toOwner: row.toOwner,
    actor: row.actor,
    reason: row.reason ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

function toAuditEventRecord(row: {
  id: string;
  tenantId: string;
  targetType: string;
  targetId: string;
  action: string;
  actor: string;
  detail: Prisma.JsonValue;
  createdAt: Date;
}): CrmAuditEventDto {
  return {
    id: row.id,
    tenantId: row.tenantId,
    targetType: parseTargetType(row.targetType as CrmTargetType),
    targetId: row.targetId,
    action: row.action,
    actor: row.actor,
    detail:
      typeof row.detail === 'object' && row.detail !== null
        ? (row.detail as Record<string, unknown>)
        : {},
    createdAt: row.createdAt.toISOString(),
  };
}
