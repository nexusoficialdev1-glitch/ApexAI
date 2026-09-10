"use strict";

const STORAGE_KEY = "nexusai_chats";
const THEME_KEY = "nexusai_theme";
const API_URL = "https://nexusaia.onrender.com/api/chat";
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);
const sidebar = $("#sidebar");
const sidebarOverlay = $("#sidebarOverlay");
const newChatBtn = $("#newChatBtn");
const mobileNewChat = $("#mobileNewChat");
const searchToggle = $("#searchToggle");
const searchBox = $("#searchBox");
const chatSearch = $("#chatSearch");
const closeSearch = $("#closeSearch");
const clearHistoryBtn = $("#clearHistoryBtn");
const chatList = $("#chatList");
const emptyHistory = $("#emptyHistory");
const themeBtn = $("#themeBtn");
const menuBtn = $("#menuBtn");

menuBtn?.addEventListener("click", () => {
    if (window.innerWidth >= 769) {
        document.body.classList.toggle("sidebar-collapsed");

        localStorage.setItem(
            "nexusai_sidebar_collapsed",
            document.body.classList.contains("sidebar-collapsed")
        );
    } else {
        document.body.classList.toggle("sidebar-open");
    }
});

const conversation = $("#conversation");
const welcome = $("#welcome");
const messages = $("#messages");
const messageInput = $("#messageInput");
const sendBtn = $("#sendBtn");
const fileInput = $("#fileInput");
const attachmentPreview = $("#attachmentPreview");
const contextMenu = $("#contextMenu");
const modalBackdrop = $("#modalBackdrop");
const cancelDelete = $("#cancelDelete");
const confirmDelete = $("#confirmDelete");
const toast = $("#toast");
const userName = $("#userName");
const userEmail = $("#userEmail");
const userAvatar = $("#userAvatar");

let chats = [];
let currentChatId = null;

let selectedChatId = null;
let selectedFile = null;

let isGenerating = false;

const IMAGE_DB_NAME = "nexusai_images";
const IMAGE_DB_VERSION = 1;
const IMAGE_STORE_NAME = "images";

function openImageDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(
            IMAGE_DB_NAME,
            IMAGE_DB_VERSION
        );

        request.onupgradeneeded = () => {
            const db = request.result;

            if (!db.objectStoreNames.contains(IMAGE_STORE_NAME)) {
                db.createObjectStore(IMAGE_STORE_NAME);
            }
        };

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}

function saveImage(messageId, file) {
    return openImageDB().then((db) => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(
                IMAGE_STORE_NAME,
                "readwrite"
            );

            const store = transaction.objectStore(
                IMAGE_STORE_NAME
            );

            const request = store.put(file, messageId);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    });
}

function getImage(messageId) {
    return openImageDB().then((db) => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(
                IMAGE_STORE_NAME,
                "readonly"
            );

            const store = transaction.objectStore(
                IMAGE_STORE_NAME
            );

            const request = store.get(messageId);

            request.onsuccess = () => {
                resolve(request.result || null);
            };

            request.onerror = () => reject(request.error);
        });
    });
}

document.addEventListener("DOMContentLoaded", () => {
    loadTheme();
    loadChats();

    setupEvents();
    setupPromptCards();

    autoResizeTextarea();
    updateSendButton();

    renderChatList();

    const urlChatId = getChatIdFromUrl();

    if (urlChatId && chats.some((chat) => chat.id === urlChatId)) {
        openChat(urlChatId, { updateUrl: false });
    } else {
        showWelcome();
    }

    loadUser();
});


if (
    window.innerWidth >= 769 &&
    localStorage.getItem("nexusai_sidebar_collapsed") === "true"
) {
    document.body.classList.add("sidebar-collapsed");
}

function setupEvents() {

    newChatBtn?.addEventListener("click", createNewChat);

    mobileNewChat?.addEventListener("click", () => {
        createNewChat();
        closeMobileSidebar();
    });

    menuBtn?.addEventListener("click", openMobileSidebar);

    sidebarOverlay?.addEventListener("click", closeMobileSidebar);


    searchToggle?.addEventListener("click", openSearch);

    closeSearch?.addEventListener("click", closeSearchBox);

    chatSearch?.addEventListener("input", () => {
        renderChatList(chatSearch.value.trim());
    });


    document.addEventListener("keydown", (event) => {

        if (
            (event.ctrlKey || event.metaKey) &&
            event.key.toLowerCase() === "k"
        ) {
            event.preventDefault();

            openSearch();
        }
    });


    messageInput?.addEventListener("input", () => {
        autoResizeTextarea();
        updateSendButton();
    });


    messageInput?.addEventListener("keydown", (event) => {

        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();

            if (!isGenerating) {
                sendMessage();
            }
        }
    });


    sendBtn?.addEventListener("click", sendMessage);


    fileInput?.addEventListener("change", handleFile);


    themeBtn?.addEventListener("click", toggleTheme);


    clearHistoryBtn?.addEventListener("click", openDeleteModal);

    cancelDelete?.addEventListener("click", closeDeleteModal);

    confirmDelete?.addEventListener("click", clearAllChats);


    document.addEventListener("click", (event) => {

        if (
            contextMenu &&
            !contextMenu.contains(event.target)
        ) {
            closeContextMenu();
        }
    });


    contextMenu?.addEventListener("click", handleContextAction);


    document.addEventListener("keydown", (event) => {

        if (event.key === "Escape") {
            closeContextMenu();
            closeDeleteModal();
            closeSearchBox();
            closeMobileSidebar();
        }
    });
}

function setupPromptCards() {

    $$(".prompt-card").forEach((button) => {

        button.addEventListener("click", () => {

            const prompt = button.dataset.prompt;

            if (!prompt) return;

            messageInput.value = prompt;

            autoResizeTextarea();
            updateSendButton();

            messageInput.focus();
        });
    });
}

function createNewChat() {

    const chat = {
        id: generateId(),
        title: "Nueva conversación",
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
    };

    chats.unshift(chat);

    currentChatId = chat.id;

    saveChats();
    renderChatList();

    showChat(chat);
    updateUrlForChat(chat.id);

    messageInput.value = "";

    autoResizeTextarea();
    updateSendButton();

    messageInput.focus();
}

