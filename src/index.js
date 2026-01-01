const cron = require('node-cron');
const { startBot, sendMessage } = require('./bot');
const { getNextVerse } = require('./bibleService');
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração
const GROUP_NAME = 'Versículo Diário'; // Mude para o nome exato do seu grupo ou use ID
// Se quiser testar, pode mudar para o ID do seu número pessoal, ex: '5511999999999@c.us'

async function enviarVersiculoDoDia() {
    console.log(`[${new Date().toLocaleString()}] Iniciando envio do versículo...`);

    try {
        const result = await getNextVerse();

        if (result.done) {
            console.log(result.message);
            return;
        }

        console.log('Versículo preparado:', result.text);

        // Tenta enviar
        const sent = await sendMessage(GROUP_NAME, result.text);

        if (sent) {
            console.log('Versículo enviado com sucesso!');
        } else {
            console.log('Falha no envio (Bot pode não estar pronto ou grupo não encontrado).');
        }

    } catch (error) {
        console.error('Erro fatal no processo de envio:', error);
    }
}

// Rota para ver o QR Code
app.get('/qr', (req, res) => {
    const qrPath = path.join(__dirname, '..', 'qrcode.png');
    if (fs.existsSync(qrPath)) {
        res.sendFile(qrPath);
    } else {
        res.status(404).send('<h1>QR Code ainda não gerado</h1><p>Aguarde alguns instantes e recarregue a página. Verifique os logs se demorar muito.</p>');
    }
});

// Rota para forçar o envio imediato (Útil para testes)
app.get('/enviar-agora', async (req, res) => {
    console.log('Solicitação manual de envio recebida pelo navegador.');
    res.send('<h1>Enviando...</h1><p>Verifique o console ou o grupo do WhatsApp.</p><a href="/">Voltar</a>');

    // Executa sem travar a resposta HTTP
    enviarVersiculoDoDia();
});

// Mensagem simples na home
app.get('/', (req, res) => {
    res.send(`
        <h1>Bot da Igreja Online</h1>
        <p>Status: <strong>Online</strong></p>
        <ul>
            <li><a href="/qr">Ver QR Code</a> (Para conectar)</li>
            <li><a href="/enviar-agora">Enviar Versículo Agora</a> (Teste manual)</li>
        </ul>
    `);
});

// Inicia servidor e depois o bot
app.listen(PORT, () => {
    console.log(`Servidor WEB rodando na porta ${PORT}`);
    startBot();
});

// Agenda a tarefa para rodar de 3 em 3 horas
// 0 */3 * * * = A cada 3 horas (00:00, 03:00, 06:00, etc)
cron.schedule('0 */3 * * *', () => {
    console.log('Executando Cron Job (3 em 3 horas)...');
    enviarVersiculoDoDia();
}, {
    timezone: "America/Sao_Paulo"
});

console.log('Sistema agendado. O versículo será enviado a cada 3 horas.');

// --- DEBUG / TESTE MANUAL ---
// Descomente as linhas abaixo para testar o envio 10 segundos após iniciar, sem esperar meia-noite

setTimeout(() => {
    console.log('Teste de envio manual...');
    enviarVersiculoDoDia();
}, 30000); // Aumentado para 30s para garantir conexão estável

