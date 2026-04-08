const modalShell = document.querySelector("[data-modal]");
const openModalButtons = document.querySelectorAll("[data-open-modal]");
const closeModalButtons = document.querySelectorAll("[data-close-modal]");
const forms = document.querySelectorAll(".modal-form");
const successPanel = document.querySelector("[data-success]");
const modalTitle = document.getElementById("modal-title");
const modalDescription = document.getElementById("modal-description");
const modalStepLabel = document.getElementById("modal-step-label");
const progressSteps = document.querySelectorAll("[data-progress-step]");
const accordionGroup = document.querySelector("[data-accordion-group]");

const colosseumStartButton = document.querySelector("[data-colosseum-start]");
const countdownBlock = document.querySelector("[data-countdown-block]");
const countdownValue = document.querySelector("[data-countdown-value]");
const handleBlock = document.querySelector("[data-handle-block]");
const stepTwoSubmit = document.querySelector("[data-step-two-submit]");
const discordLink = document.querySelector("[data-discord-link]");
const discordConfirmWrap = document.querySelector("[data-discord-confirm-wrap]");

const COLOSSEUM_URL = "https://colosseum.com/get-started";
const API_ENDPOINT = "/api/register";
const STORAGE_KEY = "elgato-solana-campaign-submissions";
const DRAFT_STORAGE_KEY = "elgato-solana-campaign-draft";
const DEFAULT_OPEN_LABEL = "Inscreva-se →";
const CONTINUE_OPEN_LABEL = "Continuar inscrição →";
const COMPLETED_OPEN_LABEL = "Inscrição concluída";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let currentStep = 1;
let countdownTimer = null;
let isSubmitting = false;
let submission = {
  name: "",
  email: "",
  whatsapp: "",
  profile: "",
  colosseumHandle: "",
  discordJoined: false,
  completed: false,
};

const stepContent = {
  1: {
    label: "Passo 1",
    title: "Registre seu interesse",
    description:
      "Preencha abaixo para receber todas as informações. O acesso à comunidade acontece pelo Discord.",
  },
  2: {
    label: "Passo 2",
    title: "Crie sua conta no Colosseum",
    description:
      "Abra o Colosseum, conclua seu cadastro e depois volte para enviar seu handle.",
  },
  3: {
    label: "Passo 3",
    title: "Entre na comunidade",
    description: "Entre no Discord e depois confirme aqui para finalizar o fluxo.",
  },
};

function syncStepThreeUI() {
  if (!discordConfirmWrap) {
    return;
  }

  discordConfirmWrap.hidden = !submission.discordJoined;
}

function openModal() {
  hydrateDraft();
  modalShell.hidden = false;
  document.body.style.overflow = "hidden";

  if (submission.completed) {
    finishFlow();
    return;
  }

  setStep(currentStep);
}

function closeModal() {
  modalShell.hidden = true;
  document.body.style.overflow = "";
  updateOpenButtonsState();
}

function setStep(step) {
  currentStep = step;

  forms.forEach((form) => {
    form.hidden = Number(form.dataset.step) !== step;
  });

  successPanel.hidden = true;

  const copy = stepContent[step];
  modalStepLabel.textContent = copy.label;
  modalTitle.textContent = copy.title;
  modalDescription.textContent = copy.description;

  progressSteps.forEach((stepNode) => {
    const stepNumber = Number(stepNode.dataset.progressStep);
    stepNode.classList.toggle("is-active", stepNumber === step);
    stepNode.classList.toggle("is-complete", stepNumber < step);
  });

  if (step >= 2 && submission.colosseumHandle) {
    handleBlock.hidden = false;
    stepTwoSubmit.hidden = false;
    countdownBlock.hidden = true;
  }

  if (step === 3) {
    syncStepThreeUI();
  }

  persistDraft();
}

function resetStepTwoUI() {
  clearInterval(countdownTimer);
  countdownTimer = null;
  countdownBlock.hidden = true;
  handleBlock.hidden = true;
  stepTwoSubmit.hidden = true;
  countdownValue.textContent = "10";
}

function resetFlow() {
  submission = {
    name: "",
    email: "",
    whatsapp: "",
    profile: "",
    colosseumHandle: "",
    discordJoined: false,
    completed: false,
  };

  forms.forEach((form) => form.reset());
  resetStepTwoUI();
  currentStep = 1;
  localStorage.removeItem(DRAFT_STORAGE_KEY);
  setStep(1);
  updateOpenButtonsState();
}

function syncFormValues() {
  document.querySelector('input[name="name"]').value = submission.name;
  document.querySelector('input[name="email"]').value = submission.email;
  document.querySelector('input[name="whatsapp"]').value = submission.whatsapp;
  document.querySelector('select[name="profile"]').value = submission.profile;
  document.querySelector('input[name="colosseumHandle"]').value = submission.colosseumHandle;
  syncStepThreeUI();
}

