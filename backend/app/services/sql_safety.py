from __future__ import annotations

import re

import sqlglot
from sqlglot import exp


BANNED_EXPRESSIONS = (
    exp.Insert,
    exp.Update,
    exp.Delete,
    exp.Create,
    exp.Drop,
    exp.Alter,
    exp.Command,
    exp.Attach,
)


def clean_sql(sql: str) -> str:
    stripped = sql.strip()
    stripped = re.sub(r"^```(?:sql)?", "", stripped, flags=re.IGNORECASE).strip()
    stripped = re.sub(r"```$", "", stripped).strip()
    return stripped.rstrip(";")


def validate_read_only_sql(sql: str, allowed_tables: set[str]) -> str:
    sql = clean_sql(sql)
    parsed = sqlglot.parse_one(sql, read="duckdb")

    for node in parsed.walk():
        if isinstance(node, BANNED_EXPRESSIONS):
            raise ValueError("Only read-only SELECT queries are allowed.")

    cte_names = set()
    for cte in parsed.find_all(exp.CTE):
        alias = cte.alias_or_name
        if alias:
            cte_names.add(alias)

    table_names = {table.name for table in parsed.find_all(exp.Table)}
    disallowed = {name for name in table_names if name not in allowed_tables and name not in cte_names}
    if disallowed:
        raise ValueError(f"Query referenced disallowed tables: {', '.join(sorted(disallowed))}")

    if not isinstance(parsed, (exp.Select, exp.Union, exp.With, exp.Subquery)):
        if not parsed.find(exp.Select):
            raise ValueError("Expected a SELECT statement.")

    return sql


def ensure_limit(sql: str, limit: int) -> str:
    parsed = sqlglot.parse_one(sql, read="duckdb")
    if isinstance(parsed, exp.Select) and parsed.args.get("limit") is None:
        parsed = parsed.limit(limit)
    elif isinstance(parsed, exp.Union) and parsed.args.get("limit") is None:
        parsed.set("limit", exp.Limit(expression=exp.Literal.number(limit)))
    return parsed.sql(dialect="duckdb")
