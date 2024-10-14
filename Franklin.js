require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, getVoiceConnection } = require('@discordjs/voice');

const { ActivityType } = require('discord.js');

const { TOKEN, CLIENT_ID } = process.env;


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
		.setDescription('Summon me for Doron ;)')
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
	await registerSpecificCommand(commands);
	registerCommand(commands);
	console.log('Doron is ready ;) ...');

});

let audioPlayer;
let audioResource;

function playerAudio(channel) {
	if (!audioPlayer) {
		audioPlayer = createAudioPlayer();
		audioResource = createAudioResource('DORON.mp3');

		audioPlayer.play(audioResource);
		const connection = joinVoiceChannel({
			channelId: channel.id,
			guildId: channel.guild.id,
			adapterCreator: channel.guild.voiceAdapterCreator,
		});

		connection.subscribe(audioPlayer)

		audioPlayer.on(AudioPlayerStatus.Idle, () => {
			audioPlayer.stop();
		});
	} else {
		//If player is playing, switch channels
		const connection = getVoiceConnection(channel.guild.id);
		if (!connection) {
			//If not connected, join a new voice channel
			const newConnection = joinVoiceChannel({
				channelId: channel.id,
				guildId: channel.guild.id,
				adapterCreator: channel.guild.voiceAdapterCreator,
			});
			newConnection.subscribe(audioPlayer)
		}
		//If the player is already playing then do nothing :>
	}
}

function handleVoiceStateUpdate(oldState, newState) {
	if (newState.member.id === DoronID) {
		if (!oldState.channel && newState.channel) {
			timeOut(newState)
		} else if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
			timeOut(newState)
		} else if (!newState.channel) {
			// User left the channel
            const connection = getVoiceConnection(oldState.guild.id);
            if (connection) connection.destroy();
            audioPlayer = null;
		}

	} 
}


	function joinAndPlaySound(channel) {
		try {

			const connection = joinVoiceChannel({
				channelId: channel.id,
				guildId: channel.guild.id,
				adapterCreator: channel.guild.voiceAdapterCreator,

			});

			const player = createAudioPlayer();
			const resource = createAudioResource('DORON.mp3');

			player.play(resource);
			connection.subscribe(player);

			player.on(AudioPlayerStatus.Idle, () => {

				connection.destroy();

			});

		} catch (error) {
			console.error('Error joining and playing sound:', error);
		}
	}
	function timeOut(newState) {
		setTimeout(() => {
			joinAndPlaySound(newState.channel)
		}, 1500);
	};


	client.on('interactionCreate', async interaction => {
		if (!interaction.isCommand()) return;

		const { commandName } = interaction;

		if (commandName === 'summon') {
			const invokingMember = interaction.member;

			if (!invokingMember.voice.channel) {
				return interaction.reply({ content: 'You must be in a voice channel to summon me.' });
			}

			const voiceChannel = invokingMember.voice.channel;
			joinAndPlaySound(voiceChannel);

		}
	});

	client.on('voiceStateUpdate', handleVoiceStateUpdate);



	client.login(TOKEN);
