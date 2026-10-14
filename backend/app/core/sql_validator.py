"""
SQL AST safety validator powered by SQLGlot.

Enforces:
1. PostgreSQL dialect AST parsing.
2. Exactly one statement.
3. Pure read-only SELECT structure across root, CTEs, and subqueries.
4. Table allowlist enforcement (devices, sites, service_events only).
5. Schema restriction (blocks pg_catalog, information_schema, etc.).
6. Rejection of DDL, DML, transaction control, COPY, and SELECT INTO.
7. Rejection of dangerous PostgreSQL functions (pg_sleep, file access, admin commands).
8. Result row limit enforcement and clamping (default 200, hard maximum 500).
"""

from typing import List, Set, Optional, Dict, Any
import sqlglot
from sqlglot import exp
from app.core.semantic_catalog import ALLOWED_TABLES

PROHIBITED_COMMANDS = (
    exp.Insert,
    exp.Update,
    exp.Delete,
    exp.Drop,
    exp.Alter,
    exp.Create,
    exp.Command,
    exp.Into,
    exp.Merge,
    exp.Transaction,
    exp.Commit,
    exp.Rollback,
    exp.Grant,
    exp.Revoke,
    exp.Pragma,
)

DANGEROUS_FUNCTIONS: Set[str] = {
    "pg_sleep",
    "pg_read_file",
    "pg_write_file",
    "pg_read_binary_file",
    "pg_ls_dir",
    "system",
    "query_to_xml",
    "pg_terminate_backend",
    "pg_cancel_backend",
    "dblink",
    "dblink_exec",
    "set_config",
    "inet_client_addr",
    "inet_server_addr",
    "pg_stat_file",
    "version",
}

DISALLOWED_SCHEMAS: Set[str] = {
    "pg_catalog",
    "information_schema",
    "pg_toast",
}

DEFAULT_LIMIT = 200
MAX_LIMIT = 500

STANDARD_CHECKS = [
    "single_statement",
    "select_only",
    "table_allowlist",
    "schema_isolation",
    "prohibited_functions",
    "row_limit_clamping",
]


class SQLValidationResult:
    def __init__(
        self,
        is_valid: bool,
        violations: Optional[List[str]] = None,
        tables_referenced: Optional[List[str]] = None,
        sanitized_sql: Optional[str] = None,
        warnings: Optional[List[str]] = None,
        checks: Optional[List[str]] = None,
    ):
        self.is_valid = is_valid
        self.violations = violations or []
        self.tables_referenced = tables_referenced or []
        self.sanitized_sql = sanitized_sql
        self.warnings = warnings or []
        self.checks = checks or list(STANDARD_CHECKS)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_valid": self.is_valid,
            "violations": self.violations,
            "tables_referenced": self.tables_referenced,
            "sanitized_sql": self.sanitized_sql,
            "warnings": self.warnings,
            "checks": self.checks,
        }


