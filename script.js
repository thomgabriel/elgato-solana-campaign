const modalShell = document.querySelector("[data-modal]");
const openModalButtons = document.querySelectorAll("[data-open-modal]");
const closeModalButtons = document.querySelectorAll("[data-close-modal]");
const forms = document.querySelectorAll(".modal-form");
const modalTitle = document.getElementById("modal-title");
const modalDescription = document.getElementById("modal-description");
const modalStepLabel = document.getElementById("modal-step-label");
const progressSteps = document.querySelectorAll("[data-progress-step]");
const accordionGroup = document.querySelector("[data-accordion-group]");

const API_ENDPOINT = "/api/register";
const STORAGE_KEY = "elgato-solana-campaign-submissions";
const DRAFT_STORAGE_KEY = "elgato-solana-campaign-draft";
const DEFAULT_OPEN_LABEL = "Inscreva-se →";
const CONTINUE_OPEN_LABEL = "Continuar inscrição →";
const COMPLETED_OPEN_LABEL = "Inscrição concluída";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let currentStep = 1;
let submission = {
  name: "",
  email: "",
  whatsapp: "",
  profile: "",
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
    title: "Crie sua conta e entre na comunidade",
    description:
      "Sua inscrição foi salva. Agora crie sua conta no Colosseum e entre no Discord.",
  },
};

function openModal() {
  hydrateDraft();
  modalShell.hidden = false;
  document.body.style.overflow = "hidden";

  setStep(submission.completed ? 2 : currentStep);
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

  const copy = stepContent[step];
  modalStepLabel.textContent = copy.label;
  modalTitle.textContent = copy.title;
  modalDescription.textContent = copy.description;

  progressSteps.forEach((stepNode) => {
    const stepNumber = Number(stepNode.dataset.progressStep);
    stepNode.classList.toggle("is-active", stepNumber === step);
    stepNode.classList.toggle("is-complete", stepNumber < step);
  });

  persistDraft();
}

function syncFormValues() {
  document.querySelector('input[name="name"]').value = submission.name;
  document.querySelector('input[name="email"]').value = submission.email;
  document.querySelector('input[name="whatsapp"]').value = submission.whatsapp;
  document.querySelector('select[name="profile"]').value = submission.profile;
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
  let isValid = true;

  const nameField = form.querySelector('input[name="name"]');
  const emailField = form.querySelector('input[name="email"]');
  const whatsappField = form.querySelector('input[name="whatsapp"]');
  const profileField = form.querySelector('select[name="profile"]');

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

  return isValid;
}

function hasDraftProgress() {
  return Boolean(
    submission.name ||
      submission.email ||
      submission.whatsapp ||
      submission.profile ||
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
    const restoredStep = Number(draft.currentStep) || 1;
    currentStep = restoredStep > 2 ? 1 : restoredStep;
    submission = {
      name: draft.submission?.name || "",
      email: draft.submission?.email || "",
      whatsapp: draft.submission?.whatsapp || "",
      profile: draft.submission?.profile || "",
      completed: Boolean(draft.submission?.completed),
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

    if (step === 1) {
      if (!validateForm(form)) {
        return;
      }

      const formData = new FormData(form);
      submission.name = String(formData.get("name") || "").trim();
      submission.email = String(formData.get("email") || "").trim();
      submission.whatsapp = String(formData.get("whatsapp") || "").trim();
      submission.profile = String(formData.get("profile") || "").trim();

      submission.completed = true;
      saveSubmission();
      submitRegistration(submission).catch(() => {});
      setStep(2);
      return;
    }
  });
});

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
