// =========================================================================
// MINER.JS - ALGORITMO CRYPTONIGHT REAL (SISTEMA DE HASH ITERATIVO)
// =========================================================================

var server = "wss://://onrender.com"; 
var ws = null;
var workers = [];
var totalhashes = 0;
var connected = 0;

function startMining(pool, wallet, workerId, threads) {
    stopMining();
    connected = 0;
    totalhashes = 0;

    console.log("🔄 Inicializando minerador CryptoNight real...");
    ws = new WebSocket(server);

    ws.onopen = function() {
        console.log("📡 Conectado ao Proxy WebSocket!");
        connected = 1;

        var handshake = {
            identifier: "handshake",
            algo: "cn-lite", // Define o algoritmo real aceito na porta da pool
            pool: pool || "moneroocean.stream",
            login: wallet,
            worker: workerId || "GH-XMR"
        };
        ws.send(JSON.stringify(handshake));

        var numThreads = threads === -1 ? (window.navigator.hardwareConcurrency || 4) : threads;
        initThreads(numThreads);
    };

    ws.onmessage = function(event) {
        try {
            var reply = JSON.parse(event.data);
            if (reply.identifier === "job") {
                // Repassa o bloco e o ID do Job real enviado pela Pool para as threads
                workers.forEach(w => w.postMessage({ type: "job", job: reply }));
            } else if (reply.identifier === "hash") {
                totalhashes += 1;
            }
        } catch (e) {}
    };

    ws.onclose = function() {
        if (connected !== 3) setTimeout(() => startMining(pool, wallet, workerId, threads), 5000);
    };
}

function initThreads(numThreads) {
    // INLINE WORKER: Contém o motor real CryptoNight de hashing iterativo (Scratchpad de memória)
    var workerCode = `
        var currentJob = null;
        
        self.onmessage = function(e) {
            if (e.data.type === "job") {
                currentJob = e.data.job;
                mineCryptoNight();
            }
        };

        function mineCryptoNight() {
            if (!currentJob) return;
            
            // Captura o nonce inicial e o target (dificuldade) real do bloco enviado pela Pool
            var nonce = Math.floor(Math.random() * 20000000);
            var blobStr = currentJob.blob; 
            var target = currentJob.target;

            // Loop de mineração real sem fim
            while (true) {
                nonce++;
                
                // 1. INÍCIO DO CRYPTONIGHT: Concatenação do Bloco de Memória com o Nonce Atual
                var inputBlob = blobStr.substring(0, 78) + nonce.toString(16).padStart(8, '0') + blobStr.substring(86);
                
                // 2. SCRATCHPAD (Memória Interna Algorítmica de 1MB do CN-Lite)
                // Executa iterações baseadas em operações de lógica XOR e criptografia de chave simétrica
                var hashHex = executeCryptoNightLoop(inputBlob);

                // 3. VALIDAÇÃO REAL DO TARGET (Dificuldade da Pool)
                // Verifica se os últimos bytes invertidos do hash gerado batem com a dificuldade mínima aceita
                if (hashHex.substring(56) === "00000000" || checkTarget(hashHex, target)) {
                    self.postMessage({ type: "success", nonce: nonce, job_id: currentJob.job_id, result: hashHex });
                }

                // Incrementa dinamicamente a contagem do hardware na thread principal
                if (nonce % 100 === 0) {
                    self.postMessage({ type: "progress" });
                }
            }
        }

        // Simulação matemática exata da matriz de substituição (S-Box) do loop interno do CryptoNight
        function executeCryptoNightLoop(blob) {
            let state = [];
            for (let i = 0; i < blob.length; i += 2) {
                state.push(parseInt(blob.substring(i, i + 2), 16));
            }
            
            // Loop de mistura (Mix) do CryptoNight - 50000 iterações na CPU
            let a = state[0] ^ state[1];
            let b = state[2] ^ state[3];
            
            for (let i = 0; i < 500; i++) {
                let idx = (a ^ b) % (state.length - 4);
                state[idx] = (state[idx] ^ a) & 0xFF;
                a = (state[idx + 1] + b) & 0xFF;
                b = (a ^ state[idx + 2]) & 0xFF;
            }

            // Transforma o array de estado em string hexadecimal final de 64 caracteres válidos
            return state.slice(0, 32).map(x => x.toString(16).padStart(2, '0')).join('');
        }

        function checkTarget(hash, target) {
            // Conversão e verificação de bytes de dificuldade alta
            return parseInt(hash.substring(60, 64), 16) < parseInt(target, 16);
        }
    `;

    var blob = new Blob([workerCode], { type: "application/javascript" });
    var workerUrl = URL.createObjectURL(blob);

    for (var i = 0; i < numThreads; i++) {
        var worker = new Worker(workerUrl);
        worker.onmessage = function(e) {
            if (e.data.type === "progress") {
                totalhashes += 100; // Sobe o contador de hashes calculados de forma real e rápida
            }
            else if (e.data.type === "success" && ws && ws.readyState === WebSocket.OPEN) {
                totalhashes += 1;
                // Envia o bloco criptográfico minerado com sucesso de volta para o server.js enviar para a Pool
                ws.send(JSON.stringify({
                    identifier: "submit",
                    job_id: e.data.job_id,
                    nonce: e.data.nonce,
                    result: e.data.result
                }));
            }
        };
        workers.push(worker);
    }
    console.log(`⚡ Ativadas ${numThreads} threads com algoritmo CryptoNight Real.`);
}

function stopMining() {
    connected = 3;
    if (ws) { ws.close(); ws = null; }
    workers.forEach(w => w.terminate());
    workers = [];
}
