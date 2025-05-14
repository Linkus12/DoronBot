// DOROONNN I NEED THE SHOKO MOCKO DORONNNNN (Made with love by GorillaGoVroom and BakaDolev <3).
// require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, ChannelType } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, getVoiceConnection } = require('@discordjs/voice');


const fs = require('fs');
const path = require('path');

const { ActivityType } = require('discord.js');

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

// const DoronID = '317621199880585216' //GorillaGoVroom ID
const DoronID = '435868622825586688' //Doron ID

const voiceStates = new Map();
const lastVoiceChannelMap = new Map();
const botLeftOnPurposeMap = new Map();

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

    setBotPresence("idle");

    CLIENT_ID = `${client.user.id}`;

    await registerSpecificCommand(commands);
    registerCommand(commands);
    console.log('Doron is ready ;) ...');

    // Fetch Doron object
    const Doron = await client.users.fetch(DoronID);

    // Iterate through all guilds the bot is in
    for (const guild of client.guilds.cache.values()) {
        try {
            // Fetch the member from the guild
            const member = await guild.members.fetch(DoronID);

            // Check if Doron is already in a voice channel
            if (member.voice.channel) {
                console.log(`Doron is in a voice channel in guild: ${guild.name}, joining...`);
                await safeJoinVoiceChannel(member.voice.channel);  // Join Doron’s channel
                return; // Exit after joining the first voice channel found
            } else {
                console.log(`Doron is not in a voice channel in guild: ${guild.name}.`);
            }
        } catch (error) {
            console.error(`Could not fetch member in guild: ${guild.name}.`, error);
        }
    }

    console.log('Doron is not in any voice channel in any guild.');

});

function setBotPresence(mode) {
    const config = {
        idle: {
            status: 'idle',
            activities: [{ name: 'For Doron...', type: ActivityType.Watching }]
        },
        active: {
            status: 'online',
            activities: [{ name: 'Thirsting for Doron rn', type: ActivityType.Custom }]
        }
    };
    client.user.setPresence(config[mode]);
}


let lastAudioResource = null;

function getRandomAudioFile() {
    const files = fs.readdirSync(audioDirectory).filter(file => file.endsWith('.mp3'));

    if (files.length === 0) {
        console.warn('No .mp3 files found in audio directory.');
        return null;
    }

    // If only one file exists, return it regardless of lastAudioResource
    if (files.length === 1) {
        lastAudioResource = path.join(audioDirectory, files[0]);
        return lastAudioResource;
    }

    let selectedFile;

    // Keep selecting until we get a different file than the last one
    do {
        const randomIndex = Math.floor(Math.random() * files.length);
        selectedFile = path.join(audioDirectory, files[randomIndex]);
    } while (selectedFile === lastAudioResource && files.length > 1);

    lastAudioResource = selectedFile;
    return selectedFile;
}
let audioPlayer;


