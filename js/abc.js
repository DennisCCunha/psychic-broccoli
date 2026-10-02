class ConnectionInterface {
    constructor(containerId, peerManager, musicController, drawingBoardController, textController, voiceController) {
        this._container = document.getElementById(containerId);
        this._peerManager = peerManager;

        this._musicController = musicController;
        this._drawingBoardController = drawingBoardController;
        this._textController = textController;
        this._voiceController = voiceController;
    }


    mount() {
        this._container.appendChild(this.renderMainController());
        console.log('Rendering main controller');

        if (this._textController) {
            console.log('Rendering text controller');
            this._container.appendChild(this.renderTextController());
        }
        if (this._voiceController) {
            console.log('Rendering voice controller');
            this._container.appendChild(this.renderVoiceController());
        }
        if (this._drawingBoardController) {
            console.log('Rendering drawing board controller');
            this._container.appendChild(this.renderDrawingBoardController());
        }
        if (this._musicController) {
            console.log('Rendering music controller');
            this._container.appendChild(this.renderMusicController());
        }
    }

    renderMainController() {
        const mainControllerElement = this._container;
        mainControllerElement.id = 'connectionPanel';
        mainControllerElement.classList.add('connection-panel');

        const connectionPanel = document.createElement('div');
        connectionPanel.id = 'connectionPanel';
        connectionPanel.classList.add('connection-panel');
        
        let label = document.createElement('label');
        label.setAttribute('for', 'connectionCodeInput');
        label.textContent = 'Codigo da Sala';
        connectionPanel.appendChild(label);

        let input = document.createElement('input');
        input.id = 'connectionCodeInput';
        input.type = 'text';
        input.value = 'psychic-b';
        input.maxLength = 24;
        input.placeholder = 'Type a shared room code';
        connectionPanel.appendChild(input);

        let shuffleButton = document.createElement('button');
        shuffleButton.id = 'copyConnectionCodeBtn';
        shuffleButton.type = 'button';
        shuffleButton.title = 'Refresh the room code';
        shuffleButton.setAttribute('aria-label', 'Refresh the room code');

        let icon = document.createElement('i');
        icon.classList.add('bi', 'bi-shuffle');
        shuffleButton.appendChild(icon);
        connectionPanel.appendChild(shuffleButton);


        let identityLabel = document.createElement('label');
        identityLabel.setAttribute('for', 'identityLabelInput');
        identityLabel.textContent = 'Seu Nome';
        connectionPanel.appendChild(identityLabel);

        let identityInput = document.createElement('input');
        identityInput.id = 'identityLabelInput';
        identityInput.type = 'text';
        identityInput.value = 'Player 1';
        identityInput.maxLength = 32;
        identityInput.placeholder = 'Nome mostrado aos outros jogadores';
        connectionPanel.appendChild(identityInput);

        let connectionActions = document.createElement('div');
        connectionActions.classList.add('connection-actions');

        let createConnectionBtn = document.createElement('button');
        createConnectionBtn.id = 'createConnectionBtn';
        createConnectionBtn.type = 'button';
        createConnectionBtn.textContent = 'Criar sala';
        connectionActions.appendChild(createConnectionBtn);

        let joinConnectionBtn = document.createElement('button');
        joinConnectionBtn.id = 'joinConnectionBtn';
        joinConnectionBtn.type = 'button';
        joinConnectionBtn.textContent = 'Entrar na sala';
        connectionActions.appendChild(joinConnectionBtn);

        let sendTestMessageBtn = document.createElement('button');
        sendTestMessageBtn.id = 'sendTestMessageBtn';
        sendTestMessageBtn.type = 'button';
        sendTestMessageBtn.textContent = 'Enviar teste';
        connectionActions.appendChild(sendTestMessageBtn);

        connectionPanel.appendChild(connectionActions);

        let connectionStatus = document.createElement('p');
        connectionStatus.id = 'connectionStatus';
        connectionStatus.textContent = 'Pronto para uma sala WebRTC compartilhada.';
        connectionPanel.appendChild(connectionStatus);
                    
        let peerRoster = document.createElement('div');
        peerRoster.classList.add('peer-roster');
        peerRoster.setAttribute('aria-live', 'polite');

        let peerRosterTitle = document.createElement('strong');
        peerRosterTitle.textContent = 'Participantes conectados';
        peerRoster.appendChild(peerRosterTitle);

        let peerList = document.createElement('ul');
        peerList.id = 'peerList';
        peerRoster.appendChild(peerList);

        connectionPanel.appendChild(peerRoster);
        mainControllerElement.replaceWith(connectionPanel);
    }

    renderTextController() {
       return ui
    }

    renderGameController() {
        // Implementation for rendering the game controller goes here
    }

}