import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { sendAssistantMessage } from '../api/assistant';

const AssistantContext = createContext(null);

const SESSION_KEY = 'structra_assistant_session';

/**
 * Persist/restore conversation to sessionStorage so it survives tab refreshes
 * but clears when the browser session ends (new window/incognito).
 */
function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore parse errors */
  }
  return [];
}

function saveSession(messages) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(messages));
  } catch {
    /* ignore storage errors */
  }
}

/**
 * AssistantProvider
 * Session-scoped conversation store. Messages persist across tab refreshes
 * (sessionStorage) but are cleared when the browser session ends.
 */
export function AssistantProvider({ children }) {
  const [messages, setMessages] = useState(() => loadSession());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesRef = useRef(messages);

  // Keep ref in sync for the sendMessage callback
  useEffect(() => {
    messagesRef.current = messages;
    saveSession(messages);
  }, [messages]);

  /**
   * Send a user message and wait for the assistant reply.
   * Appends the user bubble immediately, then appends the assistant reply.
   */
  const sendMessage = useCallback(async (text) => {
    if (!text || !text.trim()) return;

    const userMsg = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    // Append user message immediately
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);

    // Build history from current messages (excluding the user msg we just added)
    const history = messagesRef.current.map(({ role, content }) => ({ role, content }));

    try {
      const { reply } = await sendAssistantMessage(text.trim(), history);
      const assistantMsg = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: reply,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      // Add an error assistant message so the conversation flow stays intact
      setMessages((prev) => [
        ...prev,
        {
          id: `a-err-${Date.now()}`,
          role: 'assistant',
          content: err.message || 'Something went wrong. Please try again.',
          timestamp: new Date().toISOString(),
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Clear the current conversation (starts fresh session).
   */
  const clearConversation = useCallback(() => {
    setMessages([]);
    setError(null);
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <AssistantContext.Provider
      value={{
        messages,
        isLoading,
        error,
        sendMessage,
        clearConversation,
        hasMessages: messages.length > 0,
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
