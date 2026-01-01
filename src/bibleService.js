const fs = require('fs-extra');
const path = require('path');

const BIBLE_PATH = path.join(__dirname, 'data', 'bible_acf.json');
const STATUS_PATH = path.join(__dirname, 'data', 'status.json');

/**
 * Carrega a Bíblia do arquivo JSON
 */
async function loadBible() {
    try {
        let data = await fs.readFile(BIBLE_PATH, 'utf8');

        // Remove BOM e qualquer caractere estranho no início
        data = data.replace(/^\uFEFF/, '').trim();

        // Tenta parsear
        return JSON.parse(data);
    } catch (error) {
        console.error('Erro CRÍTICO ao carregar a Bíblia:', error.message);

        // Debug: Mostrar os primeiros 10 caracteres em HEX para entender a sujeira
        try {
            const raw = await fs.readFile(BIBLE_PATH);
            const header = raw.slice(0, 10);
            console.error('Hex Dump do início do arquivo:', header.toString('hex'));
            console.error('Primeiros chars (utf8):', raw.slice(0, 20).toString('utf8'));
        } catch (e) { console.error('Falha no debug:', e); }

        throw error;
    }
}

/**
 * Carrega o status atual (onde parou)
 */
async function loadStatus() {
    try {
        if (await fs.pathExists(STATUS_PATH)) {
            const data = await fs.readFile(STATUS_PATH, 'utf8');
            return JSON.parse(data);
        }
        // Status inicial padrão se não existir arquivo
        return {
            bookIndex: 0,
            chapterIndex: 0,
            verseIndex: 0,
            lastSent: null
        };
    } catch (error) {
        console.error('Erro ao carregar status:', error);
        return { bookIndex: 0, chapterIndex: 0, verseIndex: 0, lastSent: null };
    }
}

/**
 * Salva o status atual no arquivo
 */
async function saveStatus(status) {
    try {
        await fs.writeJson(STATUS_PATH, status, { spaces: 2 });
    } catch (error) {
        console.error('Erro ao salvar status:', error);
    }
}

/**
 * Obtém o próximo versículo a ser enviado e atualiza o status
 */
async function getNextVerse() {
    const bible = await loadBible();
    let status = await loadStatus();

    // Recupera índices atuais
    let { bookIndex, chapterIndex, verseIndex } = status;

    // Validações de segurança para não estourar array
    if (bookIndex >= bible.length) {
        return { done: true, message: "A Bíblia foi concluída! Reiniciando..." };
    }

    const currentBook = bible[bookIndex];

    // Nota: O JSON da Bíblia ACF tem a estrutura:
    // [ { name: "Gênesis", chapters: [ [], [] ] } ]
    // chapters é um array de arrays (capítulos contendo versículos)

    const currentChapter = currentBook.chapters[chapterIndex];
    if (!currentChapter) {
        // Se capítulo não existe (erro de índice), tenta avançar livro
        status.bookIndex++;
        status.chapterIndex = 0;
        status.verseIndex = 0;
        await saveStatus(status);
        return getNextVerse(); // Tenta de novo com novos índices
    }

    const verseText = currentChapter[verseIndex];

    if (!verseText) {
        // Se versículo não existe, avança o capítulo
        status.chapterIndex++;
        status.verseIndex = 0;

        // Verifica se o próximo capítulo existe neste livro
        if (status.chapterIndex >= currentBook.chapters.length) {
            // Se acabaram os capítulos, avança o livro
            status.bookIndex++;
            status.chapterIndex = 0;
        }

        await saveStatus(status);
        return getNextVerse(); // Recursivo para pegar o próximo válido
    }

    // Formata a mensagem
    const message = `📖 *Versículo do Dia*\n\n"${verseText}"\n\n_${currentBook.name} ${chapterIndex + 1}:${verseIndex + 1}_`;

    // Prepara o status para o PRÓXIMO versículo (para a execução de amanhã)
    status.verseIndex++;
    // Data de envio
    status.lastSent = new Date().toISOString();

    await saveStatus(status);

    return {
        done: false,
        text: message
    };
}

module.exports = {
    getNextVerse
};
