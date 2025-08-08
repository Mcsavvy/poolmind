import { useAuthSession } from '@/components/auth/session-provider';
import axios, { AxiosInstance } from 'axios';
import { config as appConfig } from '@/lib/config';
import { useMemo } from 'react';


export function useClient(): AxiosInstance {
    const { session } = useAuthSession();

    const client = useMemo(() => {
        const instance = axios.create({
            baseURL: appConfig.apiUrl,
            timeout: 10000,
        });
        instance.interceptors.request.use((cfg) => {
            if (session?.token) {
                cfg.headers = cfg.headers || {};
                cfg.headers.Authorization = `Bearer ${session.token}`;
            }
            return cfg;
        });
        return instance;
    }, [session?.token]);

    return client;
}
