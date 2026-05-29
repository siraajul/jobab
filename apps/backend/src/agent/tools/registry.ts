import { Tool } from './types';
import { searchCatalogTool } from './search-catalog.tool';
import { checkStockTool } from './check-stock.tool';
import { saveCustomerDetailTool } from './save-customer-detail.tool';
import { createOrderTool } from './create-order.tool';
import { handoffToHumanTool } from './handoff-to-human.tool';
import { matchProductByImageTool } from './match-product-by-image.tool';

export const TOOLS: Tool[] = [
  searchCatalogTool,
  matchProductByImageTool,
  checkStockTool,
  saveCustomerDetailTool,
  createOrderTool,
  handoffToHumanTool,
];

export const TOOL_BY_NAME = new Map(TOOLS.map((t) => [t.definition.name, t]));