function getFieldWrapper(field) {
  return field.closest("label") || field.closest(".checkbox-row");
}

function getErrorNode(field) {
  const wrapper = getFieldWrapper(field);
  return wrapper ? wrapper.querySelector(".field-error") : null;
}

function setFieldError(field, message) {
  const wrapper = getFieldWrapper(field);
  if (!wrapper) {
    return;
  }

  field.classList.add("is-invalid");
  wrapper.classList.add("is-invalid");

  let errorNode = getErrorNode(field);
  if (!errorNode) {
    errorNode = document.createElement("p");
    errorNode.className = "field-error";
    wrapper.appendChild(errorNode);
  }

  errorNode.textContent = message;
}

function clearFieldError(field) {
  const wrapper = getFieldWrapper(field);
  if (!wrapper) {
    return;
  }

  field.classList.remove("is-invalid");
  wrapper.classList.remove("is-invalid");

  const errorNode = getErrorNode(field);
  if (errorNode) {
    errorNode.remove();
  }
}

function getFormStatusNode(form) {
  return form.querySelector(".form-status");
}

function setFormStatus(form, message, type = "error") {
  let statusNode = getFormStatusNode(form);

  if (!statusNode) {
    statusNode = document.createElement("p");
    statusNode.className = "form-status";
    form.appendChild(statusNode);
  }

  statusNode.dataset.type = type;
  statusNode.textContent = message;
}

function clearFormStatus(form) {
  const statusNode = getFormStatusNode(form);
  if (statusNode) {
    statusNode.remove();
  }
}

function validateForm(form) {
  const step = Number(form.dataset.step);
  let isValid = true;

  const nameField = form.querySelector('input[name="name"]');
  const emailField = form.querySelector('input[name="email"]');
  const whatsappField = form.querySelector('input[name="whatsapp"]');
  const profileField = form.querySelector('select[name="profile"]');
  const handleField = form.querySelector('input[name="colosseumHandle"]');

  if (step === 1) {
    const whatsappDigits = (whatsappField?.value || "").replace(/\D/g, "");

    if (!nameField.value.trim()) {
      setFieldError(nameField, "Digite seu nome completo.");
      isValid = false;
    }

    if (!emailField.value.trim()) {
      setFieldError(emailField, "Digite seu e-mail.");
      isValid = false;
    } else if (!emailPattern.test(emailField.value.trim())) {
      setFieldError(emailField, "Digite um e-mail valido.");
      isValid = false;
    }

    if (!whatsappField.value.trim()) {
      setFieldError(whatsappField, "Digite seu WhatsApp.");
      isValid = false;
    } else if (whatsappDigits.length < 10) {
      setFieldError(whatsappField, "Digite um numero de WhatsApp valido.");
      isValid = false;
    }

    if (!profileField.value.trim()) {
      setFieldError(profileField, "Selecione seu perfil tecnico.");
      isValid = false;
    }
  }

  if (step === 2) {
    if (!handleField.value.trim()) {
      setFieldError(handleField, "Digite seu handle no Colosseum.");
      isValid = false;
    }
  }

  if (step === 3 && !submission.discordJoined) {
    setFormStatus(form, "Entre no Discord antes de concluir sua inscrição.", "error");
    isValid = false;
  }

  return isValid;
}

function hasDraftProgress() {
  return Boolean(
    submission.name ||
      submission.email ||
      submission.whatsapp ||
      submission.profile ||
      submission.colosseumHandle ||
      submission.discordJoined ||
      currentStep > 1
  );
}

function updateOpenButtonsState() {
  openModalButtons.forEach((button) => {
    if (submission.completed) {
      button.textContent = COMPLETED_OPEN_LABEL;
      return;
    }

    button.textContent = hasDraftProgress() ? CONTINUE_OPEN_LABEL : DEFAULT_OPEN_LABEL;
  });
}

function persistDraft() {
  const draft = {
    currentStep,
    submission,
  };
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  updateOpenButtonsState();
}

async function submitRegistration(payload) {
  const response = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...payload,
      source: "elgato-solana-campaign",
    }),
  });

  let result = null;

  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (!response.ok) {
    const message = result?.error || "Nao foi possivel salvar sua inscricao agora.";
    throw new Error(message);
  }

  return result;
}

function hydrateDraft() {
  const rawDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
  if (!rawDraft) {
    syncFormValues();
    return;
  }

  try {
    const draft = JSON.parse(rawDraft);
    currentStep = Number(draft.currentStep) || 1;
    submission = {
      ...submission,
      ...draft.submission,
    };
    syncFormValues();
    updateOpenButtonsState();
  } catch {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    syncFormValues();
    updateOpenButtonsState();
  }
}

