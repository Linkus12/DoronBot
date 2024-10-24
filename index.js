// DOROONNN I NEED THE SHOKO MOCKO DORONNNNN (Made with love by GorillaGoVroom and BakaDolev <3).
// require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, ChannelType } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, getVoiceConnection } = require('@discordjs/voice');

const fs = require('fs');
const path = require('path');

const { ActivityType } = require('discord.js');
const { File } = require('buffer');

const { TOKEN } = process.env;

let CLIENT_ID;

const TimeoutDuration = 500

const audioDirectory = "./Audio_Files" //The MP3 audio directory

let latestAudioFile = null;

let Debounce = false;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
    ]
});

// const DoronID = '435868622825586688'
const DoronID = '435868622825586688'

const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path || require('ffmpeg-static');

const commands = [
    new SlashCommandBuilder()
        .setName('summon')
        .setDescription('Summon me for Doron ;))')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Choose the channel to summon me in (optional)')
                .setRequired(false)
                .addChannelTypes(ChannelType.GuildVoice)),
    new SlashCommandBuilder()
        .setName('summonfull')
        .setDescription("Summon me for Doron le full ;))")
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Choose the channel to summon me in (optional)')
                .setRequired(false)
                .addChannelTypes(ChannelType.GuildVoice)),
].map(command => command.toJSON());

const GUILD_ID = "1022540810589319168";

const registerSpecificCommand = async (commands) => {
    const rest = new REST({ version: '9' }).setToken(TOKEN);
    try {
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    } catch (err) {
        console.error(err);
    }
};

const registerCommand = async (commands) => {
    const rest = new REST({ version: '9' }).setToken(TOKEN);
    try {
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    } catch (err) {
        console.error(err);
    }
};

client.once('ready', async () => {

    client.user.setPresence({
        status: 'idle',
        activities: [{
            name: 'For Doron...',
            type: ActivityType.Watching,
            //state: 'For The Hour...',
        }]
    });

    CLIENT_ID = `${client.user.id}`;

    await registerSpecificCommand(commands);
    registerCommand(commands);
    console.log('Doron is ready ;) ...');

});

function getRandomAudioFile() { // Gets a random audio file from the audio directory
    const files = fs.readdirSync(audioDirectory).filter(file => file.endsWith('.mp3'));
    // If only one file is present, return it
    if (files.length === 1) {
        return path.join(audioDirectory, files[0]);
    }

    let randomIndex;
    let selectedFile;

    // Keep picking a random file until it's different from the last one
    do {
        randomIndex = Math.floor(Math.random() * files.length);
        selectedFile = path.join(audioDirectory, files[randomIndex]);
    } while (selectedFile === latestAudioFile);

    // Update the latest audio file to the new one
    latestAudioFile = selectedFile;

    return selectedFile;
}

let audioPlayer;
let audioResource;

let isFollowingDoron = false;

function playerAudio(channel, full = false) {

    // Set Debounce for audio playback
    if (!Debounce) {
        Debounce = true;
    } else {
        followDoron(channel)
        return;
    }

    if (!channel) {
        console.error('Channel is undefined, unable to join or play audio');
        return;
    }

    // Set presence to indicate the bot is active
    client.user.setPresence({
        status: 'online',
        activities: [{
            name: 'Thirsting for Doron rn',
            type: ActivityType.Custom,
        }]
    });

    if (!audioPlayer) {
        audioPlayer = createAudioPlayer();

        let audioResource;
        if (full) {
            audioResource = createAudioResource('./Audio_Files/DORON.mp3');
        } else {
            audioResource = createAudioResource(getRandomAudioFile());
        }

        if (!audioResource) {
            console.error('Failed to create audio resource, unable to join or play audio');
            return;
        }

        audioPlayer.play(audioResource);

        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });

        connection.subscribe(audioPlayer);

        // Handle when audio finishes
        audioPlayer.on(AudioPlayerStatus.Idle, () => {
            console.log('Audio finished. Destroying connection and resetting presence.');
            const currentConnection = getVoiceConnection(channel.guild.id);
            if (currentConnection) {
                currentConnection.destroy();
                resetPresence();
                Debounce = false;
            }

            audioPlayer = null;
        });
    } else {
        // If audio player is already active, just follow Doron
        followDoron(channel);
    }
}

