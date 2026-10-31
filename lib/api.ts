// Legacy API client - maintained for backward compatibility
// New code should use services from '../services' instead
import { apiClient, productsService, companiesService } from '../services';
import type { ProductRequest } from '../types';

/**
 * @deprecated Use apiClient from '../services' instead
 */
export const api = apiClient;

/**
 * @deprecated Use productsService from '../services' instead
 */
export const ProductService = {
  getCompanyProducts: productsService.getCompanyProducts,
  createProduct: productsService.createProduct,
  updateProduct: productsService.updateProduct,
  deleteProduct: productsService.deleteProduct,
};

/**
 * @deprecated Use companiesService from '../services' instead
 */
export const CompanyService = {
  createCompany: async (name: string, description: string) => {
    // According to API spec, required fields are:
    // name, description, rules, tone_of_voice, assistant_name, 
    // qualification_workflow, qualification_examples, collection_name
    const payload = {
      name,
      description,
      rules: "Be polite and professional.",
      tone_of_voice: "Official",
      assistant_name: "AI Assistant",
      qualification_workflow: "Standard",
      qualification_examples: "None",
      collection_name: "default_collection",
      crm_default_stage_id: "new",
      tool_ids: []
    };

    try {
      const response = await apiClient.post('/api/v1/companies', payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};
