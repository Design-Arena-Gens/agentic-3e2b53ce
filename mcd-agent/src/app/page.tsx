"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import styles from "./page.module.css";

type VisibleRole = "user" | "assistant";

interface Message {
  id: string;
  role: VisibleRole;
  content: string;
  suggestions?: string[];
}

const initialAssistantMessage: Message = {
  id: "assistant-welcome",
  role: "assistant",
  content:
    "Welcome to the McDonald's AI crew counter! Tell me what you are craving and I will line up menu ideas, combos, hours, or allergen-friendly picks.",
  suggestions: [
    "Recommend lunch under 600 Cal",
    "Any spicy chicken today?",
    "Gluten-friendly options?",
  ],
};

const quickStarts = [
  "Breakfast ideas before 10:30",
  "Build a family order",
  "Suggest a dessert and drink pairing",
  "Show vegetarian snacks",
];

function createId() {
  return Math.random().toString(36).slice(2, 10);
}

async function sendToAgent(history: Message[]) {
  const response = await fetch("/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      history: history.map(({ role, content }) => ({ role, content })),
    }),
  });

  if (!response.ok) {
    throw new Error(`Agent request failed with ${response.status}`);
  }

  return (await response.json()) as {
    text: string;
    suggestions: string[];
  };
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([initialAssistantMessage]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    textAreaRef.current?.focus();
  }, []);

  const latestSuggestions = useMemo(() => {
    const assistantMessages = messages.filter(
      (message) => message.role === "assistant"
    );
    return assistantMessages[assistantMessages.length - 1]?.suggestions ?? [];
  }, [messages]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!input.trim() || loading) return;
    await dispatchMessage(input.trim());
    setInput("");
  };

  const dispatchMessage = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;

    setError(null);
    const userMessage: Message = {
      id: `user-${createId()}`,
      role: "user",
      content: trimmed,
    };

    const optimisticHistory = [...messages, userMessage];
    setMessages(optimisticHistory);
    setLoading(true);

    try {
      const agentResponse = await sendToAgent(optimisticHistory);
      const assistantMessage: Message = {
        id: `assistant-${createId()}`,
        role: "assistant",
        content: agentResponse.text,
        suggestions: agentResponse.suggestions?.slice(0, 4) ?? [],
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error(err);
      setError("Crew bot lost connection. Try again.");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.badge}>Crew AI</p>
          <h1>McDonald&apos;s Order Assistant</h1>
          <p className={styles.tagline}>
            Menu knowledge, combos, and service tips from a virtual crew member
            trained on McDonald&apos;s favorites.
          </p>
        </div>
        <div className={styles.quickStart}>
          {quickStarts.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => dispatchMessage(suggestion)}
              disabled={loading}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </header>

      <section className={styles.chatCard}>
        <div ref={chatRef} className={styles.chatStream}>
          {messages.map((message) => (
            <article
              key={message.id}
              className={`${styles.message} ${
                message.role === "assistant" ? styles.assistant : styles.user
              }`}
            >
              <div className={styles.messageRole}>
                {message.role === "assistant" ? "Crew AI" : "You"}
              </div>
              <p className={styles.messageBody}>{message.content}</p>
              {message.role === "assistant" &&
                message.suggestions &&
                message.suggestions.length > 0 && (
                  <div className={styles.messageSuggestions}>
                    {message.suggestions.map((suggestion) => (
                      <button
                        key={`${message.id}-${suggestion}`}
                        type="button"
                        onClick={() => dispatchMessage(suggestion)}
                        disabled={loading}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
            </article>
          ))}
        </div>
        <form className={styles.inputDock} onSubmit={handleSubmit}>
          <textarea
            ref={textAreaRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask for spicy chicken, vegetarian combos, or mobile order tips..."
            rows={2}
            disabled={loading}
          />
          <div className={styles.inputActions}>
            {error && <p className={styles.error}>{error}</p>}
            <button type="submit" disabled={loading || !input.trim()}>
              {loading ? "Thinking..." : "Send"}
            </button>
          </div>
        </form>
      </section>

      {latestSuggestions.length > 0 && (
        <section className={styles.followUps}>
          <h2>Try asking</h2>
          <div className={styles.suggestionRow}>
            {latestSuggestions.map((suggestion) => (
              <button
                key={`follow-${suggestion}`}
                type="button"
                onClick={() => dispatchMessage(suggestion)}
                disabled={loading}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
