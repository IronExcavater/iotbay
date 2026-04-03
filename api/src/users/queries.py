from src.common.sql import read_sql

SELECT_USER = read_sql(__file__, "sql", "select_user.sql")
