import axios from 'axios';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

const token = document.querySelector('meta[name="csrf-token"]');

if (token) {
    window.axios.defaults.headers.common['X-CSRF-TOKEN'] = token.getAttribute('content');
}

if (!window.__appWriteToastInterceptorRegistered) {
    window.__appWriteToastInterceptorRegistered = true;
    const writeMethods = new Set(['post', 'put', 'patch', 'delete']);

    window.axios.interceptors.response.use(
        (response) => {
            const method = (response?.config?.method || '').toLowerCase();
            if (writeMethods.has(method)) {
                const message = response?.data?.message || 'Saved successfully.';
                window.dispatchEvent(
                    new CustomEvent('app:notify', {
                        detail: { type: 'success', message },
                    })
                );
            }

            return response;
        },
        (error) => {
            const method = (error?.config?.method || '').toLowerCase();
            if (writeMethods.has(method)) {
                const message = error?.response?.data?.message || 'Action failed. Please try again.';
                window.dispatchEvent(
                    new CustomEvent('app:notify', {
                        detail: { type: 'error', message },
                    })
                );
            }

            return Promise.reject(error);
        }
    );
}
