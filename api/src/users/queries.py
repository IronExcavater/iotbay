from src.common.sql import read_sql

LIST_USERS = read_sql(__file__, "sql", "list_users.sql")
SELECT_USER = read_sql(__file__, "sql", "select_user.sql")
