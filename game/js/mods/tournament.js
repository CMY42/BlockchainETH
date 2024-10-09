import { GameArea } from '../scenes/gameArea.js';
import { Paddle } from '../scenes/paddle.js';
import { Ball } from '../scenes/ball.js';
import { setupControls } from '../scenes/controls.js';
import { Score } from '../scenes/score.js';
import { waitForKeyPress } from '../scenes/assets.js';
import { map1 } from '../scenes/maps/VS.js';
import { map2 } from '../scenes/maps/VS.js';
import { map3 } from '../scenes/maps/VS.js';
import { map4 } from '../scenes/maps/VS.js';

// Déclaration de la variable pour le contrat
let tournamentContract;
let web3Initialized = false;

// Fonction pour charger Web3
function chargerWeb3() {
    return new Promise((resolve, reject) => {
        if (typeof window.Web3 !== 'undefined') {
            console.log('Web3 est déjà chargé.');
            resolve();
            return;
        }

        // Charger dynamiquement Web3 si ce n'est pas encore fait
        const script = document.createElement('script');
        script.src = '../../../js/libs/web3.min.js';
        script.onload = () => {
            if (typeof window.Web3 !== 'undefined') {
                console.log('Web3 chargé avec succès');
                resolve();
            } else {
                reject(new Error('Web3 n\'a pas pu être chargé'));
            }
        };
        script.onerror = () => {
            reject(new Error('Échec du chargement de Web3'));
        };
        document.head.appendChild(script);
    });
}

// Fonction pour initialiser Web3 et le contrat
async function initWeb3() {
    if (web3Initialized) {
        console.log('Web3 est déjà initialisé.');
        return;
    }

    if (typeof Web3 === 'undefined') {
        throw new Error('Web3 n\'a pas pu être chargé');
    }

    if (typeof window.ethereum !== 'undefined') {
        console.log('Ethereum browser detected');
        window.web3 = new Web3(window.ethereum);
        await window.ethereum.enable();
    } else {
        console.log('Connecting to local blockchain');
        window.web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545'));
    }

    const tournamentContractJSON = await fetch('http://127.0.0.1:5500/build/contracts/TournamentScore.json')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        });

    const contractABI = tournamentContractJSON.abi;
    const networkId = Object.keys(tournamentContractJSON.networks)[0];
    const contractAddress = tournamentContractJSON.networks[networkId]?.address;

    if (!contractAddress) {
        throw new Error('Contract address not found. Make sure the contract is deployed to the specified network.');
    }

    tournamentContract = new web3.eth.Contract(contractABI, contractAddress);
    web3Initialized = true;
    console.log('Contrat initialisé avec succès:', tournamentContract);
}

// Fonction pour récupérer le compte utilisateur
async function getCompte() {
    const comptes = await window.web3.eth.getAccounts();
    return comptes[0];
}

// Fonction pour enregistrer les scores sur la blockchain
async function enregistrerScoresFinTournoi(joueurs, scores) {
    try {
        const compte = await getCompte();
        const scoresArray = Array.isArray(scores) ? scores : Object.values(scores);

        await tournamentContract.methods.finalizeTournament(joueurs, scoresArray)
            .send({ from: compte, gas: 500000 });

        console.log('Scores enregistrés avec succès');
    } catch (error) {
        console.error('Erreur lors de l\'enregistrement des scores', error);
    }
}

// Fonction corrigée pour afficher tous les joueurs et leurs scores
async function afficherTousLesScores() {
    try {
        // Récupérer le nombre total de joueurs
        const totalPlayers = await tournamentContract.methods.getTotalPlayers().call();
        console.log(`Nombre total de joueurs avec un score : ${totalPlayers}`);

        // Boucler sur chaque joueur et récupérer son nom et son score
        for (let i = 0; i < totalPlayers; i++) {
            const result = await tournamentContract.methods.getPlayerScore(i).call();
            console.log('Résultat brut de getPlayerScore:', result);

            // Vérifiez si le résultat est un objet avec des clés nommées
            const name = result.name || result[0]; // Vérifier si c'est un objet ou un tableau
            const score = result.score || result[1]; // Vérifier si c'est un objet ou un tableau

            if (name && score !== undefined) {
                console.log(`Joueur ${i + 1}: ${name}, Score: ${score}`);
            } else {
                console.error(`Erreur de format: getPlayerScore a retourné un résultat inattendu pour l'index ${i}`, result);
            }
        }
    } catch (error) {
        console.error('Erreur lors de la récupération des scores:', error);
    }
}

// Fonction principale pour initialiser et lancer le jeu
async function main() {
    try {
        await initWeb3();
        const compte = await getCompte();
        console.log('Selected Account:', compte);

        // Exemple d'appel pour afficher tous les scores enregistrés
        await afficherTousLesScores();
    } catch (error) {
        console.error('Erreur lors de l\'exécution de main:', error);
    }
}

