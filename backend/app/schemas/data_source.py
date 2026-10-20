import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field


class DataSourceColumnInfo(BaseModel):
    name: str
    data_type: str
    is_nullable: bool


class DataSourceTableInfo(BaseModel):
    table_name: str
    columns: List[DataSourceColumnInfo]
    row_count_estimate: Optional[int] = None


class DataSourceSchemaCatalog(BaseModel):
    table_count: int
    column_count: int
    tables: List[DataSourceTableInfo]
    introspected_at: str


class DataSourceCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="User-friendly name for this database")
    db_type: Literal["postgresql"] = Field(default="postgresql", description="Database engine type")
    host: str = Field(..., min_length=1, max_length=255, description="Host address or hostname")
    port: int = Field(default=5432, ge=1, le=65535, description="Database port number")
    database_name: str = Field(..., min_length=1, max_length=100, description="Target database name")
    username: str = Field(..., min_length=1, max_length=100, description="Read-only user name")
    password: str = Field(..., min_length=1, max_length=255, description="Password for database user")
    ssl_mode: Literal["disable", "prefer", "require"] = Field(default="prefer", description="SSL connection mode")
    set_as_active: bool = Field(default=True, description="Whether to immediately activate this data source")


class DataSourceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    host: Optional[str] = Field(None, min_length=1, max_length=255)
    port: Optional[int] = Field(None, ge=1, le=65535)
    database_name: Optional[str] = Field(None, min_length=1, max_length=100)
    username: Optional[str] = Field(None, min_length=1, max_length=100)
    password: Optional[str] = Field(None, min_length=1, max_length=255)
    ssl_mode: Optional[Literal["disable", "prefer", "require"]] = None


class DataSourceTestRequest(BaseModel):
    db_type: Literal["postgresql"] = Field(default="postgresql")
    host: str = Field(..., min_length=1, max_length=255)
    port: int = Field(default=5432, ge=1, le=65535)
    database_name: str = Field(..., min_length=1, max_length=100)
    username: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=1, max_length=255)
    ssl_mode: Literal["disable", "prefer", "require"] = Field(default="prefer")


class DataSourceTestResponse(BaseModel):
    success: bool
    latency_ms: Optional[float] = None
    server_version: Optional[str] = None
    tables_found: int = 0
    tables: List[str] = []
    error_message: Optional[str] = None


class DataSourcePublic(BaseModel):
    id: uuid.UUID
    workspace_name: str
    name: str
    db_type: str
    host: str
    port: int
    database_name: str
    username: str
    ssl_mode: str
    status: str
    last_error: Optional[str] = None
    is_active: bool
    is_default: bool
    table_count: int = 0
    column_count: int = 0
    tables: List[str] = []
    last_synced_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class ActiveDataSourceResponse(BaseModel):
    mode: Literal["sandbox", "connected", "unconfigured"]
    workspace_name: str
    source_id: Optional[uuid.UUID] = None
    name: str
    db_type: str
    host: Optional[str] = None
    database_name: Optional[str] = None
    table_count: int
    column_count: int = 0
    tables: List[str]
    schema_details: Optional[List[DataSourceTableInfo]] = None
    last_synced_at: Optional[str] = None

