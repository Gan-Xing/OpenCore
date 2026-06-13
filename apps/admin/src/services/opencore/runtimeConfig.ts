import {
  createSystemManagementClient,
  type SystemConfigRuntimeSummary,
} from '@opencore/sdk';
import { opencoreSdkRequest } from './client';

const systemManagementClient = createSystemManagementClient(opencoreSdkRequest);

export function getOpenCoreAdminRuntimeConfig(): Promise<SystemConfigRuntimeSummary> {
  return systemManagementClient.getConfigRuntime();
}
