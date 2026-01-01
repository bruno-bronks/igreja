const https = require('https');
const fs = require('fs');

const url = "https://raw.githubusercontent.com/maatheusgois/bible/main/versions/pt-br/acf.json";
const filePath = "src/data/bible_acf.json";

console.log(`Baixando Bíblia de: ${url}`);

const file = fs.createWriteStream(filePath);

https.get(url, (response) => {
    if (response.statusCode !== 200) {
        console.error(`Falha no download. Status Code: ${response.statusCode}`);
        return;
    }

    response.pipe(file);

    file.on('finish', () => {
        file.close(() => {
            console.log("Download concluído com sucesso!");

            // Tenta validar o JSON baixado
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                JSON.parse(content);
                console.log("JSON validado com sucesso! Arquivo íntegro.");
            } catch (e) {
                console.error("Erro fatal: O arquivo baixado ainda é um JSON inválido.", e.message);
            }
        });
    });
}).on('error', (err) => {
    fs.unlink(filePath, () => { }); // Apaga arquivo parcial
    console.error('Erro de rede:', err.message);
});
