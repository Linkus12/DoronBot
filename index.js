// DOROONNN I NEED THE SHOKO MOCKO DORONNNNN (Made with love by GorillaGoVroom and BakaDolev <3) .
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
const DoronID = '317621199880585216'

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

// async function handleVoiceStateUpdate(oldState, newState) {
//     // Check if the Doron user joined or left a channel
//     if (newState.member.id === DoronID) {
//         if (!oldState.channel && newState.channel) {
//             // Doron joined a voice channel
//             timeOut(newState);
//         } else if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
//             // Doron switched channels
//             timeOut(newState);
//         } else if (!newState.channel) {
//             // Doron left the channel
//             const connection = getVoiceConnection(oldState.guild.id);
//             if (connection) connection.destroy();
//             audioPlayer = null;
//             client.user.setPresence({
//                 status: 'idle',
//                 activities: [{
//                     name: 'For Doron...',
//                     type: ActivityType.Watching,
//                 }]
//             });
//             Debounce = false;
//         }
//     }

//     // Check if the bot itself was disconnected from the voice channel
//     if (oldState.member.id === client.user.id && !newState.channel) {
//         console.log(`Bot was disconnected from ${oldState.channel.name}`);

//         const connection = getVoiceConnection(oldState.guild.id);

//         // Check if Doron is still in the channel and if audio is playing
//         const doronInOldChannel = oldState.channel?.members.has(DoronID);
//         const audioStillPlaying = audioPlayer?.state?.status !== AudioPlayerStatus.Idle;

//         if (doronInOldChannel && audioStillPlaying) {
//             // Rejoin if Doron disconnected the bot and audio is still playing
//             console.log('Rejoining because Doron disconnected the bot and audio is playing...');
//             setTimeout(() => {
//                 const newConnection = joinVoiceChannel({
//                     channelId: oldState.channel.id,
//                     guildId: oldState.guild.id,
//                     adapterCreator: oldState.guild.voiceAdapterCreator,
//                 });

//                 const subscription = newConnection.subscribe(audioPlayer);
//                 if (subscription) {
//                     console.log(`Successfully resubscribed to audio player in ${oldState.channel.name}`);
//                 } else {
//                     console.log('Subscription failed');
//                 }

//                 client.user.setPresence({
//                     status: 'online',
//                     activities: [{
//                         name: 'Thirsting for Doron rn',
//                         type: ActivityType.Custom,
//                     }]
//                 });
//             }, 500);
//         } else {
//             // Stop the bot if someone else disconnected it or the audio has finished playing
//             console.log('Stopping the bot as someone else disconnected it or audio has finished.');
//             if (connection) {
//                 connection.destroy();
//                 console.log('Connection destroyed.');
//             }
//             audioPlayer = null;
//             client.user.setPresence({
//                 status: 'idle',
//                 activities: [{
//                     name: 'For Doron...',
//                     type: ActivityType.Watching,
//                 }]
//             });
//         }
//     }
// }

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let isSwitchingChannels = false
async function handleVoiceStateUpdate(oldState, newState) {
    await delay(1000);  // Small delay to avoid premature disconnections

    if (oldState.id !== client.user.id) return;
    if (isSwitchingChannels) return;

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
            isSwitchingChannels = true;  // Set the flag to prevent further updates

            try {
                // Move the bot to the new voice channel
                console.log(`Moving bot to ${newChannel.name}`);
                await client.voice.move({
                    channelId: newChannel.id,
                    guildId: oldState.guild.id,
                    adapterCreator: newChannel.guild.voiceAdapterCreator,
                });

                // Resubscribe to audio player after moving
                if (audioPlayer) {
                    const connection = getVoiceConnection(oldState.guild.id);
                    const subscription = connection.subscribe(audioPlayer);
                    if (subscription) {
                        console.log(`Successfully resubscribed to audio player in ${newChannel.name}`);
                    } else {
                        console.log('Subscription failed');
                    }
                } else {
                    console.log('Audio player is null, cannot resubscribe.');
                }

                client.user.setPresence({
                    status: 'online',
                    activities: [{
                        name: 'Thirsting for Doron rn',
                        type: ActivityType.Custom,
                    }]
                });

                isSwitchingChannels = false;  // Reset the flag after handling the switch
            } catch (error) {
                console.error(`Failed to move bot to ${newChannel.name}: ${error}`);
            }
        } else if (!newChannel) {
            // Doron left the voice channel entirely
            console.log(`Doron left the voice channel`);
            const connection = getVoiceConnection(oldState.guild.id);
            if (connection) {
                console.log(`Destroying connection to ${oldChannel.name}`);
                connection.destroy();
            }
            audioPlayer = null;
            client.user.setPresence({
                status: 'idle',
                activities: [{
                    name: 'For Doron...',
                    type: ActivityType.Watching,
                }]
            });
        }
    }

    // Handle bot disconnection logic
    if (oldState.member.id === client.user.id && !newState.channel) {
        if (oldState.channel) {
            console.log(`Bot was disconnected from ${oldState.channel.name}`);
        } else {
            console.log('Bot was disconnected from a channel.');
        }

        const connection = getVoiceConnection(oldState.guild.id);
        const doronInOldChannel = oldState.channel?.members.has(DoronID);
        const audioStillPlaying = audioPlayer?.state?.status !== AudioPlayerStatus.Idle;

        if (doronInOldChannel && audioStillPlaying) {
            // Rejoin if Doron disconnected the bot and audio is still playing
            console.log('Rejoining because Doron disconnected the bot and audio is playing...');
            
            if (Debounce2) {
                console.log('Debounce is active, skipping audio playback.');
                return;
            }

            Debounce2 = true;

            setTimeout(() => {
                try {
                    console.log(`Attempting to rejoin ${oldState.channel.name}`);
                    const newConnection = joinVoiceChannel({
                        channelId: oldState.channel.id,
                        guildId: oldState.guild.id,
                        adapterCreator: oldState.guild.voiceAdapterCreator,
                    });

                    if (audioPlayer) {
                        const subscription = newConnection.subscribe(audioPlayer);
                        if (subscription) {
                            console.log(`Successfully resubscribed to audio player in ${oldState.channel.name}`);
                        } else {
                            console.log('Subscription failed');
                        }
                    } else {
                        console.log('Audio player is null, cannot resubscribe.');
                        newConnection.destroy();
                    }

                    client.user.setPresence({
                        status: 'online',
                        activities: [{
                            name: 'Thirsting for Doron rn',
                            type: ActivityType.Custom,
                        }]
                    });
                } catch (error) {
                    console.error(`Failed to rejoin voice channel: ${error}`);
                }
            }, TimeoutDuration);
        } else {
            // If someone else disconnected the bot or audio has finished
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

        setTimeout(() => Debounce2 = false, TimeoutDuration);
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
