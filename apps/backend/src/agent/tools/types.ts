import { PrismaService } from '../../prisma/prisma.service';
import { ToolDefinition } from '../llm/provider';
import { OrderGuardrail } from '../../orders/order.guardrail';
import { CatalogService } from '../../catalog/catalog.service';
import { GroqVisionProvider } from '../../vision/groq-vision.provider';
import { JinaEmbeddingProvider } from '../../embeddings/jina.provider';
import { WhatsAppService } from '../../notifications/whatsapp.service';

export interface ToolContext {
  organizationId: string;
  conversationId: string;
  prisma: PrismaService;
  catalog: CatalogService;
  guardrail: OrderGuardrail;
  vision: GroqVisionProvider;
  embeddings: JinaEmbeddingProvider;
  whatsapp: WhatsAppService;
}

export interface Tool {
  definition: ToolDefinition;
  execute(input: unknown, ctx: ToolContext): Promise<unknown>;
}
