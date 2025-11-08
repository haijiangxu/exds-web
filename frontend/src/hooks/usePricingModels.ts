import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import { PricingModel } from '../types/pricing';

let cachedModels: PricingModel[] = [];
let cacheTime: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const usePricingModels = () => {
    const [models, setModels] = useState<PricingModel[]>(cachedModels);
    const [loading, setLoading] = useState<boolean>(!cachedModels.length);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchModels = async () => {
            const now = new Date().getTime();
            if (cachedModels.length > 0 && cacheTime && (now - cacheTime < CACHE_DURATION)) {
                setModels(cachedModels);
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const response = await apiClient.get<PricingModel[]>('/api/v1/pricing-models');
                cachedModels = response.data;
                cacheTime = new Date().getTime();
                setModels(response.data);
                setError(null);
            } catch (err) {
                setError('Failed to fetch pricing models.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchModels();
    }, []);

    const getModelByCode = useCallback((model_code: string): PricingModel | undefined => {
        return models.find(model => model.model_code === model_code);
    }, [models]);

    const getModelDisplayName = useCallback((model_code: string): string => {
        const model = getModelByCode(model_code);
        return model ? model.display_name : model_code;
    }, [getModelByCode]);

    return { models, loading, error, getModelByCode, getModelDisplayName };
};

export default usePricingModels;
