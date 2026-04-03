from src.common.sql import read_sql

LIST_PRODUCTS = read_sql(__file__, "sql", "list_products.sql")
SELECT_PRODUCT_BY_ID = read_sql(__file__, "sql", "select_product_by_id.sql")