// Charger Web3 et exécuter l'application
(async () => {
    try {
        await chargerWeb3();
        console.log('Web3 prêt, initialisation de l\'application');
        await main();
    } catch (error) {
        console.error('Erreur lors du chargement ou de l\'initialisation de Web3:', error);
    }
})();

/////////////////////////////////////////////////////////////////////////////////////////////////////

export class Tournament {

    constructor(canvas, playerNames, key, ctx, font, maxScore, paddleSpeed, paddleSize, bounceMode, ballSpeed, ballAcceleration, numBalls, map) {
        this.gameArea = new GameArea(800, 600, canvas);
        this.playerNames = playerNames;
        this.key = key;
        this.ctx = ctx;
        this.font = font;
        this.isGameOver = false;
        this.balls = [];
        this.map = map;
        this.bricks = [];
        this.bricks = [];
        this.bricksX = 60;
        this.bricksY = 60;

        this.score = new Score(ctx, font, this.gameArea, playerNames[0], playerNames[1]);

        this.currentMatch = 0;
        this.round = 1;
        this.matches = this.createAllMatches(playerNames);
        this.wins = this.initializeWins(playerNames);
        this.activePlayers = playerNames.slice();

        this.gameTitle = "Tournament Mode";
        this.gameSubtitle = "First to ";
        this.maxScore = maxScore - 1;
        this.walls = {
            top: 'bounce',
            bottom: 'bounce',
            left: 'pass',
            right: 'pass'
        };

        if (map == 1)
            this.bricks = [];
        else if (map == 2)
            this.bricks = map1(this.gameArea, this.bricksX, this.bricksY);
        else if (map == 3)
            this.bricks = map2(this.gameArea, this.bricksX, this.bricksY);
        else if (map == 4)
            this.bricks = map3(this.gameArea, this.bricksX, this.bricksY);
        else if (map == 5)
            this.bricks = map4(this.gameArea, this.bricksX, this.bricksY);

        this.player1Paddle = new Paddle(this.gameArea.gameX + 10, this.gameArea.gameY + (this.gameArea.gameHeight - paddleSize) / 2, paddleSize / 10, paddleSize, 'white', paddleSpeed, 'vertical');
        this.player2Paddle = new Paddle(this.gameArea.gameX + this.gameArea.gameWidth - 20, this.gameArea.gameY + (this.gameArea.gameHeight - paddleSize) / 2, paddleSize / 10, paddleSize, 'white', paddleSpeed, 'vertical');
        this.initBalls(numBalls, ballSpeed, bounceMode, ballAcceleration);
        this.main();
    }

    initializeWins(playerNames) {
        let wins = {};
        for (let name of playerNames) {
            wins[name] = 0;
        }
        return wins;
    }

    createAllMatches(playerNames) {
        let matches = [];
        for (let i = 0; i < playerNames.length; i++) {
            for (let j = i + 1; j < playerNames.length; j++) {
                matches.push([playerNames[i], playerNames[j]]);
            }
        }
        return this.shuffle(matches); // Mélanger les matchs
    }

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    initBalls(numBalls, ballSpeed, bounceMode, ballAcceleration) {
        const centerX = this.gameArea.gameX + this.gameArea.gameWidth / 2;
        const centerY = this.gameArea.gameY + this.gameArea.gameHeight / 2;
        const spacing = 15; // Espace entre les balles

        for (let i = 0; i < numBalls; i++) {
            const yOffset = Math.pow(-1, i) * Math.ceil(i / 2) * spacing;
            this.balls.push(new Ball(centerX, centerY + yOffset, 10, 'white', ballSpeed, bounceMode, ballAcceleration, yOffset, this.walls));
        }
    }

    main() {
        setupControls(this.key, 1, this.player1Paddle, this.player2Paddle);
        this.startMatch();
    }

