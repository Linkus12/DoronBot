// DOROONNN I NEED THE SHOKO MOCKO DORONNNNN (Made with love by GorillaGoVroom and BakaDolev <3).
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  ChannelType,
  ActivityType
} = require('discord.js');

const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  getVoiceConnection
} = require('@discordjs/voice');

/* --------------------- Config --------------------- */
const TOKEN = process.env.DISCORD_TOKEN;
if (!TOKEN) {
  console.error('DISCORD_TOKEN not provided in environment.');
  process.exit(1);
}

// Remove GUILD_ID. We don't need it for global bots.
const TARGET_USER_ID = process.env.TARGET_USER_ID; // Read from Docker Env
const audioDirectory = path.resolve(__dirname, './Audio_Files');
const TimeoutDuration = 500; // ms debounce for audio spamming
const DEFAULT_FULL_AUDIO = path.join(audioDirectory, 'DORON.mp3');
/* -------------------------------------------------- */

/* -------------------- State ----------------------- */
// Keep minimal state maps but with actual names I CAN UNDERSTAND GRAHHH
const voiceState = new Map();            // guildId => { isJoining: bool, connection }
const lastVoiceChannel = new Map();      // guildId => VoiceChannel
const botLeftOnPurpose = new Map();      // guildId => bool
let lastAudioPath = null;
let debounce = false;
let audioPlayer = null;

/* ------------------- Discord client -------------- */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers
  ]
});

/* ------------------ Commands ---------------------- */
const commands = [
  new SlashCommandBuilder()
    .setName('summon')
    .setDescription('Summon me for Doron ;))')
    .addChannelOption(opt =>
      opt.setName('channel')
        .setDescription('Choose the channel to summon me in (optional)')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildVoice)
    ),
  new SlashCommandBuilder()
    .setName('summonfull')
    .setDescription("Summon me for Doron le full ;))")
    .addChannelOption(opt =>
      opt.setName('channel')
        .setDescription('Choose the channel to summon me in (optional)')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildVoice)
    )
].map(c => c.toJSON());

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  try {
    console.log('Registering global commands...');
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands }); 
  } catch (err) {
    console.error('Failed to register commands:', err);
  }
}

/* ---------------- Presence helpers ---------------- */
function setBotPresence(mode = 'idle') {
  const presets = {
    idle: { status: 'idle', activities: [{ name: 'For Doron...', type: ActivityType.Watching }] },
    active: { status: 'online', activities: [{ name: 'Thirsting for Doron rn', type: ActivityType.Custom || ActivityType.Playing }] }
  };

  const cfg = presets[mode] || presets.idle;
  try {
    client.user.setPresence(cfg);
  } catch (e) {
    console.warn('Failed to set presence:', e?.message || e);
  }
}

/* ---------------- Audio helpers ------------------- */
function listAudioFiles() {
  try {
    if (!fs.existsSync(audioDirectory)) return [];
    return fs.readdirSync(audioDirectory).filter(f => f.endsWith('.mp3') && f !== 'DORON.mp3');
  } catch (err) {
    console.error('Failed to list audio files:', err);
    return [];
  }
}

function pickRandomAudio() {
  const files = listAudioFiles();
  if (files.length === 0) {
    console.warn('No .mp3 files found in audio directory.');
    return null;
  }
  if (files.length === 1) {
    lastAudioPath = path.join(audioDirectory, files[0]);
    return lastAudioPath;
  }

  let selected;
  do {
    selected = path.join(audioDirectory, files[Math.floor(Math.random() * files.length)]);
  } while (files.length > 1 && selected === lastAudioPath);

  lastAudioPath = selected;
  return selected;
}

function createResourceForFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    console.error('Audio file not found:', filePath);
    return null;
  }
  try {
    // createAudioResource accepts a stream or filename -- use stream to be explicit
    const stream = fs.createReadStream(filePath);
    return createAudioResource(stream, { inlineVolume: false });
  } catch (err) {
    console.error('Failed to create audio resource:', err);
    return null;
  }
}

