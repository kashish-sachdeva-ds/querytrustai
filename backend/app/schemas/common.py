"""Strict request-model defaults for every browser-controlled mutation."""

from pydantic import BaseModel, ConfigDict


class StrictRequestModel(BaseModel):
    """Reject unexpected fields and normalize surrounding whitespace.

    Response models intentionally remain permissive for backwards-compatible
    serialization.  Only input models inherit this class.
    """

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
