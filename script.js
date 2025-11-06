document.addEventListener("DOMContentLoaded", () => {
  // --- Elements ---
  const chatBubble = document.getElementById("chat-bubble");
  const chatWindow = document.getElementById("chat-window");
  const chatMessages = document.getElementById("chat-messages");
  const userInput = document.getElementById("user-input") || document.getElementById("chat-input");
  const sendBtn = document.getElementById("send-btn");
  const micBtn = document.getElementById("mic-btn");

  const userFormContainer = document.getElementById("user-form-container");
  const userForm = document.getElementById("user-form");

  // --- User Info ---
  let userName = localStorage.getItem("userName");
  let userEmail = localStorage.getItem("userEmail");
  let userPhone = localStorage.getItem("userPhone");

  // --- Speech Recognition ---
  let isListening = false;
  let recognition;

  if ("webkitSpeechRecognition" in window) {
    recognition = new webkitSpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      addMessage("user", transcript);
      userInput.value = "";
      handleMessage(transcript);
    };

    recognition.onerror = (err) => console.error("🎙️ Speech recognition error:", err);
  }

  // --- Initialize Form or Chat ---
  if (!userName || !userEmail || !userPhone) {
    userFormContainer.style.display = "flex";
  } else {
    startChat(userName);
  }

  // --- Handle Form Submission ---
  if (userForm) {
    userForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      userName = document.getElementById("userName").value.trim();
      userEmail = document.getElementById("userEmail").value.trim();
      userPhone = document.getElementById("userPhone").value.trim();

      if (!userName || !userEmail || !userPhone) {
        alert("Please fill in all fields.");
        return;
      }

      localStorage.setItem("userName", userName);
      localStorage.setItem("userEmail", userEmail);
      localStorage.setItem("userPhone", userPhone);

      // Optional backend save
      try {
        await fetch("http://localhost:3000/saveUser", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: userName, email: userEmail, phone: userPhone }),
        });
      } catch (err) {
        console.warn("⚠️ Could not connect to backend to save user.");
      }

      userFormContainer.style.display = "none";
      startChat(userName);
    });
  }

  // --- Chat Bubble Toggle ---
  if (chatBubble) {
    chatBubble.addEventListener("click", () => {
      chatWindow.classList.toggle("hidden");
    });
  }

  // --- Mic Button ---
  if (micBtn) {
    micBtn.addEventListener("click", () => {
      if (!recognition) return alert("Speech recognition not supported in this browser.");
      if (isListening) {
        recognition.stop();
        micBtn.textContent = "🎤";
      } else {
        recognition.start();
        micBtn.textContent = "🛑";
      }
      isListening = !isListening;
    });
  }

  // --- Send Button ---
  if (sendBtn) sendBtn.addEventListener("click", handleSend);
  if (userInput) {
    userInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") handleSend();
    });
  }

  // --- Append Messages ---
  function addMessage(sender, text) {
    const msg = document.createElement("div");
    msg.classList.add(sender === "bot" ? "bot-msg" : "user-msg");
    msg.textContent = text;
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // --- Start Chat ---
  function startChat(name) {
    chatWindow.style.display = "block";
    addMessage("bot", `👋 Hello ${name}! I'm Eva, your AI assistant. How can I help you today?`);
    speak(`Hello ${name}, I'm Eva, your assistant. How can I help you today?`);
  }

  // --- Handle Send Message ---
  async function handleSend() {
    const message = userInput.value.trim();
    if (!message) return;
    addMessage("user", message);
    userInput.value = "";
    handleMessage(message);
  }

  // --- Handle Message (Text + Voice) ---
  async function handleMessage(message) {
    if (!message.trim()) return;

    // Check for navigation or brief commands first
    if (navigateIfCommand(message)) return;

    addMessage("bot", "⏳ Thinking...");

    try {
      const response = await fetch("http://localhost:3000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, name: userName }),
      });
      const data = await response.json();
      chatMessages.lastChild.remove(); // remove "Thinking..."
      const reply = data.reply || "Sorry, I couldn’t understand that.";
      addMessage("bot", reply);
      speak(reply);
    } catch (err) {
      console.error("❌ Chat error:", err);
      chatMessages.lastChild.remove();
      addMessage("bot", "⚠️ Error connecting to the server.");
    }
  }

  // =====================================================
  // === Auto Scroll + Section Brief Integration =========
  // =====================================================

  const sectionBriefs = {
    home: "You are on the Home page — where we introduce our AI innovations.",
    about: "You are on the About page — here we explain our mission and values.",
    services: "You are on the Services page — showcasing our AI and automation tools.",
    contact: "You are on the Contact page — you can reach us or send your inquiries here.",
  };

  function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => {
        speakBrief(sectionId);
      }, 800);
    } else {
      const msg = "Sorry, I couldn't find that section.";
      addMessage("bot", msg);
      speak(msg);
    }
  }

  function speakBrief(sectionId) {
    const brief = sectionBriefs[sectionId];
    if (brief) {
      addMessage("bot", brief);
      speak(brief);
    }
  }

  // --- Enhanced Navigation Commands ---
  function navigateIfCommand(text) {
    const lower = text.toLowerCase();

    if (lower.includes("home")) {
      scrollToSection("home");
      return true;
    } else if (lower.includes("about")) {
      scrollToSection("about");
      return true;
    } else if (lower.includes("service")) {
      scrollToSection("services");
      return true;
    } else if (lower.includes("contact")) {
      scrollToSection("contact");
      return true;
    }

    // Other existing commands (like courses, careers, etc.)
    const commands = [
      { keywords: ["course", "training"], target: "#courses" },
      { keywords: ["career", "job"], target: "#careers" },
      { keywords: ["client", "portal"], target: "#client-portal" },
    ];

    for (let cmd of commands) {
      if (cmd.keywords.some(k => lower.includes(k))) {
        const section = document.querySelector(cmd.target);
        if (section) {
          section.scrollIntoView({ behavior: "smooth" });
          const reply = `Navigating to ${cmd.target.replace("#", "")} section.`;
          addMessage("bot", reply);
          speak(reply);
          return true;
        }
      }
    }
    return false;
  }

  // --- Text-to-Speech ---
  function speak(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.pitch = 1;
    utterance.rate = 1;
    speechSynthesis.speak(utterance);
  }
});
