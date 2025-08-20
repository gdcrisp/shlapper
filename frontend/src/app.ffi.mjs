import { Ok, Error } from './gleam.mjs';

export function get_text_content(selector) {
  const element = document.querySelector(selector)
  const textContent = element?.textContent

  if (textContent == null) {
    return new Error();
  }

  return new Ok(textContent);
}

export function getCurrentTimestamp() {
  return Date.now();
}

export function setupDragAndDropListener(handler) {
  // Remove existing listener if any
  document.removeEventListener('itemStatusChanged', window.gleamDragDropHandler);
  
  // Create and store the handler
  window.gleamDragDropHandler = function(event) {
    const { id, type, newStatus } = event.detail;
    handler([type, id, newStatus]);
  };
  
  // Add the event listener
  document.addEventListener('itemStatusChanged', window.gleamDragDropHandler);
}

export function clearDragUpdateState(itemType, itemId) {
  // Find the element that was being updated and clear its updating state
  const element = document.querySelector(`[data-type="${itemType}"][data-id="${itemId}"]`);
  if (element && element.style) {
    element.style.opacity = '';
    element.style.filter = '';
    element.classList.remove('api-updating');
  }
}
