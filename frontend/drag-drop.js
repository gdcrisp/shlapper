// Drag and drop utilities
let draggedElement = null;
let draggedIndex = -1;
let draggedData = null;

function initializeDragAndDrop() {
  // Add event listeners for drag and drop
  document.addEventListener('dragstart', function(e) {
    if (e.target.draggable) {
      draggedElement = e.target;
      draggedIndex = Array.from(e.target.parentNode.children).indexOf(e.target);
      
      // Extract dragged item data
      draggedData = {
        id: e.target.getAttribute('data-id'),
        type: e.target.getAttribute('data-type'), // 'task' or 'project'
        currentStatus: e.target.getAttribute('data-status'),
      };
      
      if (e.target.style) {
        e.target.style.opacity = '0.5';
        e.target.style.transform = 'rotate(2deg)';
      }
      
      // Set transfer data for HTML5 drag and drop
      e.dataTransfer.setData('application/json', JSON.stringify(draggedData));
    }
  });

  document.addEventListener('dragend', function(e) {
    if (e.target.draggable) {
      if (e.target.style) {
        e.target.style.opacity = '';
        e.target.style.transform = '';
      }
      draggedElement = null;
      draggedIndex = -1;
      draggedData = null;
    }
  });

  document.addEventListener('dragover', function(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  });

  document.addEventListener('dragenter', function(e) {
    e.preventDefault();
    const kanbanColumn = e.target.closest('.kanban-column');
    const draggableTarget = e.target.closest('[draggable="true"]');
    
    if (kanbanColumn && !draggableTarget && kanbanColumn.style) {
      kanbanColumn.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
      kanbanColumn.style.borderColor = 'rgb(59, 130, 246)';
    } else if (draggableTarget && draggableTarget !== draggedElement && draggableTarget.style) {
      draggableTarget.style.transform = 'translateY(10px)';
    }
  });

  document.addEventListener('dragleave', function(e) {
    const kanbanColumn = e.target.closest('.kanban-column');
    const draggableTarget = e.target.closest('[draggable="true"]');
    
    if (kanbanColumn && !draggableTarget && kanbanColumn.style) {
      kanbanColumn.style.backgroundColor = '';
      kanbanColumn.style.borderColor = '';
    } else if (draggableTarget && draggableTarget !== draggedElement && draggableTarget.style) {
      draggableTarget.style.transform = '';
    }
  });

  document.addEventListener('drop', function(e) {
    e.preventDefault();
    const kanbanColumn = e.target.closest('.kanban-column');
    const dropTarget = e.target.closest('[draggable="true"]');
    
    // Clear visual feedback
    if (kanbanColumn && kanbanColumn.style) {
      kanbanColumn.style.backgroundColor = '';
      kanbanColumn.style.borderColor = '';
    }
    if (dropTarget && dropTarget.style) {
      dropTarget.style.transform = '';
    }
    
    if (draggedElement && draggedData) {
      let targetStatus = null;
      let targetContainer = null;
      
      // Check if dropped on a kanban column
      if (kanbanColumn) {
        targetStatus = kanbanColumn.getAttribute('data-status');
        targetContainer = kanbanColumn.querySelector('.space-y-3');
      }
      
      // Check if dropped on another draggable item
      if (dropTarget && dropTarget !== draggedElement) {
        const dropTargetColumn = dropTarget.closest('.kanban-column');
        if (dropTargetColumn) {
          targetStatus = dropTargetColumn.getAttribute('data-status');
          targetContainer = dropTargetColumn.querySelector('.space-y-3');
        }
      }
      
      // Only proceed if we have a valid target and status change
      if (targetStatus && targetContainer && targetStatus !== draggedData.currentStatus) {
        // Move the element visually first for immediate feedback
        if (dropTarget && targetContainer.contains(dropTarget)) {
          // Insert before the drop target
          targetContainer.insertBefore(draggedElement, dropTarget);
        } else {
          // Append to the column
          targetContainer.appendChild(draggedElement);
        }
        
        // Update the element's data attributes
        draggedElement.setAttribute('data-status', targetStatus);
        
        // Add visual feedback that API call is in progress
        if (draggedElement.style) {
          draggedElement.style.opacity = '0.7';
          draggedElement.style.transform = '';
          draggedElement.style.filter = 'brightness(0.9)';
          draggedElement.classList.add('api-updating');
        }
        
        // Trigger status update via custom event
        const updateEvent = new CustomEvent('itemStatusChanged', {
          detail: {
            id: parseInt(draggedData.id),
            type: draggedData.type,
            oldStatus: draggedData.currentStatus,
            newStatus: targetStatus
          }
        });
        document.dispatchEvent(updateEvent);
        
      } else if (dropTarget && dropTarget !== draggedElement && !targetStatus) {
        // Handle reordering within the same column
        const dropIndex = Array.from(dropTarget.parentNode.children).indexOf(dropTarget);
        const container = dropTarget.parentNode;
        
        if (draggedElement.style) {
          draggedElement.style.opacity = '';
          draggedElement.style.transform = '';
        }
        
        // Reorder elements
        if (draggedIndex < dropIndex) {
          container.insertBefore(draggedElement, dropTarget.nextSibling);
        } else {
          container.insertBefore(draggedElement, dropTarget);
        }
        
        // Add smooth animation
        if (draggedElement.style) {
          draggedElement.style.transform = 'scale(1.05)';
          const elementToAnimate = draggedElement;
          setTimeout(() => {
            if (elementToAnimate && elementToAnimate.style) {
              elementToAnimate.style.transform = '';
            }
          }, 200);
        }
      }
    }
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeDragAndDrop);
} else {
  initializeDragAndDrop();
}

// Re-initialize when new content is added (for SPA updates)
const observer = new MutationObserver(function(mutations) {
  mutations.forEach(function(mutation) {
    if (mutation.addedNodes.length > 0) {
      // Check if any added nodes are draggable or contain draggable elements
      for (let node of mutation.addedNodes) {
        if (node.nodeType === 1) { // Element node
          if (node.draggable || node.querySelector && node.querySelector('[draggable="true"]')) {
            // Small delay to ensure the elements are fully rendered
            setTimeout(initializeDragAndDrop, 10);
            break;
          }
        }
      }
    }
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

window.dragAndDropUtils = {
  initializeDragAndDrop: initializeDragAndDrop
};