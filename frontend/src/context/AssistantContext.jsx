import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { createAssistantSession, sendAssistantMessage, resetAssistantSession } from '../api/assistant';
import { useAuth } from '../hooks/useAuth';

const AssistantContext = createContext(null);

const SESSION_ID_KEY = 'structra_assistant_session_id';
const MESSAGES_KEY = 'structra_assistant_messages';
const USER_KEY = 'structra_assistant_user_id';
const DRAFT_INPUT_KEY = 'structra_assistant_draft_input';

function loadStoredMessages() {
  try {
    const raw = sessionStorage.getItem(MESSAGES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore parse errors */
  }
  return [];
}

function loadStoredSessionId() {
  try {
    return sessionStorage.getItem(SESSION_ID_KEY) || null;
  } catch {
    return null;
  }
}

function loadStoredDraftInput() {
  try {
    return sessionStorage.getItem(DRAFT_INPUT_KEY) || '';
  } catch {
    return '';
  }
}

/**
 * AssistantProvider
 * Manages ephemeral session lifecycle, bounded conversation history,
 * multi-turn message dispatch, request deduplication, stale response protection,
 * draft input preservation across navigation, and strict user isolation.
 */
export function AssistantProvider({ children }) {
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState(() => loadStoredSessionId());
  const [messages, setMessages] = useState(() => loadStoredMessages());
  const [draftInput, setDraftInput] = useState(() => loadStoredDraftInput());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const messagesRef = useRef(messages);
  const sessionIdRef = useRef(sessionId);
  const isInitializingRef = useRef(false);
  const currentUserRef = useRef(user?.id || null);
  const activeRequestIdRef = useRef(0);

  // Keep refs synchronized
  useEffect(() => {
    messagesRef.current = messages;
    try {
      sessionStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
    } catch {
      /* ignore */
    }
  }, [messages]);

  useEffect(() => {
    sessionIdRef.current = sessionId;
    try {
      if (sessionId) {
        sessionStorage.setItem(SESSION_ID_KEY, sessionId);
      } else {
        sessionStorage.removeItem(SESSION_ID_KEY);
      }
    } catch {
      /* ignore */
    }
  }, [sessionId]);

  useEffect(() => {
    try {
      if (draftInput) {
        sessionStorage.setItem(DRAFT_INPUT_KEY, draftInput);
      } else {
        sessionStorage.removeItem(DRAFT_INPUT_KEY);
      }
    } catch {
      /* ignore */
    }
  }, [draftInput]);

  // Strict user isolation: purge assistant state when user logs out or switches
  useEffect(() => {
    const currentUserId = user?.id || null;
    const storedUserId = sessionStorage.getItem(USER_KEY);

    // Invalidate any in-flight requests from the previous state
    activeRequestIdRef.current++;

    if (!currentUserId) {
      // User logged out
      setSessionId(null);
      setMessages([]);
      setDraftInput('');
      setIsLoading(false);
      setError(null);
      try {
        sessionStorage.removeItem(SESSION_ID_KEY);
        sessionStorage.removeItem(MESSAGES_KEY);
        sessionStorage.removeItem(DRAFT_INPUT_KEY);
        sessionStorage.removeItem(USER_KEY);
      } catch {
        /* ignore */
      }
    } else if (storedUserId && storedUserId !== currentUserId) {
      // Switched to a different user account
      setSessionId(null);
      setMessages([]);
      setDraftInput('');
      setIsLoading(false);
      setError(null);
      try {
        sessionStorage.removeItem(SESSION_ID_KEY);
        sessionStorage.removeItem(MESSAGES_KEY);
        sessionStorage.removeItem(DRAFT_INPUT_KEY);
        sessionStorage.setItem(USER_KEY, currentUserId);
      } catch {
        /* ignore */
      }
    } else if (currentUserId) {
      try {
        sessionStorage.setItem(USER_KEY, currentUserId);
      } catch {
        /* ignore */
      }
    }
    currentUserRef.current = currentUserId;
  }, [user]);

  // Initialize session once when authenticated user opens the app
  const initSession = useCallback(async () => {
    if (!user || isInitializingRef.current) return;
    if (sessionIdRef.current) return; // Session already restored

    isInitializingRef.current = true;
    try {
      const res = await createAssistantSession();
      if (res?.session_id) {
        setSessionId(res.session_id);
      }
    } catch (err) {
      console.warn('Session init warning (will create on first message):', err.message);
    } finally {
      isInitializingRef.current = false;
    }
  }, [user]);

  useEffect(() => {
    if (user && !sessionId) {
      initSession();
    }
  }, [user, sessionId, initSession]);

  /**
   * Send a user message and wait for the assistant reply.
   * Appends the user bubble immediately, then appends the assistant reply.
   */
  const sendMessage = useCallback(
    async (text) => {
      const trimmed = text?.trim();
      if (!trimmed || isLoading) return;

      const currentRequestId = ++activeRequestIdRef.current;
      const originatingUserId = currentUserRef.current;

      const userMsg = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: trimmed,
        timestamp: new Date().toISOString(),
      };

      // Append user message immediately
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      setError(null);

      // Build bounded history from current messages (excluding the new user message)
      const history = messagesRef.current
        .slice(-8)
        .map(({ role, content }) => ({ role, content }));

      try {
        let activeSessionId = sessionIdRef.current;
        let response;

        try {
          response = await sendAssistantMessage({
            session_id: activeSessionId,
            message: trimmed,
            history,
          });
        } catch (firstErr) {
          // If session expired on server (404), create a fresh session and retry once
          if (firstErr.isSessionExpired) {
            const newSession = await createAssistantSession();
            activeSessionId = newSession.session_id;
            setSessionId(activeSessionId);
            response = await sendAssistantMessage({
              session_id: activeSessionId,
              message: trimmed,
              history,
            });
          } else {
            throw firstErr;
          }
        }

        // Stale response / user switch protection
        if (
          currentRequestId !== activeRequestIdRef.current ||
          originatingUserId !== currentUserRef.current
        ) {
          return;
        }

        if (response?.session_id && response.session_id !== activeSessionId) {
          setSessionId(response.session_id);
        }

        const replyContent =
          response.reply || response.message || 'I found the information from your documents.';
        const assistantMsg = {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: replyContent,
          result_type: response.result_type || response.metadata?.type || null,
          title: response.title || response.metadata?.title || null,
          summary: response.summary || response.metadata?.summary || null,
          sources: response.sources || [],
          source_count: response.source_count || response.sources?.length || 0,
          metadata: response.metadata || null,
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        // Stale response / user switch protection
        if (
          currentRequestId !== activeRequestIdRef.current ||
          originatingUserId !== currentUserRef.current
        ) {
          return;
        }

        const errorText =
          err.message || "STRUCTRA couldn't process that right now. Please try again.";
        setError(errorText);
        setMessages((prev) => [
          ...prev,
          {
            id: `a-err-${Date.now()}`,
            role: 'assistant',
            content: errorText,
            timestamp: new Date().toISOString(),
            isError: true,
          },
        ]);
      } finally {
        if (currentRequestId === activeRequestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [isLoading]
  );

  /**
   * Clear the current conversation and reset session on the backend.
   */
  const clearConversation = useCallback(async () => {
    activeRequestIdRef.current++;
    const activeSessionId = sessionIdRef.current;
    setMessages([]);
    setIsLoading(false);
    setError(null);
    try {
      sessionStorage.removeItem(MESSAGES_KEY);
    } catch {
      /* ignore */
    }

    if (activeSessionId) {
      try {
        await resetAssistantSession(activeSessionId);
      } catch {
        /* ignore */
      }
    }
  }, []);

  return (
    <AssistantContext.Provider
      value={{
        sessionId,
        messages,
        isLoading,
        error,
        sendMessage,
        clearConversation,
        hasMessages: messages.length > 0,
        draftInput,
        setDraftInput,
      }}
    >
      {children}
    </AssistantContext.Provider>
  );
}

export function useAssistant() {
  const ctx = useContext(AssistantContext);
  if (!ctx) {
    throw new Error('useAssistant must be used within an AssistantProvider');
  }
  return ctx;
}