function ensureAudioPlayer(guildId) {
  if (audioPlayer) return audioPlayer;

  audioPlayer = createAudioPlayer();

  audioPlayer.on(AudioPlayerStatus.Idle, () => {
    try {
      // When done, destroy connection and reset
      const conn = getVoiceConnection(guildId);
      if (conn) {
        botLeftOnPurpose.set(guildId, true);
        conn.destroy();
      }
    } catch (err) {
      console.warn('Error cleaning up after audio idle:', err);
    } finally {
      audioPlayer = null;
      debounce = false;
      setBotPresence('idle');
    }
  });

  audioPlayer.on('error', err => {
    console.error('Audio player error:', err?.message || err);
    audioPlayer = null;
    debounce = false;
    setBotPresence('idle');
  });

  return audioPlayer;
}

/* ------------------ Join & Play ------------------- */
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function waitForJoin(guildId, timeout = 10000) {
  // Wait until connection found OR timeout
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const conn = getVoiceConnection(guildId);
    if (conn) return;
    await sleep(250);
  }
  throw new Error('Timeout waiting for bot to appear in voice channel.');
}

/**
 * Safely join a voice channel and play audio.
 * - If `command` is false, we require Doron to be in that channel; commands override that.
 * - `full` chooses the special DORON.mp3 file.
 */
async function safeJoinVoiceChannel(voiceChannel, full = false, command = false) {
  if (!voiceChannel) throw new Error('No voice channel provided to join.');

  const guildId = voiceChannel.guild.id;
  const state = voiceState.get(guildId) || { isJoining: false };

  if (state.isJoining) {
    // already joining -- ignore duplicate attempt
    return;
  }

  state.isJoining = true;
  voiceState.set(guildId, state);

  try {
    // small delay to let transient switches finish
    await sleep(1000);

    if (TARGET_USER_ID && !voiceChannel.members.has(TARGET_USER_ID) && !command) {
      console.log('Target user not present; aborting.');
      return;
    }

    // Tear down previous connection if exists
    const prevConn = getVoiceConnection(guildId);
    if (prevConn) {
      try { prevConn.destroy(); } catch (e) { /* ignore */ }
    }

    // Join
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      selfDeaf: false
    });

    // Save connection reference
    state.connection = connection;
    voiceState.set(guildId, state);
    lastVoiceChannel.set(guildId, voiceChannel);
    botLeftOnPurpose.set(guildId, false);

    // Wait until connection appears (or timeout)
    await waitForJoin(guildId);

    // Play audio
    await playAudioInChannel(voiceChannel, full);

    // ensure we explicitly mark not left on purpose after playing
    botLeftOnPurpose.set(guildId, false);
  } finally {
    state.isJoining = false;
    voiceState.set(guildId, state);
  }
}

async function playAudioInChannel(channel, full = false) {
  if (!channel) throw new Error('No channel to play audio in.');

  if (debounce) return;          // prevent spam
  debounce = true;
  setTimeout(() => { debounce = false; }, TimeoutDuration);

  setBotPresence('active');

  const player = ensureAudioPlayer(channel.guild.id);

  const audioFile = full ? DEFAULT_FULL_AUDIO : pickRandomAudio();
  if (!audioFile) {
    console.error('No audio file chosen; aborting play.');
    debounce = false;
    setBotPresence('idle');
    return;
  }

  const resource = createResourceForFile(audioFile);
  if (!resource) {
    debounce = false;
    setBotPresence('idle');
    return;
  }

  try {
    // If already connected, subscribe; otherwise subscription happens automatically via createAudioPlayer usage
    const existingConn = getVoiceConnection(channel.guild.id);
    if (existingConn) existingConn.subscribe(player);

    player.play(resource);
  } catch (err) {
    console.error('Failed to play audio:', err?.message || err);
    debounce = false;
    setBotPresence('idle');
  }
}

/* ---------------- Voice state tracking ------------- */
/**
 * Handles voiceStateUpdate events.
 * We only want to track Doron and his shoko mocko; we also handle the bot being disconnected unexpectedly.
 */
