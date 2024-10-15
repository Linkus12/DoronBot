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

console.log(`ZE TOKEN!! TOKEN: ${TOKEN}`);
console.log(`ZE CLIENT!! CLIENT_ID: ${CLIENT_ID}`);

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

function playerAudio(channel, full = false) {
    if (Debounce) {
        return;
    }
    Debounce = true; // Set debounce here when audio starts playing

    if (!channel) {
        console.error('Channel is undefined, unable to join or play audio');
        return;
    }

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
            audioResource = createAudioResource(getRandomAudioFile()); // Get a random audio file
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

        // Handle disconnections explicitly
        connection.on('disconnect', () => {
            console.log('Bot was disconnected from the channel');
            audioPlayer = null; // Reset the audio player
            Debounce = false;   // Reset debounce
            client.user.setPresence({
                status: 'idle',
                activities: [{
                    name: 'For Doron...',
                    type: ActivityType.Watching,
                }]
            });
        });

        // Listen for the audio player becoming idle and disconnect after audio is finished
        audioPlayer.on(AudioPlayerStatus.Idle, () => {
            const currentConnection = getVoiceConnection(channel.guild.id);
            if (currentConnection) {
                currentConnection.destroy(); // Destroy the connection
                client.user.setPresence({
                    status: 'idle',
                    activities: [{
                        name: 'For Doron...',
                        type: ActivityType.Watching,
                    }]
                });
                Debounce = false; // Reset debounce here after playback ends
            }

            // Reset the audio player and resource for future use
            audioPlayer = null;
            audioResource = null;
        });
    } else {
        // If the player is already active, switch channels or reconnect
        const connection = getVoiceConnection(channel.guild.id);
        if (!connection) {
            const newConnection = joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
            });
            newConnection.subscribe(audioPlayer);
        }
    }
}





// function joinAndPlaySound(channel) {
// 	try {

// 		const connection = joinVoiceChannel({
// 			channelId: channel.id,
// 			guildId: channel.guild.id,
// 			adapterCreator: channel.guild.voiceAdapterCreator,

// 		});
		
// 		playerAudio(channel);
// 	// 	const player = createAudioPlayer();
// 	// 	const resource = createAudioResource('DORON.mp3');

// 	// 	player.play(resource);
// 	// 	connection.subscribe(player);

// 	// 	player.on(AudioPlayerStatus.Idle, () => {

// 	// 		connection.destroy();

// 	// 	});

// 	} catch (error) {
// 		console.error('Error joining and playing sound:', error);
// 	}
// }

function timeOut(newState) {
	setTimeout(() => {
		playerAudio(newState.channel, false)
	}, 500);
};

function handleVoiceStateUpdate(oldState, newState) {
    // Detect if the user (DoronID) is moving or leaving channels
    if (newState.member.id === DoronID) {
        if (!oldState.channel && newState.channel) {
            timeOut(newState);
        } else if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
            timeOut(newState);
        } else if (!newState.channel) {
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
            Debounce = false; // Reset Debounce when Doron leaves
        }
    }

    // Check if the bot itself was disconnected from the voice channel
    if (oldState.member.id === client.user.id && !newState.channel) {
        console.log(`Bot was disconnected from ${oldState.channel ? oldState.channel.name : 'the voice channel'}`);
        
        // Reset bot state if disconnected
        const connection = getVoiceConnection(oldState.guild.id);
        if (connection) connection.destroy();

        audioPlayer = null; // Reset audio player
        Debounce = false;   // Reset debounce

        client.user.setPresence({
            status: 'idle',
            activities: [{
                name: 'For Doron...',
                type: ActivityType.Watching,
            }]
        });
    }
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
