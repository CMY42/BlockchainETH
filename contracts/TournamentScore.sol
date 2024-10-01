// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TournamentScore {
    struct Player {
        string name;
        uint score;
    }

    Player[] public players;

    // Ajouter un événement pour suivre les ajouts de joueurs
    event PlayerAdded(string name, uint score);

    function addPlayer(string memory _name) public {
        require(bytes(_name).length > 0, "Le nom ne peut pas etre vide");
        players.push(Player(_name, 0));
        emit PlayerAdded(_name, 0); // Emettre un événement après l'ajout d'un joueur
    }

    function getPlayerScore(uint _index) public view returns (string memory name, uint score) {
        require(_index < players.length, "Index hors limites");
        Player memory player = players[_index];
        return (player.name, player.score);
    }

    function getTotalPlayers() public view returns (uint) {
        return players.length;
    }

    function getAllPlayers() public view returns (Player[] memory) {
        return players;
    }

    function finalizeTournament(string[] memory playerNames, uint[] memory scores) public {
        require(playerNames.length == scores.length, "Les tableaux doivent avoir la meme longueur");
        for (uint i = 0; i < playerNames.length; i++) {
            require(bytes(playerNames[i]).length > 0, "Le nom ne peut pas etre vide");
            players.push(Player(playerNames[i], scores[i]));
            emit PlayerAdded(playerNames[i], scores[i]); // Emettre un événement après l'ajout d'un joueur avec son score
        }
    }
}
