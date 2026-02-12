const it = {
    common: {
      appName: 'Sharkord',
      language: 'Lingua',
      placeholder: {
        searchUsers: 'Cerca utenti per nome o identità...'
      },
      placeholders: {
        searchUsers: 'Cerca utenti per nome o identità...',
        enterServerName: 'Inserisci nome server',
        enterChannelTopic: 'Inserisci argomento canale',
        enterCategoryName: 'Inserisci nome categoria',
        searchInMessage: 'Cerca nel messaggio...',
        searchLinks: 'Cerca link...',
        searchFiles: 'Cerca file...',
        searchCustomEmojis: 'Cerca emoji personalizzate...',
        searchEmojis: 'Cerca emoji...',
        selectRole: 'Seleziona un ruolo'
      },
      labels: {
        fileAccessToken: 'Token di accesso file',
        name: 'Nome',
        private: 'Privato',
        userId: 'ID utente',
        identity: 'Identità',
        ipAddress: 'Indirizzo IP',
        location: 'Posizione',
        joinedServer: 'Iscritto al server',
        lastActive: 'Ultima attività',
        banned: 'Bannato',
        banReason: 'Motivo ban',
        bannedAt: 'Bannato il',
        role: 'Ruolo',
        openInNewTab: 'Apri in nuova scheda',
        noRemoteAudioStreams: 'Nessun flusso audio remoto disponibile.'
      },
      pagination: {
        noItemsFound: 'Nessun elemento trovato',
        noItemsFoundMatching:
          'Nessun elemento trovato per "{{searchTerm}}"',
        showingRangeSingular:
          'Visualizzazione da {{start}} a {{end}} di {{total}} elemento',
        showingRangePlural:
          'Visualizzazione da {{start}} a {{end}} di {{total}} elementi'
      }
    },
    errors: {
      generic: 'Qualcosa è andato storto, riprova.',
      codes: {
        badRequest: 'Dati della richiesta non validi.',
        unauthorized: 'Devi effettuare l’accesso per continuare.',
        forbidden: 'Non hai i permessi per eseguire questa azione.',
        notFound: 'La risorsa richiesta non è stata trovata.',
        methodNotSupported: 'Questa operazione non è supportata.',
        timeout: 'La richiesta è scaduta. Riprova.',
        conflict: 'Questa azione è in conflitto con i dati esistenti.',
        preconditionFailed: 'Le precondizioni della richiesta non sono state soddisfatte.',
        payloadTooLarge: 'I dati inviati sono troppo grandi.',
        tooManyRequests: 'Troppe richieste. Attendi e riprova.',
        internalServerError: 'Errore interno del server. Riprova più tardi.'
      },
      validation: {
        invalidType: 'Tipo di valore non valido.',
        invalidString: 'Valore testuale non valido.',
        invalidEnumValue: 'Seleziona un’opzione valida.',
        invalidLiteral: 'Valore non valido.',
        invalidUnion: 'Valore non valido.',
        tooSmall: 'Il valore è troppo piccolo o troppo corto.',
        tooBig: 'Il valore è troppo grande o troppo lungo.',
        custom: 'Valore non valido.'
      },
      auth: {
        invalidPassword: 'Password non valida.',
        invalidSecretToken: 'Token di accesso non valido.',
        invalidHandshakeHash: 'Token di connessione non valido.',
        userNotAuthenticated: 'Utente non autenticato.'
      },
      channel: {
        channelNotFound: 'Canale non trovato.',
        channelNotVoice: 'Il canale non è vocale.',
        userAlreadyInVoiceChannel: 'L’utente è già in un canale vocale.',
        userNotInVoiceChannel: 'L’utente non è in un canale vocale.',
        voiceRuntimeNotFound: 'Il servizio vocale non è disponibile per questo canale.',
        permissionOverrideRequiresTarget:
          'Seleziona un utente o un ruolo per questa eccezione permessi.',
        permissionOverrideSingleTarget:
          'Puoi impostare un’eccezione permessi per un solo target alla volta.',
        permissionOverrideAddFailed: 'Impossibile aggiungere l’eccezione permessi',
        permissionOverrideDeleteFailed: 'Impossibile eliminare l’eccezione permessi',
        permissionOverrideUpdateFailed: 'Impossibile aggiornare l’eccezione permessi',
        rotateFileAccessTokenFailed: 'Impossibile ruotare il token di accesso file'
      },
      moderation: {
        userNotConnected: 'L’utente non è connesso.',
        cannotBanSelf: 'Non puoi bannare te stesso.',
        userAlreadyHasRole: 'L’utente possiede già questo ruolo.',
        userDoesNotHaveRole: 'L’utente non possiede questo ruolo.'
      },
      roles: {
        roleNotFound: 'Ruolo non trovato.',
        defaultRoleNotFound: 'Ruolo predefinito non trovato.'
      },
      files: {
        temporaryFileNotFound: 'File temporaneo non trovato.',
        noUploadPermission: 'Non hai i permessi per caricare file.',
        uploadsDisabled: 'Il caricamento file è disabilitato su questo server.'
      }
    },
    connect: {
      title: 'Connetti',
      identityLabel: 'Identità',
      identityHelp:
        'Un identificatore univoco per il tuo account su questo server. Puoi usare quello che preferisci, ad esempio un indirizzo email o un nome utente. Non verrà condiviso pubblicamente.',
      passwordLabel: 'Password',
      rememberCredentialsLabel: 'Ricorda credenziali',
      insecureConnectionTitle: 'Connessione non sicura',
      insecureConnectionDescription:
        "Stai accedendo al server tramite una connessione non sicura (HTTP). Per impostazione predefinita, i browser bloccano l'accesso ai dispositivi multimediali come fotocamera e microfono su origini non sicure. Questo significa che non potrai usare le funzionalità video o vocali mentre sei connesso al server via HTTP. Se sei l'amministratore del server, puoi configurare HTTPS seguendo la documentazione.",
      connectButton: 'Connetti',
      newRegistrationsDisabled:
        "Le registrazioni di nuovi utenti sono attualmente disabilitate. Se non hai ancora un account, devi essere invitato da un utente esistente per entrare in questo server.",
      invitedTitle: 'Sei stato invitato a entrare in questo server',
      inviteCodeLabel: 'Codice invito: {{code}}',
      connectError: 'Impossibile connettersi: {{errorMessage}}'
    },
    loadingApp: {
      loadingSharkord: 'Caricamento di Sharkord'
    },
    topBar: {
      closeVoiceChat: 'Chiudi chat vocale',
      openVoiceChat: 'Apri chat vocale',
      closeMembersSidebar: 'Chiudi barra membri',
      openMembersSidebar: 'Apri barra membri'
    },
    sidebar: {
      serverMenu: {
        server: 'Server',
        addCategory: 'Aggiungi categoria',
        serverSettings: 'Impostazioni server',
        disconnect: 'Disconnetti'
      },
      categories: {
        collapse: 'Comprimi categoria',
        expand: 'Espandi categoria',
        createChannel: 'Crea canale'
      }
    },
    modView: {
      actions: {
        kick: 'Espelli',
        ban: 'Banna',
        unban: 'Sbanna',
        assignRole: 'Assegna ruolo'
      },
      header: {
        removeRoleTitle: 'Rimuovi ruolo',
        removeRoleMessage:
          'Sei sicuro di voler rimuovere il ruolo "{{roleName}}" da {{userName}}?',
        removeRoleConfirm: 'Rimuovi',
        kickTitle: 'Espelli utente',
        kickMessage:
          'Inserisci un motivo per l\'espulsione di questo utente (opzionale).',
        kickConfirm: 'Espelli',
        banTitle: 'Banna utente',
        banMessage:
          'Inserisci un motivo per il ban di questo utente (opzionale).',
        banConfirm: 'Banna',
        unbanTitle: 'Sbanna utente',
        unbanMessage: 'Sei sicuro di voler sbannare questo utente?',
        unbanConfirm: 'Sbanna'
      }
    },
    dialogs: {
      createCategory: {
        title: 'Crea nuova categoria',
        categoryNameLabel: 'Nome categoria',
        categoryNamePlaceholder: 'Nome categoria',
        cancel: 'Annulla',
        createCategory: 'Crea categoria'
      },
      createInvite: {
        title: 'Crea invito server',
        description: 'Crea un nuovo link di invito per consentire agli utenti di entrare nel server.',
        codeLabel: 'Codice',
        codePlaceholder: 'Codice invito',
        maxUsesLabel: 'Utilizzi massimi',
        maxUsesDescription: 'Usa 0 per utilizzi illimitati.',
        maxUsesPlaceholder: 'Utilizzi massimi',
        expiresInLabel: 'Scade tra',
        expiresInDescription: 'Lascia vuoto per nessuna scadenza.',
        cancel: 'Annulla',
        createInvite: 'Crea invito',
        toasts: {
          created: 'Invito creato'
        }
      },
      serverPassword: {
        title: 'Inserisci la password',
        description: 'Questo server è protetto da password. Inseriscila per entrare.',
        savePasswordLabel: 'Salva password',
        cancel: 'Annulla',
        join: 'Entra'
      },
      createChannel: {
        title: 'Crea nuovo canale',
        channelTypeLabel: 'Tipo canale',
        textChannelTitle: 'Canale testuale',
        textChannelDescription: 'Condividi testo, immagini, file e altro',
        voiceChannelTitle: 'Canale vocale',
        voiceChannelDescription: 'Parla con voce, video e condivisione schermo',
        channelNameLabel: 'Nome canale',
        channelNamePlaceholder: 'Nome canale',
        defaultName: 'Nuovo canale',
        cancel: 'Annulla',
        createChannel: 'Crea canale'
      },
      pluginLogs: {
        title: 'Log di {{pluginId}}',
        stats: {
          info: 'Info',
          errors: 'Errori',
          debug: 'Debug',
          total: 'Totale',
          logs: 'log',
          show: 'Mostra'
        },
        limits: {
          hundred: '100 log',
          fiveHundred: '500 log',
          all: 'Tutti i log'
        },
        emptyTitle: 'Nessun log ancora',
        emptyDescription: 'I log appariranno qui quando il plugin li genererà'
      },
      pluginSettings: {
        title: 'Impostazioni di {{pluginName}}',
        listTitle: 'Impostazioni',
        listEmpty: 'Nessuna impostazione disponibile per questo plugin',
        edited: 'Modificato',
        loadFailed: 'Impossibile caricare le impostazioni del plugin',
        saveSuccess: 'Impostazioni salvate',
        saveFailed: 'Impossibile salvare le impostazioni',
        noConfigTitle: 'Nessuna impostazione configurabile',
        selectSettingTitle: 'Seleziona un\'impostazione da modificare',
        keyLabel: 'Chiave',
        valueLabel: 'Valore',
        noUnsavedChanges: 'Nessuna modifica non salvata',
        unsavedChanges: '{{count}} {{suffix}} non salvata{{ending}}',
        unsavedSuffixOne: 'modifica',
        unsavedSuffixMany: 'modifiche',
        unsavedEndingOne: '',
        unsavedEndingMany: 'e',
        close: 'Chiudi',
        saveChanges: 'Salva modifiche',
        saving: 'Salvataggio...'
      },
      pluginCommands: {
        title: 'Comandi disponibili per {{pluginId}}',
        selectCommandTitle: 'Seleziona un comando da eseguire',
        noArgs: 'Questo comando non richiede argomenti.',
        close: 'Chiudi',
        execute: 'Esegui comando',
        executing: 'Esecuzione...',
        executeSuccess: "Comando '{{commandName}}' eseguito con successo",
        executeFailed: 'Impossibile eseguire il comando',
        commandListTitle: 'Comandi',
        commandListEmpty: 'Nessun comando disponibile per questo plugin',
        argumentsCount: '{{count}} argomento',
        argumentsCountPlural: '{{count}} argomenti',
        helpersTitle: 'Valori helper',
        helpersDescription: 'Valori del contesto corrente che puoi usare nei comandi',
        yourUserId: 'Il tuo ID utente',
        currentVoiceChannelId: 'ID canale vocale corrente',
        selectedChannelId: 'ID canale selezionato',
        notLoaded: 'Non caricato',
        notInVoiceChannel: 'Non sei in un canale vocale',
        noChannelSelected: 'Nessun canale selezionato',
        argBooleanPlaceholder: 'Seleziona valore...',
        argTrue: 'Vero',
        argFalse: 'Falso',
        argInputPlaceholder: 'Inserisci {{name}}...',
        responseTitle: 'Risposta',
        responseSuccess: 'Comando eseguito con successo',
        responseFailed: 'Comando fallito'
      },
      confirmAction: {
        defaultTitle: 'Conferma azione',
        defaultMessage: 'Sei sicuro di voler eseguire questa azione?',
        cancel: 'Annulla',
        confirm: 'Conferma'
      },
      textInput: {
        cancel: 'Annulla',
        confirm: 'Conferma'
      }
    },
    toasts: {
      messages: {
        sendFailed: 'Invio messaggio fallito',
        deleted: 'Messaggio eliminato',
        deleteFailed: 'Impossibile eliminare il messaggio',
        edited: 'Messaggio modificato',
        editFailed: 'Impossibile modificare il messaggio',
        reactionAddFailed: 'Impossibile aggiungere la reazione',
        reactionToggleFailed: 'Impossibile aggiornare la reazione'
      },
      channels: {
        deleted: 'Canale eliminato',
        deleteFailed: 'Impossibile eliminare il canale',
        joinVoiceFailed: 'Impossibile entrare nel canale vocale',
        leaveVoiceFailed: 'Impossibile uscire dal canale vocale',
        initVoiceFailed: 'Impossibile inizializzare la connessione vocale',
        reorderFailed: 'Impossibile riordinare i canali'
      },
      categories: {
        deleted: 'Categoria eliminata',
        deleteFailed: 'Impossibile eliminare la categoria',
        reorderFailed: 'Impossibile riordinare le categorie'
      },
      roles: {
        assignSelectRole: 'Seleziona un ruolo',
        assignedSuccess: 'Ruolo assegnato con successo',
        assignFailed: 'Impossibile assegnare il ruolo',
        removedSuccess: 'Ruolo rimosso con successo',
        removeFailed: 'Impossibile rimuovere il ruolo',
        created: 'Ruolo creato',
        createFailed: 'Impossibile creare il ruolo',
        deleted: 'Ruolo eliminato',
        deleteFailed: 'Impossibile eliminare il ruolo',
        updated: 'Ruolo aggiornato',
        defaultUpdated: 'Ruolo predefinito aggiornato'
      },
      moderation: {
        userKickedSuccess: 'Utente espulso con successo',
        userKickedFailed: 'Impossibile espellere utente',
        userBannedSuccess: 'Utente bannato con successo',
        userBannedFailed: 'Impossibile bannare utente',
        userUnbannedSuccess: 'Utente sbannato con successo',
        userUnbannedFailed: 'Impossibile sbannare utente'
      },
      files: {
        deletedSuccess: 'File eliminato con successo',
        deleteFailed: 'Impossibile eliminare il file'
      },
      auth: {
        ownerGranted: 'Ora sei proprietario di questo server'
      },
      app: {
        loadServerInfoFailed: 'Impossibile caricare le informazioni del server'
      },
      server: {
        settingsUpdated: 'Impostazioni aggiornate',
        updateInitiated: 'Aggiornamento server avviato',
        channelUpdated: 'Canale aggiornato',
        categoryUpdated: 'Categoria aggiornata',
        storageSettingsUpdated: 'Impostazioni storage aggiornate'
      },
      permissions: {
        overrideAdded: 'Override permesso aggiunto',
        overrideDeleted: 'Override permesso eliminato',
        overrideUpdated: 'Override permesso aggiornato'
      },
      security: {
        tokenRotated: 'Token di accesso file ruotato con successo'
      }
    },
    userSettings: {
      title: 'Impostazioni utente',
      tabs: {
        profile: 'Profilo',
        devices: 'Dispositivi',
        password: 'Password'
      },
      actions: {
        cancel: 'Annulla',
        saveChanges: 'Salva modifiche'
      },
      profile: {
        title: 'Il tuo profilo',
        description:
          'Aggiorna qui le tue informazioni personali e le impostazioni.',
        usernameLabel: 'Nome utente',
        usernamePlaceholder: 'Nome utente',
        bioLabel: 'Bio',
        bioPlaceholder: 'Raccontaci qualcosa di te...',
        bannerColorLabel: 'Colore banner',
        toasts: {
          updated: 'Profilo aggiornato'
        },
        avatar: {
          label: 'Avatar',
          removeButton: 'Rimuovi avatar',
          toasts: {
            removedSuccess: 'Avatar rimosso con successo!',
            removedError: "Impossibile rimuovere l'avatar. Riprova.",
            uploadError: 'Impossibile caricare il file. Riprova.',
            updatedSuccess: 'Avatar aggiornato con successo!',
            updatedError: "Impossibile aggiornare l'avatar. Riprova."
          }
        },
        banner: {
          label: 'Banner',
          alt: 'Banner utente',
          removeButton: 'Rimuovi banner',
          toasts: {
            removedSuccess: 'Banner rimosso con successo!',
            removedError: 'Impossibile rimuovere il banner. Riprova.',
            uploadError: 'Impossibile caricare il file. Riprova.',
            updatedSuccess: 'Banner aggiornato con successo!',
            updatedError: 'Impossibile aggiornare il banner. Riprova.'
          }
        }
      },
      devices: {
        title: 'Dispositivi',
        description: 'Gestisci i tuoi dispositivi e le relative impostazioni.',
        voiceChannelWarning:
          'Sei in un canale vocale: le modifiche avranno effetto solo dopo essere uscito e rientrato nel canale.',
        microphoneLabel: 'Microfono',
        webcamLabel: 'Webcam',
        screenSharingLabel: 'Condivisione schermo',
        echoCancellationLabel: 'Cancellazione eco',
        noiseSuppressionLabel: 'Soppressione rumore',
        autoGainControlLabel: 'Controllo automatico del guadagno',
        resolutionLabel: 'Risoluzione',
        framerateLabel: 'Frame rate',
        selectInputPlaceholder: 'Seleziona il dispositivo di input',
        defaultMicrophone: 'Microfono predefinito',
        defaultWebcam: 'Webcam predefinita',
        toasts: {
          saved: 'Impostazioni dispositivi salvate'
        }
      },
      password: {
        title: 'Password',
        description: 'In questa sezione puoi aggiornare la tua password.',
        currentPasswordLabel: 'Password attuale',
        newPasswordLabel: 'Nuova password',
        confirmNewPasswordLabel: 'Conferma nuova password',
        toasts: {
          updated: 'Password aggiornata!'
        }
      }
    },
    serverSettings: {
      title: 'Impostazioni server',
      tabs: {
        general: 'Generale',
        roles: 'Ruoli',
        emojis: 'Emoji',
        storage: 'Storage',
        users: 'Utenti',
        invites: 'Inviti',
        updates: 'Aggiornamenti',
        plugins: 'Plugin'
      },
      actions: {
        cancel: 'Annulla',
        close: 'Chiudi',
        saveChanges: 'Salva modifiche'
      },
      general: {
        title: 'Informazioni server',
        description: 'Gestisci le informazioni di base del tuo server',
        nameLabel: 'Nome',
        namePlaceholder: 'Inserisci il nome del server',
        descriptionLabel: 'Descrizione',
        descriptionPlaceholder: 'Inserisci la descrizione del server',
        passwordLabel: 'Password',
        passwordPlaceholder: 'Lascia vuoto per nessuna password',
        logoLabel: 'Logo',
        allowNewUsersLabel: 'Consenti nuovi utenti',
        allowNewUsersDescription:
          'Consenti a chiunque di registrarsi ed entrare nel server. Se disabilitato, potranno entrare solo gli utenti invitati.',
        enablePluginsLabel: 'Abilita plugin',
        enablePluginsDescription:
          'Abilita o disabilita i plugin per il tuo server.',
        toasts: {
          logoRemovedSuccess: 'Logo rimosso con successo!',
          logoRemovedError: 'Impossibile rimuovere il logo. Riprova.',
          logoUploadError: 'Impossibile caricare il file. Riprova.',
          logoUpdatedSuccess: 'Logo aggiornato con successo!',
          logoUpdatedError: 'Impossibile aggiornare il logo. Riprova.'
        }
      },
      invites: {
        title: 'Inviti server',
        description:
          'Gestisci i link di invito per consentire agli utenti di entrare nel server',
        createInvite: 'Crea invito',
        searchPlaceholder: 'Cerca inviti per codice o creatore...',
        emptyMessage: 'Nessun invito trovato',
        columns: {
          code: 'Codice',
          creator: 'Creatore',
          uses: 'Utilizzi',
          expires: 'Scade',
          created: 'Creato',
          status: 'Stato',
          actions: 'Azioni'
        },
        never: 'Mai',
        expired: 'Scaduto',
        maxUses: 'Utilizzi max',
        active: 'Attivo',
        copyInviteLink: 'Copia link invito',
        deleteTitle: 'Elimina invito',
        deleteMessage:
          'Sei sicuro di voler eliminare questo invito? Questa azione non può essere annullata.',
        deleteConfirm: 'Elimina',
        toasts: {
          copied: 'Codice invito copiato negli appunti',
          deleted: 'Invito eliminato',
          deleteFailed: 'Impossibile eliminare invito'
        }
      },
      users: {
        title: 'Utenti',
        description: 'Gestisci gli utenti del server e i loro permessi',
        emptyMessage: 'Nessun utente trovato',
        moderateUser: 'Modera utente',
        columns: {
          avatar: 'Avatar',
          user: 'Utente',
          roles: 'Ruoli',
          joinedAt: 'Entrato il',
          lastJoin: 'Ultimo accesso',
          status: 'Stato',
          actions: 'Azioni'
        }
      },
      roles: {
        title: 'Ruoli',
        emptySelection: 'Seleziona un ruolo da modificare o creane uno nuovo'
      },
      plugins: {
        title: 'Plugin',
        description:
          'Gestisci i plugin installati ed estendi il tuo server Sharkord con funzionalità aggiuntive.',
        refresh: 'Aggiorna',
        logs: 'Log',
        commands: 'Comandi',
        settings: 'Impostazioni',
        error: 'Errore',
        enabled: 'Abilitato',
        disabled: 'Disabilitato',
        noPluginsTitle: 'Nessun plugin installato',
        noPluginsDescription:
          'Installa plugin per aggiungere nuove funzioni ed estendere il server Sharkord.',
        disabledTitle: 'I plugin sono disabilitati',
        disabledDescription:
          'I plugin sono stati disabilitati per questo server. Abilitalli nelle impostazioni server per gestirli e usarli.',
        toasts: {
          refreshed: 'Elenco plugin aggiornato',
          refreshFailed: 'Impossibile aggiornare elenco plugin',
          toggled: 'Plugin {{status}} con successo',
          toggleFailed: 'Impossibile cambiare stato del plugin'
        }
      },
      storage: {
        title: 'Storage',
        description:
          'Gestisci le impostazioni di archiviazione del server. Controlla come i dati vengono salvati, accessibili e gestiti. Qui puoi configurare limiti di spazio, opzioni di backup e policy di retention per garantire prestazioni e affidabilità ottimali.',
        allowUploadsLabel: 'Consenti upload',
        allowUploadsDescription:
          'Consente agli utenti di caricare file sul server. I file esistenti non saranno influenzati.',
        quotaLabel: 'Quota',
        quotaDescription:
          'Quantità totale di spazio di archiviazione allocato al server.',
        quotaHelp:
          "Questo non è un limite rigido: i file saranno comunque scritti temporaneamente su disco anche se la quota è superata. L'azione di overflow verrà applicata dopo il completamento dell'upload. Assicurati di avere più spazio disco disponibile rispetto alla quota impostata qui.",
        maxFileSizeLabel: 'Dimensione massima file',
        maxFileSizeDescription:
          'Dimensione massima di un singolo file caricabile sul server.',
        quotaPerUserLabel: 'Quota per utente',
        quotaPerUserDescription:
          'Quantità massima di spazio che ogni utente può usare sul server. Puoi configurare quote anche per ruolo nelle impostazioni Ruoli; queste sovrascriveranno l\'impostazione globale per gli utenti con quel ruolo specifico. Usa 0 per illimitato',
        overflowActionLabel: 'Azione overflow',
        overflowActionDescription:
          'Azione da eseguire quando la quota globale del server viene superata.',
        overflowActionPlaceholder: 'Seleziona l\'intervallo di polling',
        metrics: {
          totalDiskSpace: 'Spazio disco totale',
          availableSpace: 'Spazio disponibile',
          systemUsed: 'Usato dal sistema',
          sharkordUsed: 'Usato da Sharkord',
          diskUsage: 'Utilizzo disco',
          used: 'usato'
        }
      },
      emojis: {
        title: 'Emoji',
        searchPlaceholder: 'Cerca emoji...',
        emptySearch: 'Nessuna emoji trovata',
        emptyList: 'Nessuna emoji personalizzata',
        emptyListHint:
          'Gli amministratori del server possono caricare emoji personalizzate nelle impostazioni server',
        uploadTitle: 'Carica emoji personalizzate',
        uploadDescription:
          'Seleziona una emoji da modificare o caricane di nuove per personalizzare il server',
        uploadButton: 'Carica emoji',
        editTitle: 'Modifica emoji',
        deleteTitle: 'Elimina emoji',
        deleteMessage:
          'Sei sicuro di voler eliminare questa emoji? Questa azione non può essere annullata.',
        deleteConfirm: 'Elimina',
        uploadedBy: 'Caricato da {{user}}',
        nameLabel: 'Nome',
        namePlaceholder:
          'Inserisci nome emoji (senza spazi o caratteri speciali)',
        usageHint: 'Verrà usata come :{{name}}: nei messaggi',
        toasts: {
          created: 'Emoji creata',
          uploadFailed: 'Caricamento emoji fallito',
          deleted: 'Emoji eliminata',
          deleteFailed: 'Impossibile eliminare emoji',
          updated: 'Emoji aggiornata'
        }
      },
      updates: {
        title: 'Aggiornamenti',
        description:
          'Controlla e installa aggiornamenti per mantenere il server Sharkord con le ultime funzionalità e migliorie di sicurezza.',
        currentVersion: 'Versione attuale',
        latestVersion: 'Ultima versione',
        unknown: 'Sconosciuta',
        notSupportedTitle: 'Aggiornamenti non supportati',
        notSupportedDescription:
          'Gli aggiornamenti automatici non sono supportati in questo ambiente. Consulta la documentazione per istruzioni di aggiornamento manuale.',
        availableTitle: 'Aggiornamento disponibile',
        availableDescription:
          'Una nuova versione ({{version}}) è disponibile per il download. L\'aggiornamento riavvierà il server e potrebbe causare downtime temporaneo.',
        upToDateTitle: 'Aggiornato',
        upToDateDescription:
          'Il tuo server esegue già l\'ultima versione di Sharkord.',
        updateServer: 'Aggiorna server',
        noUpdates: 'Nessun aggiornamento disponibile'
      }
    },
    disconnected: {
      title: 'Disconnesso',
      kickedTitle: 'Sei stato espulso',
      bannedTitle: 'Sei stato bannato',
      noReasonProvided: 'Nessun motivo fornito.',
      connectionLostTitle: 'Connessione persa',
      connectionLostMessage: 'Connessione al server persa inaspettatamente.',
      goToConnectButton: 'Vai alla schermata di connessione',
      details: 'Dettagli',
      codeLabel: 'Codice',
      timeLabel: 'Ora'
    }
  } as const;

export { it };

