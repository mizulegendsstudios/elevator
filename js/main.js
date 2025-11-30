// Configuración - EDITA ESTOS VALORES
const CONFIG = {
    SUPABASE_URL: 'https://TU-URL.supabase.co',
    SUPABASE_ANON_KEY: 'TU-ANON-KEY',
    OPENAI_KEY: OPENAI_KEY, // Inyectado por Cloudflare
    WHATSAPP_NUMBER: '573000000000'
};

// Inicializar Supabase
const supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

// Estado de autenticación
let currentUser = null;

// Inicializar app
document.addEventListener('DOMContentLoaded', async () => {
    await checkUser();
    setupAuthListener();
});

// --- AUTH FUNCTIONS ---
async function checkUser() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    currentUser = user;
    updateUI();
}

function setupAuthListener() {
    supabaseClient.auth.onAuthStateChange((event, session) => {
        currentUser = session?.user || null;
        updateUI();
    });
}

function toggleAuth() {
    const modal = document.getElementById('authForm');
    modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
}

function toggleAuthMode() {
    const isLogin = document.getElementById('authTitle').textContent === 'Iniciar Sesión';
    document.getElementById('authTitle').textContent = isLogin ? 'Registrarse' : 'Iniciar Sesión';
    document.getElementById('authSubmit').textContent = isLogin ? 'Crear cuenta' : 'Entrar';
    document.getElementById('authToggle').innerHTML = isLogin 
        ? '¿Ya tienes cuenta? <a href="#" onclick="toggleAuthMode()">Inicia sesión</a>'
        : '¿No tienes cuenta? <a href="#" onclick="toggleAuthMode()">Regístrate</a>';
}

async function handleAuth(event) {
    event.preventDefault();
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const isLogin = document.getElementById('authTitle').textContent === 'Iniciar Sesión';
    
    const { data, error } = isLogin
        ? await supabaseClient.auth.signInWithPassword({ email, password })
        : await supabaseClient.auth.signUp({ email, password });
    
    if (error) {
        document.getElementById('authMessage').textContent = error.message;
    } else {
        document.getElementById('authMessage').textContent = isLogin ? '✅ Acceso concedido' : '✅ Cuenta creada';
        if (isLogin) {
            setTimeout(() => {
                toggleAuth();
                loadClientDashboard();
            }, 1000);
        }
    }
}

async function logout() {
    await supabaseClient.auth.signOut();
    currentUser = null;
    updateUI();
}

function updateUI() {
    const isLoggedIn = currentUser !== null;
    document.getElementById('authButton').style.display = isLoggedIn ? 'none' : 'inline';
    document.getElementById('logoutButton').style.display = isLoggedIn ? 'inline' : 'none';
    document.getElementById('clientDashboard').style.display = isLoggedIn ? 'block' : 'none';
    document.getElementById('services').style.display = isLoggedIn ? 'none' : 'block';
}

// --- DASHBOARD CLIENTES ---
async function loadClientDashboard() {
    if (!currentUser) return;
    
    // Obtener datos del cliente (ejemplo estático por ahora)
    document.getElementById('elevatorCount').textContent = '3 elevadores activos';
    document.getElementById('maintenanceHistory').innerHTML = `
        <li>✅ Mantenimiento - 15 Nov 2024</li>
        <li>✅ Revisión técnica - 01 Oct 2024</li>
        <li>🔧 Reparación menor - 12 Sep 2024</li>
    `;
    document.getElementById('nextMaintenance').textContent = '20 Diciembre 2024';
}

// --- UTILS ---
function scrollToSection(id) {
    document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
}

// --- FORMULARIO EMERGENCIA ---
document.getElementById('emergencyForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = document.getElementById('emergencyStatus');
    
    const data = {
        name: document.getElementById('clientName').value,
        phone: document.getElementById('clientPhone').value,
        brand: document.getElementById('elevatorBrand').value,
        problem: document.getElementById('problemDesc').value,
        created_at: new Date().toISOString()
    };

    const fileInput = document.getElementById('problemPhoto');
    if (fileInput.files[0]) {
        const file = fileInput.files[0];
        const fileName = `emergency_${Date.now()}_${file.name}`;
        const { error } = await supabaseClient.storage.from('emergency-photos').upload(fileName, file);
        if (!error) data.photo_url = `${CONFIG.SUPABASE_URL}/storage/v1/object/public/emergency-photos/${fileName}`;
    }

    const { error } = await supabaseClient.from('emergencies').insert([data]);
    
    if (error) {
        status.innerHTML = '❌ Error. Intenta WhatsApp directo.';
    } else {
        status.innerHTML = '✅ Reporte enviado. Te contactamos en <5 min.';
        document.getElementById('emergencyForm').reset();
        setTimeout(() => {
            const message = `🚨 EMERGENCIA - ${data.name} - ${data.phone}`;
            window.open(`https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`);
        }, 2000);
    }
});

// --- FORMULARIO COTIZACIÓN ---
document.getElementById('quoteForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = document.getElementById('quoteStatus');
    
    const data = {
        project: document.getElementById('projectName').value,
        email: document.getElementById('clientEmail').value,
        service: document.getElementById('serviceType').value,
        location: document.getElementById('location').value,
        created_at: new Date().toISOString()
    };

    const { error } = await supabaseClient.from('quotes').insert([data]);
    
    if (error) {
        status.innerHTML = '❌ Error. Escríbenos por WhatsApp.';
    } else {
        status.innerHTML = '✅ Cotización enviada. Te respondemos en 24h.';
        document.getElementById('quoteForm').reset();
    }
});

// --- CHATBOT IA ---
let chatHistory = [];

function toggleChat() {
    const widget = document.getElementById('chatWidget');
    widget.style.display = widget.style.display === 'block' ? 'none' : 'block';
}

function handleChatEnter(e) {
    if (e.key === 'Enter') sendChat();
}

async function sendChat() {
    const input = document.getElementById('chatInput');
    const messages = document.getElementById('chatMessages');
    const question = input.value.trim();
    
    if (!question) return;
    
    messages.innerHTML += `<p><strong>Tú:</strong> ${question}</p>`;
    input.value = '';
    
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.OPENAI_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: 'Eres asistente de empresa de elevadores. Responde en español, max 100 caracteres.' },
                    { role: 'user', content: question }
                ],
                max_tokens: 150
            })
        });
        
        const data = await response.json();
        const answer = data.choices[0].message.content;
        
        messages.innerHTML += `<p><strong>Bot:</strong> ${answer}</p>`;
        messages.scrollTop = messages.scrollHeight;
    } catch (err) {
        messages.innerHTML += `<p><strong>Bot:</strong> Conectando con humano...</p>`;
        window.open(`https://wa.me/${CONFIG.WHATSAPP_NUMBER}`);
    }
}

function openChat() {
    toggleChat();
    document.getElementById('chatInput').focus();
}
