(function () {
  const modals = new Map();
  let openModalId = null;

  // Update trigger states
  function updateTriggers(modalId, isOpen) {
    document
      .querySelectorAll(`[data-modal-trigger="${modalId}"]`)
      .forEach((trigger) => {
        trigger.setAttribute("data-open", isOpen);
      });
  }

  // Create modal instance
  function createModal(modal) {
    const modalId = modal.id;
    const content = modal.querySelector("[data-modal-content]");
    const isInitiallyOpen = modal.hasAttribute("data-initial-open");

    if (!content || !modalId) return null;

    let isOpen = isInitiallyOpen;

    // Set state
    function setState(open) {
      isOpen = open;
      modal.style.display = open ? "flex" : "none";
      modal.setAttribute("data-open", open);
      updateTriggers(modalId, open);

      if (open) {
        openModalId = modalId;
        document.body.style.overflow = "hidden";

        // Animation classes
        modal.classList.remove("opacity-0");
        modal.classList.add("opacity-100");
        content.classList.remove("scale-95", "opacity-0");
        content.classList.add("scale-100", "opacity-100");

        // Focus first element
        setTimeout(() => {
          const focusable = content.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          focusable?.focus();
        }, 50);
      } else {
        if (openModalId === modalId) {
          openModalId = null;
          document.body.style.overflow = "";
        }

        // Animation classes
        modal.classList.remove("opacity-100");
        modal.classList.add("opacity-0");
        content.classList.remove("scale-100", "opacity-100");
        content.classList.add("scale-95", "opacity-0");
      }
    }

    // Open modal
    function open() {
      // Close any other open modal
      if (openModalId && openModalId !== modalId) {
        modals.get(openModalId)?.close(true);
      }

      modal.style.display = "flex";
      modal.offsetHeight; // Force reflow
      setState(true);

      // Add event listeners
      document.addEventListener("keydown", handleEsc);
      document.addEventListener("click", handleClickAway);
    }

    // Close modal
    function close(immediate = false) {
      setState(false);

      // Remove event listeners
      document.removeEventListener("keydown", handleEsc);
      document.removeEventListener("click", handleClickAway);

      // Hide after animation
      if (!immediate) {
        setTimeout(() => {
          if (!isOpen) modal.style.display = "none";
        }, 300);
      }
    }

    // Toggle modal
    function toggle() {
      isOpen ? close() : open();
    }

    // Handle escape key
    function handleEsc(e) {
      if (
        e.key === "Escape" &&
        isOpen &&
        modal.getAttribute("data-disable-esc") !== "true"
      ) {
        close();
      }
    }

    // Handle click away
    function handleClickAway(e) {
      if (modal.getAttribute("data-disable-click-away") === "true") return;

      if (!content.contains(e.target) && !isTriggerClick(e.target)) {
        close();
      }
    }

    // Check if click is on a trigger
    function isTriggerClick(target) {
      const trigger = target.closest("[data-modal-trigger]");
      return trigger && trigger.getAttribute("data-modal-trigger") === modalId;
    }

    // Setup close buttons
    modal.querySelectorAll("[data-modal-close]").forEach((btn) => {
      btn.addEventListener("click", close);
    });

    // Set initial state
    setState(isInitiallyOpen);

    return { open, close, toggle };
  }

  // Initialize all modals and triggers
  function init(root = document) {
    // Find and initialize modals
    root.querySelectorAll("[data-modal]").forEach((modal) => {
      if (modal.dataset.initialized) return;
      modal.dataset.initialized = "true";

      const modalInstance = createModal(modal);
      if (modalInstance && modal.id) {
        modals.set(modal.id, modalInstance);
      }
    });

    // Setup trigger clicks
    root.querySelectorAll("[data-modal-trigger]").forEach((trigger) => {
      if (trigger.dataset.initialized) return;
      trigger.dataset.initialized = "true";

      const modalId = trigger.getAttribute("data-modal-trigger");
      trigger.addEventListener("click", () => {
        if (
          !trigger.hasAttribute("disabled") &&
          !trigger.classList.contains("opacity-50")
        ) {
          modals.get(modalId)?.toggle();
        }
      });
    });
  }

  // Export
  window.templUI = window.templUI || {};
  window.templUI.modal = { initAllComponents: init };

  // Auto-initialize
  document.addEventListener("DOMContentLoaded", () => init());
})();
