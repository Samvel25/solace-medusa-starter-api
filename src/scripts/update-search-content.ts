import { ExecArgs } from '@medusajs/framework/types';

export default async function updateSearchContent({ container }: ExecArgs) {
  const knex = container.resolve('__pg_connection__');
  const logger = container.resolve('logger');

  /* Update existing products to have searchable_content */
  logger.info('Updating searchable_content for existing products...');

  try {
    const products = await knex('product').select('id').whereNull('deleted_at');

    logger.info(`Found ${products.length} products to update`);

    for (const product of products) {
      await knex.raw(
        `
        UPDATE product
        SET searchable_content = (
          setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
          setweight(to_tsvector('english', coalesce(material, '')), 'C') ||
          setweight(to_tsvector('english', coalesce(
            (SELECT string_agg(variant.title || ' ' || variant.sku, ' ')
            FROM product_variant variant
            WHERE variant.product_id = product.id), '')), 'D') ||
          setweight(to_tsvector('english', coalesce(
            (SELECT collection.title
            FROM product_collection collection
            WHERE collection.id = product.collection_id), '')), 'D') ||
          setweight(to_tsvector('english', coalesce(
            (SELECT product_type.value
            FROM product_type
            WHERE product_type.id = product.type_id), '')), 'D')
        )
        WHERE id = ?
      `,
        [product.id]
      );
    }

    logger.info('Successfully updated searchable_content for all products');
  } catch (error) {
    logger.error(`Error updating searchable_content: ${error.message}`);
    throw error;
  }
}
