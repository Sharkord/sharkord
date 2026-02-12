const en = {
    common: {
      appName: 'Sharkord',
      language: 'Language',
      placeholder: {
        searchUsers: 'Search users by name or identity...'
      },
      placeholders: {
        searchUsers: 'Search users by name or identity...',
        enterServerName: 'Enter server name',
        enterChannelTopic: 'Enter channel topic',
        enterCategoryName: 'Enter category name',
        searchInMessage: 'Search in message...',
        searchLinks: 'Search links...',
        searchFiles: 'Search files...',
        searchCustomEmojis: 'Search custom emojis...',
        searchEmojis: 'Search emojis...',
        selectRole: 'Select a role'
      },
      labels: {
        fileAccessToken: 'File Access Token',
        name: 'Name',
        private: 'Private',
        userId: 'User ID',
        identity: 'Identity',
        ipAddress: 'IP Address',
        location: 'Location',
        joinedServer: 'Joined Server',
        lastActive: 'Last Active',
        banned: 'Banned',
        banReason: 'Ban Reason',
        bannedAt: 'Banned At',
        role: 'Role',
        openInNewTab: 'Open in new tab',
        noRemoteAudioStreams: 'No remote audio streams available.'
      },
      pagination: {
        noItemsFound: 'No items found',
        noItemsFoundMatching: 'No items found matching "{{searchTerm}}"',
        showingRangeSingular: 'Showing {{start}} to {{end}} of {{total}} item',
        showingRangePlural: 'Showing {{start}} to {{end}} of {{total}} items'
      }
    },
    errors: {
      generic: 'Something went wrong, please try again.',
      codes: {
        badRequest: 'Invalid request data.',
        unauthorized: 'You need to sign in to continue.',
        forbidden: 'You do not have permission to perform this action.',
        notFound: 'The requested resource was not found.',
        methodNotSupported: 'This operation is not supported.',
        timeout: 'The request timed out. Please try again.',
        conflict: 'This action conflicts with existing data.',
        preconditionFailed: 'The request preconditions were not met.',
        payloadTooLarge: 'The submitted data is too large.',
        tooManyRequests: 'Too many requests. Please wait and try again.',
        internalServerError: 'Internal server error. Please try again later.'
      },
      validation: {
        invalidType: 'Invalid value type.',
        invalidString: 'Invalid text value.',
        invalidEnumValue: 'Please select a valid option.',
        invalidLiteral: 'Invalid value.',
        invalidUnion: 'Invalid value.',
        tooSmall: 'The value is too short or too small.',
        tooBig: 'The value is too long or too large.',
        custom: 'Invalid value.'
      },
      auth: {
        invalidPassword: 'Invalid password.',
        invalidSecretToken: 'Invalid access token.',
        invalidHandshakeHash: 'Invalid connection token.',
        userNotAuthenticated: 'You are not authenticated.'
      },
      channel: {
        channelNotFound: 'Channel not found.',
        channelNotVoice: 'Channel is not a voice channel.',
        userAlreadyInVoiceChannel: 'User is already in a voice channel.',
        userNotInVoiceChannel: 'User is not in a voice channel.',
        voiceRuntimeNotFound: 'Voice service is not available for this channel.',
        permissionOverrideRequiresTarget:
          'Please select either a user or a role for this permission override.',
        permissionOverrideSingleTarget:
          'You can only set a permission override for one target at a time.',
        permissionOverrideAddFailed: 'Failed to add permission override',
        permissionOverrideDeleteFailed: 'Failed to delete permission override',
        permissionOverrideUpdateFailed: 'Failed to update permission override',
        rotateFileAccessTokenFailed: 'Failed to rotate file access token'
      },
      moderation: {
        userNotConnected: 'User is not connected.',
        cannotBanSelf: 'You cannot ban yourself.',
        userAlreadyHasRole: 'User already has this role.',
        userDoesNotHaveRole: 'User does not have this role.'
      },
      roles: {
        roleNotFound: 'Role not found.',
        defaultRoleNotFound: 'Default role not found.'
      },
      files: {
        temporaryFileNotFound: 'Temporary file not found.',
        noUploadPermission: 'You do not have permission to upload files.',
        uploadsDisabled: 'File uploads are disabled on this server.'
      }
    },
    connect: {
      title: 'Connect',
      identityLabel: 'Identity',
      identityHelp:
        "A unique identifier for your account on this server. You can use whatever you like, such as an email address or a username. This won't be shared publicly.",
      passwordLabel: 'Password',
      rememberCredentialsLabel: 'Remember Credentials',
      insecureConnectionTitle: 'Insecure Connection',
      insecureConnectionDescription:
        "You are accessing the server over an insecure connection (HTTP). By default, browsers block access to media devices such as your camera and microphone on insecure origins. This means that you won't be able to use video or voice chat features while connected to the server over HTTP. If you are the server administrator, you can set up HTTPS by following the instructions in the documentation.",
      connectButton: 'Connect',
      newRegistrationsDisabled:
        'New user registrations are currently disabled. If you do not have an account yet, you need to be invited by an existing user to join this server.',
      invitedTitle: 'You were invited to join this server',
      inviteCodeLabel: 'Invite code: {{code}}',
      connectError: 'Could not connect: {{errorMessage}}'
    },
    loadingApp: {
      loadingSharkord: 'Loading Sharkord'
    },
    topBar: {
      closeVoiceChat: 'Close Voice Chat',
      openVoiceChat: 'Open Voice Chat',
      closeMembersSidebar: 'Close Members Sidebar',
      openMembersSidebar: 'Open Members Sidebar'
    },
    sidebar: {
      serverMenu: {
        server: 'Server',
        addCategory: 'Add category',
        serverSettings: 'Server Settings',
        disconnect: 'Disconnect'
      },
      categories: {
        collapse: 'Collapse category',
        expand: 'Expand category',
        createChannel: 'Create channel'
      }
    },
    modView: {
      actions: {
        kick: 'Kick',
        ban: 'Ban',
        unban: 'Unban',
        assignRole: 'Assign Role'
      },
      header: {
        removeRoleTitle: 'Remove Role',
        removeRoleMessage:
          'Are you sure you want to remove the role "{{roleName}}" from {{userName}}?',
        removeRoleConfirm: 'Remove',
        kickTitle: 'Kick User',
        kickMessage: 'Please provide a reason for kicking this user (optional).',
        kickConfirm: 'Kick',
        banTitle: 'Ban User',
        banMessage: 'Please provide a reason for banning this user (optional).',
        banConfirm: 'Ban',
        unbanTitle: 'Unban User',
        unbanMessage: 'Are you sure you want to unban this user?',
        unbanConfirm: 'Unban'
      }
    },
    dialogs: {
      createCategory: {
        title: 'Create New Category',
        categoryNameLabel: 'Category name',
        categoryNamePlaceholder: 'Category name',
        cancel: 'Cancel',
        createCategory: 'Create Category'
      },
      createInvite: {
        title: 'Create Server Invite',
        description: 'Create a new invitation link for users to join the server.',
        codeLabel: 'Code',
        codePlaceholder: 'Invite code',
        maxUsesLabel: 'Max uses',
        maxUsesDescription: 'Use 0 for unlimited uses.',
        maxUsesPlaceholder: 'Max uses',
        expiresInLabel: 'Expires in',
        expiresInDescription: 'Leave empty for no expiration.',
        cancel: 'Cancel',
        createInvite: 'Create Invite',
        toasts: {
          created: 'Invite created'
        }
      },
      serverPassword: {
        title: 'Enter the password',
        description: 'This server is password protected. Please enter the password to join.',
        savePasswordLabel: 'Save password',
        cancel: 'Cancel',
        join: 'Join'
      },
      createChannel: {
        title: 'Create New Channel',
        channelTypeLabel: 'Channel type',
        textChannelTitle: 'Text Channel',
        textChannelDescription: 'Share text, images, files and more',
        voiceChannelTitle: 'Voice Channel',
        voiceChannelDescription: 'Hangout with voice, video and screen sharing',
        channelNameLabel: 'Channel name',
        channelNamePlaceholder: 'Channel name',
        defaultName: 'New Channel',
        cancel: 'Cancel',
        createChannel: 'Create channel'
      },
      pluginLogs: {
        title: 'Logs for {{pluginId}}',
        stats: {
          info: 'Info',
          errors: 'Errors',
          debug: 'Debug',
          total: 'Total',
          logs: 'logs',
          show: 'Show'
        },
        limits: {
          hundred: '100 logs',
          fiveHundred: '500 logs',
          all: 'All logs'
        },
        emptyTitle: 'No logs yet',
        emptyDescription: 'Logs will appear here when the plugin generates them'
      },
      pluginSettings: {
        title: 'Settings for {{pluginName}}',
        listTitle: 'Settings',
        listEmpty: 'No settings available for this plugin',
        edited: 'Edited',
        loadFailed: 'Failed to load plugin settings',
        saveSuccess: 'Settings saved',
        saveFailed: 'Failed to save settings',
        noConfigTitle: 'No configurable settings',
        selectSettingTitle: 'Select a setting to edit',
        keyLabel: 'Key',
        valueLabel: 'Value',
        noUnsavedChanges: 'No unsaved changes',
        unsavedChanges: '{{count}} unsaved {{suffix}}',
        unsavedSuffixOne: 'change',
        unsavedSuffixMany: 'changes',
        close: 'Close',
        saveChanges: 'Save Changes',
        saving: 'Saving...'
      },
      pluginCommands: {
        title: 'Available Commands For {{pluginId}}',
        selectCommandTitle: 'Select a command to execute',
        noArgs: 'This command does not require any arguments.',
        close: 'Close',
        execute: 'Execute Command',
        executing: 'Executing...',
        executeSuccess: "Command '{{commandName}}' executed successfully",
        executeFailed: 'Failed to execute command',
        commandListTitle: 'Commands',
        commandListEmpty: 'No commands available for this plugin',
        argumentsCount: '{{count}} argument',
        argumentsCountPlural: '{{count}} arguments',
        helpersTitle: 'Helper Values',
        helpersDescription: 'Current context values you can use in commands',
        yourUserId: 'Your User ID',
        currentVoiceChannelId: 'Current Voice Channel ID',
        selectedChannelId: 'Selected Channel ID',
        notLoaded: 'Not loaded',
        notInVoiceChannel: 'Not in voice channel',
        noChannelSelected: 'No channel selected',
        argBooleanPlaceholder: 'Select value...',
        argTrue: 'True',
        argFalse: 'False',
        argInputPlaceholder: 'Enter {{name}}...',
        responseTitle: 'Response',
        responseSuccess: 'Command executed successfully',
        responseFailed: 'Command failed'
      },
      confirmAction: {
        defaultTitle: 'Confirm Action',
        defaultMessage: 'Are you sure you want to perform this action?',
        cancel: 'Cancel',
        confirm: 'Confirm'
      },
      textInput: {
        cancel: 'Cancel',
        confirm: 'Confirm'
      }
    },
    toasts: {
      messages: {
        sendFailed: 'Failed to send message',
        deleted: 'Message deleted',
        deleteFailed: 'Failed to delete message',
        edited: 'Message edited',
        editFailed: 'Failed to edit message',
        reactionAddFailed: 'Failed to add reaction',
        reactionToggleFailed: 'Failed to toggle reaction'
      },
      channels: {
        deleted: 'Channel deleted',
        deleteFailed: 'Failed to delete channel',
        joinVoiceFailed: 'Failed to join voice channel',
        leaveVoiceFailed: 'Failed to leave voice channel',
        initVoiceFailed: 'Failed to initialize voice connection',
        reorderFailed: 'Failed to reorder channels'
      },
      categories: {
        deleted: 'Category deleted',
        deleteFailed: 'Failed to delete category',
        reorderFailed: 'Failed to reorder categories'
      },
      roles: {
        assignSelectRole: 'Please select a role',
        assignedSuccess: 'Role assigned successfully',
        assignFailed: 'Failed to assign role',
        removedSuccess: 'Role removed successfully',
        removeFailed: 'Failed to remove role',
        created: 'Role created',
        createFailed: 'Could not create role',
        deleted: 'Role deleted',
        deleteFailed: 'Failed to delete role',
        updated: 'Role updated',
        defaultUpdated: 'Default role updated'
      },
      moderation: {
        userKickedSuccess: 'User kicked successfully',
        userKickedFailed: 'Failed to kick user',
        userBannedSuccess: 'User banned successfully',
        userBannedFailed: 'Failed to ban user',
        userUnbannedSuccess: 'User unbanned successfully',
        userUnbannedFailed: 'Failed to unban user'
      },
      files: {
        deletedSuccess: 'File deleted successfully',
        deleteFailed: 'Failed to delete file'
      },
      auth: {
        ownerGranted: 'You are now an owner of this server'
      },
      app: {
        loadServerInfoFailed: 'Failed to load server info'
      },
      server: {
        settingsUpdated: 'Settings updated',
        updateInitiated: 'Server update initiated',
        channelUpdated: 'Channel updated',
        categoryUpdated: 'Category updated',
        storageSettingsUpdated: 'Storage settings updated'
      },
      permissions: {
        overrideAdded: 'Permission override added',
        overrideDeleted: 'Permission override deleted',
        overrideUpdated: 'Permission override updated'
      },
      security: {
        tokenRotated: 'File access token rotated successfully'
      }
    },
    userSettings: {
      title: 'User Settings',
      tabs: {
        profile: 'Profile',
        devices: 'Devices',
        password: 'Password'
      },
      actions: {
        cancel: 'Cancel',
        saveChanges: 'Save Changes'
      },
      profile: {
        title: 'Your Profile',
        description: 'Update your personal information and settings here.',
        usernameLabel: 'Username',
        usernamePlaceholder: 'Username',
        bioLabel: 'Bio',
        bioPlaceholder: 'Tell us about yourself...',
        bannerColorLabel: 'Banner color',
        toasts: {
          updated: 'Profile updated'
        },
        avatar: {
          label: 'Avatar',
          removeButton: 'Remove avatar',
          toasts: {
            removedSuccess: 'Avatar removed successfully!',
            removedError: 'Could not remove avatar. Please try again.',
            uploadError: 'Could not upload file. Please try again.',
            updatedSuccess: 'Avatar updated successfully!',
            updatedError: 'Could not update avatar. Please try again.'
          }
        },
        banner: {
          label: 'Banner',
          alt: 'User Banner',
          removeButton: 'Remove banner',
          toasts: {
            removedSuccess: 'Banner removed successfully!',
            removedError: 'Could not remove banner. Please try again.',
            uploadError: 'Could not upload file. Please try again.',
            updatedSuccess: 'Banner updated successfully!',
            updatedError: 'Could not update banner. Please try again.'
          }
        }
      },
      devices: {
        title: 'Devices',
        description: 'Manage your peripheral devices and their settings.',
        voiceChannelWarning:
          'You are in a voice channel, changes will only take effect after you leave and rejoin the channel.',
        microphoneLabel: 'Microphone',
        webcamLabel: 'Webcam',
        screenSharingLabel: 'Screen Sharing',
        echoCancellationLabel: 'Echo cancellation',
        noiseSuppressionLabel: 'Noise suppression',
        autoGainControlLabel: 'Automatic gain control',
        resolutionLabel: 'Resolution',
        framerateLabel: 'Framerate',
        selectInputPlaceholder: 'Select the input device',
        defaultMicrophone: 'Default Microphone',
        defaultWebcam: 'Default Webcam',
        toasts: {
          saved: 'Device settings saved'
        }
      },
      password: {
        title: 'Password',
        description: 'In this section, you can update your password.',
        currentPasswordLabel: 'Current Password',
        newPasswordLabel: 'New Password',
        confirmNewPasswordLabel: 'Confirm New Password',
        toasts: {
          updated: 'Password updated!'
        }
      }
    },
    serverSettings: {
      title: 'Server Settings',
      tabs: {
        general: 'General',
        roles: 'Roles',
        emojis: 'Emojis',
        storage: 'Storage',
        users: 'Users',
        invites: 'Invites',
        updates: 'Updates',
        plugins: 'Plugins'
      },
      actions: {
        cancel: 'Cancel',
        close: 'Close',
        saveChanges: 'Save Changes'
      },
      general: {
        title: 'Server Information',
        description: "Manage your server's basic information",
        nameLabel: 'Name',
        namePlaceholder: 'Enter server name',
        descriptionLabel: 'Description',
        descriptionPlaceholder: 'Enter server description',
        passwordLabel: 'Password',
        passwordPlaceholder: 'Leave empty for no password',
        logoLabel: 'Logo',
        allowNewUsersLabel: 'Allow New Users',
        allowNewUsersDescription:
          'Allow anyone to register and join your server. If disabled, only users you invite can join.',
        enablePluginsLabel: 'Enable Plugins',
        enablePluginsDescription:
          'Enable or disable plugins for your server.',
        toasts: {
          logoRemovedSuccess: 'Logo removed successfully!',
          logoRemovedError: 'Could not remove logo. Please try again.',
          logoUploadError: 'Could not upload file. Please try again.',
          logoUpdatedSuccess: 'Logo updated successfully!',
          logoUpdatedError: 'Could not update logo. Please try again.'
        }
      },
      invites: {
        title: 'Server Invites',
        description: 'Manage invitation links for users to join the server',
        createInvite: 'Create Invite',
        searchPlaceholder: 'Search invites by code or creator...',
        emptyMessage: 'No invites found',
        columns: {
          code: 'Code',
          creator: 'Creator',
          uses: 'Uses',
          expires: 'Expires',
          created: 'Created',
          status: 'Status',
          actions: 'Actions'
        },
        never: 'Never',
        expired: 'Expired',
        maxUses: 'Max Uses',
        active: 'Active',
        copyInviteLink: 'Copy Invite Link',
        deleteTitle: 'Delete Invite',
        deleteMessage:
          'Are you sure you want to delete this invite? This action cannot be undone.',
        deleteConfirm: 'Delete',
        toasts: {
          copied: 'Invite code copied to clipboard',
          deleted: 'Invite deleted',
          deleteFailed: 'Failed to delete invite'
        }
      },
      users: {
        title: 'Users',
        description: 'Manage server users and their permissions',
        emptyMessage: 'No users found',
        moderateUser: 'Moderate User',
        columns: {
          avatar: 'Avatar',
          user: 'User',
          roles: 'Roles',
          joinedAt: 'Joined At',
          lastJoin: 'Last Join',
          status: 'Status',
          actions: 'Actions'
        }
      },
      roles: {
        title: 'Roles',
        emptySelection: 'Select a role to edit or create a new one'
      },
      plugins: {
        title: 'Plugins',
        description:
          'Manage installed plugins and extend your Sharkord server with additional features and functionality.',
        refresh: 'Refresh',
        logs: 'Logs',
        commands: 'Commands',
        settings: 'Settings',
        error: 'Error',
        enabled: 'Enabled',
        disabled: 'Disabled',
        noPluginsTitle: 'No plugins installed',
        noPluginsDescription:
          'Install plugins to add new features and extend the functionality of your Sharkord server.',
        disabledTitle: 'Plugins are disabled',
        disabledDescription:
          'Plugins have been disabled for this server. Enable plugins in the server settings to manage and use plugins.',
        toasts: {
          refreshed: 'Plugins list refreshed',
          refreshFailed: 'Failed to refresh plugins list',
          toggled: 'Plugin {{status}} successfully',
          toggleFailed: 'Failed to toggle plugin'
        }
      },
      storage: {
        title: 'Storage',
        description:
          "Manage your server's storage settings. Control how data is stored, accessed, and managed. Here you can configure storage limits, backup options, and data retention policies to ensure optimal performance and reliability.",
        allowUploadsLabel: 'Allow uploads',
        allowUploadsDescription:
          "Allows users to upload files to the server. Existing files won't be affected.",
        quotaLabel: 'Quota',
        quotaDescription:
          'The total amount of storage space allocated to the server.',
        quotaHelp:
          'This is not a hard limit, meaning that files will still be written to disk temporarily even if the quota is exceeded. The overflow action will be applied after the upload is complete. Make sure you have more disk space available than the quota you set here.',
        maxFileSizeLabel: 'Max file size',
        maxFileSizeDescription:
          'The maximum size of a single file that can be uploaded to the server.',
        quotaPerUserLabel: 'Quota per user',
        quotaPerUserDescription:
          'The maximum amount of storage space each user can use on the server. You can also configure quotas on a per-role basis in the Roles settings, which will override this global setting for users with that specific role. Use 0 for unlimited',
        overflowActionLabel: 'Overflow action',
        overflowActionDescription:
          'Action to take when the global storage quota is exceeded.',
        overflowActionPlaceholder: 'Select the polling interval',
        metrics: {
          totalDiskSpace: 'Total Disk Space',
          availableSpace: 'Available Space',
          systemUsed: 'System Used',
          sharkordUsed: 'Sharkord Used',
          diskUsage: 'Disk Usage',
          used: 'used'
        }
      },
      emojis: {
        title: 'Emojis',
        searchPlaceholder: 'Search emojis...',
        emptySearch: 'No emojis found',
        emptyList: 'No custom emojis yet',
        emptyListHint:
          'Server admins can upload custom emojis in server settings',
        uploadTitle: 'Upload Custom Emojis',
        uploadDescription:
          'Select an emoji to edit or upload new ones to customize your server',
        uploadButton: 'Upload Emoji',
        editTitle: 'Edit Emoji',
        deleteTitle: 'Delete Emoji',
        deleteMessage:
          'Are you sure you want to delete this emoji? This action cannot be undone.',
        deleteConfirm: 'Delete',
        uploadedBy: 'Uploaded by {{user}}',
        nameLabel: 'Name',
        namePlaceholder: 'Enter emoji name (no spaces or special characters)',
        usageHint: 'This will be used as :{{name}}: in messages',
        toasts: {
          created: 'Emoji created',
          uploadFailed: 'Failed to upload emoji',
          deleted: 'Emoji deleted',
          deleteFailed: 'Failed to delete emoji',
          updated: 'Emoji updated'
        }
      },
      updates: {
        title: 'Updates',
        description:
          'Check for and install updates to keep your Sharkord server running with the latest features and security improvements.',
        currentVersion: 'Current Version',
        latestVersion: 'Latest Version',
        unknown: 'Unknown',
        notSupportedTitle: 'Updates Not Supported',
        notSupportedDescription:
          'Automatic updates are not supported in this environment. Please refer to the documentation for manual update instructions.',
        availableTitle: 'Update Available',
        availableDescription:
          'A new version ({{version}}) is available for download. Updating will restart the server and may cause temporary downtime.',
        upToDateTitle: 'Up to Date',
        upToDateDescription:
          'Your server is running the latest version of Sharkord.',
        updateServer: 'Update Server',
        noUpdates: 'No Updates Available'
      }
    },
    disconnected: {
      title: 'Disconnected',
      kickedTitle: 'You have been kicked',
      bannedTitle: 'You have been banned',
      noReasonProvided: 'No reason provided.',
      connectionLostTitle: 'Connection lost',
      connectionLostMessage: 'Lost connection to the server unexpectedly.',
      goToConnectButton: 'Go to Connect Screen',
      details: 'Details',
      codeLabel: 'Code',
      timeLabel: 'Time'
    }
  } as const;

export { en };