async function playerAudio(channel, full = false) {
    if (!channel) {
        console.error("Channel is undefined, unable to join or play audio");
        return;
    }

    //Debouce so audio isn't spammed
    if (Debounce) return;
    Debounce = true;
    setTimeout(() => Debounce = false, TimeoutDuration);

    //Set bot to online
    setBotPresence("active");

    //Create or reuse audio player
    if (!audioPlayer) {
        audioPlayer = createAudioPlayer(); //Create the audio player.
        audioPlayer.on(AudioPlayerStatus.Idle, () => {
            const connection = getVoiceConnection(channel.guild.id);
            if (connection) {
                connection.destroy();
                resetPresence();
                Debounce = false;
            }
            audioPlayer = null;
        });

        audioPlayer.on('error', error => {
            console.error('Audio Player Error:', error.message);
            audioPlayer = null;
        });
    }

    const audioFile = full ? './Audio_Files/DORON.mp3' : getRandomAudioFile();
    const resource = createAudioResource(audioFile);
    if (!resource) {
        console.error('Audio resource creation failed.');
        return;
    }

    try {

        //Subscribe player
        const connection = getVoiceConnection(channel.guild.id);
        if (connection) connection.subscribe(audioPlayer);
        //Play sound
        audioPlayer.play(resource);
    } catch (err) {
        console.error('Failed to play audio', err.message);
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function handleVoiceStateUpdate(oldState, newState) {
    //Only track Doron
    const wasInChannel = oldState.channelId;
    const isNowInChannel = newState.channelId;

    const isBot = newState.id === client.user.id;

    const guild = newState.guild;
    const guildId = guild.id;
    const newChannel = newState.channel;
    const oldChannel = oldState.channel;

    const state = voiceStates.get(guildId) || { isJoining: false };

    if (isBot) {
        // Someone disconnected the bot
    if (wasInChannel && !isNowInChannel) {
        const leftOnPurpose = botLeftOnPurposeMap.get(guildId);
        if (leftOnPurpose) {
            botLeftOnPurposeMap.set(guildId, false);
            return;
        }

        await safeJoinVoiceChannel(lastVoiceChannelMap.get(guildId));

        console.log("Bot was disconnected from a voice channel by someone");
    }
    }


    if (newState.id !== DoronID) return; //After finishing tracking the bot, track Doron

    // Doron LEFT VC
    if (!newChannel) {
        const connection = getVoiceConnection(guildId);
        if (connection) connection.destroy();
        voiceStates.delete(guildId);
        return;
    }

    // Doron JOINED or SWITCHED VC
    if (newChannel && newChannel !== oldChannel) {
        if (state.isJoining) return;

        try {
            await safeJoinVoiceChannel(newChannel);
        } catch(err) {
            console.warn(`Voice join failed: ${err.message}`);
        }
    }
}

function resetPresence() {
    setBotPresence("idle");
}


async function waitForBotToJoinVoiceChannel(guildId, timeoutDuration = 10000) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Timeout: Bot did not join a voice channel in time.'));
        }, timeoutDuration);

        const checkVoiceChannel = () => {
            const guild = client.guilds.cache.get(guildId);
            if (!guild) {
                clearTimeout(timeout);
                reject(new Error('Guild not found.'));
                return;
            }

            const isInVoiceChannel = guild.channels.cache.some(channel =>
                (channel.type === 2 || channel.type === 'GUILD_VOICE') && // type === 2 for voice channels in v14+
                channel.members.has(client.user.id)
            );

            if (isInVoiceChannel) {
                clearTimeout(timeout);
                resolve();
            } else {
                setTimeout(checkVoiceChannel, 1000);
            }
        };

        checkVoiceChannel();
    });
}



async function safeJoinVoiceChannel(voiceChannel, full = false) {

    const guildId = voiceChannel.guild.id;

    // Prevent double join attempts.
    const state = voiceStates.get(guildId) || {};
    if (state.isJoining) {
        throw new Error("Already joining a voice channel");
    }

    if (state.timeout) clearInterval(state.timeout);

    // Mark as joining
    state.isJoining = true;
    voiceStates.set(guildId, state);

    try {
        // Delay 1.5s to handle quick switches
        await delay(1000);

        //Check if Doron is still in the voice channel
        const doronInChannel = voiceChannel.members.has(DoronID);
        if (!doronInChannel) {
            throw new Error("Doron not in voice channel");
        }

        // Disconnect existing conenction (if any)
        const oldConnection = getVoiceConnection(guildId);
        if (oldConnection) {
            oldConnection.destroy();
        }

        // Join the new voice channel
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: guildId,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            selfDeaf: false,
        });

        //Save connection
        state.connection = connection;
        voiceStates.set(guildId, state);
        lastVoiceChannelMap.set(guildId, voiceChannel);
        await waitForBotToJoinVoiceChannel(guildId);

        botLeftOnPurposeMap.set(voiceChannel, false);

        // Play Audio
        await playerAudio(voiceChannel, full);
        botLeftOnPurposeMap.set(voiceChannel, true);
    } finally {
        //Unlock
        state.isJoining = false;
        voiceStates.set(guildId, state);
    }

}

function resolveVoiceChannel(interaction) {
    const selectedChannel = interaction.options.getChannel('channel');
    const invokingMember = interaction.member;

    if (selectedChannel && selectedChannel.isVoiceBased()) {
        return selectedChannel;
    }

    if (invokingMember.voice.channel) {
        return invokingMember.voice.channel;
    }

    return null;
}



client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;
    if (commandName !== 'summon' && commandName !== 'summonfull') return;

    const voiceChannel = resolveVoiceChannel(interaction);
    if (!voiceChannel) {
        return interaction.reply({ content: `Yo homie you ain't in a voice chat nigga, join one and then summon me dawg.`, ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
        await safeJoinVoiceChannel(voiceChannel, commandName === 'summonfull');
    } catch (err) {
        console.error(err);
        return interaction.followUp({ content: `Couldn't join VC, dawg. Maybe I'm already busy or Doron be wildin'.`, ephemeral: true });
    }
});




client.on('voiceStateUpdate', handleVoiceStateUpdate);



client.login(TOKEN);
