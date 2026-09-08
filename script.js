/* ==========================================
   MONITOR DE SISTEMAS WEB - script mejorado
========================================== */

(() => {
    /* =========================
       CONFIGURACIÓN / ALMACENAMIENTO
    ========================= */

    const STORAGE_KEY = "monitor_state_v1";

    // SERVICIOS SIMULADOS (estado inicial)
    const services = [
        { id: "frontend", name: "Página web", icon: "🌐", status: "online", code: "HTTP 200", time: "1.2 s" },
        { id: "server", name: "Servidor", icon: "🖥️", status: "online", code: "HTTP 200", time: "0.9 s" },
        { id: "api", name: "API REST", icon: "🔌", status: "online", code: "HTTP 200", time: "0.4 s" },
        { id: "database", name: "Base de datos", icon: "🗄️", status: "online", code: "OK", time: "0.08 s" }
    ];

    let incidents = [];

    /* =========================
       ELEMENTOS HTML
    ========================= */

    const servicesContainer = document.getElementById("services");
    const globalStatus = document.getElementById("globalStatus");
    const diagnosisStatus = document.getElementById("diagnosisStatus");
    const diagnosisText = document.getElementById("diagnosisText");
    const incidentsContainer = document.getElementById("incidents");
    const lastCheck = document.getElementById("lastCheck");

    // Mejoras de accesibilidad: anunciar cambios
    if (globalStatus) {
        globalStatus.setAttribute("role", "status");
        globalStatus.setAttribute("aria-live", "polite");
    }
    if (diagnosisText) {
        diagnosisText.setAttribute("role", "status");
        diagnosisText.setAttribute("aria-live", "polite");
    }

    /* =========================
       PERSISTENCIA (localStorage)
    ========================= */

    function saveState() {
        try {
            const payload = {
                services: services.map(s => ({ id: s.id, status: s.status, code: s.code, time: s.time })),
                incidents,
                lastCheck: new Date().toISOString()
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        } catch (e) {
            // fall back silencioso si storage falla
            console.warn("No se pudo guardar el estado:", e);
        }
    }

    function loadState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (parsed.services && Array.isArray(parsed.services)) {
                // aplicar solo las propiedades guardadas a los servicios existentes
                parsed.services.forEach(saved => {
                    const s = services.find(x => x.id === saved.id);
                    if (s) {
                        s.status = saved.status ?? s.status;
                        s.code = saved.code ?? s.code;
                        s.time = saved.time ?? s.time;
                    }
                });
            }
            if (parsed.incidents && Array.isArray(parsed.incidents)) {
                incidents = parsed.incidents;
            }
            if (parsed.lastCheck) {
                try {
                    const dt = new Date(parsed.lastCheck);
                    if (!isNaN(dt)) {
                        lastCheck.textContent = `Última comprobación: ${dt.toLocaleString("es-AR")}`;
                    }
                } catch {}
            }
        } catch (e) {
            console.warn("No se pudo cargar el estado:", e);
        }
    }

    /* =========================
       RENDERIZAR SERVICIOS
    ========================= */

    function renderServices() {
        servicesContainer.innerHTML = "";

        services.forEach(service => {
            let statusClass = "";
            if (service.status === "offline") statusClass = "offline";
            if (service.status === "warning") statusClass = "warning";

            // crear tarjeta con elementos y textContent para evitar XSS
            const card = document.createElement("article");
            card.className = `service-card ${statusClass}`;

            const iconDiv = document.createElement("div");
            iconDiv.className = "service-icon";
            iconDiv.textContent = service.icon;

            const title = document.createElement("h3");
            title.textContent = service.name;

            const statusDiv = document.createElement("div");
            statusDiv.className = "service-status";
            let statusText = "";
            if (service.status === "online") statusText = "🟢 Operativo";
            else if (service.status === "warning") statusText = "🟡 Advertencia";
            else statusText = "🔴 Fuera de servicio";
            statusDiv.textContent = statusText;

            const details = document.createElement("div");
            details.className = "service-details";
            details.innerHTML = `
                Respuesta: ${escapeHtml(service.code)}<br><br>
                Tiempo: ${escapeHtml(service.time)}
            `;

            card.appendChild(iconDiv);
            card.appendChild(title);
            card.appendChild(statusDiv);
            card.appendChild(details);

            servicesContainer.appendChild(card);
        });
    }

    // pequeña función para escapar valores usados en innerHTML
    function escapeHtml(str) {
        if (typeof str !== "string") return String(str);
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    /* =========================
       ESTADO GLOBAL
    ========================= */

    function updateGlobalStatus() {
        const offline = services.some(s => s.status === "offline");
        const warning = services.some(s => s.status === "warning");

        if (offline) {
            globalStatus.textContent = "● INCIDENTE DETECTADO";
            globalStatus.className = "global-status offline";
        } else if (warning) {
            globalStatus.textContent = "● ADVERTENCIA";
            globalStatus.className = "global-status warning";
        } else {
            globalStatus.textContent = "● SISTEMA OPERATIVO";
            globalStatus.className = "global-status online";
        }
    }

    /* =========================
       DIAGNÓSTICO (más robusto)
    ========================= */

    function updateDiagnosis() {
        const server = services.find(s => s.id === "server");
        const api = services.find(s => s.id === "api");
        const database = services.find(s => s.id === "database");

        // comprobaciones seguras por si falta algún servicio
        if (!server || !api || !database) {
            diagnosisStatus.textContent = "🔶 Estado parcial";
            diagnosisText.innerHTML = `
                <strong>Advertencia:</strong> la configuración actual no incluye todos los servicios esperados.
                <br><br>
                Verifica la definición de servicios.
            `;
            return;
        }

        if (server.status === "offline") {
            diagnosisStatus.textContent = "🔴 Servidor caído";
            diagnosisText.innerHTML = `
                <strong>Problema detectado:</strong> el servidor no está respondiendo.
                <br><br>
                <strong>Respuesta simulada:</strong> HTTP 503 - Service Unavailable.
                <br><br>
                <strong>Qué haría una programadora:</strong>
                revisar logs del servidor, recursos disponibles, servicios activos, errores recientes y cambios realizados.
            `;
            return;
        }

        if (api.status === "offline") {
            diagnosisStatus.textContent = "🔴 API con errores";
            diagnosisText.innerHTML = `
                <strong>Problema detectado:</strong> la página web está disponible, pero la API REST no responde.
                <br><br>
                <strong>Qué revisar:</strong> backend, endpoints, logs, autenticación, conexión con la base de datos y dependencias.
            `;
            return;
        }

        if (database.status === "offline") {
            diagnosisStatus.textContent = "🔴 Base de datos";
            diagnosisText.innerHTML = `
                <strong>Problema detectado:</strong> la aplicación no puede comunicarse con la base de datos.
                <br><br>
                <strong>Qué revisar:</strong> disponibilidad del servicio, conexión, configuración autorizada y logs del backend.
            `;
            return;
        }

        diagnosisStatus.textContent = "🟢 Normal";
        diagnosisText.innerHTML = `
            <strong>No se detectaron incidentes.</strong>
            <br><br>
            Todos los componentes simulados responden correctamente.
            <br><br>
            La aplicación se encuentra operativa.
        `;
    }

    /* =========================
       INCIDENTES
    ========================= */

    function addIncident(message) {
        const date = new Date().toLocaleString("es-AR");
        // objeto simple, sin HTML
        incidents.unshift({ message: String(message), date });
        renderIncidents();
        saveState();
    }

    function renderIncidents() {
        incidentsContainer.innerHTML = "";

        if (incidents.length === 0) {
            const p = document.createElement("p");
            p.className = "empty";
            p.textContent = "No hay incidentes registrados.";
            incidentsContainer.appendChild(p);
            return;
        }

        incidents.forEach(incident => {
            const item = document.createElement("div");
            item.className = "incident";

            const title = document.createElement("div");
            title.className = "incident-title";
            title.textContent = `⚠️ ${incident.message}`;

            const date = document.createElement("div");
            date.className = "incident-date";
            date.textContent = incident.date;

            item.appendChild(title);
            item.appendChild(date);

            incidentsContainer.appendChild(item);
        });
    }

    /* =========================
       HORA DE COMPROBACIÓN
    ========================= */

    function updateLastCheck(dateObj = new Date()) {
        try {
            lastCheck.textContent = `Última comprobación: ${dateObj.toLocaleString("es-AR")}`;
        } catch {
            lastCheck.textContent = `Última comprobación: ${dateObj.toLocaleTimeString("es-AR")}`;
        }
        saveState();
    }

    /* =========================
       BOTONES / ACCIONES
    ========================= */

    const checkBtn = document.getElementById("checkBtn");
    const failBtn = document.getElementById("failBtn");
    const recoverBtn = document.getElementById("recoverBtn");
    const clearBtn = document.getElementById("clearBtn");

    if (checkBtn) {
        checkBtn.addEventListener("click", () => {
            updateLastCheck();
            addIncident("Comprobación manual ejecutada. Se revisó el estado de los servicios.");
            renderServices();
            updateGlobalStatus();
            updateDiagnosis();
        });
    }

    if (failBtn) {
        failBtn.addEventListener("click", () => {
            const server = services.find(s => s.id === "server");
            const frontend = services.find(s => s.id === "frontend");

            if (server) {
                server.status = "offline";
                server.code = "HTTP 503";
                server.time = "8.4 s";
            }
            if (frontend) {
                frontend.status = "offline";
                frontend.code = "HTTP 503";
                frontend.time = "8.4 s";
            }

            addIncident("Caída detectada: el servidor dejó de responder.");
            updateLastCheck();
            renderServices();
            updateGlobalStatus();
            updateDiagnosis();
            saveState();
        });
    }

    if (recoverBtn) {
        recoverBtn.addEventListener("click", () => {
            services.forEach(service => {
                service.status = "online";
                if (service.id === "database") {
                    service.code = "OK";
                    service.time = "0.08 s";
                } else {
                    service.code = "HTTP 200";
                    service.time = "1.0 s";
                }
            });

            addIncident("Recuperación completada: todos los servicios volvieron a responder.");
            updateLastCheck();
            renderServices();
            updateGlobalStatus();
            updateDiagnosis();
            saveState();
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener("click", () => {
            incidents = [];
            localStorage.removeItem(STORAGE_KEY);
            renderIncidents();
        });
    }

    /* =========================
       INICIALIZAR
    ========================= */

    // cargar estado guardado antes de renderizar
    loadState();

    renderServices();
    renderIncidents();
    updateGlobalStatus();
    updateDiagnosis();

    // Si no había lastCheck guardado, inicializarlo
    if (!lastCheck.textContent || lastCheck.textContent.includes("--:--")) {
        updateLastCheck();
    }
})();
