/**
 * modal.js - Global Modal System for miplan.pro
 * Handles dynamic loading of the safety protocol to prevent flow disruption.
 */

const ProtocolModal = (() => {
    let overlay = null;
    let body = null;
    let isInitialized = false;

    /**
     * Creates the modal structure in the DOM if it doesn't exist.
     */
    const init = () => {
        if (isInitialized) return;

        overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = 'protocol-modal-overlay';
        overlay.innerHTML = `
            <div class="modal-container">
                <div class="modal-header">
                    <h3>Protocolo de Seguridad</h3>
                    <button class="modal-close" id="protocol-modal-close" aria-label="Cerrar">&times;</button>
                </div>
                <div class="modal-body" id="protocol-modal-body">
                    <div class="modal-loader">
                        <div class="spinner"></div>
                        <p>Cargando información de seguridad...</p>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        body = overlay.querySelector('#protocol-modal-body');

        // Close events
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close();
        });

        overlay.querySelector('#protocol-modal-close').addEventListener('click', close);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && overlay.classList.contains('active')) close();
        });

        isInitialized = true;
    };

    /**
     * Fetches and displays the protocol content.
     */
    const open = async (e) => {
        if (e) e.preventDefault();
        
        init();
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scroll

        try {
            const response = await fetch('protocolo-emergencia.html');
            if (!response.ok) throw new Error('No se pudo cargar el protocolo.');
            
            const html = await response.text();
            
            // Parse HTML and extract the protocol container
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const content = doc.querySelector('.protocol-container');

            if (content) {
                // Remove header and footer from the extracted content to keep it clean in modal
                const navbar = content.querySelector('.navbar');
                if (navbar) navbar.remove();
                
                const footer = content.querySelector('footer');
                if (footer) footer.remove();

                body.innerHTML = content.innerHTML;
            } else {
                body.innerHTML = '<p style="padding: 2rem; text-align: center; color: red;">Error: No se encontró el bloque de contenido del protocolo.</p>';
            }

        } catch (error) {
            console.error('Error loading protocol:', error);
            body.innerHTML = `<p style="padding: 2rem; text-align: center; color: red;">Error cargando el protocolo. Por favor intenta de nuevo más tarde.</p>`;
        }
    };

    const close = () => {
        if (!overlay) return;
        overlay.classList.remove('active');
        document.body.style.overflow = ''; // Restore scroll
        
        // Reset body to loader for next time
        setTimeout(() => {
            body.innerHTML = `
                <div class="modal-loader">
                    <div class="spinner"></div>
                    <p>Cargando información de seguridad...</p>
                </div>
            `;
        }, 300);
    };

    /**
     * Auto-attaches to links with [data-modal-protocol]
     */
    const attachListeners = () => {
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href*="protocolo-emergencia.html"]');
            if (link) {
                // If it's a mobile device or the user explicitly wants modal (we can add a data attribute later)
                // For now, let's make it the default for all links to the protocol
                open(e);
            }
        });
    };

    return {
        open,
        close,
        attachListeners
    };
})();

// Initialize listeners
ProtocolModal.attachListeners();
