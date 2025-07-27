(function () {
  function parseISODate(isoString) {
    if (!isoString || typeof isoString !== "string") return null;
    const parts = isoString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!parts) return null;
    const year = parseInt(parts[1], 10);
    const month = parseInt(parts[2], 10) - 1; // JS month is 0-indexed
    const day = parseInt(parts[3], 10);
    const date = new Date(Date.UTC(year, month, day));
    if (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month &&
      date.getUTCDate() === day
    ) {
      return date;
    }
    return null;
  }

  function formatDateWithIntl(date, format, localeTag) {
    if (!date || isNaN(date.getTime())) return "";

    // Always use UTC for formatting to avoid timezone shifts
    let options = { timeZone: "UTC" };
    switch (format) {
      case "locale-short":
        options.dateStyle = "short";
        break;
      case "locale-long":
        options.dateStyle = "long";
        break;
      case "locale-full":
        options.dateStyle = "full";
        break;
      case "locale-medium": // Default to medium
      default:
        options.dateStyle = "medium";
        break;
    }

    try {
      // Explicitly pass the options object with timeZone: 'UTC'
      return new Intl.DateTimeFormat(localeTag, options).format(date);
    } catch (e) {
      console.error(
        `Error formatting date with Intl (locale: ${localeTag}, format: ${format}, timezone: UTC):`,
        e
      );
      // Fallback to locale default medium on error, still using UTC
      try {
        const fallbackOptions = { dateStyle: "medium", timeZone: "UTC" };
        return new Intl.DateTimeFormat(localeTag, fallbackOptions).format(date);
      } catch (fallbackError) {
        console.error(
          `Error formatting date with fallback Intl (locale: ${localeTag}, timezone: UTC):`,
          fallbackError
        );
        // Absolute fallback: Format the UTC date parts manually if Intl fails completely
        const year = date.getUTCFullYear();
        // getUTCMonth is 0-indexed, add 1 for display
        const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
        const day = date.getUTCDate().toString().padStart(2, "0");
        return `${year}-${month}-${day}`; // Simple ISO format as absolute fallback
      }
    }
  }

  function initDatePicker(triggerButton) {
    if (!triggerButton || triggerButton.hasAttribute("data-initialized")) return;
    triggerButton.setAttribute("data-initialized", "true");

    const datePickerID = triggerButton.id;
    const displaySpan = triggerButton.querySelector(
      "[data-tui-datepicker-display]"
    );
    const calendarInstanceId = datePickerID + "-calendar-instance";
    const calendarInstance = document.getElementById(calendarInstanceId);
    const calendarHiddenInputId = calendarInstanceId + "-hidden";
    const calendarHiddenInput = document.getElementById(calendarHiddenInputId);

    // Fallback to find calendar relatively
    let calendar = calendarInstance;
    let hiddenInput = calendarHiddenInput;

    if (!calendarInstance || !calendarHiddenInput) {
      const popoverContentId = triggerButton.getAttribute("aria-controls");
      const popoverContent = popoverContentId
        ? document.getElementById(popoverContentId)
        : null;
      if (popoverContent) {
        if (!calendar)
          calendar = popoverContent.querySelector("[data-tui-calendar-container]");
        if (!hiddenInput) {
          const wrapper = popoverContent.querySelector(
            "[data-tui-calendar-wrapper]"
          );
          hiddenInput = wrapper
            ? wrapper.querySelector("[data-tui-calendar-hidden-input]")
            : null;
        }
      }
    }

    if (!displaySpan || !calendar || !hiddenInput) {
      console.error("DatePicker init error: Missing required elements.", {
        datePickerID,
        displaySpan,
        calendar,
        hiddenInput,
      });
      return;
    }

    const displayFormat =
      triggerButton.getAttribute("data-tui-datepicker-display-format") || "locale-medium";
    const localeTag = triggerButton.getAttribute("data-tui-datepicker-locale-tag") || "en-US";
    const placeholder = triggerButton.getAttribute("data-tui-datepicker-placeholder") || "Select a date";

    const onCalendarSelect = (event) => {
      if (
        !event.detail ||
        !event.detail.date ||
        !(event.detail.date instanceof Date)
      )
        return;
      const selectedDate = event.detail.date;
      const displayFormattedValue = formatDateWithIntl(
        selectedDate,
        displayFormat,
        localeTag
      );
      displaySpan.textContent = displayFormattedValue;
      displaySpan.classList.remove("text-muted-foreground");

      // Find and click the popover trigger to close it
      const popoverTrigger = triggerButton
        .closest("[data-tui-popover]")
        ?.querySelector("[data-tui-popover-trigger]");
      if (popoverTrigger instanceof HTMLElement) {
        popoverTrigger.click();
      } else {
        triggerButton.click(); // Fallback: click the button itself (might not work if inside popover)
      }
    };

    const updateDisplay = () => {
      if (hiddenInput && hiddenInput.value) {
        const initialDate = parseISODate(hiddenInput.value);
        if (initialDate) {
          const correctlyFormatted = formatDateWithIntl(
            initialDate,
            displayFormat,
            localeTag
          );
          if (displaySpan.textContent.trim() !== correctlyFormatted) {
            displaySpan.textContent = correctlyFormatted;
            displaySpan.classList.remove("text-muted-foreground");
          }
        } else {
          // Handle case where hidden input has invalid value
          displaySpan.textContent = placeholder;
          displaySpan.classList.add("text-muted-foreground");
        }
      } else {
        // Ensure placeholder is shown if no value
        displaySpan.textContent = placeholder;
        displaySpan.classList.add("text-muted-foreground");
      }
    };

    // Attach listener to the specific calendar instance
    calendar.addEventListener("calendar-date-selected", onCalendarSelect);

    updateDisplay(); // Initial display update

    triggerButton._datePickerInitialized = true;

    // Store cleanup function on the button itself
    triggerButton._datePickerCleanup = () => {
      if (calendar) {
        calendar.removeEventListener(
          "calendar-date-selected",
          onCalendarSelect
        );
      }
    };

    // Form reset support
    const form = triggerButton.closest('form');
    if (form) {
      form.addEventListener('reset', () => {
        // Clear hidden input
        if (hiddenInput) {
          hiddenInput.value = '';
        }
        // Reset display to placeholder
        displaySpan.textContent = placeholder;
        displaySpan.classList.add('text-muted-foreground');
      });
    }
  }

  function init(root = document) {
    if (root instanceof Element && root.matches('[data-tui-datepicker="true"]')) {
      initDatePicker(root);
    }
    root
      .querySelectorAll('[data-tui-datepicker="true"]:not([data-initialized])')
      .forEach((triggerButton) => {
        initDatePicker(triggerButton);
      });
  }

  window.templUI = window.templUI || {};
  window.templUI.datePicker = { init: init };

  document.addEventListener("DOMContentLoaded", () => init());
})();
