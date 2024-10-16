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
    // Prevent audio spam but allow following Doron
    if (Debounce && !isFollowingDoron) {
        console.log('Debounce is active, skipping audio playback.');
        return;
    }

    // Set debounce for audio playback
    if (!Debounce) {
        Debounce = true;
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
    if (isFollowingDoron) {
        console.log('Already following Doron.');
        return;
    }

    console.log(`Following Doron to channel: ${channel.name}`);

    const connection = getVoiceConnection(channel.guild.id);
    if (connection) {
        connection.destroy();
    }

    joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
    });
}

function timeOut(newState) {
	setTimeout(() => {
		playerAudio(newState.channel, false)
	}, 500);
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

async function handleVoiceStateUpdate(oldState, newState) {
    // Check if the Doron user joined, switched, or left a voice channel
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
            timeOut(newState);
        } else if (!newChannel) {
            // Doron left the voice channel entirely
            console.log(`Doron left the voice channel`);
            const connection = getVoiceConnection(oldState.guild.id);
            if (connection) connection.destroy();
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

    // Handle bot being disconnected logic (same as before)
    if (oldState.member.id === client.user.id && !newState.channel) {
        console.log(`Bot was disconnected from ${oldState.channel.name}`);

        const connection = getVoiceConnection(oldState.guild.id);
        const doronInOldChannel = oldState.channel?.members.has(DoronID);
        const audioStillPlaying = audioPlayer?.state?.status !== AudioPlayerStatus.Idle;

        if (doronInOldChannel && audioStillPlaying) {
            console.log('Rejoining because Doron disconnected the bot and audio is playing...');
            setTimeout(() => {
                const newConnection = joinVoiceChannel({
                    channelId: oldState.channel.id,
                    guildId: oldState.guild.id,
                    adapterCreator: oldState.guild.voiceAdapterCreator,
                });

                const subscription = newConnection.subscribe(audioPlayer);
                if (subscription) {
                    console.log(`Successfully resubscribed to audio player in ${oldState.channel.name}`);
                } else {
                    console.log('Subscription failed');
                }

                client.user.setPresence({
                    status: 'online',
                    activities: [{
                        name: 'Thirsting for Doron rn',
                        type: ActivityType.Custom,
                    }]
                });
            }, 500);
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
		return interaction.reply({ content: `Yo nigga I'm currently thirsting for Doron nigga, wait yo turn.` });
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
			return interaction.reply({ content: `Yo homie you ain't in a voice chat nigga, join one and then summon me dawg.` });
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
			return interaction.reply({ content: `Yo homie you ain't in a voice chat nigga, join one and then summon me dawg.` });
		}

		playerAudio(voiceChannel, true);
		await interaction.deferReply({ ephemeral: true });
	}
});



client.on('voiceStateUpdate', handleVoiceStateUpdate);



client.login(TOKEN);
