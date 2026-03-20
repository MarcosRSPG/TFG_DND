from pydantic import BaseModel, ConfigDict


class UserSchema(BaseModel):
    id: str | None = None
    username: str
    email: str
    password: str | None = None
    role: str = "user"
    created_by: str | None = None
    created_at: str | None = None
    updated_at: str | None = None

    model_config = ConfigDict(extra="ignore")