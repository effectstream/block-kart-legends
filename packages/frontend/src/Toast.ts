export function showToast(message: string, duration: number = 3000) {
  const container = document.getElementById('toast-container') || createToastContainer();
  
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerText = message;
  toast.style.cssText = `
    background: rgba(0, 0, 0, 0.9);
    color: #00ffcc;
    padding: 12px 24px;
    border-radius: 8px;
    margin-top: 10px;
    border: 1px solid #00ffcc;
    font-family: 'Exo 2', sans-serif;
    box-shadow: 0 0 10px rgba(0, 255, 204, 0.2);
    min-width: 200px;
    text-align: center;
    transition: all 0.3s ease;
  `;
  
  container.appendChild(toast);
  
  const close = () => {
      if (toast.parentElement) {
          toast.style.opacity = '0';
          setTimeout(() => {
            if (toast.parentElement) toast.parentElement.removeChild(toast);
          }, 300);
      }
  };

  if (duration > 0) {
      setTimeout(close, duration);
  }

  return {
      updateMessage: (msg: string) => {
          toast.innerText = msg;
      },
      close
  };
}

function createToastContainer() {
    const div = document.createElement('div');
    div.id = 'toast-container';
    div.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        pointer-events: none;
    `;
    document.body.appendChild(div);
    return div;
}