async function sendMessage() {

    if (isGenerating) return;

    const text = messageInput.value.trim();
    const file = selectedFile;

    if (!text && !file) return;

    if (!currentChatId) {
        createNewChat();
    }

    const chat = getCurrentChat();

    if (!chat) return;

    hideWelcome();

    const userMessage = {
        id: generateId(),
        role: "user",
        content: text,
        createdAt: Date.now()
    };

    chat.messages.push(userMessage);

    if (file) {
        try {
            await saveImage(userMessage.id, file);
        } catch (error) {
            console.error(
                "No se pudo guardar la imagen:",
                error
            );

            showToast(
                "No se pudo guardar la imagen"
            );
        }
    }

    if (
        chat.title === "Nueva conversación" ||
        !chat.title
    ) {
        chat.title = createChatTitle(text);
    }

    chat.updatedAt = Date.now();

    saveChats();
    renderChatList();

    let imageUrl = null;

    if (file) {
        imageUrl = URL.createObjectURL(file);
    }

    appendMessage(userMessage, imageUrl);

    messageInput.value = "";

    autoResizeTextarea();
    updateSendButton();

    clearAttachment();

    await generateResponse(
        chat,
        text,
        file
    );
}

async function generateResponse(chat, userText, file) {

    isGenerating = true;

    updateSendButton();

    const typingElement = appendTyping();


    try {

        let apiResult;

if (API_URL) {
    apiResult = await requestAPI(
        chat,
        userText,
        file
    );
} else {
    apiResult = {
        text: await demoResponse(userText),
        images: []
    };
}

typingElement.remove();

const assistantMessage = {
    id: generateId(),
    role: "assistant",
    content: apiResult.text,
    images: apiResult.images,
    createdAt: Date.now()
};


        chat.messages.push(assistantMessage);
        chat.updatedAt = Date.now();

        saveChats();

        appendMessage(assistantMessage);


    } catch (error) {

        console.error("NexusAI error:", error);

        typingElement.remove();


        const errorMessage = {
            id: generateId(),
            role: "assistant",
            content:
                "Lo siento, ocurrió un error al procesar tu mensaje. Comprueba la conexión con el servidor e inténtalo de nuevo.",
            createdAt: Date.now()
        };


        chat.messages.push(errorMessage);

        saveChats();

        appendMessage(errorMessage);

        showToast("No se pudo obtener una respuesta");


    } finally {

        isGenerating = false;

        updateSendButton();
    }
}

async function requestAPI(chat, text, file) {
    const payload = {
        message: text,
        conversation_id: chat.id,
        history: chat.messages,
        custom_instructions: getCustomInstructions()
    };

    if (file) {
        if (!file.type.startsWith("image/")) {
            throw new Error("Solo se pueden adjuntar imágenes.");
        }

        if (file.size > 10 * 1024 * 1024) {
            throw new Error("La imagen no puede superar los 10 MB.");
        }

        const imageBase64 = await fileToBase64(file);

        payload.history = chat.messages.map(message => ({
            role: message.role,
            content: message.content,
            ...(message.images ? { images: message.images } : {})
        }));

        const lastMessage = payload.history[payload.history.length - 1];

        if (lastMessage && lastMessage.role === "user") {
            lastMessage.images = [imageBase64];
        }
    }

    const response = await fetch(
        API_URL,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        }
    );

    if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(
            `API error: ${response.status}${errorText ? ` - ${errorText}` : ""}`
        );
    }

    const data = await response.json();

return {
    text: extractAPIResponse(data),
    images: Array.isArray(data.images) ? data.images : []
};

}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            const result = reader.result;

            const base64 = result.split(",")[1];

            if (!base64) {
                reject(new Error("No se pudo procesar la imagen."));
                return;
            }

            resolve(base64);
        };

        reader.onerror = () => {
            reject(new Error("No se pudo leer la imagen."));
        };

        reader.readAsDataURL(file);
    });
}

function extractAPIResponse(data) {

    if (typeof data === "string") {
        return data;
    }


    if (data.response) {
        return data.response;
    }


    if (data.message) {
        return data.message;
    }


    if (data.content) {
        return data.content;
    }


    if (data.reply) {
        return data.reply;
    }


    if (
        data.choices &&
        data.choices[0]
    ) {

        const choice = data.choices[0];

        if (choice.message?.content) {
            return choice.message.content;
        }

        if (choice.text) {
            return choice.text;
        }
    }


    return "El servidor respondió, pero no se encontró contenido en la respuesta.";
}

function demoResponse(text) {

    return new Promise((resolve) => {

        const delay =
            700 +
            Math.random() * 900;


        setTimeout(() => {

            const lower = text.toLowerCase();


            if (
                lower.includes("hola") ||
                lower.includes("buenas")
            ) {

                resolve(
                    "¡Hola! 👋 Soy NexusAI. ¿Qué hacemos hoy?"
                );

                return;
            }


            if (
                lower.includes("historia")
            ) {

                resolve(
                    "¡Claro! Podemos crear una historia desde cero. Dame un personaje, un lugar y un problema, y empezamos. ✨"
                );

                return;
            }


            if (
                lower.includes("organizar") ||
                lower.includes("día")
            ) {

                resolve(
                    "Podemos organizarlo fácilmente. Divide tu día en bloques: estudio, tareas importantes, descansos y tiempo libre. 📅"
                );

                return;
            }


            if (
                lower.includes("película")
            ) {

                resolve(
                    "Puedo ayudarte a encontrar una película según el género, duración o tipo de historia que tengas ganas de ver. 🎬"
                );

                return;
            }


            if (
                lower.includes("html") ||
                lower.includes("css") ||
                lower.includes("javascript")
            ) {

                resolve(
                    "¡Sí! Puedo ayudarte con HTML, CSS y JavaScript. Si me pasas tu código, podemos revisarlo y mejorarlo paso a paso. 💻"
                );

                return;
            }


            resolve(
                `Entendido. Recibí tu mensaje: "${text}". Cuando conectemos el backend de NexusAI, esta respuesta será generada por tu modelo de IA. 🚀`
            );

        }, delay);
    });
}

function appendMessage(message, imageUrl = null) {

    if (!messages) return;

    const article = document.createElement("article");

    article.className =
        `message ${message.role === "user" ? "user" : "assistant"}`;

    const avatar = document.createElement("div");

    avatar.className = "message-avatar";

    if (message.role === "user") {

        avatar.textContent =
            getUserInitial();

    } else {

        avatar.innerHTML =
            `<img src="/img/icon.png"
                alt="ApexAI"
                style="width:100%;height:100%;object-fit:cover;border-radius:9px;">`;
    }

    const content = document.createElement("div");

    content.className =
        "message-content";

    const role = document.createElement("div");

    role.className =
        "message-role";

    role.textContent =
        message.role === "user"
            ? getUserName()
            : "ApexAi";

    content.appendChild(role);

    if (
        imageUrl &&
        message.role === "user"
    ) {

        const image =
            document.createElement("img");

        image.className =
            "message-image";

        image.src =
            imageUrl;

        image.alt =
            "Imagen adjunta";

        image.addEventListener("click", () => {
    openImageViewer(imageUrl);
});

        content.appendChild(image);
    }

    const text =
        document.createElement("div");

    text.className =
        "message-text";

    renderMessageContent(
        text,
        message.content
    );

    content.appendChild(text);

    if (
    message.role === "assistant" &&
    Array.isArray(message.images) &&
    message.images.length > 0
) {
    const gallery = document.createElement("div");

    gallery.className = "assistant-image-gallery";

    message.images.forEach(item => {
        const img = document.createElement("img");

        img.src = item.url;
        img.alt = item.title || "Imagen";
        img.loading = "lazy";
        img.className = "assistant-image";

        img.addEventListener("click", () => {
            openImageViewer(item.url);
        });

        gallery.appendChild(img);
    });

    content.appendChild(gallery);
}

    if (
        message.role === "assistant"
    ) {

        content.appendChild(
            createMessageActions(message)
        );
    }

    article.appendChild(avatar);
    article.appendChild(content);

    messages.appendChild(article);

    scrollToBottom();
}