async function handleVoiceStateUpdate(oldState, newState) {
  try {
    const guild = newState.guild || oldState.guild;
    if (!guild) return;
    const guildId = guild.id;

    // If the bot itself was disconnected unexpectedly, rejoin where appropriate
    if (newState.id === client.user.id) {
      const wasInChannel = oldState.channelId;
      const isNowInChannel = newState.channelId;
      if (wasInChannel && !isNowInChannel) {
        // bot left voice; if not left on purpose, try to rejoin last known channel
        const leftOnPurpose = botLeftOnPurpose.get(guildId);
        if (!leftOnPurpose) {
          const lastChan = lastVoiceChannel.get(guildId);
          if (lastChan) {
            console.log('Bot disconnected unexpectedly; attempting to rejoin last channel...');
            await safeJoinVoiceChannel(lastChan).catch(e => console.warn('Rejoin failed:', e.message || e));
          }
        } else {
          console.log('Bot left on purpose, not rejoining.');
        }
      }
      return;
    }

    // We only care about Doron events beyond this point
    if (TARGET_USER_ID && newState.id !== TARGET_USER_ID) return;

    const oldChannel = oldState.channel;
    const newChannel = newState.channel;

    // Doron left VC entirely
    if (!newChannel) {
      const conn = getVoiceConnection(guildId);
      if (conn) {
        try { conn.destroy(); } catch (e) { /* ignore */ }
      }
      voiceState.delete(guildId);
      return;
    }

    // Doron joined or switched VC
    if (newChannel && newChannel !== oldChannel) {
      try {
        await safeJoinVoiceChannel(newChannel);
      } catch (err) {
        console.warn('Failed to join when Doron moved:', err?.message || err);
      }
    }
  } catch (err) {
    console.error('Error in voiceStateUpdate handler:', err);
  }
}

/* --------------- Interaction handler ---------------- */
function resolveVoiceChannelFromInteraction(interaction) {
  const selected = interaction.options.getChannel('channel');
  if (selected?.isVoiceBased?.()) return selected;
  if (interaction.member && interaction.member.voice && interaction.member.voice.channel) return interaction.member.voice.channel;
  return null;
}

client.on('interactionCreate', async interaction => {
  try {
    if (!interaction.isCommand()) return;
    const { commandName } = interaction;
    if (commandName !== 'summon' && commandName !== 'summonfull') return;

    const voiceChannel = resolveVoiceChannelFromInteraction(interaction);
    if (!voiceChannel) {
      return interaction.reply({ content: `Yo homie you ain't in a voice chat nigga, join one and then summon me dawg.`, ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });
    try {
      await safeJoinVoiceChannel(voiceChannel, commandName === 'summonfull', true);
      return interaction.followUp({ content: `Summoned.`, ephemeral: true }).catch(() => {});
    } catch (err) {
      console.error('Command summon failed:', err);
      return interaction.followUp({ content: `Couldn't join VC, dawg. Maybe I'm already busy or Doron be wildin'.`, ephemeral: true });
    }
  } catch (err) {
    console.error('Error handling interaction:', err);
  }
});

/* ------------------- Client events ----------------- */
client.once('ready', async () => {
  console.log('Client ready as', client.user.tag);
  setBotPresence('idle');

  // Register commands (guild + global)
  await registerCommands();

  // Attempt to find Doron (in any guild) and auto-join if found in a voice channel
  try {
    for (const guild of client.guilds.cache.values()) {
      try {
        if (!TARGET_USER_ID) return; // Skip if no target set
        const member = await guild.members.fetch(TARGET_USER_ID).catch(() => null);
        if (member && member.voice && member.voice.channel) {
          console.log(`Doron is in voice in guild ${guild.name} — joining...`);
          await safeJoinVoiceChannel(member.voice.channel).catch(e => console.warn('Auto-join failed:', e?.message || e));
          return; // join the first found occurrence
        }
      } catch (err) {
        // continue scanning other guilds
      }
    }
    console.log('Doron not found in voice channels on startup.');
  } catch (err) {
    console.warn('Startup Doron-scan failed:', err);
  }
});

client.on('voiceStateUpdate', handleVoiceStateUpdate);

/* -------------------- Start ------------------------ */
client.login(TOKEN).catch(err => {
  console.error('Failed to login:', err);
  process.exit(1);
});
