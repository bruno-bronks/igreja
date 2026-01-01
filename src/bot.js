const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');
const qrcode = require('qrcode');
const fs = require('fs-extra');
const path = require('path');

// Inicializa o cliente com persistência de sessão local
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

let isReady = false;

// Evento de geração do QR Code
client.on('qr', (qr) => {
    console.log('--- NOVO QR CODE RECEBIDO ---');
    console.log('Hora:', new Date().toLocaleTimeString());

    // Opção 1: Terminal
    qrcodeTerminal.generate(qr, { small: true });

    // Opção 2: Arquivo de Imagem
    const qrPath = path.join(__dirname, '..', 'qrcode.png');

    // Remove anterior se existir para garantir que é novo
    if (fs.existsSync(qrPath)) {
        fs.unlinkSync(qrPath);
    }

    qrcode.toFile(qrPath, qr, (err) => {
        if (err) {
            console.error('Erro ao salvar imagem do QR Code:', err);
        } else {
            console.log(`\n>>> ARQUIVO QR CODE ATUALIZADO <<<`);
            console.log(`Local: ${qrPath}`);
            console.log('Abra este arquivo AGORA e escaneie.\n');
        }
    });
});

// Evento quando o cliente está pronto
client.on('ready', () => {
    console.log('Tudo certo! O cliente WhatsApp está pronto.');
    isReady = true;
});

// Evento de falha de autenticação
client.on('auth_failure', msg => {
    console.error('Falha na autenticação:', msg);
});

client.on('disconnected', (reason) => {
    console.log('Cliente desconectado:', reason);
    isReady = false;
});

/**
 * Inicializa o bot
 */
function startBot() {
    console.log('Inicializando cliente WhatsApp...');
    client.initialize();
}

/**
 * Envia uma mensagem para um grupo ou número específico.
 * @param {string} destination - Nome do grupo ou ID
 * @param {string} message - Texto da mensagem
 */
async function sendMessage(destination, message) {
    if (!isReady) {
        console.log('O cliente ainda não está pronto. Aguardando...');
        return false;
    }

    try {
        let chatId = destination;

        // Se não parece um ID de chat (não tem @), tenta buscar pelo nome do grupo
        if (!destination.includes('@')) {
            console.log(`Buscando grupo com nome: "${destination}"...`);
            const chats = await client.getChats();
            console.log(`Total de chats encontrados: ${chats.length}`);

            // Loga grupos para ajudar no debug
            const groups = chats.filter(c => c.isGroup).map(c => c.name);
            console.log('Grupos disponíveis:', groups);

            // Busca exata ou que contém o nome (case insensitive)
            const group = chats.find(chat =>
                chat.isGroup && chat.name.toLowerCase().includes(destination.toLowerCase())
            );

            if (group) {
                chatId = group.id._serialized;
                console.log(`Grupo ENCONTRADO: ${group.name} (${chatId})`);
            } else {
                console.error(`ERRO: Grupo com nome "${destination}" não encontrado.`);
                console.log('Verifique se o bot está no grupo e se o nome está correto.');
                return false;
            }
        }

        await client.sendMessage(chatId, message);
        console.log(`Mensagem enviada com sucesso para ${destination}!`);
        return true;
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        return false;
    }
}

module.exports = {
    startBot,
    sendMessage,
    client
};
