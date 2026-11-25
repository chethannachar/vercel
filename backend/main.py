import logging
import os

import bcrypt
import psycopg
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class Credentials(BaseModel):
    username: str
    password: str = Field(min_length=8, max_length=72)

    @field_validator("password")
    @classmethod
    def validate_password_bytes(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password must be no more than 72 UTF-8 bytes.")
        return value


def get_database_url() -> str:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL must be set.")
    return database_url


app = FastAPI(title="Authentication API")

allowed_origins = ["http://localhost:5173"]
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    allowed_origins.append(frontend_url.rstrip("/"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/register", status_code=201)
def register(credentials: Credentials) -> dict[str, str]:
    password_hash = bcrypt.hashpw(
        credentials.password.encode("utf-8"),
        bcrypt.gensalt(),
    ).decode("utf-8")

    try:
        with psycopg.connect(
            get_database_url(),
            sslmode="require",
            connect_timeout=10,
        ) as connection:
            connection.execute(
                """
                INSERT INTO public.users (username, password_hash)
                VALUES (%s, %s)
                """,
                (credentials.username, password_hash),
            )
    except psycopg.errors.UniqueViolation as error:
        raise HTTPException(
            status_code=409,
            detail="Username is already taken.",
        ) from error
    except Exception as error:
        logger.exception("User registration failed.")
        raise HTTPException(
            status_code=500,
            detail="Unable to register right now.",
        ) from error

    return {"message": "Account created successfully. You can now log in."}


@app.post("/login")
def login(credentials: Credentials) -> dict[str, str]:
    try:
        with psycopg.connect(
            get_database_url(),
            sslmode="require",
            connect_timeout=10,
        ) as connection:
            user = connection.execute(
                """
                SELECT password_hash
                FROM public.users
                WHERE username = %s
                LIMIT 1
                """,
                (credentials.username,),
            ).fetchone()
    except Exception as error:
        logger.exception("User login lookup failed.")
        raise HTTPException(
            status_code=500,
            detail="Unable to log in right now.",
        ) from error

    password_matches = user is not None and bcrypt.checkpw(
        credentials.password.encode("utf-8"),
        user[0].encode("utf-8"),
    )
    if not password_matches:
        raise HTTPException(status_code=401, detail="Invalid username or password.")

    return {"message": "Login successful."}
