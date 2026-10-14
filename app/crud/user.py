from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.Models.user import User


def get_user(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id)


def get_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email))


def count_users(db: Session) -> int:
    return db.scalar(select(func.count()).select_from(User)) or 0


def create_user(db: Session, email: str, password_hash: str, is_admin: bool = False) -> User:
    obj = User(email=email, password_hash=password_hash, is_admin=is_admin)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj