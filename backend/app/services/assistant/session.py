"""Ephemeral session manager for the STRUCTRA AI Assistant.

Maintains in-memory session metadata and conversation turns scoped to authenticated users
with automatic TTL expiration. No permanent database tables are used.
"""

import asyncio
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
import uuid


@dataclass
class AssistantSession:
    """Represents an ephemeral AI assistant conversation session."""

    session_id: str
    user_id: str
    created_at: datetime
    last_activity_at: datetime
    expires_at: datetime
    turns: list[dict[str, str]] = field(default_factory=list)

    @property
    def is_expired(self) -> bool:
        """Return True if session has expired."""
        return datetime.now(UTC) > self.expires_at


class AssistantSessionManager:
    """Thread-safe in-memory session store with TTL expiration and user isolation."""

    def __init__(self, default_ttl_seconds: int = 7200) -> None:
        """Initialize session manager.
        
        Args:
            default_ttl_seconds: Time to live in seconds (default 2 hours).
        """
        self.default_ttl_seconds = default_ttl_seconds
        self._sessions: dict[str, AssistantSession] = {}
        self._lock = asyncio.Lock()

    async def create_session(
        self,
        user_id: str,
        ttl_seconds: int | None = None,
    ) -> AssistantSession:
        """Create and store a new ephemeral assistant session for the given user."""
        ttl = ttl_seconds if ttl_seconds is not None else self.default_ttl_seconds
        now = datetime.now(UTC)
        session_id = str(uuid.uuid4())
        session = AssistantSession(
            session_id=session_id,
            user_id=str(user_id),
            created_at=now,
            last_activity_at=now,
            expires_at=now + timedelta(seconds=ttl),
            turns=[],
        )
        async with self._lock:
            self._sessions[session_id] = session
        return session

    async def get_session(
        self,
        session_id: str,
        user_id: str | None = None,
    ) -> AssistantSession | None:
        """Retrieve active session ensuring it is not expired and matches user_id."""
        async with self._lock:
            session = self._sessions.get(session_id)
            if not session:
                return None

            if session.is_expired:
                self._sessions.pop(session_id, None)
                return None

            if user_id is not None and session.user_id != str(user_id):
                return None

            # Refresh last activity and slide expiration
            session.last_activity_at = datetime.now(UTC)
            session.expires_at = session.last_activity_at + timedelta(seconds=self.default_ttl_seconds)
            return session

    async def validate_session(self, session_id: str, user_id: str) -> bool:
        """Check whether a session ID exists, belongs to user_id, and is active."""
        session = await self.get_session(session_id, user_id=user_id)
        return session is not None

    async def add_turn(
        self,
        session_id: str,
        user_id: str,
        role: str,
        content: str,
    ) -> AssistantSession | None:
        """Append a message turn to the session."""
        session = await self.get_session(session_id, user_id=user_id)
        if not session:
            return None

        async with self._lock:
            session.turns.append({"role": role, "content": content})
            # Keep up to last 20 turns in memory to bound memory usage
            if len(session.turns) > 20:
                session.turns = session.turns[-20:]
        return session

    async def reset_session(self, session_id: str, user_id: str) -> bool:
        """Clear conversation turns in an active session."""
        session = await self.get_session(session_id, user_id=user_id)
        if not session:
            return False

        async with self._lock:
            session.turns.clear()
            session.last_activity_at = datetime.now(UTC)
            session.expires_at = session.last_activity_at + timedelta(seconds=self.default_ttl_seconds)
        return True

    async def delete_session(self, session_id: str, user_id: str) -> bool:
        """Explicitly remove a session."""
        async with self._lock:
            session = self._sessions.get(session_id)
            if not session or session.user_id != str(user_id):
                return False
            self._sessions.pop(session_id, None)
            return True

    async def cleanup_expired_sessions(self) -> int:
        """Remove all expired sessions from memory."""
        now = datetime.now(UTC)
        removed = 0
        async with self._lock:
            expired_ids = [
                sid for sid, s in self._sessions.items() if s.expires_at < now
            ]
            for sid in expired_ids:
                self._sessions.pop(sid, None)
                removed += 1
        return removed

    def clear_all_sync(self) -> None:
        """Synchronously clear all sessions (for unit tests)."""
        self._sessions.clear()


# Default singleton instance
default_session_manager = AssistantSessionManager()