    startMatch() {
        if (this.currentMatch >= this.matches.length) {
            this.setupNextRound();
            return;
        }

        if (this.map == 1)
            this.bricks = [];
        else if (this.map == 2)
            this.bricks = map1(this.gameArea, this.bricksX, this.bricksY);
        else if (this.map == 3)
            this.bricks = map2(this.gameArea, this.bricksX, this.bricksY);
        else if (this.map == 4)
            this.bricks = map3(this.gameArea, this.bricksX, this.bricksY);
        else if (this.map == 5)
            this.bricks = map4(this.gameArea, this.bricksX, this.bricksY);

        this.player1Paddle.resetPosition();
        this.player2Paddle.resetPosition();
        this.score.reset();
        this.isGameOver = false;
        this.score.player1Name = this.matches[this.currentMatch][0];
        this.score.player2Name = this.matches[this.currentMatch][1];
        const directions = [
            { x: 1, y: 0.5 },
            { x: 1, y: -0.5 },
            { x: -1, y: 0.5 },
            { x: -1, y: -0.5 }
        ];

        this.gameArea.clear(this.ctx);
        this.gameArea.draw(this.ctx);
        this.player1Paddle.draw(this.ctx);
        this.player2Paddle.draw(this.ctx);
        this.bricks.forEach(brick => brick.draw(this.ctx));
        this.score.drawTitle(this.gameTitle);
        this.score.drawSubtitle(this.gameSubtitle, this.maxScore + 1);
        this.score.drawScore();
        this.score.drawTournamentScore(this.wins, this.round, this.activePlayers);

        setTimeout(() => {
            this.score.drawFlat("Press any key to start.", 30, 'white', 'center', this.ctx.canvas.width / 2, this.ctx.canvas.width / 2)
            waitForKeyPress(() => {
                this.balls.forEach(ball => ball.spawn(this.gameArea, directions));
                this.loop();
            });
        }, 1000);
    }

    loop() {
        if (this.isGameOver) {
            return;
        }
        this.gameArea.clear(this.ctx);

        this.balls.forEach(ball => {
            if (ball.x < this.gameArea.gameX) {
                this.score.incrementPlayer2Score();
                const directions = [
                    { x: 1, y: 0.5 },
                    { x: 1, y: -0.5 }
                ];
                ball.spawn(this.gameArea, directions);
            } else if (ball.x + ball.size > this.gameArea.gameX + this.gameArea.gameWidth) {
                this.score.incrementPlayer1Score();
                const directions = [
                    { x: -1, y: 0.5 },
                    { x: -1, y: -0.5 }
                ];
                ball.spawn(this.gameArea, directions);
            }

            ball.move(this.gameArea, [this.player1Paddle, this.player2Paddle], this.bricks);
        });

        this.player1Paddle.move(this.gameArea);
        this.player2Paddle.move(this.gameArea);

        this.gameArea.draw(this.ctx);
        this.player1Paddle.draw(this.ctx);
        this.player2Paddle.draw(this.ctx);
        this.balls.forEach(ball => ball.draw(this.ctx));
        this.bricks.forEach(brick => brick.draw(this.ctx));
        this.game_over_screen();
        this.score.drawTitle(this.gameTitle);
        this.score.drawSubtitle(this.gameSubtitle, this.maxScore + 1);
        this.score.drawScore();
        this.score.drawTournamentScore(this.wins, this.round, this.activePlayers);
        requestAnimationFrame(this.loop.bind(this));
    }

    game_over_screen() {
        if (this.score.player1Score > this.maxScore) {
            this.isGameOver = true;
            this.score.drawEnd(1);
            setTimeout(() => {
                this.score.drawFlat("Press any key.", 20, 'white', 'center', this.ctx.canvas.width / 2, this.ctx.canvas.width / 2 + 50)
                waitForKeyPress(() => {
                    this.advanceTournament(this.score.player1Name);
                });
            }, 2000);
        }
        else if (this.score.player2Score > this.maxScore) {
            this.isGameOver = true;
            this.score.drawEnd(2);
            setTimeout(() => {
                this.score.drawFlat("Press any key.", 20, 'white', 'center', this.ctx.canvas.width / 2, this.ctx.canvas.width / 2 + 50)
                waitForKeyPress(() => {
                    this.advanceTournament(this.score.player2Name);
                });
            }, 2000);
        }
    }

    advanceTournament(winner) {
        this.wins[winner]++;
        console.log(`Enregistrement du score pour ${winner}`);

        // Appel de la fonction d'enregistrement
        enregistrerScoresFinTournoi(this.activePlayers, this.wins)
            .then(() => {
                //console.log('Score enregistré avec succès');
                this.currentMatch++;

                if (this.currentMatch < this.matches.length) {
                    this.startMatch();
                } else {
                    this.setupNextRound();
                }
            })
            .catch(error => {
                console.error('Erreur lors de l\'enregistrement du score', error);
            });
    }


    setupNextRound() {
        let maxWins = Math.max(...Object.values(this.wins));
        let topPlayers = Object.keys(this.wins).filter(player => this.wins[player] === maxWins);

        if (topPlayers.length === 1) {
            this.score.drawTournamentScore(this.wins, this.round, this.activePlayers);
            this.score.drawTournamentEnd(topPlayers[0]);
        } else {
            this.matches = this.createAllMatches(topPlayers);
            this.currentMatch = 0;
            this.activePlayers = topPlayers;
            this.round++;


            this.startMatch();
        }
    }
}
