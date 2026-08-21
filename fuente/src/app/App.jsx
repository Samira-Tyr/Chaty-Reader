import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import workerSource from "virtual:chaty-worker";
import { modelsFromMessages } from "../model/schema.js";
import { searchConversations } from "./search.js";

const PAGE_SIZE = 120;
const THEME_OPTIONS = [
  { id: "deep-blue", label: "Azul profundo" },
  { id: "ivory", label: "Marfil" },
  { id: "steampunk", label: "Steampunk" },
];

export function App() {
  const [conversations, setConversations] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [fileSummary, setFileSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [sortOrder, setSortOrder] = useState("newest");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [page, setPage] = useState({ conversationId: null, limit: PAGE_SIZE });
  const [theme, setTheme] = useState(() => safeStoredTheme());

  const fileInputRef = useRef(null);
  const workerRef = useRef(null);
  const readerRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("chaty-reader-theme", theme);
  }, [theme]);

  useEffect(() => {
    const blob = new Blob([workerSource], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    workerRef.current = worker;

    worker.onmessage = (event) => {
      setLoading(false);
      setLoadingText("");
      if (!event.data.ok) {
        setError(event.data.error || "No pude leer estos archivos.");
        return;
      }

      const document = event.data.document;
      const loaded = document.conversations || [];
      setConversations(loaded);
      setPlatforms(document.platforms || []);
      setSelectedId(loaded[0]?.id ?? null);
      setPage({ conversationId: loaded[0]?.id ?? null, limit: PAGE_SIZE });
      setError(loaded.length ? "" : "No encontré conversaciones visibles en estos archivos.");
      window.setTimeout(() => readerRef.current?.scrollTo({ top: 0 }), 0);
    };

    return () => {
      worker.terminate();
      URL.revokeObjectURL(url);
    };
  }, []);

  const availableModels = useMemo(() => {
    const unique = new Map();
    for (const conversation of conversations) {
      for (const model of conversationModels(conversation)) {
        if (!unique.has(model.id)) unique.set(model.id, model);
      }
    }
    return Array.from(unique.values()).sort((left, right) =>
      left.label.localeCompare(right.label, "es"),
    );
  }, [conversations]);

  const results = useMemo(
    () =>
      searchConversations(
        conversations,
        deferredQuery,
        sortOrder,
        dateFrom,
        dateTo,
        modelFilter,
      ),
    [conversations, deferredQuery, sortOrder, dateFrom, dateTo, modelFilter],
  );

  const selectedConversation =
    conversations.find((conversation) => conversation.id === selectedId) || null;
  const selectedResult = results.find((conversation) => conversation.id === selectedId) || null;
  const messages = selectedConversation?.messages || [];
  const visibleLimit =
    page.conversationId === selectedConversation?.id ? page.limit : PAGE_SIZE;
  const visibleMessages = messages.slice(0, visibleLimit);
  const selectedModels = conversationModels(selectedConversation);
  const selectedModelCoverage = modelCoverage(selectedConversation);
  const totalMessages = conversations.reduce(
    (total, conversation) => total + conversation.messages.length,
    0,
  );

  function openFiles(incomingFiles) {
    const files = Array.from(incomingFiles || [])
      .filter((file) => file.name.toLocaleLowerCase().endsWith(".json"))
      .sort((left, right) => left.name.localeCompare(right.name));

    if (!files.length) {
      setError("Elige uno o varios archivos JSON de una exportación compatible.");
      return;
    }

    setError("");
    setQuery("");
    setDateFrom("");
    setDateTo("");
    setModelFilter("");
    setPage({ conversationId: null, limit: PAGE_SIZE });
    setLoading(true);
    setLoadingText(
      files.length === 1
        ? "Detectando, leyendo y ordenando la exportación…"
        : `Detectando y uniendo ${files.length} archivos…`,
    );
    const summary = files.length === 1 ? files[0].name : `${files.length} archivos JSON`;
    setFileSummary(summary);
    workerRef.current?.postMessage({ files });
  }

  function selectConversation(result) {
    const matchIndex = result.firstMatchId
      ? result.messages.findIndex((message) => message.id === result.firstMatchId)
      : -1;
    setSelectedId(result.id);
    setPage({
      conversationId: result.id,
      limit: matchIndex >= 0 ? Math.max(PAGE_SIZE, matchIndex + 1) : PAGE_SIZE,
    });

    window.setTimeout(() => {
      if (result.firstMatchId) scrollToMessage(result.firstMatchId, readerRef.current);
      else readerRef.current?.scrollTo({ top: 0 });
    }, 0);
  }

  async function copyText(text, id) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      textArea.remove();
    }
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 1500);
  }

  function resetListScroll() {
    window.setTimeout(() => listRef.current?.scrollTo({ top: 0 }), 0);
  }

  return (
    <main
      className={`app-shell ${dragging ? "is-dragging" : ""}`}
      onDragEnter={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        openFiles(event.dataTransfer.files);
      }}
    >
      <input
        ref={fileInputRef}
        className="sr-only"
        type="file"
        accept="application/json,.json"
        multiple
        onChange={(event) => {
          openFiles(event.target.files);
          event.target.value = "";
        }}
      />

      <header className="topbar">
        <div className="brand">
          <img src="./assets/chaty-logo.svg" alt="" className="brand-mark" />
          <div>
            <p className="eyebrow">AI Memory Decoder</p>
            <h1>Chaty Reader</h1>
          </div>
        </div>
        <div className="topbar-actions">
          <label className="theme-control">
            <span>Tema</span>
            <select
              value={theme}
              onChange={(event) => setTheme(event.target.value)}
              aria-label="Tema visual"
            >
              {THEME_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button className="primary-button" onClick={() => fileInputRef.current?.click()}>
            <span aria-hidden="true">＋</span>
            {conversations.length ? "Cambiar archivos" : "Abrir conversaciones"}
          </button>
        </div>
      </header>

      {conversations.length ? (
        <div className="workspace">
          <aside className="sidebar" aria-label="Conversaciones">
            <div className="file-summary">
              <span className={`status-dot ${loading ? "is-loading" : ""}`} aria-hidden="true" />
              <div>
                <strong>{fileSummary}</strong>
                <span>
                  {loadingText || (
                    <>
                      {conversations.length.toLocaleString("es-ES")} chats ·{" "}
                      {totalMessages.toLocaleString("es-ES")} mensajes
                    </>
                  )}
                </span>
              </div>
              <span className="platform-badge">{platforms.map(platformLabel).join(" + ")}</span>
            </div>

            <label className="search-box">
              <span aria-hidden="true">⌕</span>
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage({ conversationId: null, limit: PAGE_SIZE });
                  resetListScroll();
                }}
                placeholder="Busca un chat, frase, fecha o modelo…"
                autoFocus
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setPage({ conversationId: null, limit: PAGE_SIZE });
                    resetListScroll();
                  }}
                  aria-label="Borrar búsqueda"
                >
                  ×
                </button>
              )}
            </label>

            <div className="date-tools">
              <label className="filter-field filter-order">
                <span>Orden</span>
                <select
                  value={sortOrder}
                  onChange={(event) => {
                    setSortOrder(event.target.value);
                    resetListScroll();
                  }}
                >
                  <option value="newest">Más recientes primero</option>
                  <option value="oldest">Más antiguas primero</option>
                </select>
              </label>
              <label className="filter-field filter-model">
                <span>Modelo</span>
                <select
                  value={modelFilter}
                  onChange={(event) => {
                    setModelFilter(event.target.value);
                    setPage({ conversationId: null, limit: PAGE_SIZE });
                    resetListScroll();
                  }}
                  disabled={!availableModels.length}
                >
                  <option value="">Todos los modelos</option>
                  {availableModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="date-range">
                <label className="filter-field">
                  <span>Desde</span>
                  <input
                    type="date"
                    value={dateFrom}
                    max={dateTo || undefined}
                    onChange={(event) => {
                      setDateFrom(event.target.value);
                      resetListScroll();
                    }}
                  />
                </label>
                <label className="filter-field">
                  <span>Hasta</span>
                  <input
                    type="date"
                    value={dateTo}
                    min={dateFrom || undefined}
                    onChange={(event) => {
                      setDateTo(event.target.value);
                      resetListScroll();
                    }}
                  />
                </label>
              </div>
              {(dateFrom || dateTo || modelFilter) && (
                <button
                  className="clear-date-button"
                  onClick={() => {
                    setDateFrom("");
                    setDateTo("");
                    setModelFilter("");
                    resetListScroll();
                  }}
                >
                  Quitar filtros
                </button>
              )}
            </div>

            <div className="results-heading" aria-live="polite">
              <span>
                {query
                  ? `${results.length} coincidencias`
                  : dateFrom || dateTo || modelFilter
                    ? `${results.length} filtradas`
                    : "Conversaciones"}
              </span>
              <span>{results.length}</span>
            </div>

            <div className="conversation-list" ref={listRef}>
              {results.map((conversation) => (
                <button
                  key={conversation.id}
                  className={`conversation-card ${selectedId === conversation.id ? "selected" : ""}`}
                  onClick={() => selectConversation(conversation)}
                >
                  <span className="conversation-title">{conversation.title}</span>
                  {conversationModels(conversation).length > 0 && (
                    <span
                      className="conversation-models"
                      title={conversationModels(conversation)
                        .map((model) => `Identificador: ${model.id}`)
                        .join("\n")}
                    >
                      {conversationModels(conversation)
                        .map((model) => model.label)
                        .join(" · ")}
                    </span>
                  )}
                  <span className="conversation-snippet">{conversation.snippet}</span>
                  <span className="conversation-meta">
                    <time
                      title={
                        query && conversation.matchTime
                          ? "Fecha y hora del mensaje encontrado"
                          : "Fecha de la conversación"
                      }
                    >
                      {query && conversation.matchTime
                        ? `Coincidencia · ${formatExactDate(conversation.matchTime)}`
                        : formatDate(conversation.createdAt)}
                    </time>
                    {query && (
                      <b>
                        {conversation.matchCount}{" "}
                        {conversation.matchCount === 1 ? "mensaje" : "mensajes"}
                      </b>
                    )}
                  </span>
                </button>
              ))}
              {!results.length && (
                <div className="empty-results">
                  <span aria-hidden="true">⌕</span>
                  <p>No encontré ese recuerdo.</p>
                  <small>Prueba con menos palabras, otra fecha o una frase distinta.</small>
                </div>
              )}
            </div>
          </aside>

          <section className="reader" ref={readerRef} aria-label="Conversación seleccionada">
            {selectedConversation ? (
              <>
                <header className="reader-header">
                  <div>
                    <div className="reader-kicker">
                      <p className="eyebrow">{formatDate(selectedConversation.createdAt, true)}</p>
                      <span className="platform-badge">
                        {platformLabel(selectedConversation.platform)}
                      </span>
                    </div>
                    <h2>{selectedConversation.title}</h2>
                    <p className="conversation-count">
                      {selectedConversation.messages.length} mensajes
                      {query ? " · abre un resultado para ir a la coincidencia" : ""}
                    </p>
                    <div className="conversation-model-summary">
                      {selectedModels.length ? (
                        <>
                          <span className="model-summary-label">Modelos registrados</span>
                          <span className="model-summary-badges">
                            {selectedModels.map((model) => (
                              <span
                                key={model.id}
                                className="model-badge"
                                title={`Identificador de la exportación: ${model.id}`}
                              >
                                {model.label}
                              </span>
                            ))}
                          </span>
                          <span className="model-coverage">
                            {selectedModelCoverage.identified}/{selectedModelCoverage.total}{" "}
                            respuestas identificadas
                          </span>
                        </>
                      ) : (
                        <span className="model-missing">
                          Modelo no indicado en esta exportación
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="reader-actions">
                    <button
                      onClick={() =>
                        copyText(conversationAsText(selectedConversation), `chat-${selectedConversation.id}`)
                      }
                    >
                      {copiedId === `chat-${selectedConversation.id}` ? "Copiado" : "Copiar chat"}
                    </button>
                    <button onClick={() => saveConversation(selectedConversation)}>Guardar .txt</button>
                  </div>
                </header>

                <div className="messages">
                  {visibleMessages.map((message) => {
                    const isMatch = selectedResult?.matchIds?.includes(message.id);
                    return (
                      <article
                        key={message.id}
                        id={`message-${message.id}`}
                        className={`message message-${message.role} ${isMatch ? "search-match" : ""}`}
                      >
                        <div className="message-avatar" aria-hidden="true">
                          {message.role === "user" ? "T" : "◐"}
                        </div>
                        <div className="message-body">
                          <div className="message-heading">
                            <strong>{message.authorLabel}</strong>
                            {message.model && (
                              <span
                                className="model-badge message-model"
                                title={`Identificador de la exportación: ${message.model.id}`}
                              >
                                {message.model.label}
                              </span>
                            )}
                            {message.createdAt && (
                              <time
                                className="message-time"
                                dateTime={new Date(message.createdAt * 1000).toISOString()}
                                title="Fecha y hora guardadas en la exportación"
                              >
                                {formatExactDate(message.createdAt)}
                              </time>
                            )}
                            <button onClick={() => copyText(message.text, message.id)}>
                              {copiedId === message.id ? "Copiado" : "Copiar"}
                            </button>
                          </div>
                          <div className="message-text">{message.text}</div>
                        </div>
                      </article>
                    );
                  })}

                  {visibleMessages.length < messages.length && (
                    <div className="load-more-wrap">
                      <p className="message-progress">
                        Mostrando {visibleMessages.length} de {messages.length} mensajes
                      </p>
                      <button
                        className="load-more-button"
                        onClick={() =>
                          setPage((current) => ({
                            conversationId: selectedConversation.id,
                            limit:
                              current.conversationId === selectedConversation.id
                                ? current.limit + PAGE_SIZE
                                : PAGE_SIZE * 2,
                          }))
                        }
                      >
                        Cargar {PAGE_SIZE} mensajes más
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="reader-empty">Elige una conversación para leerla.</div>
            )}
          </section>
        </div>
      ) : (
        <section className="welcome-panel" aria-busy={loading}>
          <div className="welcome-glow" />
          <img src="./assets/chaty-logo.svg" alt="Lobo y media luna" className="welcome-logo" />
          <p className="eyebrow">Tus conversaciones, legibles otra vez</p>
          <h2>Abre una exportación y encuentra el recuerdo que buscas.</h2>
          <p className="welcome-copy">
            Suelta aquí uno o varios archivos <strong>JSON</strong>. Chaty detecta el formato,
            separa los chats y los ordena sin subir nada fuera de tu dispositivo.
          </p>
          <button
            className="hero-button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
          >
            {loading ? "Leyendo los archivos…" : "Elegir archivos JSON"}
          </button>
          <p className="drop-hint">También puedes arrastrarlos a esta ventana</p>
          {loadingText && (
            <div className="loading-line">
              <span /> {loadingText}
            </div>
          )}
          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}
          <div className="heart-principle">
            Chaty ordena los recuerdos. <strong>Tú decides cuáles tienen corazón.</strong>
          </div>
          <div className="privacy-note">
            <span aria-hidden="true">◆</span> Sin nube · sin cuenta · sin API · sin conexión
          </div>
        </section>
      )}

      {dragging && (
        <div className="drag-overlay">
          <strong>Suelta los archivos aquí</strong>
          <span>Solo se abrirán en tu dispositivo</span>
        </div>
      )}
    </main>
  );
}