function followDoron(channel) {
    const connection = getVoiceConnection(channel.guild.id);
    isFollowingDoron = true;
    // Check if there's an existing connection
    if (connection) {
        // Check if the bot is already in the desired channel
        if (connection.channel && connection.channel.id === channel.id) {
            console.log(`Already in ${channel.name}, skipping...`);
            return;
        } else {
            console.log(`Switching from ${connection.channel ? connection.channel.name : 'unknown'} to ${channel.name}`);
            connection.destroy();
        }
    }

    // Join the new voice channel
    joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
    });
    setTimeout(() => {
        isFollowingDoron = false;
    }, 1000);
}

function timeOut(newState) {
    setTimeout(() => {
        playerAudio(newState.channel, false)
    }, TimeoutDuration);
};


function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let isSwitchingChannels = false
async function handleVoiceStateUpdate(oldState, newState) {
    await delay(1000);

    // Check if Doron joined, switched, or left a voice channel
    if (newState.member.id === DoronID) {
        const oldChannel = oldState.channel;
        const newChannel = newState.channel;

        if (!oldChannel && newChannel) {
            // Doron joined a new voice channel
            console.log(`Doron joined ${newChannel.name}`);
            timeOut(newState);
        } else if (oldChannel && newChannel && oldChannel.id !== newChannel.id) {
            // Doron switched voice channels
            console.log(`Doron switched from ${oldChannel.name} to ${newChannel.name}`);

            // Move the bot to the new channel
            const botMember = oldState.guild.members.cache.get(client.user.id);
            let newConnection = await moveBotToChannel(botMember, newChannel);

            if (!playerAudio) {
                playerAudio(oldState.channel.id, false);
            }

            client.user.setPresence({
                status: 'online',
                activities: [{
                    name: 'Thirsting for Doron rn',
                    type: ActivityType.Custom,
                }]
            });
        } else if (!newChannel) {
            // Doron left all voice channels
            console.log(`Doron left the voice channel`);

            // Check if the bot was in the same channel as Doron
            const connection = getVoiceConnection(oldState.guild.id);
            const botInSameChannelAsDoron = oldState.channel?.members.has(client.user.id);

            if (connection && botInSameChannelAsDoron) {
                console.log(`Bot is leaving because it was in the same channel as Doron`);
                connection.destroy();
                audioPlayer = null;

                client.user.setPresence({
                    status: 'idle',
                    activities: [{
                        name: 'For Doron...',
                        type: ActivityType.Watching,
                    }]
                });
                Debounce = false;
            }
        }
    }

    // Handle bot being disconnected logic
    if (oldState.member.id === client.user.id && !newState.channel) {
        console.log(`Bot was disconnected from ${oldState.channel.name}`);

        const connection = getVoiceConnection(oldState.guild.id);
        const doronInOldChannel = oldState.channel?.members.has(DoronID);
        const audioStillPlaying = audioPlayer?.state?.status !== AudioPlayerStatus.Idle;

        if (doronInOldChannel && audioStillPlaying) {
            console.log('Rejoining because Doron disconnected the bot and audio is playing...');

            // Bypass Debounce check for Doron
            if (Debounce) {
                console.log('Debounce is active, skipping audio playback.');
                return;
            }

            Debounce = true; // Apply Debounce for others, but allow Doron to rejoin.

            setTimeout(() => {
                const connectionStillActive = audioPlayer?.state?.status !== AudioPlayerStatus.Idle;
                if (!connectionStillActive) {
                    console.log('Audio finished, bot will not rejoin.');
                    return; // Don't rejoin if the audio is no longer playing
                }

                const newConnection = joinVoiceChannel({
                    channelId: oldState.channel.id,
                    guildId: oldState.guild.id,
                    adapterCreator: oldState.guild.voiceAdapterCreator,
                });

                if (!newConnection) {
                    setTimeout(() => Debounce = false, TimeoutDuration);
                    return;
                }

                if (!playerAudio) {
                    playerAudio(oldState.channel.id, false);
                }

                client.user.setPresence({
                    status: 'online',
                    activities: [{
                        name: 'Thirsting for Doron rn',
                        type: ActivityType.Custom,
                    }]
                });
            }, TimeoutDuration);
        } else {
            console.log('Stopping the bot as someone else disconnected it or audio has finished.');
            if (connection) connection.destroy();
            audioPlayer = null;
            client.user.setPresence({
                status: 'idle',
                activities: [{
                    name: 'For Doron...',
                    type: ActivityType.Watching,
                }]
            });
        }

        // Reset Debounce after a delay to allow future actions
        setTimeout(() => Debounce = false, TimeoutDuration);
    }
}


