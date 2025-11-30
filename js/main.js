// Configuración - SOLO EDITA ESTOS VALORES
const CONFIG = {
    SUPABASE_URL: 'https://TU-URL.supabase.co',
    SUPABASE_ANON_KEY: 'TU-ANON-KEY',
    OPENAI_KEY: 'TU-OPENAI-KEY', // Desde Cloudflare Pages > Settings > Environment Variables
    WHATSAPP_NUMBER: '573000000000'
};

// Inicializar Supabase desde CDN
const supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

// Funciones de utilidad
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

    // Subir foto si existe
    const fileInput = document.getElementById('problemPhoto');
    if (fileInput.files[0]) {
        const file = fileInput.files[0];
        const fileName = `emergency_${Date.now()}_${file.name}`;
        const { error } = await supabaseClient.storage.from('emergency-photos').upload(fileName, file);
        if (!error) data.photo_url = `${CONFIG.SUPABASE_URL}/storage/v1/object/public/emergency-photos/${fileName}`;
    }

    // Guardar en Supabase
    const { error } = await supabaseClient.from('emergencies').insert([data]);
    
    if (error) {
        status.innerHTML = '❌ Error. Intenta WhatsApp directo.';
    } else {
        status.innerHTML = '✅ Reporte enviado. Te contactamos en <5 min.';
        document.getElementById('emergencyForm').reset();
        
        // Enviar WhatsApp automático
        setTimeout(() => {
            const message = `🚨 EMERGENCIA - ${data.name} - ${data.phone}`;
            window.open(`https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`);
        }, 2000);
    }
});

// --- FORMULARIO COTIZACIÓN ---
document.getElementById('quoteForm').addEventListener('submit', async (e) => {
    e.preventEventListener('submit', async (e) => { // Fix: typo
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

// --- CHATBOT IA SIMPLIFICADO ---
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
    
    // Mostrar pregunta
    messages.innerHTML += `<p><strong>Tú:</strong> ${question}</p>`;
    input.value = '';
    
    // Llamar a OpenAI
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
                    { role: 'system', content: 'Eres un asistente de una empresa de elevadores. Responde en español, max 100 caracteres.' },
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

// Abrir chat desde cards
function openChat() {
    toggleChat();
    document.getElementById('chatInput').focus();
}