function formatDate(timestamp, withTime = false) {
  if (!timestamp) return "Sin fecha";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: withTime ? "long" : "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(timestamp * 1000));
}

function formatExactDate(timestamp) {
  if (!timestamp) return "Sin hora individual";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  }).format(new Date(timestamp * 1000));
}

function platformLabel(platform) {
  return platform === "chatgpt" ? "ChatGPT" : platform;
}

function conversationAsText(conversation, separator = "\n\n") {
  return conversation.messages
    .map(
      (message) => {
        const model = message.model ? ` · ${message.model.label}` : "";
        return `${message.authorLabel}${model} · ${formatExactDate(message.createdAt)}\n${message.text}`;
      },
    )
    .join(separator);
}

function conversationModels(conversation) {
  if (!conversation) return [];
  return Array.isArray(conversation.models)
    ? conversation.models
    : modelsFromMessages(conversation.messages || []);
}

function modelCoverage(conversation) {
  if (!conversation) return { identified: 0, total: 0 };
  if (conversation.modelCoverage) return conversation.modelCoverage;
  const assistants = (conversation.messages || []).filter(
    (message) => message.role === "assistant",
  );
  return {
    identified: assistants.filter((message) => message.model).length,
    total: assistants.length,
  };
}

function saveConversation(conversation) {
  const content = `${conversation.title}\n${formatDate(conversation.createdAt, true)}\n\n${conversationAsText(conversation, "\n\n──────────\n\n")}`;
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeFilename(conversation.title) || "conversacion"}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeFilename(value) {
  return value.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim();
}

function scrollToMessage(messageId, container) {
  if (!container) return;
  const element = document.getElementById(`message-${messageId}`);
  if (!element) return;
  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  container.scrollTo({
    top: Math.max(0, container.scrollTop + elementRect.top - containerRect.top - container.clientHeight * 0.3),
  });
}

function safeStoredTheme() {
  const stored = localStorage.getItem("chaty-reader-theme");
  return THEME_OPTIONS.some((option) => option.id === stored) ? stored : "deep-blue";
}