// Function to move the bot to a specified channel (Only if it has move perms)
// async function moveBotToChannel(channel) {
//     try {
//         // Get the guild member object for the bot
//         const botMember = await channel.guild.members.fetch(client.user.id);

//         // Move the bot to the specified channel
//         await botMember.voice.setChannel(channel);
//         console.log(`Moved bot to ${channel.name}`);

//         // If an audio player exists, subscribe to it
//         if (audioPlayer) {
//             const connection = getVoiceConnection(channel.guild.id);
//             const subscription = connection.subscribe(audioPlayer);
//             if (subscription) {
//                 console.log(`Successfully resubscribed to audio player in ${channel.name}`);
//             } else {
//                 console.log('Subscription failed');
//             }
//         } else {
//             console.log('Audio player is null, cannot subscribe.');
//         }

//         // Update bot presence
//         updateBotPresence('Thirsting for Doron rn');
//     } catch (error) {
//         console.error(`Error moving bot to channel ${channel.name}: ${error}`);
//     }
// }

async function moveBotToChannel(botMember, newChannel) {
    const oldChannel = botMember.voice.channel;
    if (!oldChannel || oldChannel.id === newChannel.id) return;

    try {
        // Join the new channel
        const newConnection = joinVoiceChannel({
            channelId: newChannel.id,
            guildId: oldChannel.guild.id,
            adapterCreator: oldChannel.guild.voiceAdapterCreator,
        });

        return newConnection;

        // Optionally, handle audio subscription
        // if (audioPlayer) {
        //     const subscription = newConnection.subscribe(audioPlayer);
        //     if (subscription) {
        //         console.log(`Successfully resubscribed to audio player in ${newChannel.name}`);
        //     } else {
        //         console.log('Subscription failed, destroying connection.');
        //         newConnection.destroy();  // Destroy if subscription fails
        //     }
        // }

        console.log(`Bot successfully switched to ${newChannel.name}`);
    } catch (error) {
        console.error('Error switching voice channel:', error);
    }
}





function resetPresence() {
    client.user.setPresence({
        status: 'idle',
        activities: [{
            name: 'For Doron...',
            type: ActivityType.Watching,
        }]
    });
}














client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (Debounce) {
        return interaction.reply({ content: `Yo nigga I'm currently thirsting for Doron nigga, wait yo turn.`, ephemeral: true });
    }

    if (commandName === 'summon') {
        const invokingMember = interaction.member;
        const selectedChannel = interaction.options.getChannel('channel');

        let voiceChannel;

        if (selectedChannel && selectedChannel.isVoiceBased()) {
            voiceChannel = selectedChannel;
        } else if (invokingMember.voice.channel) {
            voiceChannel = invokingMember.voice.channel;
        } else {
            return interaction.reply({ content: `Yo homie you ain't in a voice chat nigga, join one and then summon me dawg.`, ephemeral: true });
        }

        playerAudio(voiceChannel, false);
        await interaction.deferReply({ ephemeral: true });
    } else if (commandName === 'summonfull') {
        const invokingMember = interaction.member;
        const selectedChannel = interaction.options.getChannel('channel');

        let voiceChannel;

        if (selectedChannel && selectedChannel.isVoiceBased()) {
            voiceChannel = selectedChannel;
        } else if (invokingMember.voice.channel) {
            voiceChannel = invokingMember.voice.channel;
        } else {
            return interaction.reply({ content: `Yo homie you ain't in a voice chat nigga, join one and then summon me dawg.`, ephemeral: true });
        }

        playerAudio(voiceChannel, true);
        await interaction.deferReply({ ephemeral: true });
    }
});



client.on('voiceStateUpdate', handleVoiceStateUpdate);



client.login(TOKEN);