function openImageViewer(imageUrl) {
    const viewer = document.createElement("div");
    viewer.className = "image-viewer";

    viewer.innerHTML = `
        <button class="image-viewer-close" aria-label="Cerrar">
            <i class="fa-solid fa-xmark"></i>
        </button>
        <img src="${imageUrl}" alt="Imagen adjunta">
    `;

    document.body.appendChild(viewer);

    const closeViewer = () => {
        viewer.remove();
    };

    viewer.querySelector(".image-viewer-close").addEventListener("click", closeViewer);

    viewer.addEventListener("click", (event) => {
        if (event.target === viewer) {
            closeViewer();
        }
    });

    document.addEventListener("keydown", function escapeHandler(event) {
        if (event.key === "Escape") {
            closeViewer();
            document.removeEventListener("keydown", escapeHandler);
        }
    });
}

function createMessageActions(message) {

    const actions = document.createElement("div");
    actions.className = "message-actions";


    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "message-action-btn";
    copyBtn.title = "Copiar";
    copyBtn.setAttribute("aria-label", "Copiar mensaje");
    copyBtn.innerHTML = `<i class="fa-regular fa-copy"></i>`;

        copyBtn.addEventListener("click", () => {
        copyMessageText(message.content, copyBtn);
    });

    const speakBtn = document.createElement("button");
    speakBtn.type = "button";
    speakBtn.className = "message-action-btn";
    speakBtn.title = "Escuchar";
    speakBtn.setAttribute("aria-label", "Escuchar mensaje");
    speakBtn.innerHTML = `<i class="fa-solid fa-volume-high"></i>`;

    speakBtn.addEventListener("click", () => {
        toggleSpeakMessage(message.content, speakBtn);
    });

    const likeBtn = document.createElement("button");
    likeBtn.type = "button";
    likeBtn.className = "message-action-btn message-like-btn";
    likeBtn.title = "Buena respuesta";
    likeBtn.setAttribute("aria-label", "Buena respuesta");


    const dislikeBtn = document.createElement("button");
    dislikeBtn.type = "button";
    dislikeBtn.className = "message-action-btn message-dislike-btn";
    dislikeBtn.title = "Mala respuesta";
    dislikeBtn.setAttribute("aria-label", "Mala respuesta");


    updateFeedbackButtons(message.feedback, likeBtn, dislikeBtn);


    likeBtn.addEventListener("click", () => {
        const next = message.feedback === "like" ? null : "like";

        setMessageFeedback(message, next);
        updateFeedbackButtons(message.feedback, likeBtn, dislikeBtn);
    });

    dislikeBtn.addEventListener("click", () => {
        const next = message.feedback === "dislike" ? null : "dislike";

        setMessageFeedback(message, next);
        updateFeedbackButtons(message.feedback, likeBtn, dislikeBtn);
    });


        actions.appendChild(copyBtn);
    actions.appendChild(speakBtn);
    actions.appendChild(likeBtn);
    actions.appendChild(dislikeBtn);

    return actions;
}


function updateFeedbackButtons(feedback, likeBtn, dislikeBtn) {

    likeBtn.classList.toggle("active", feedback === "like");
    dislikeBtn.classList.toggle("active", feedback === "dislike");

    likeBtn.innerHTML =
        feedback === "like"
            ? `<i class="fa-solid fa-thumbs-up"></i>`
            : `<i class="fa-regular fa-thumbs-up"></i>`;

    dislikeBtn.innerHTML =
        feedback === "dislike"
            ? `<i class="fa-solid fa-thumbs-down"></i>`
            : `<i class="fa-regular fa-thumbs-down"></i>`;
}


function setMessageFeedback(message, value) {

    message.feedback = value;

    const chat = getCurrentChat();

    if (chat) {
        const target = chat.messages.find(
            (item) => item.id === message.id
        );

        if (target) {
            target.feedback = value;
        }
    }

    saveChats();

    if (value === "like") {
        showToast("Gracias por tu feedback 👍");
    } else if (value === "dislike") {
        showToast("Gracias por tu feedback 👎");
    }
}


function copyMessageText(content, button) {

    if (!content) return;


    const finish = () => {
        const icon = button.querySelector("i");
        if (!icon) return;

        const original = icon.className;
        icon.className = "fa-solid fa-check";

        showToast("Mensaje copiado");

        setTimeout(() => {
            icon.className = original;
        }, 1500);
    };


    if (navigator.clipboard?.writeText) {

        navigator.clipboard.writeText(content)
            .then(finish)
            .catch(() => fallbackCopy(content, finish));

    } else {

        fallbackCopy(content, finish);
    }
}

let currentSpeakUtterance = null;
let currentSpeakButton = null;

function stripMarkdownForSpeech(text) {
    return String(text)
        .replace(/```[\s\S]*?```/g, " código de ejemplo. ")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/^#{1,6}\s+/gm, "")
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/__([^_]+)__/g, "$1")
        .replace(/\*([^*]+)\*/g, "$1")
        .replace(/_([^_]+)_/g, "$1")
        .replace(/~~([^~]+)~~/g, "$1")
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/^\s*>\s?/gm, "")
        .replace(/^\s*[-*+]\s+/gm, "")
        .replace(/^\s*\d+\.\s+/gm, "")
        .replace(/\n{2,}/g, ". ")
        .replace(/\n/g, " ")
        .trim();
}

function toggleSpeakMessage(content, button) {
    if (!("speechSynthesis" in window)) {
        showToast("Tu navegador no soporta lectura en voz alta");
        return;
    }

    const icon = button.querySelector("i");

    if (currentSpeakButton === button && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        return;
    }

    window.speechSynthesis.cancel();

    const cleanText = stripMarkdownForSpeech(content);
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "es-ES";
    utterance.rate = 1;

    utterance.onstart = () => {
        if (icon) icon.className = "fa-solid fa-stop";
        currentSpeakButton = button;
    };

    utterance.onend = utterance.onerror = () => {
        if (icon) icon.className = "fa-solid fa-volume-high";
        currentSpeakButton = null;
        currentSpeakUtterance = null;
    };

    currentSpeakUtterance = utterance;
    window.speechSynthesis.speak(utterance);
}

