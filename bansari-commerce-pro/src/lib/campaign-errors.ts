/**
 * Typed error class for the Homepage Campaign CMS.
 * Mirrors the ProductError pattern used in product-v2.
 */
export class CampaignError extends Error {
  constructor(
    message: string,
    public readonly code: 'NOT_FOUND' | 'VALIDATION' | 'INTERNAL' | 'UNAUTHORIZED' = 'INTERNAL'
  ) {
    super(message);
    this.name = 'CampaignError';
  }
}
