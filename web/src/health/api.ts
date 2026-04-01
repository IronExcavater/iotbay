import { getJson } from '../services/http';

export interface HealthStatus {
    status: string;
}

export const healthApi = {
    get(signal?: AbortSignal): Promise<HealthStatus> {
        return getJson<HealthStatus>('/api/health', signal);
    },
};
