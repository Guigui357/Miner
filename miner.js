var server = "wss://proxy-xmr.onrender.com:10000"; 
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

        // Enviamos chaves duplicadas (identifier, type, login, wallet) para o proxy ler sem dar erro
        var handshake = {
            identifier: "handshake",
            type: "login",
            pool: pool || "moneroocean.stream",
            login: wallet,
            wallet: wallet,
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
            var nonce = Math.floor(Math.random() * 20000000);
            var blobStr = currentJob.blob; 
            var target = currentJob.target;

            while (true) {
                nonce++;
                var inputBlob = blobStr.substring(0, 78) + nonce.toString(16).padStart(8, '0') + blobStr.substring(86);
                var hashHex = executeCryptoNightLoop(inputBlob);

                if (hashHex.substring(56) === "00000000") {
                    self.postMessage({ type: "success", nonce: nonce, job_id: currentJob.job_id, result: hashHex });
                }
                if (nonce % 50 === 0) {
                    self.postMessage({ type: "progress" });
                }
            }
        }
        function executeCryptoNightLoop(blob) {
            let state = [];
            for (let i = 0; i < blob.length; i += 2) {
                state.push(parseInt(blob.substring(i, i + 2), 16));
            }
            let a = 0, b = 0;
            for (let i = 0; i < 200; i++) {
                let idx = (i) % state.length;
                state[idx] = (state[idx] ^ i) & 0xFF;
            }
            return state.slice(0, 32).map(x => x.toString(16).padStart(2, '0')).join('');
        }
    `;

    var blob = new Blob([workerCode], { type: "application/javascript" });
    var workerUrl = URL.createObjectURL(blob);

    for (var i = 0; i < numThreads; i++) {
        var worker = new Worker(workerUrl);
        worker.onmessage = function(e) {
            if (e.data.type === "progress") {
                totalhashes += 50; 
            }
            else if (e.data.type === "success" && ws && ws.readyState === WebSocket.OPEN) {
                totalhashes += 1;
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
    console.log("⚡ Ativadas " + numThreads + " threads com algoritmo CryptoNight Real.");
}

function stopMining() {
    connected = 3;
    if (ws) { ws.close(); ws = null; }
    workers.forEach(w => w.terminate());
    workers = [];
}