def validate_and_sanitize_sql(sql_query: str) -> SQLValidationResult:
    """Parses and validates a candidate SQL query against strict read-only governance rules.

    Fails closed: any parse ambiguity or unexpected node results in validation failure.
    """
    if not sql_query or not sql_query.strip():
        return SQLValidationResult(
            is_valid=False,
            violations=["Empty SQL query."],
            checks=list(STANDARD_CHECKS),
        )

    # 1. Parse using SQLGlot in PostgreSQL dialect
    try:
        statements = sqlglot.parse(sql_query.strip(), read="postgres")
    except Exception as e:
        return SQLValidationResult(
            is_valid=False,
            violations=[f"Syntax error or unparseable PostgreSQL query: {str(e)}"],
            checks=list(STANDARD_CHECKS),
        )

    # 2. Require exactly one statement
    if len(statements) != 1:
        return SQLValidationResult(
            is_valid=False,
            violations=[f"Multiple SQL statements detected ({len(statements)} found). Exactly one statement is allowed."],
            checks=list(STANDARD_CHECKS),
        )

    root = statements[0]
    if root is None:
        return SQLValidationResult(
            is_valid=False,
            violations=["Could not construct AST for query."],
            checks=list(STANDARD_CHECKS),
        )

    # 3. Root statement must be a Select or Union expression
    if not isinstance(root, (exp.Select, exp.Union)):
        return SQLValidationResult(
            is_valid=False,
            violations=[f"Prohibited statement type '{type(root).__name__}'. Only read-only SELECT queries are permitted."],
            checks=list(STANDARD_CHECKS),
        )

    violations: List[str] = []
    warnings: List[str] = []
    tables_found: Set[str] = set()

    # Collect CTE aliases defined in the query
    cte_aliases = {
        cte.alias_or_name.lower()
        for cte in root.find_all(exp.CTE)
        if cte.alias_or_name
    }

    # 4. AST deep inspection: forbid prohibited commands, side-effects, schemas, functions
    for node in root.walk():
        # Check prohibited statements/commands
        if isinstance(node, PROHIBITED_COMMANDS):
            violations.append(f"Prohibited SQL operation '{type(node).__name__}' found in query AST.")

        # Check for SELECT INTO (writing results to a new table)
        if isinstance(node, exp.Into):
            violations.append("SELECT INTO is prohibited as it causes database writes.")

        # Check CTEs: if WITH clause exists, ensure all subqueries are read-only SELECTs
        if isinstance(node, exp.CTE):
            cte_query = node.this
            if not isinstance(cte_query, (exp.Select, exp.Union)):
                violations.append(f"Prohibited non-SELECT operation inside CTE '{node.alias_or_name}'.")

        # Check function calls
        if isinstance(node, (exp.Anonymous, exp.Func)):
            func_name = ""
            if isinstance(node, exp.Anonymous):
                func_name = node.this.lower() if isinstance(node.this, str) else ""
            else:
                func_name = node.key.lower() if hasattr(node, "key") else ""

            if func_name in DANGEROUS_FUNCTIONS:
                violations.append(f"Call to prohibited function '{func_name}' is blocked.")

        # Check table references
        if isinstance(node, exp.Table):
            table_name = node.name.lower() if node.name else ""
            db_schema = node.db.lower() if node.db else ""

            # Check schema qualification
            if db_schema in DISALLOWED_SCHEMAS:
                violations.append(f"Access to prohibited schema '{db_schema}' is blocked.")
            elif db_schema and db_schema != "public":
                violations.append(f"Access to non-public schema '{db_schema}' is blocked.")

            # Ignore CTE aliases
            if table_name not in cte_aliases and table_name:
                if table_name not in ALLOWED_TABLES:
                    violations.append(
                        f"Table '{table_name}' is not in the approved analytics allowlist ({', '.join(sorted(ALLOWED_TABLES))})."
                    )
                else:
                    tables_found.add(table_name)

    # If any AST violations were detected, fail closed immediately
    if violations:
        return SQLValidationResult(
            is_valid=False,
            violations=violations,
            tables_referenced=sorted(list(tables_found)),
            checks=list(STANDARD_CHECKS),
        )

    # 5. Row limit enforcement / clamping
    sanitized_ast = root.copy()
    limit_clause = sanitized_ast.args.get("limit")

    if limit_clause is None:
        sanitized_ast = sanitized_ast.limit(DEFAULT_LIMIT)
        warnings.append(f"No LIMIT specified; automatically applied default LIMIT {DEFAULT_LIMIT}.")
    else:
        try:
            current_limit = int(limit_clause.expression.this)
            if current_limit > MAX_LIMIT:
                sanitized_ast.args["limit"] = exp.Limit(expression=exp.Literal.number(MAX_LIMIT))
                warnings.append(f"Requested LIMIT {current_limit} exceeded ceiling; clamped to {MAX_LIMIT}.")
            elif current_limit <= 0:
                sanitized_ast.args["limit"] = exp.Limit(expression=exp.Literal.number(DEFAULT_LIMIT))
                warnings.append(f"Invalid LIMIT {current_limit}; reset to default {DEFAULT_LIMIT}.")
        except (ValueError, AttributeError, TypeError):
            sanitized_ast.args["limit"] = exp.Limit(expression=exp.Literal.number(DEFAULT_LIMIT))
            warnings.append(f"Unparseable LIMIT expression; reset to default {DEFAULT_LIMIT}.")

    # Generate sanitized SQL output in PostgreSQL dialect
    sanitized_sql = sanitized_ast.sql(dialect="postgres")

    return SQLValidationResult(
        is_valid=True,
        violations=[],
        tables_referenced=sorted(list(tables_found)),
        sanitized_sql=sanitized_sql,
        warnings=warnings,
        checks=list(STANDARD_CHECKS),
    )