function saveSubmission() {
  const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  existing.push({
    ...submission,
    createdAt: new Date().toISOString(),
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

function finishFlow() {
  submission.completed = true;
  currentStep = 3;

  forms.forEach((form) => {
    form.hidden = true;
  });

  progressSteps.forEach((stepNode) => {
    stepNode.classList.remove("is-active");
    stepNode.classList.add("is-complete");
  });

  modalStepLabel.textContent = "Concluído";
  modalTitle.textContent = "Inscrição recebida";
  modalDescription.textContent =
    "Este protótipo salva os dados localmente. O próximo passo pode ser conectar um backend real.";
  successPanel.hidden = false;
  persistDraft();
}

openModalButtons.forEach((button) => {
  button.addEventListener("click", openModal);
});

closeModalButtons.forEach((button) => {
  button.addEventListener("click", closeModal);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !modalShell.hidden) {
    closeModal();
  }
});

forms.forEach((form) => {
  form.addEventListener("input", () => {
    const formData = new FormData(form);

    if (form.dataset.step === "1") {
      submission.name = String(formData.get("name") || "").trim();
      submission.email = String(formData.get("email") || "").trim();
      submission.whatsapp = String(formData.get("whatsapp") || "").trim();
      submission.profile = String(formData.get("profile") || "").trim();
    }

    if (form.dataset.step === "2") {
      submission.colosseumHandle = String(formData.get("colosseumHandle") || "").trim();
    }

    persistDraft();
  });

  form.querySelectorAll("input, select, textarea").forEach((field) => {
    const eventName = field.type === "checkbox" || field.tagName === "SELECT" ? "change" : "input";
    field.addEventListener(eventName, () => {
      clearFieldError(field);
    });
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const step = Number(form.dataset.step);
    clearFormStatus(form);

    if (!validateForm(form)) {
      return;
    }

    if (step === 1) {
      const formData = new FormData(form);
      submission.name = String(formData.get("name") || "").trim();
      submission.email = String(formData.get("email") || "").trim();
      submission.whatsapp = String(formData.get("whatsapp") || "").trim();
      submission.profile = String(formData.get("profile") || "").trim();
      setStep(2);
      return;
    }

    if (step === 2) {
      if (handleBlock.hidden) {
        return;
      }

      const formData = new FormData(form);
      submission.colosseumHandle = String(formData.get("colosseumHandle") || "").trim();

      if (!submission.colosseumHandle) {
        form.reportValidity();
        return;
      }

      setStep(3);
      return;
    }

    if (step === 3) {
      if (isSubmitting) {
        return;
      }

      isSubmitting = true;
      setFormStatus(form, "Salvando sua inscricao...", "info");

      submitRegistration(submission)
        .then(() => {
          saveSubmission();
          finishFlow();
        })
        .catch((error) => {
          setFormStatus(form, error.message, "error");
        })
        .finally(() => {
          isSubmitting = false;
        });
    }
  });
});

colosseumStartButton.addEventListener("click", () => {
  window.open(COLOSSEUM_URL, "_blank", "noopener,noreferrer");
  resetStepTwoUI();
  countdownBlock.hidden = false;
  persistDraft();

  let remainingSeconds = 10;
  countdownValue.textContent = String(remainingSeconds);

  countdownTimer = window.setInterval(() => {
    remainingSeconds -= 1;
    countdownValue.textContent = String(remainingSeconds);

    if (remainingSeconds <= 0) {
      clearInterval(countdownTimer);
      countdownTimer = null;
      countdownBlock.hidden = true;
      handleBlock.hidden = false;
      stepTwoSubmit.hidden = false;
      persistDraft();
    }
  }, 1000);
});

if (discordLink) {
  discordLink.addEventListener("click", () => {
    submission.discordJoined = true;
    syncStepThreeUI();
    persistDraft();
  });
}

hydrateDraft();
updateOpenButtonsState();

if (accordionGroup) {
  accordionGroup.querySelectorAll(".faq-question").forEach((button) => {
    button.addEventListener("click", () => {
      const isExpanded = button.getAttribute("aria-expanded") === "true";

      accordionGroup.querySelectorAll(".faq-question").forEach((otherButton) => {
        const answer = otherButton.parentElement.querySelector(".faq-answer");
        otherButton.setAttribute("aria-expanded", "false");
        if (answer) {
          answer.hidden = true;
        }
      });

      if (!isExpanded) {
        const answer = button.parentElement.querySelector(".faq-answer");
        button.setAttribute("aria-expanded", "true");
        if (answer) {
          answer.hidden = false;
        }
      }
    });
  });
}
