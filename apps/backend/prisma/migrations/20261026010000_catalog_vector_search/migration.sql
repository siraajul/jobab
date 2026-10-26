-- Preserve legacy vectors; model identity prevents comparing incompatible spaces.
ALTER TABLE products ADD COLUMN text_embedding_model TEXT, ADD COLUMN image_embedding_model TEXT;
CREATE INDEX products_text_embedding_hnsw ON products USING hnsw ((text_embedding::vector(1024)) vector_cosine_ops)
 WHERE text_embedding IS NOT NULL AND vector_dims(text_embedding) = 1024
 AND text_embedding_model = 'jina-embeddings-v3:retrieval.passage:1024';
CREATE INDEX products_image_embedding_hnsw ON products USING hnsw ((image_embedding::vector(1024)) vector_cosine_ops)
 WHERE image_embedding IS NOT NULL AND vector_dims(image_embedding) = 1024
 AND image_embedding_model = 'jina-clip-v2:1024';