function fallbackCopy(text, callback) {

    const textarea = document.createElement("textarea");

    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";

    document.body.appendChild(textarea);

    textarea.focus();
    textarea.select();

    try {
        document.execCommand("copy");
        callback?.();
    } catch (error) {
        console.error("No se pudo copiar:", error);
        showToast("No se pudo copiar el mensaje");
    }

    document.body.removeChild(textarea);
}

function renderMessageContent(element, content) {
    if (!element) return;

    element.innerHTML = "";

    if (!content) return;

    content = String(content)
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n");

    const fragment = document.createDocumentFragment();

    const parts = content.split(/(```[\s\S]*?```)/g);

    parts.forEach(part => {
        if (!part.trim()) return;

        if (part.startsWith("```")) {
            const match = part.match(/^```([\w+#.-]*)\n?([\s\S]*?)```$/);

            if (match) {
                const language = match[1] || "";
                const code = match[2].replace(/\n$/, "");

                const wrapper = document.createElement("div");
                wrapper.className = "code-block";

                const header = document.createElement("div");
                header.className = "code-header";

                const lang = document.createElement("span");
                lang.textContent = language || "code";

                const copyButton = document.createElement("button");
                copyButton.type = "button";
                copyButton.innerHTML = '<i class="fa-regular fa-copy"></i> Copiar';

                copyButton.addEventListener("click", async () => {
                    try {
                        await navigator.clipboard.writeText(code);
                        copyButton.innerHTML =
                            '<i class="fa-solid fa-check"></i> Copiado';

                        setTimeout(() => {
                            copyButton.innerHTML =
                                '<i class="fa-regular fa-copy"></i> Copiar';
                        }, 1500);
                    } catch {
                        copyButton.textContent = "No se pudo copiar";
                    }
                });

                header.appendChild(lang);
                header.appendChild(copyButton);

                const pre = document.createElement("pre");
                const codeElement = document.createElement("code");

                codeElement.textContent = code;

                pre.appendChild(codeElement);
                wrapper.appendChild(header);
                wrapper.appendChild(pre);

                fragment.appendChild(wrapper);
                return;
            }
        }

        const lines = part.split("\n");
        let i = 0;

        while (i < lines.length) {
            let line = lines[i];

            if (!line.trim()) {
                i++;
                continue;
            }

            const heading = line.match(/^(#{1,6})\s+(.+)$/);

            if (heading) {
                const level = heading[1].length;
                const h = document.createElement(`h${level}`);

                appendInlineMarkdown(h, heading[2]);

                fragment.appendChild(h);
                i++;
                continue;
            }

            if (/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
                fragment.appendChild(document.createElement("hr"));
                i++;
                continue;
            }

            if (/^\s*[-*+]\s+/.test(line)) {
                const ul = document.createElement("ul");

                while (
                    i < lines.length &&
                    /^\s*[-*+]\s+/.test(lines[i])
                ) {
                    const li = document.createElement("li");

                    appendInlineMarkdown(
                        li,
                        lines[i].replace(/^\s*[-*+]\s+/, "")
                    );

                    ul.appendChild(li);
                    i++;
                }

                fragment.appendChild(ul);
                continue;
            }

            if (/^\s*\d+\.\s+/.test(line)) {
                const ol = document.createElement("ol");

                while (
                    i < lines.length &&
                    /^\s*\d+\.\s+/.test(lines[i])
                ) {
                    const li = document.createElement("li");

                    appendInlineMarkdown(
                        li,
                        lines[i].replace(/^\s*\d+\.\s+/, "")
                    );

                    ol.appendChild(li);
                    i++;
                }

                fragment.appendChild(ol);
                continue;
            }

            if (/^\s*>\s?/.test(line)) {
                const quote = document.createElement("blockquote");

                while (
                    i < lines.length &&
                    /^\s*>\s?/.test(lines[i])
                ) {
                    const text = lines[i].replace(/^\s*>\s?/, "");

                    if (quote.childNodes.length > 0) {
                        quote.appendChild(document.createElement("br"));
                    }

                    appendInlineMarkdown(quote, text);
                    i++;
                }

                fragment.appendChild(quote);
                continue;
            }

            if (
                i + 1 < lines.length &&
                lines[i].includes("|") &&
                /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(
                    lines[i + 1]
                )
            ) {
                const table = renderMarkdownTable(
                    lines.slice(i)
                );

                fragment.appendChild(table);

                break;
            }

            const paragraph = document.createElement("p");

            while (
                i < lines.length &&
                lines[i].trim() &&
                !/^(#{1,6})\s+/.test(lines[i]) &&
                !/^\s*[-*+]\s+/.test(lines[i]) &&
                !/^\s*\d+\.\s+/.test(lines[i]) &&
                !/^\s*>\s?/.test(lines[i]) &&
                !/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(lines[i])
            ) {
                if (paragraph.childNodes.length > 0) {
                    paragraph.appendChild(
                        document.createElement("br")
                    );
                }

                appendInlineMarkdown(paragraph, lines[i]);

                i++;
            }

            fragment.appendChild(paragraph);
        }
    });

    element.appendChild(fragment);
}

function appendInlineMarkdown(parent, text) {
    if (!text) return;

    const fragment = document.createDocumentFragment();

    const regex =
        /(`[^`]+`)|(!?\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\))|(\*\*([^*]+)\*\*)|(__([^_]+)__)|(\*([^*]+)\*)|(_([^_]+)_)|(~~([^~]+)~~)|(https?:\/\/[^\s<]+)/g;

    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            fragment.appendChild(
                document.createTextNode(
                    text.slice(lastIndex, match.index)
                )
            );
        }

        if (match[1]) {
            const code = document.createElement("code");

            code.textContent = match[1].slice(1, -1);

            fragment.appendChild(code);
        }

        else if (match[2]) {
            const isImage = match[2].startsWith("!");

            const label = match[3];
            const url = match[4];

            if (isImage) {
                if (/^https?:\/\//i.test(url)) {
                    const img = document.createElement("img");

                    img.src = url;
                    img.alt = label;
                    img.loading = "lazy";
                    img.referrerPolicy = "no-referrer";

                    fragment.appendChild(img);
                }
            } else {
                const link = document.createElement("a");

                link.href = url;
                link.textContent = label;
                link.target = "_blank";
                link.rel = "noopener noreferrer";

                fragment.appendChild(link);
            }
        }

        else if (match[6]) {
            const strong = document.createElement("strong");

            appendInlineMarkdown(strong, match[7]);

            fragment.appendChild(strong);
        }

        else if (match[8]) {
            const strong = document.createElement("strong");

            appendInlineMarkdown(strong, match[9]);

            fragment.appendChild(strong);
        }

        else if (match[10]) {
            const em = document.createElement("em");

            appendInlineMarkdown(em, match[11]);

            fragment.appendChild(em);
        }

        else if (match[12]) {
            const em = document.createElement("em");

            appendInlineMarkdown(em, match[13]);

            fragment.appendChild(em);
        }

        else if (match[14]) {
            const del = document.createElement("del");

            appendInlineMarkdown(del, match[15]);

            fragment.appendChild(del);
        }

        else if (match[16]) {
            const link = document.createElement("a");

            link.href = match[16];
            link.textContent = match[16];
            link.target = "_blank";
            link.rel = "noopener noreferrer";

            fragment.appendChild(link);
        }

        lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
        fragment.appendChild(
            document.createTextNode(text.slice(lastIndex))
        );
    }

    parent.appendChild(fragment);
}

function renderMarkdownTable(lines) {
    const table = document.createElement("table");
    table.className = "markdown-table";

    const thead = document.createElement("thead");
    const tbody = document.createElement("tbody");

    const headerCells = parseTableRow(lines[0]);

    const headerRow = document.createElement("tr");

    headerCells.forEach(cell => {
        const th = document.createElement("th");

        appendInlineMarkdown(th, cell.trim());

        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);

    for (let i = 2; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        const cells = parseTableRow(lines[i]);
        const row = document.createElement("tr");

        cells.forEach(cell => {
            const td = document.createElement("td");

            appendInlineMarkdown(td, cell.trim());

            row.appendChild(td);
        });

        tbody.appendChild(row);
    }

    table.appendChild(thead);
    table.appendChild(tbody);

    return table;
}


function parseTableRow(line) {
    line = line.trim();

    if (line.startsWith("|")) {
        line = line.slice(1);
    }

    if (line.endsWith("|")) {
        line = line.slice(0, -1);
    }

    return line.split("|");
}

function appendTyping() {

    const article =
        document.createElement("article");

    article.className =
        "message assistant";


    const avatar =
        document.createElement("div");

    avatar.className =
        "message-avatar";


    avatar.innerHTML =
        `<img src="/img/icon.png" alt="ApexsAI" style="width:100%;height:100%;object-fit:cover;border-radius:9px;">`;


    const content =
        document.createElement("div");

    content.className =
        "message-content";


    const role =
        document.createElement("div");

    role.className =
        "message-role";

    role.textContent =
        "ApexAI";


    const typing =
        document.createElement("div");

    typing.className =
        "typing";


    typing.innerHTML =
        `
            <span></span>
            <span></span>
            <span></span>
        `;


    content.appendChild(role);
    content.appendChild(typing);

    article.appendChild(avatar);
    article.appendChild(content);

    messages.appendChild(article);


    scrollToBottom();


    return article;
}

async function showChat(chat) {

    currentChatId = chat.id;

    hideWelcome();

    messages.innerHTML = "";

    for (const message of chat.messages) {

        let imageUrl = null;

        if (message.role === "user") {

            try {

                const imageFile =
                    await getImage(message.id);

                if (imageFile) {
                    imageUrl =
                        URL.createObjectURL(imageFile);
                }

            } catch (error) {

                console.error(
                    "No se pudo cargar la imagen:",
                    error
                );
            }
        }

        appendMessage(
            message,
            imageUrl
        );
    }

    renderChatList();

    scrollToBottom();
}


function showWelcome() {

    if (welcome) {
        welcome.style.display = "";
    }

    if (messages) {
        messages.innerHTML = "";
    }
}


function hideWelcome() {

    if (welcome) {
        welcome.style.display = "none";
    }
}

function renderChatList(filter = "") {

    if (!chatList) return;


    chatList.innerHTML = "";


    const normalized =
        filter.toLowerCase();


    const filtered =
        chats.filter((chat) => {

            return chat.title
                .toLowerCase()
                .includes(normalized);
        });


    if (
        filtered.length === 0
    ) {

        if (emptyHistory) {
            emptyHistory.style.display =
                "flex";
        }

        return;
    }


    if (emptyHistory) {
        emptyHistory.style.display =
            "none";
    }


    filtered.forEach((chat) => {

        const item =
            document.createElement("div");


        item.className =
            "chat-item";


        if (
            chat.id === currentChatId
        ) {
            item.classList.add("active");
        }


        item.dataset.id =
            chat.id;


        const icon =
            document.createElement("i");

        icon.className =
            "fa-regular fa-message";


        const title =
            document.createElement("span");

        title.className =
            "chat-item-title";

        title.textContent =
            chat.title;


        const menu =
            document.createElement("button");

        menu.className =
            "chat-item-menu";

        menu.type =
            "button";

        menu.title =
            "Opciones";

        menu.innerHTML =
            `<i class="fa-solid fa-ellipsis"></i>`;


        item.appendChild(icon);
        item.appendChild(title);
        item.appendChild(menu);


        item.addEventListener(
            "click",
            (event) => {

                if (
                    event.target.closest(
                        ".chat-item-menu"
                    )
                ) {

                    openContextMenu(
                        event,
                        chat.id
                    );

                    return;
                }


                openChat(chat.id);

                closeMobileSidebar();
            }
        );


        chatList.appendChild(item);
    });
}

function openChat(id, options = {}) {

    const chat =
        chats.find(
            (item) => item.id === id
        );


    if (!chat) return;


    currentChatId = id;

    showChat(chat);

    if (options.updateUrl !== false) {
        updateUrlForChat(id);
    }

    messageInput.focus();
}

function openContextMenu(
    event,
    chatId
) {

    event.preventDefault();
    event.stopPropagation();


    selectedChatId =
        chatId;


    contextMenu.classList.add(
        "active"
    );


    const rect =
        contextMenu.getBoundingClientRect();


    let x =
        event.clientX;

    let y =
        event.clientY;


    if (
        x + rect.width >
        window.innerWidth
    ) {
        x =
            window.innerWidth -
            rect.width -
            10;
    }


    if (
        y + rect.height >
        window.innerHeight
    ) {
        y =
            window.innerHeight -
            rect.height -
            10;
    }


    contextMenu.style.left =
        `${Math.max(10, x)}px`;

    contextMenu.style.top =
        `${Math.max(10, y)}px`;
}


function closeContextMenu() {

    if (!contextMenu) return;

    contextMenu.classList.remove(
        "active"
    );

    selectedChatId = null;
}


function handleContextAction(event) {

    const button =
        event.target.closest(
            "button"
        );


    if (!button) return;


    const action =
        button.dataset.action;


    if (!selectedChatId) return;


    if (action === "rename") {
        renameChat(selectedChatId);
    }


    if (action === "delete") {
        deleteChat(selectedChatId);
    }


    closeContextMenu();
}

function renameChat(id) {

    const chat =
        chats.find(
            (item) => item.id === id
        );


    if (!chat) return;


    const newTitle =
        window.prompt(
            "Nuevo nombre de la conversación:",
            chat.title
        );


    if (
        newTitle === null
    ) {
        return;
    }


    const cleanTitle =
        newTitle.trim();


    if (!cleanTitle) {
        showToast("El nombre no puede estar vacío");
        return;
    }


    chat.title =
        cleanTitle.slice(0, 80);

    chat.updatedAt =
        Date.now();


    saveChats();
    renderChatList();

    showToast("Conversación renombrada");
}

function deleteChat(id) {

    const index =
        chats.findIndex(
            (chat) => chat.id === id
        );


    if (index === -1) return;


    chats.splice(index, 1);


    if (
        currentChatId === id
    ) {

        currentChatId =
            null;

        showWelcome();
        updateUrlForChat(null);
    }


    saveChats();
    renderChatList();

    showToast("Conversación eliminada");
}

function openDeleteModal() {

    if (chats.length === 0) {
        showToast("No hay conversaciones para borrar");
        return;
    }


    modalBackdrop.classList.add(
        "active"
    );
}


function closeDeleteModal() {

    modalBackdrop?.classList.remove(
        "active"
    );
}


function clearAllChats() {

    chats = [];

    currentChatId = null;

    saveChats();

    renderChatList();

    showWelcome();
    updateUrlForChat(null);

    closeDeleteModal();

    showToast("Historial eliminado");
}

function openSearch() {

    if (!searchBox) return;


    searchBox.classList.add(
        "active"
    );


    searchToggle.style.display =
        "none";


    setTimeout(() => {
        chatSearch?.focus();
    }, 50);
}


function closeSearchBox() {

    if (!searchBox) return;


    searchBox.classList.remove(
        "active"
    );


    searchToggle.style.display =
        "";


    if (chatSearch) {
        chatSearch.value = "";
    }


    renderChatList();
}

function openMobileSidebar() {

    sidebar?.classList.add(
        "open"
    );

    sidebarOverlay?.classList.add(
        "active"
    );
}


function closeMobileSidebar() {

    sidebar?.classList.remove(
        "open"
    );

    sidebarOverlay?.classList.remove(
        "active"
    );
}

function loadTheme() {

    const saved =
        localStorage.getItem(
            THEME_KEY
        );


    if (saved === "dark") {

        document.documentElement
            .setAttribute(
                "data-theme",
                "dark"
            );

        updateThemeIcon(true);

    } else {

        document.documentElement
            .removeAttribute(
                "data-theme"
            );

        updateThemeIcon(false);
    }
}


function toggleTheme() {

    const dark =
        document.documentElement
            .getAttribute(
                "data-theme"
            ) === "dark";


    if (dark) {

        document.documentElement
            .removeAttribute(
                "data-theme"
            );

        localStorage.setItem(
            THEME_KEY,
            "light"
        );

        updateThemeIcon(false);

        showToast("Modo claro activado");

    } else {

        document.documentElement
            .setAttribute(
                "data-theme",
                "dark"
            );

        localStorage.setItem(
            THEME_KEY,
            "dark"
        );

        updateThemeIcon(true);

        showToast("Modo oscuro activado");
    }
}


function updateThemeIcon(isDark) {

    if (!themeBtn) return;


    const icon =
        themeBtn.querySelector("i");


    if (!icon) return;


    icon.className =
        isDark
            ? "fa-solid fa-sun"
            : "fa-solid fa-moon";
}

function handleFile(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
        showToast("Solo puedes adjuntar imágenes");
        clearAttachment();
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        showToast("La imagen no puede superar los 10 MB");
        clearAttachment();
        return;
    }

    selectedFile = file;

    renderAttachment(file);
    updateSendButton();
}


function renderAttachment(file) {

    if (!attachmentPreview) return;


    attachmentPreview.innerHTML = "";


    const chip =
        document.createElement("div");


    chip.className =
        "attachment-chip";


    const icon =
        document.createElement("i");


    icon.className =
        "fa-solid fa-paperclip";


    const name =
        document.createElement("span");


    name.textContent =
        file.name;


    const remove =
        document.createElement("button");


    remove.type =
        "button";

    remove.style.marginLeft =
        "auto";

    remove.style.background =
        "transparent";

    remove.style.color =
        "inherit";

    remove.style.cursor =
        "pointer";

    remove.innerHTML =
        `<i class="fa-solid fa-xmark"></i>`;


    remove.addEventListener(
        "click",
        clearAttachment
    );


    chip.appendChild(icon);
    chip.appendChild(name);
    chip.appendChild(remove);


    attachmentPreview.appendChild(
        chip
    );
}


function clearAttachment() {

    selectedFile = null;


    if (fileInput) {
        fileInput.value = "";
    }


    if (attachmentPreview) {
        attachmentPreview.innerHTML =
            "";
    }
}

function autoResizeTextarea() {

    if (!messageInput) return;


    messageInput.style.height =
        "auto";


    const height =
        Math.min(
            messageInput.scrollHeight,
            180
        );


    messageInput.style.height =
        `${height}px`;
}


function updateSendButton() {
    if (!sendBtn) return;

    const hasText = messageInput?.value.trim().length > 0;
    const hasFile = !!selectedFile;

    sendBtn.disabled = (!hasText && !hasFile) || isGenerating;
}

function scrollToBottom() {

    if (!conversation) return;


    requestAnimationFrame(() => {

        conversation.scrollTo({
            top:
                conversation.scrollHeight,
            behavior:
                "smooth"
        });

    });
}

function loadChats() {

    try {

        const saved =
            localStorage.getItem(
                STORAGE_KEY
            );


        if (!saved) {
            chats = [];
            return;
        }


        const parsed =
            JSON.parse(saved);


        chats =
            Array.isArray(parsed)
                ? parsed
                : [];


    } catch (error) {

        console.error(
            "No se pudo cargar el historial:",
            error
        );

        chats = [];
    }
}


function saveChats() {

    try {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(chats)
        );

    } catch (error) {

        console.error(
            "No se pudo guardar el historial:",
            error
        );
    }
}

function getCurrentChat() {

    return chats.find(
        (chat) =>
            chat.id === currentChatId
    );
}

function getChatIdFromUrl() {

    const match =
        window.location.pathname.match(
            /^\/c\/([a-f0-9-]+)$/i
        );

    return match ? match[1] : null;
}


function updateUrlForChat(id) {

    const newPath =
        id ? `/c/${id}` : "/app.html";

    if (window.location.pathname === newPath) return;

    window.history.pushState(
        { chatId: id || null },
        "",
        newPath
    );
}


window.addEventListener("popstate", () => {

    const id = getChatIdFromUrl();

    if (id) {
        openChat(id, { updateUrl: false });
    } else {
        currentChatId = null;
        showWelcome();
    }
});


function generateId() {

    if (crypto?.randomUUID) {
        return crypto.randomUUID();
    }

    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
        /[xy]/g,
        (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        }
    );
}


function createChatTitle(text) {

    const clean =
        text
            .replace(/\s+/g, " ")
            .trim();


    if (!clean) {
        return "Nueva conversación";
    }


    if (clean.length <= 38) {
        return clean;
    }


    return (
        clean.substring(0, 38) +
        "..."
    );
}


function getUserName() {

    const value =
        userName?.textContent?.trim();


    return value ||
        "Usuario";
}


function getUserInitial() {

    const name =
        getUserName();


    return name
        .charAt(0)
        .toUpperCase();
}

const AUTH_API = "https://nexus-ai-api-iwqr.onrender.com/api";

function getAuthToken() {
    return localStorage.getItem("nexusai_token");
}

function setAuthToken(token) {
    if (token) {
        localStorage.setItem("nexusai_token", token);
    }
}

async function loadUser() {

    const params = new URLSearchParams(window.location.search);
    const userParam = params.get("user");
    const tokenParam = params.get("token");

    if (tokenParam) {
        setAuthToken(tokenParam);

        params.delete("token");
        params.delete("user");

        const newUrl =
            window.location.pathname +
            (params.toString() ? `?${params.toString()}` : "");

        window.history.replaceState({}, "", newUrl);
    }

    const token = getAuthToken();

    if (!token) {
        window.location.href = "index.html";
        return;
    }

    try {
        const response = await fetch(
            `${AUTH_API}/auth/me`,
            {
                method: "GET",
                credentials: "include",
                headers: token
                    ? { Authorization: `Bearer ${token}` }
                    : {}
            }
        );

        if (!response.ok) {
    let errorData = {};

    try {
        errorData = await response.json();
    } catch {
        errorData = {};
    }

    console.error("AUTH /ME ERROR:", response.status, errorData);

    localStorage.removeItem("nexusai_token");
    localStorage.removeItem("nexusai_user");
    window.location.href = "index.html";
    return;
}

        const data = await response.json();

        if (!data.success || !data.user) {
            localStorage.removeItem("nexusai_token");
            localStorage.removeItem("nexusai_user");
            window.location.href = "index.html";
            return;
        }

        const user = data.user;

        if (userName) {
            userName.textContent = user.name || "Usuario";
        }

        if (userEmail) {
            userEmail.textContent = user.email || "ApexAI";
        }

        if (userAvatar) {
            userAvatar.textContent =
                (user.name || "U").charAt(0).toUpperCase();
        }

        localStorage.setItem(
            "nexusai_user",
            JSON.stringify({
                id: user.id,
                name: user.name,
                email: user.email
            })
        );

    } catch (error) {
        console.error("Error cargando usuario:", error);
    }
}

let toastTimer = null;


function showToast(message) {

    if (!toast) return;


    toast.textContent =
        message;


    toast.classList.add(
        "show"
    );


    clearTimeout(
        toastTimer
    );


    toastTimer =
        setTimeout(() => {

            toast.classList.remove(
                "show"
            );

        }, 2200);
}

window.addEventListener(
    "resize",
    () => {

        if (
            window.innerWidth > 700
        ) {
            closeMobileSidebar();
        }
    }
);

modalBackdrop?.addEventListener(
    "click",
    (event) => {

        if (
            event.target ===
            modalBackdrop
        ) {
            closeDeleteModal();
        }
    }
);

console.log(
    "%cApexAI",
    "color:#2563eb;font-size:20px;font-weight:700;"
);

console.log(
    "ApexAi frontend inicializado correctamente."
);

const desktopSidebarToggle =
    document.getElementById("desktopSidebarToggle");

if (desktopSidebarToggle) {

    desktopSidebarToggle.addEventListener("click", () => {

        if (window.innerWidth < 769) return;

        document.body.classList.toggle(
            "sidebar-collapsed"
        );

        const collapsed =
            document.body.classList.contains(
                "sidebar-collapsed"
            );

        localStorage.setItem(
            "nexusai_sidebar_collapsed",
            collapsed
        );

        desktopSidebarToggle.setAttribute(
            "aria-label",
            collapsed
                ? "Abrir barra lateral"
                : "Cerrar barra lateral"
        );
    });
}

if (
    window.innerWidth >= 769 &&
    localStorage.getItem(
        "nexusai_sidebar_collapsed"
    ) === "true"
) {

    document.body.classList.add(
        "sidebar-collapsed"
    );
}

const SETTINGS_KEY = "nexusai_settings";

const userMoreBtn = $("#userMoreBtn");
const userMenu = $("#userMenu");

const settingsBackdrop = $("#settingsBackdrop");
const closeSettingsBtn = $("#closeSettings");

const settingsTabs = $("#settingsTabs");
const settingsPanels = $$(".settings-panel");

const settingsThemeSelect = $("#settingsThemeSelect");
const settingsLangSelect = $("#settingsLangSelect");
const settingsPromptCards = $("#settingsPromptCards");

const settingsNickname = $("#settingsNickname");
const settingsCustomInstructions = $("#settingsCustomInstructions");
const savePersonalizationBtn = $("#savePersonalizationBtn");

const settingsNameForm = $("#settingsNameForm");
const settingsName = $("#settingsName");
const settingsNameBtn = $("#settingsNameBtn");

const settingsPasswordForm = $("#settingsPasswordForm");
const settingsCurrentPassword = $("#settingsCurrentPassword");
const settingsNewPassword = $("#settingsNewPassword");
const settingsPasswordBtn = $("#settingsPasswordBtn");

const deleteAccountBtn = $("#deleteAccountBtn");

const exportChatsBtn = $("#exportChatsBtn");
const deleteAllChatsFromSettingsBtn = $("#deleteAllChatsFromSettingsBtn");


function getSettings() {
    try {
        return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    } catch {
        return {};
    }
}

function saveSettings(patch) {
    const current = getSettings();
    const updated = { ...current, ...patch };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    return updated;
}

function getCustomInstructions() {
    const settings = getSettings();
    return {
        nickname: settings.nickname || "",
        instructions: settings.instructions || ""
    };
}

userMoreBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    userMenu?.classList.toggle("active");
});

document.addEventListener("click", (event) => {
    if (
        userMenu &&
        !userMenu.contains(event.target) &&
        event.target !== userMoreBtn
    ) {
        userMenu.classList.remove("active");
    }
});

userMenu?.addEventListener("click", (event) => {

    const button = event.target.closest("button[data-action]");
    if (!button) return;

    userMenu.classList.remove("active");

    if (button.dataset.action === "settings") {
        openSettingsModal();
    }

    if (button.dataset.action === "logout") {
        handleLogout();
    }
});

settingsTabs?.addEventListener("click", (event) => {

    const tabBtn = event.target.closest(".settings-tab");
    if (!tabBtn) return;

    const target = tabBtn.dataset.tab;

    $$(".settings-tab").forEach((tab) => {
        tab.classList.toggle("active", tab === tabBtn);
    });

    settingsPanels.forEach((panel) => {
        panel.classList.toggle(
            "active",
            panel.dataset.panel === target
        );
    });
});

function openSettingsModal() {

    const savedUser = JSON.parse(
        localStorage.getItem("nexusai_user") || "null"
    );

    const settings = getSettings();

    const isDark =
        document.documentElement.getAttribute("data-theme") === "dark";

    if (settingsThemeSelect) settingsThemeSelect.value = isDark ? "dark" : "light";
    if (settingsLangSelect) settingsLangSelect.value = settings.lang || "es";
    if (settingsPromptCards) {
        settingsPromptCards.checked = settings.showPromptCards !== false;
    }

    if (settingsNickname) settingsNickname.value = settings.nickname || "";
    if (settingsCustomInstructions) {
        settingsCustomInstructions.value = settings.instructions || "";
    }

    if (settingsName) {
        settingsName.value =
            savedUser?.name ||
            userName?.textContent.trim() ||
            "";
    }

    if (settingsCurrentPassword) settingsCurrentPassword.value = "";
    if (settingsNewPassword) settingsNewPassword.value = "";

    settingsBackdrop?.classList.add("active");
}

function closeSettingsModal() {
    settingsBackdrop?.classList.remove("active");
}

closeSettingsBtn?.addEventListener("click", closeSettingsModal);

settingsBackdrop?.addEventListener("click", (event) => {
    if (event.target === settingsBackdrop) {
        closeSettingsModal();
    }
});

settingsThemeSelect?.addEventListener("change", () => {

    const wantDark = settingsThemeSelect.value === "dark";
    const isDark =
        document.documentElement.getAttribute("data-theme") === "dark";

    if (wantDark !== isDark) {
        toggleTheme();
    }
});

settingsLangSelect?.addEventListener("change", () => {
    saveSettings({ lang: settingsLangSelect.value });
    showToast("Idioma guardado (próximamente disponible)");
});

settingsPromptCards?.addEventListener("change", () => {

    const show = settingsPromptCards.checked;

    saveSettings({ showPromptCards: show });

    const promptGrid = document.querySelector(".prompt-grid");

    if (promptGrid) {
        promptGrid.style.display = show ? "" : "none";
    }
});

savePersonalizationBtn?.addEventListener("click", () => {

    saveSettings({
        nickname: settingsNickname.value.trim(),
        instructions: settingsCustomInstructions.value.trim()
    });

    showToast("Personalización guardada");
});

settingsNameForm?.addEventListener("submit", async (event) => {

    event.preventDefault();

    const name = settingsName.value.trim();

    if (!name) {
        showToast("El nombre no puede estar vacío");
        return;
    }

    const token = getAuthToken();

    settingsNameBtn.disabled = true;

    try {

        const response = await fetch(
            `${AUTH_API}/user/name`,
            {
                method: "PUT",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ name })
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            showToast(data.message || "No se pudo actualizar el nombre");
            return;
        }

        if (userName) userName.textContent = data.user.name;

        if (userAvatar) {
            userAvatar.textContent =
                (data.user.name || "U").charAt(0).toUpperCase();
        }

        localStorage.setItem(
            "nexusai_user",
            JSON.stringify(data.user)
        );

        showToast("Nombre actualizado");

    } catch (error) {
        console.error("Update name error:", error);
        showToast("No se pudo conectar con el servidor");

    } finally {
        settingsNameBtn.disabled = false;
    }
});


settingsPasswordForm?.addEventListener("submit", async (event) => {

    event.preventDefault();

    const currentPassword = settingsCurrentPassword.value;
    const newPassword = settingsNewPassword.value;

    if (newPassword.length < 8) {
        showToast("La nueva contraseña debe tener al menos 8 caracteres");
        return;
    }

    const token = getAuthToken();

    settingsPasswordBtn.disabled = true;

    try {

        const response = await fetch(
            `${AUTH_API}/user/password`,
            {
                method: "PUT",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ currentPassword, newPassword })
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            showToast(data.message || "No se pudo actualizar la contraseña");
            return;
        }

        settingsPasswordForm.reset();
        showToast("Contraseña actualizada");

    } catch (error) {
        console.error("Update password error:", error);
        showToast("No se pudo conectar con el servidor");

    } finally {
        settingsPasswordBtn.disabled = false;
    }
});


deleteAccountBtn?.addEventListener("click", async () => {

    const confirmed = window.confirm(
        "¿Seguro que quieres eliminar tu cuenta? Esta acción no se puede deshacer."
    );

    if (!confirmed) return;

    const token = getAuthToken();

    try {

        const response = await fetch(
            `${AUTH_API}/user`,
            {
                method: "DELETE",
                credentials: "include",
                headers: token
                    ? { Authorization: `Bearer ${token}` }
                    : {}
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            showToast(data.message || "No se pudo eliminar la cuenta");
            return;
        }

        localStorage.removeItem("nexusai_token");
        localStorage.removeItem("nexusai_user");

        window.location.href = "index.html";

    } catch (error) {
        console.error("Delete account error:", error);
        showToast("No se pudo conectar con el servidor");
    }
});

exportChatsBtn?.addEventListener("click", () => {

    if (!chats || chats.length === 0) {
        showToast("No hay conversaciones para exportar");
        return;
    }

    const blob = new Blob(
        [JSON.stringify(chats, null, 2)],
        { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "nexusai-conversaciones.json";
    link.click();

    URL.revokeObjectURL(url);

    showToast("Conversaciones exportadas");
});

deleteAllChatsFromSettingsBtn?.addEventListener("click", () => {
    closeSettingsModal();
    openDeleteModal();
});

async function handleLogout() {

    const token = getAuthToken();

    try {
        await fetch(
            `${AUTH_API}/auth/logout`,
            {
                method: "POST",
                credentials: "include",
                headers: token
                    ? { Authorization: `Bearer ${token}` }
                    : {}
            }
        );
    } catch (error) {
        console.error("Logout error:", error);
    }

    localStorage.removeItem("nexusai_token");
    localStorage.removeItem("nexusai_user");

    window.location.href = "index.html";
}

(function applyStoredGeneralSettings() {
    const settings = getSettings();

    if (settings.showPromptCards === false) {
        const promptGrid = document.querySelector(".prompt-grid");
        if (promptGrid) promptGrid.style.display = "none";
    }
})();